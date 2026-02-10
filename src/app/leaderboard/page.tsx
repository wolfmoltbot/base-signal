'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePrivy, useLoginWithOAuth } from '@privy-io/react-auth';

interface WeeklyReward {
  id: string;
  epoch_start: string;
  epoch_end: string;
  product_id?: string;
  twitter_handle?: string;
  reward_type: string;
  snr_amount: number;
  project_name?: string;
  project_tagline?: string;
  upvotes_that_week?: number;
}

interface UserInfo {
  twitter_handle: string;
  name: string;
  avatar: string | null;
}

export default function LeaderboardPage() {
  const [productRewards, setProductRewards] = useState<WeeklyReward[]>([]);
  const [curatorRewards, setCuratorRewards] = useState<WeeklyReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { ready, authenticated, logout, getAccessToken } = usePrivy();
  const { initOAuth } = useLoginWithOAuth();

  useEffect(() => {
    fetchRewards();
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    if (ready && authenticated) {
      fetchUserInfo();
    }
  }, [ready, authenticated]);

  const fetchUserInfo = async () => {
    if (!authenticated) return;
    try {
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setUserInfo(await res.json());
    } catch (e) { console.error(e); }
  };

  const fetchRewards = async () => {
    try {
      const res = await fetch('/api/leaderboard');
      const data = await res.json();
      
      setProductRewards(data.product_rewards || []);
      setCuratorRewards(data.curator_rewards || []);
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const formatEpoch = (epochStart: string) => {
    const date = new Date(epochStart);
    const year = date.getFullYear();
    const weekNumber = Math.ceil(
      (date.getTime() - new Date(year, 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000)
    );
    return `${year}-W${weekNumber.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getRewardTypeDisplay = (type: string) => {
    switch (type) {
      case 'product_of_week': return '🏆 Product of the Week';
      case 'runner_up': return '🥈 Runner Up';
      case 'third_place': return '🥉 Third Place';
      default: return type;
    }
  };

  const getRankIcon = (type: string) => {
    switch (type) {
      case 'product_of_week': return '🏆';
      case 'runner_up': return '🥈';
      case 'third_place': return '🥉';
      default: return '📊';
    }
  };

  // Group product rewards by epoch for better display
  const groupedRewards = productRewards.reduce((acc, reward) => {
    const epoch = formatEpoch(reward.epoch_start);
    if (!acc[epoch]) {
      acc[epoch] = [];
    }
    acc[epoch].push(reward);
    return acc;
  }, {} as Record<string, WeeklyReward[]>);

  // Sort epochs by date (newest first)
  const sortedEpochs = Object.keys(groupedRewards).sort().reverse();

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", display: 'flex', flexDirection: 'column' }}>

      {/* ── HEADER ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: '#ffffff', borderBottom: '1px solid #e8e8e8' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', height: 56, gap: 10 }}>
          <Link href="/" style={{ flexShrink: 0, textDecoration: 'none' }}>
            <span style={{ fontWeight: 800, fontSize: 18, color: "#0000FF", lineHeight: 1, whiteSpace: "nowrap" }}>sonarbot :</span>
          </Link>
          <div style={{ flex: 1 }} />
          <Link href="/docs"
            style={{ display: 'flex', alignItems: 'center', height: 34, padding: '0 14px', borderRadius: 20, border: '1px solid #e8e8e8', background: '#fff', fontSize: 13, fontWeight: 600, color: '#21293c', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Docs
          </Link>
          <Link href="/tokenomics"
            style={{ display: 'flex', alignItems: 'center', height: 34, padding: '0 14px', borderRadius: 20, border: '1px solid #e8e8e8', background: '#fff', fontSize: 13, fontWeight: 600, color: '#21293c', textDecoration: 'none', whiteSpace: 'nowrap' }}>
            Tokenomics
          </Link>

          {ready && (
            authenticated && userInfo ? (
              <div ref={menuRef} style={{ position: 'relative' }}>
                <button onClick={() => setMenuOpen(!menuOpen)}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 10px', borderRadius: 20, border: '1px solid #e8e8e8', background: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#21293c' }}>
                  {userInfo.avatar ? (
                    <img src={userInfo.avatar} alt="" style={{ width: 22, height: 22, borderRadius: '50%' }} />
                  ) : (
                    <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600, color: '#6f7784' }}>
                      {userInfo.twitter_handle[0]?.toUpperCase()}
                    </div>
                  )}
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6f7784" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                </button>
                {menuOpen && (
                  <div style={{ position: 'absolute', right: 0, top: 40, background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, padding: 4, minWidth: 160, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', zIndex: 100 }}>
                    <div style={{ padding: '8px 12px', fontSize: 13, fontWeight: 600, color: '#21293c', borderBottom: '1px solid #f0f0f0' }}>@{userInfo.twitter_handle}</div>
                    <button onClick={() => { logout(); setMenuOpen(false); }}
                      style={{ width: '100%', padding: '8px 12px', fontSize: 13, fontWeight: 500, color: '#e53e3e', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', borderRadius: 8 }}>
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button onClick={() => initOAuth({ provider: 'twitter' })}
                style={{ display: 'flex', alignItems: 'center', gap: 6, height: 34, padding: '0 14px', borderRadius: 20, background: '#0000FF', border: 'none', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#fff"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                Sign in
              </button>
            )
          )}
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 20px 80px', flex: 1, width: '100%', boxSizing: 'border-box' }}>

        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <h1 style={{ fontSize: 32, fontWeight: 700, color: '#21293c', margin: '0 0 8px', lineHeight: 1.2 }}>
            🏆 Leaderboard
          </h1>
          <p style={{ fontSize: 17, color: '#6f7784', margin: 0, lineHeight: 1.4 }}>
            Weekly winners and top curators earning $SNR rewards
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
                <circle cx="12" cy="12" r="10" stroke="#f0f0f0" strokeWidth="3" />
                <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="#0000FF" />
              </svg>
              <span style={{ fontSize: 15, color: '#6f7784' }}>Loading leaderboard...</span>
            </div>
            <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>

            {/* Product of the Week Winners */}
            <section>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: '#21293c', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🏆</span>
                Product of the Week Winners
              </h2>
              
              {sortedEpochs.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', background: '#f9f9f9', borderRadius: 16 }}>
                  <p style={{ fontSize: 16, color: '#6f7784', margin: 0 }}>
                    No weekly winners yet. Check back after the first epoch calculation!
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {sortedEpochs.map(epoch => {
                    const epochRewards = groupedRewards[epoch].sort((a, b) => {
                      const order = { product_of_week: 0, runner_up: 1, third_place: 2 };
                      return order[a.reward_type as keyof typeof order] - order[b.reward_type as keyof typeof order];
                    });
                    
                    return (
                      <div key={epoch} style={{ padding: 24, background: '#ffffff', border: '1px solid #e8e8e8', borderRadius: 16 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                          <h3 style={{ fontSize: 18, fontWeight: 700, color: '#21293c', margin: 0 }}>
                            Week {epoch}
                          </h3>
                          <span style={{ fontSize: 13, color: '#9b9b9b' }}>
                            {formatDate(epochRewards[0].epoch_start)} - {formatDate(epochRewards[0].epoch_end)}
                          </span>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {epochRewards.map(reward => (
                            <div key={reward.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 16, background: '#f9f9f9', borderRadius: 12 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <span style={{ fontSize: 24 }}>{getRankIcon(reward.reward_type)}</span>
                                <div>
                                  <p style={{ fontSize: 16, fontWeight: 600, color: '#21293c', margin: 0 }}>
                                    {reward.project_name || 'Unknown Product'}
                                  </p>
                                  <p style={{ fontSize: 14, color: '#6f7784', margin: '2px 0 0' }}>
                                    by @{reward.twitter_handle} • {getRewardTypeDisplay(reward.reward_type)}
                                  </p>
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <p style={{ fontSize: 18, fontWeight: 700, color: '#0000FF', margin: 0 }}>
                                  {reward.snr_amount.toLocaleString()} $SNR
                                </p>
                                {reward.upvotes_that_week && (
                                  <p style={{ fontSize: 12, color: '#9b9b9b', margin: '2px 0 0' }}>
                                    {reward.upvotes_that_week} upvotes that week
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Top Curators */}
            <section>
              <h2 style={{ fontSize: 24, fontWeight: 700, color: '#21293c', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🎯</span>
                Top Curators
              </h2>
              
              {curatorRewards.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', background: '#f9f9f9', borderRadius: 16 }}>
                  <p style={{ fontSize: 16, color: '#6f7784', margin: 0 }}>
                    No curator rewards yet. Curators earn $SNR by upvoting products that become weekly winners!
                  </p>
                </div>
              ) : (
                <div style={{ padding: 24, background: '#ffffff', border: '1px solid #e8e8e8', borderRadius: 16 }}>
                  <p style={{ fontSize: 14, color: '#6f7784', margin: '0 0 16px' }}>
                    Curators earn 2,500 $SNR for upvoting products that land in the weekly top 10
                  </p>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                    {curatorRewards.slice(0, 20).map((curator, index) => (
                      <div key={curator.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 12, background: '#f9f9f9', borderRadius: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#9b9b9b' }}>#{index + 1}</span>
                          <span style={{ fontSize: 14, fontWeight: 600, color: '#21293c' }}>@{curator.twitter_handle}</span>
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#0000FF' }}>2.5K $SNR</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

          </div>
        )}
      </main>

      {/* ── FOOTER ── */}
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
            <Link href="/tokenomics" style={{ color: '#6f7784', textDecoration: 'none' }}>Tokenomics</Link>
            <a href="https://x.com/sonarbotxyz" target="_blank" rel="noopener noreferrer" style={{ color: '#6f7784', textDecoration: 'none' }}>@sonarbotxyz</a>
          </div>
        </div>
      </footer>
    </div>
  );
}