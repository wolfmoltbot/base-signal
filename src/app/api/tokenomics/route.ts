import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/db';

// GET /api/tokenomics - Get tokenomics transparency data
export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabase();

    // Get weekly rewards summary
    const { data: weeklyRewards, error: rewardsError } = await supabase
      .from('weekly_rewards')
      .select('*')
      .order('epoch_start', { ascending: false });

    if (rewardsError) {
      console.error('Database error:', rewardsError);
      return NextResponse.json({ error: 'Failed to fetch weekly rewards' }, { status: 500 });
    }

    // Group rewards by epoch and calculate totals
    const epochRewards = new Map<string, {
      epoch: string;
      total_rewards: number;
      product_rewards: number;
      curator_rewards: number;
      burn_amount: number;
    }>();

    if (weeklyRewards) {
      for (const reward of weeklyRewards) {
        const epochKey = reward.epoch_start;
        const epochLabel = formatEpochLabel(reward.epoch_start);
        
        const existing = epochRewards.get(epochKey);
        const rewardAmount = Number(reward.snr_amount);
        
        if (existing) {
          existing.total_rewards += rewardAmount;
          if (reward.reward_type === 'curator') {
            existing.curator_rewards += rewardAmount;
          } else {
            existing.product_rewards += rewardAmount;
          }
        } else {
          epochRewards.set(epochKey, {
            epoch: epochLabel,
            total_rewards: rewardAmount,
            product_rewards: reward.reward_type === 'curator' ? 0 : rewardAmount,
            curator_rewards: reward.reward_type === 'curator' ? rewardAmount : 0,
            burn_amount: 15000 // As per tokenomics plan - 15K $SNR burned per epoch
          });
        }
      }
    }

    // Convert to array and sort by epoch
    const weeklyRewardsSummary = Array.from(epochRewards.values()).sort((a, b) => b.epoch.localeCompare(a.epoch));

    // Calculate total $SNR burned (placeholder - will be populated from onchain data later)
    const totalRewardsBurned = weeklyRewardsSummary.reduce((sum, epoch) => sum + epoch.burn_amount, 0);
    const subscriptionsBurned = 0; // TODO: Calculate from subscription burns
    const sponsoredBurned = 0; // TODO: Calculate from USDC buybacks
    const totalSnrBurned = totalRewardsBurned + subscriptionsBurned + sponsoredBurned;

    // Get active subscriptions count
    const { data: subscriptionsCount, error: subError } = await supabase
      .from('api_keys')
      .select('id', { count: 'exact' })
      .eq('subscription_tier', 'premium')
      .gt('subscription_expires', new Date().toISOString());

    const activeSubscriptions = subError ? 0 : (subscriptionsCount || 0);

    // Get sponsored revenue total
    const { data: sponsoredSpots, error: sponsoredError } = await supabase
      .from('sponsored_spots')
      .select('usdc_paid');

    const sponsoredRevenue = sponsoredError ? 0 : 
      (sponsoredSpots || []).reduce((sum, spot) => sum + Number(spot.usdc_paid), 0);

    // Calculate subscription revenue (estimated)
    const subscriptionRevenue = Array.isArray(subscriptionsCount) ? subscriptionsCount.length * 1000 : Number(activeSubscriptions) * 1000;

    return NextResponse.json({
      total_snr_burned: totalSnrBurned,
      weekly_rewards: weeklyRewardsSummary,
      active_subscriptions: activeSubscriptions,
      sponsored_revenue: sponsoredRevenue,
      subscription_revenue: subscriptionRevenue
    });
  } catch (error) {
    console.error('Error fetching tokenomics data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function formatEpochLabel(epochStart: string): string {
  const date = new Date(epochStart);
  const year = date.getFullYear();
  const weekNumber = Math.ceil(
    (date.getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)
  );
  return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
}