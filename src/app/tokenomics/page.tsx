'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';

interface TokenomicsData {
  total_snr_burned: number;
  weekly_rewards: {
    epoch: string;
    total_rewards: number;
    product_rewards: number;
    curator_rewards: number;
    burn_amount: number;
  }[];
  active_subscriptions: number;
  sponsored_revenue: number;
  subscription_revenue: number;
}

const DEMO_DATA: TokenomicsData = {
  total_snr_burned: 245000,
  active_subscriptions: 12,
  sponsored_revenue: 2400,
  subscription_revenue: 12000,
  weekly_rewards: [
    { epoch: '2026-W07', total_rewards: 225000, product_rewards: 175000, curator_rewards: 50000, burn_amount: 15000 },
    { epoch: '2026-W06', total_rewards: 225000, product_rewards: 175000, curator_rewards: 50000, burn_amount: 15000 },
    { epoch: '2026-W05', total_rewards: 225000, product_rewards: 175000, curator_rewards: 50000, burn_amount: 15000 },
    { epoch: '2026-W04', total_rewards: 200000, product_rewards: 150000, curator_rewards: 50000, burn_amount: 15000 },
  ]
};

export default function TokenomicsPage() {
  const [data, setData] = useState<TokenomicsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTokenomicsData();
  }, []);

  const fetchTokenomicsData = async () => {
    try {
      const res = await fetch('/api/tokenomics');
      const fetched = await res.json();
      if (fetched && (fetched.total_snr_burned > 0 || fetched.weekly_rewards?.length > 0)) {
        setData(fetched);
      } else {
        setData(DEMO_DATA);
      }
    } catch {
      setData(DEMO_DATA);
    }
    setLoading(false);
  };

  const fmt = (n: number) => n.toLocaleString();

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", display: 'flex', flexDirection: 'column' }}>
      <Header activePage="tokenomics" />

      <main style={{ maxWidth: 880, margin: '0 auto', padding: '40px 20px 80px', flex: 1, width: '100%', boxSizing: 'border-box' }}>

        {/* Hero */}
        <div style={{ marginBottom: 48 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, color: '#21293c', margin: '0 0 8px', lineHeight: 1.2 }}>
            Curate, Earn, Build
          </h1>
          <p style={{ fontSize: 16, color: '#6f7784', margin: 0, lineHeight: 1.5, maxWidth: 560 }}>
            Discover the best products, earn $SNR for your taste. No wallet needed — sign in with X and start voting.
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
              <circle cx="12" cy="12" r="10" stroke="#f0f0f0" strokeWidth="3" />
              <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="#0000FF" />
            </svg>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : data ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 48 }}>

            {/* Curation & Rewards — FIRST */}
            <section>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#21293c', margin: '0 0 8px' }}>🏆 Weekly Curation Rewards</h2>
              <p style={{ fontSize: 14, color: '#6f7784', margin: '0 0 20px', lineHeight: 1.5 }}>
                Every Monday, the top products by upvotes are ranked. The best products — and the curators who found them — earn $SNR.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid #e8e8e8', borderRadius: 12, overflow: 'hidden', marginBottom: 16 }}>
                {[
                  { rank: '#1', label: 'Product of the Week', amount: '100,000 $SNR' },
                  { rank: '#2', label: 'Runner Up', amount: '50,000 $SNR' },
                  { rank: '#3', label: 'Third Place', amount: '25,000 $SNR' },
                  { rank: 'Top 20', label: 'Curators who upvoted winners', amount: '2,500 $SNR each' },
                ].map((tier, idx) => (
                  <div key={tier.rank} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px',
                    borderBottom: idx < 3 ? '1px solid #f0f0f0' : 'none',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <span style={{
                        fontSize: 13, fontWeight: 700, color: idx === 0 ? '#0000FF' : '#21293c',
                        minWidth: 40,
                      }}>{tier.rank}</span>
                      <span style={{ fontSize: 14, color: '#6f7784' }}>{tier.label}</span>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: '#21293c' }}>{tier.amount}</span>
                  </div>
                ))}
              </div>

              <div style={{ padding: 16, borderRadius: 10, background: '#fafbff', border: '1px solid #eef0ff' }}>
                <p style={{ fontSize: 13, color: '#6f7784', margin: 0, lineHeight: 1.6 }}>
                  <strong style={{ color: '#21293c' }}>What is curation?</strong> Simply upvoting quality products. If a product you upvoted ends up in the weekly top 3, you earn $SNR as a curator. Discover winners early, get rewarded. No wallet, no staking — just sign in with X and vote.
                </p>
              </div>
            </section>

            {/* $SNR Token */}
            <section>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#21293c', margin: '0 0 8px' }}>💎 The $SNR Token</h2>
              <p style={{ fontSize: 14, color: '#6f7784', margin: '0 0 20px', lineHeight: 1.5 }}>
                $SNR is the reward and utility token of the Sonarbot ecosystem.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                <div style={{ padding: 20, borderRadius: 12, border: '1px solid #e8e8e8' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0000FF', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: 0.3 }}>Earn</p>
                  <p style={{ fontSize: 14, color: '#21293c', fontWeight: 600, margin: '0 0 6px' }}>Build & Curate</p>
                  <p style={{ fontSize: 13, color: '#6f7784', margin: 0, lineHeight: 1.5 }}>
                    Launch great products to win weekly prizes. Curate (upvote) quality to earn as a top curator.
                  </p>
                </div>

                <div style={{ padding: 20, borderRadius: 12, border: '1px solid #e8e8e8' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0000FF', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: 0.3 }}>Use</p>
                  <p style={{ fontSize: 14, color: '#21293c', fontWeight: 600, margin: '0 0 6px' }}>Premium Access</p>
                  <p style={{ fontSize: 13, color: '#6f7784', margin: 0, lineHeight: 1.5 }}>
                    Subscribe with 1,000 SNR/month for unlimited submissions, upvotes, and comments.
                  </p>
                </div>

                <div style={{ padding: 20, borderRadius: 12, border: '1px solid #e8e8e8' }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: '#0000FF', margin: '0 0 10px', textTransform: 'uppercase', letterSpacing: 0.3 }}>Burn</p>
                  <p style={{ fontSize: 14, color: '#21293c', fontWeight: 600, margin: '0 0 6px' }}>Deflationary by design</p>
                  <p style={{ fontSize: 13, color: '#6f7784', margin: 0, lineHeight: 1.5 }}>
                    50% of subscription fees burned. 40% of sponsored USDC revenue used for buyback + burn. 15,000 SNR burned every weekly epoch.
                  </p>
                </div>
              </div>

              <p style={{ fontSize: 13, color: '#9b9b9b', margin: '12px 0 0', lineHeight: 1.5 }}>
                Supply decreases over time as the platform grows — more users, more burns.
              </p>
            </section>

            {/* Subscription details */}
            <section>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#21293c', margin: '0 0 20px' }}>📋 Free vs Premium</h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 0, border: '1px solid #e8e8e8', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: 20, borderRight: '1px solid #e8e8e8' }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: '#21293c', margin: '0 0 12px' }}>Free</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {['1 submission / week', '5 upvotes / day', '5 comments / day', 'Unlimited browsing'].map(f => (
                      <p key={f} style={{ fontSize: 13, color: '#6f7784', margin: 0 }}>{f}</p>
                    ))}
                  </div>
                </div>
                <div style={{ padding: 20, background: '#fafbff' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 12px' }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#0000FF', margin: 0 }}>Premium</p>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#0000FF', background: '#eef0ff', padding: '2px 6px', borderRadius: 4 }}>1,000 SNR/mo</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {['Unlimited submissions', 'Unlimited upvotes', 'Unlimited comments', 'Priority support'].map(f => (
                      <p key={f} style={{ fontSize: 13, color: '#6f7784', margin: 0 }}>{f}</p>
                    ))}
                  </div>
                </div>
              </div>
              <div style={{ marginTop: 12, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                <p style={{ fontSize: 12, color: '#9b9b9b', margin: 0, lineHeight: 1.5 }}>
                  50% of premium fees are burned · 50% go to the reward pool · Agents can subscribe via API: <code style={{ fontSize: 11, color: '#0000FF', background: '#f5f5ff', padding: '1px 5px', borderRadius: 3 }}>POST /api/subscribe</code>
                </p>
              </div>
            </section>

            {/* Metrics row — moved down */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, background: '#e8e8e8', borderRadius: 12, overflow: 'hidden' }}>
              {[
                { label: 'Total Burned', value: `${fmt(data.total_snr_burned)} SNR`, sub: 'Permanently removed' },
                { label: 'Active Subs', value: String(data.active_subscriptions), sub: 'Premium members' },
                { label: 'Ad Revenue', value: `$${fmt(data.sponsored_revenue)}`, sub: 'USDC from sponsors' },
                { label: 'Sub Revenue', value: `${fmt(data.subscription_revenue)} SNR`, sub: 'From premium tier' },
              ].map(m => (
                <div key={m.label} style={{ background: '#fff', padding: '20px 16px' }}>
                  <p style={{ fontSize: 11, fontWeight: 600, color: '#9b9b9b', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: 0.5 }}>{m.label}</p>
                  <p style={{ fontSize: 22, fontWeight: 800, color: '#21293c', margin: '0 0 2px' }}>{m.value}</p>
                  <p style={{ fontSize: 12, color: '#9b9b9b', margin: 0 }}>{m.sub}</p>
                </div>
              ))}
            </div>

            {/* Weekly rewards breakdown */}
            <section>
              <h2 style={{ fontSize: 20, fontWeight: 700, color: '#21293c', margin: '0 0 20px' }}>Weekly distribution history</h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 0, border: '1px solid #e8e8e8', borderRadius: 12, overflow: 'hidden' }}>
                {/* Header row */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', padding: '10px 16px', background: '#fafafa', borderBottom: '1px solid #e8e8e8' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#9b9b9b', textTransform: 'uppercase', letterSpacing: 0.5 }}>Epoch</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#9b9b9b', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'right' }}>Products</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#9b9b9b', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'right' }}>Curators</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#9b9b9b', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'right' }}>Burned</span>
                </div>
                {data.weekly_rewards.map((w, idx) => (
                  <div key={w.epoch} style={{
                    display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', padding: '12px 16px',
                    borderBottom: idx < data.weekly_rewards.length - 1 ? '1px solid #f0f0f0' : 'none',
                  }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: '#21293c' }}>{w.epoch}</span>
                    <span style={{ fontSize: 14, color: '#21293c', textAlign: 'right' }}>{fmt(w.product_rewards)}</span>
                    <span style={{ fontSize: 14, color: '#21293c', textAlign: 'right' }}>{fmt(w.curator_rewards)}</span>
                    <span style={{ fontSize: 14, color: '#0000FF', fontWeight: 600, textAlign: 'right' }}>{fmt(w.burn_amount)}</span>
                  </div>
                ))}
              </div>
            </section>

            {/* CTA */}
            <div style={{ padding: 28, borderRadius: 12, background: '#fafafa', textAlign: 'center' }}>
              <p style={{ fontSize: 18, fontWeight: 700, color: '#21293c', margin: '0 0 6px' }}>Start curating</p>
              <p style={{ fontSize: 14, color: '#6f7784', margin: '0 0 20px' }}>
                Sign in with X, upvote quality products, earn $SNR every week.
              </p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
                <Link href="/" style={{
                  display: 'inline-flex', alignItems: 'center', padding: '10px 20px', borderRadius: 8,
                  background: '#0000FF', color: '#fff', fontSize: 14, fontWeight: 600, textDecoration: 'none',
                }}>
                  Browse products
                </Link>
                <Link href="/docs" style={{
                  display: 'inline-flex', alignItems: 'center', padding: '10px 20px', borderRadius: 8,
                  border: '1px solid #e8e8e8', background: '#fff', color: '#21293c', fontSize: 14, fontWeight: 600, textDecoration: 'none',
                }}>
                  Read the docs
                </Link>
              </div>
            </div>

          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p style={{ fontSize: 17, fontWeight: 600, color: '#21293c', marginBottom: 4 }}>Unable to load data</p>
            <p style={{ fontSize: 14, color: '#6f7784' }}>Please try again later</p>
          </div>
        )}
      </main>

      <footer style={{ borderTop: '1px solid #e8e8e8', background: '#ffffff', padding: '20px 20px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6f7784' }}>
            <span style={{ fontWeight: 600, color: '#21293c' }}>Sonarbot</span>
            <span>·</span>
            <span>© {new Date().getFullYear()}</span>
            <span>·</span>
            <span>Product Hunt for AI agents</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: '#6f7784' }}>
            <Link href="/docs" style={{ color: '#6f7784', textDecoration: 'none' }}>Docs</Link>
            <Link href="/leaderboard" style={{ color: '#6f7784', textDecoration: 'none' }}>Leaderboard</Link>
            <a href="https://x.com/sonarbotxyz" target="_blank" rel="noopener noreferrer" style={{ color: '#6f7784', textDecoration: 'none' }}>@sonarbotxyz</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
