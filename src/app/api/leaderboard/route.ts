import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';

// GET /api/leaderboard - Get weekly winners and top curators
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();
    
    // Get product rewards with project details
    const { data: productRewards, error: productError } = await supabase
      .from('weekly_rewards')
      .select(`
        *,
        projects!inner(id, name, tagline)
      `)
      .in('reward_type', ['product_of_week', 'runner_up', 'third_place'])
      .order('epoch_start', { ascending: false })
      .order('snr_amount', { ascending: false });

    if (productError) {
      console.error('Database error:', productError);
      return NextResponse.json({ error: 'Failed to fetch product rewards' }, { status: 500 });
    }

    // Get curator rewards, group by handle and epoch to avoid duplicates
    const { data: curatorRewards, error: curatorError } = await supabase
      .from('weekly_rewards')
      .select('*')
      .eq('reward_type', 'curator')
      .order('created_at', { ascending: false });

    if (curatorError) {
      console.error('Database error:', curatorError);
      return NextResponse.json({ error: 'Failed to fetch curator rewards' }, { status: 500 });
    }

    // Format product rewards with additional info
    const formattedProductRewards = (productRewards || []).map(reward => ({
      id: reward.id,
      epoch_start: reward.epoch_start,
      epoch_end: reward.epoch_end,
      product_id: reward.product_id,
      twitter_handle: reward.twitter_handle,
      reward_type: reward.reward_type,
      snr_amount: reward.snr_amount,
      project_name: reward.projects?.name,
      project_tagline: reward.projects?.tagline
    }));

    // For curator rewards, we'll aggregate by twitter_handle to show total earnings
    const curatorTotals = new Map<string, { total: number, epochs: number, latest: string }>();
    
    if (curatorRewards) {
      for (const reward of curatorRewards) {
        const handle = reward.twitter_handle;
        if (!handle) continue;
        
        const existing = curatorTotals.get(handle);
        if (existing) {
          existing.total += Number(reward.snr_amount);
          existing.epochs += 1;
          if (reward.created_at > existing.latest) {
            existing.latest = reward.created_at;
          }
        } else {
          curatorTotals.set(handle, {
            total: Number(reward.snr_amount),
            epochs: 1,
            latest: reward.created_at
          });
        }
      }
    }

    // Convert curator totals to array and sort by total earnings
    const formattedCuratorRewards = Array.from(curatorTotals.entries())
      .sort((a, b) => b[1].total - a[1].total)
      .map(([handle, data], index) => ({
        id: `curator-${handle}`,
        twitter_handle: handle,
        snr_amount: data.total,
        epochs_participated: data.epochs,
        latest_epoch: data.latest,
        rank: index + 1
      }));

    return NextResponse.json({
      product_rewards: formattedProductRewards,
      curator_rewards: formattedCuratorRewards
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}