import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';

// POST /api/admin/epoch - Calculate and distribute weekly rewards (admin only)
export async function POST(request: NextRequest) {
  try {
    // Check admin API key
    const adminKey = process.env.ADMIN_API_KEY;
    const authHeader = request.headers.get('Authorization');
    const providedKey = authHeader?.replace(/^Bearer\s+/i, '').trim();

    if (!adminKey || !providedKey || providedKey !== adminKey) {
      return NextResponse.json(
        { error: 'Admin API key required' },
        { status: 401 }
      );
    }

    const supabase = getSupabase();
    
    // Calculate epoch dates (last Monday 00:00 UTC to Sunday 23:59 UTC)
    const now = new Date();
    const lastMonday = new Date(now);
    const daysToMonday = (lastMonday.getDay() + 6) % 7; // Monday = 0
    lastMonday.setDate(lastMonday.getDate() - daysToMonday - 7); // Go back to last week's Monday
    lastMonday.setUTCHours(0, 0, 0, 0);
    
    const lastSunday = new Date(lastMonday);
    lastSunday.setDate(lastSunday.getDate() + 6);
    lastSunday.setUTCHours(23, 59, 59, 999);

    console.log('Calculating epoch:', {
      start: lastMonday.toISOString(),
      end: lastSunday.toISOString()
    });

    // Check if rewards for this epoch already exist
    const { data: existingRewards } = await supabase
      .from('weekly_rewards')
      .select('id')
      .eq('epoch_start', lastMonday.toISOString())
      .limit(1);

    if (existingRewards && existingRewards.length > 0) {
      return NextResponse.json(
        { error: 'Rewards for this epoch have already been calculated' },
        { status: 409 }
      );
    }

    // Get top 3 products by upvotes in the epoch range
    const { data: topProducts, error: productsError } = await supabase
      .from('project_upvotes')
      .select(`
        project_id,
        projects!inner(id, name, twitter_handle)
      `)
      .gte('created_at', lastMonday.toISOString())
      .lte('created_at', lastSunday.toISOString());

    if (productsError) {
      console.error('Error fetching upvotes:', productsError);
      return NextResponse.json({ error: 'Failed to fetch upvotes' }, { status: 500 });
    }

    // Count upvotes per product
    const productUpvotes = new Map<string, { count: number; project: any }>();
    
    if (topProducts) {
      for (const upvote of topProducts) {
        const projectId = upvote.project_id;
        const existing = productUpvotes.get(projectId);
        if (existing) {
          existing.count++;
        } else {
          productUpvotes.set(projectId, {
            count: 1,
            project: upvote.projects
          });
        }
      }
    }

    // Sort products by upvote count and get top 3
    const sortedProducts = Array.from(productUpvotes.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);

    // Get top 10 products for curator calculation
    const top10Products = Array.from(productUpvotes.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map(p => p.project.id);

    // Get top 20 curators (users who upvoted products in top 10)
    let topCurators = [];
    if (top10Products.length > 0) {
      const { data: curatorUpvotes, error: curatorsError } = await supabase
        .from('project_upvotes')
        .select('twitter_handle, project_id')
        .in('project_id', top10Products)
        .gte('created_at', lastMonday.toISOString())
        .lte('created_at', lastSunday.toISOString());

      if (!curatorsError && curatorUpvotes) {
        // Count how many top-10 products each user upvoted
        const curatorScores = new Map<string, number>();
        for (const upvote of curatorUpvotes) {
          const handle = upvote.twitter_handle;
          curatorScores.set(handle, (curatorScores.get(handle) || 0) + 1);
        }

        // Sort by score and get top 20
        topCurators = Array.from(curatorScores.entries())
          .sort(([, a], [, b]) => b - a)
          .slice(0, 20)
          .map(([handle]) => handle);
      }
    }

    // Prepare rewards for insertion
    const rewards = [];
    const rewardAmounts = [100000, 50000, 25000]; // #1, #2, #3 rewards
    const rewardTypes = ['product_of_week', 'runner_up', 'third_place'];

    // Product rewards
    for (let i = 0; i < Math.min(sortedProducts.length, 3); i++) {
      const product = sortedProducts[i];
      rewards.push({
        epoch_start: lastMonday.toISOString(),
        epoch_end: lastSunday.toISOString(),
        product_id: product.project.id,
        twitter_handle: product.project.twitter_handle,
        reward_type: rewardTypes[i],
        snr_amount: rewardAmounts[i],
        claimed: false,
        wallet_address: null
      });
    }

    // Curator rewards (2500 $SNR each)
    for (const curatorHandle of topCurators) {
      rewards.push({
        epoch_start: lastMonday.toISOString(),
        epoch_end: lastSunday.toISOString(),
        product_id: null,
        twitter_handle: curatorHandle,
        reward_type: 'curator',
        snr_amount: 2500,
        claimed: false,
        wallet_address: null
      });
    }

    // Insert rewards
    if (rewards.length > 0) {
      const { error: insertError } = await supabase
        .from('weekly_rewards')
        .insert(rewards);

      if (insertError) {
        console.error('Error inserting rewards:', insertError);
        return NextResponse.json({ error: 'Failed to insert rewards' }, { status: 500 });
      }
    }

    // Calculate totals
    const productRewardsTotal = sortedProducts.slice(0, 3).reduce((sum, _, i) => sum + rewardAmounts[i], 0);
    const curatorRewardsTotal = topCurators.length * 2500;
    const totalRewards = productRewardsTotal + curatorRewardsTotal;

    return NextResponse.json({
      success: true,
      epoch: {
        start: lastMonday.toISOString(),
        end: lastSunday.toISOString()
      },
      top_products: sortedProducts.slice(0, 3).map((p, i) => ({
        rank: i + 1,
        name: p.project.name,
        handle: p.project.twitter_handle,
        upvotes: p.count,
        reward: rewardAmounts[i]
      })),
      top_curators: {
        count: topCurators.length,
        handles: topCurators,
        reward_each: 2500
      },
      summary: {
        total_rewards_distributed: totalRewards,
        product_rewards: productRewardsTotal,
        curator_rewards: curatorRewardsTotal,
        burned: 15000 // As per tokenomics plan
      }
    });
  } catch (error) {
    console.error('Error calculating epoch:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}