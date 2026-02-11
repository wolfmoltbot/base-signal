'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';

interface Project {
  id: string;
  name: string;
  tagline: string;
  logo_url?: string;
  twitter_handle?: string;
  category: string;
  upvotes: number;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  agents: 'AI Agents', defi: 'DeFi', infrastructure: 'Infrastructure',
  consumer: 'Consumer', gaming: 'Gaming', social: 'Social', tools: 'Tools', other: 'Other',
};

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

function getWeekRange(year: number, week: number): { start: Date; end: Date } {
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const jan1Day = jan1.getUTCDay() || 7;
  const startOfWeek1 = new Date(jan1);
  startOfWeek1.setUTCDate(jan1.getUTCDate() - jan1Day + 1);
  const start = new Date(startOfWeek1);
  start.setUTCDate(startOfWeek1.getUTCDate() + (week - 1) * 7);
  const end = new Date(start);
  end.setUTCDate(start.getUTCDate() + 6);
  return { start, end };
}

function formatDateShort(d: Date): string {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function LeaderboardPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [commentCounts, setCommentCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  // Current week
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentWeek = getWeekNumber(now);

  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedWeek, setSelectedWeek] = useState(currentWeek);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects?sort=upvotes&limit=100');
      const data = await res.json();
      const projs = data.projects || [];
      setProjects(projs);
      for (const p of projs) {
        fetch(`/api/projects/${p.id}/comments`).then(r => r.json()).then(d => {
          setCommentCounts(prev => ({ ...prev, [p.id]: (d.comments || []).length }));
        }).catch(() => {});
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // Filter projects by selected week
  const weekProjects = useMemo(() => {
    const { start, end } = getWeekRange(selectedYear, selectedWeek);
    const endOfDay = new Date(end);
    endOfDay.setUTCHours(23, 59, 59, 999);

    const filtered = projects.filter(p => {
      const created = new Date(p.created_at);
      return created >= start && created <= endOfDay;
    });

    // Sort by upvotes descending
    return filtered.sort((a, b) => b.upvotes - a.upvotes);
  }, [projects, selectedYear, selectedWeek]);

  const { start: weekStart, end: weekEnd } = getWeekRange(selectedYear, selectedWeek);

  const goToPrevWeek = () => {
    if (selectedWeek <= 1) {
      setSelectedYear(selectedYear - 1);
      setSelectedWeek(52);
    } else {
      setSelectedWeek(selectedWeek - 1);
    }
  };

  const goToNextWeek = () => {
    if (selectedYear === currentYear && selectedWeek >= currentWeek) return;
    if (selectedWeek >= 52) {
      setSelectedYear(selectedYear + 1);
      setSelectedWeek(1);
    } else {
      setSelectedWeek(selectedWeek + 1);
    }
  };

  const isCurrentWeek = selectedYear === currentYear && selectedWeek === currentWeek;
  const canGoNext = !(selectedYear === currentYear && selectedWeek >= currentWeek);

  const hueFrom = (s: string) => s.charCodeAt(0) * 7 % 360;

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", display: 'flex', flexDirection: 'column' }}>

      <Header activePage="leaderboard" />

      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '32px 20px 80px', flex: 1, width: '100%', boxSizing: 'border-box' }}>

        {/* Title + week nav */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#21293c', margin: '0 0 4px' }}>
            Weekly Leaderboard
          </h1>
          <p style={{ fontSize: 15, color: '#6f7784', margin: '0 0 24px' }}>
            Top products by upvotes, ranked weekly
          </p>

          {/* Week selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button onClick={goToPrevWeek} style={{
              width: 36, height: 36, borderRadius: 8, border: '1px solid #e8e8e8', background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6f7784" strokeWidth="2" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
            </button>

            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#21293c' }}>
                Week {selectedWeek}
              </span>
              <span style={{ fontSize: 14, color: '#9b9b9b' }}>
                {formatDateShort(weekStart)} – {formatDateShort(weekEnd)}, {selectedYear}
              </span>
              {isCurrentWeek && (
                <span style={{ fontSize: 11, fontWeight: 600, color: '#0000FF', background: '#eef0ff', padding: '2px 8px', borderRadius: 4 }}>
                  This week
                </span>
              )}
            </div>

            <button onClick={goToNextWeek} disabled={!canGoNext} style={{
              width: 36, height: 36, borderRadius: 8, border: '1px solid #e8e8e8',
              background: canGoNext ? '#fff' : '#fafafa',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: canGoNext ? 'pointer' : 'default', opacity: canGoNext ? 1 : 0.4,
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6f7784" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
            </button>
          </div>
        </div>

        {/* Product list */}
        {loading ? (
          <div>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 0', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ width: 32, height: 20, borderRadius: 4, background: '#f0f0f0' }} />
                <div style={{ width: 48, height: 48, borderRadius: 10, background: '#f0f0f0' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ width: 180, height: 16, borderRadius: 4, background: '#f0f0f0', marginBottom: 6 }} />
                  <div style={{ width: 260, height: 14, borderRadius: 4, background: '#f0f0f0' }} />
                </div>
                <div style={{ width: 52, height: 52, borderRadius: 10, background: '#f0f0f0' }} />
              </div>
            ))}
          </div>
        ) : weekProjects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p style={{ fontSize: 17, fontWeight: 600, color: '#21293c', marginBottom: 4 }}>No products launched this week</p>
            <p style={{ fontSize: 14, color: '#6f7784' }}>
              {isCurrentWeek ? 'Products launched this week will appear here.' : 'Try browsing a different week.'}
            </p>
          </div>
        ) : (
          <div>
            {weekProjects.map((p, i) => {
              const hue = hueFrom(p.name);
              const rank = i + 1;
              return (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', gap: 14, padding: '16px 0',
                  borderBottom: '1px solid #f0f0f0',
                }}>
                  {/* Rank */}
                  <span style={{
                    fontSize: rank <= 3 ? 18 : 15, fontWeight: 700,
                    color: rank === 1 ? '#0000FF' : rank <= 3 ? '#21293c' : '#9b9b9b',
                    minWidth: 28, textAlign: 'center', flexShrink: 0,
                  }}>
                    {rank}
                  </span>

                  {/* Logo */}
                  <Link href={`/project/${p.id}`} style={{ flexShrink: 0 }}>
                    {p.logo_url ? (
                      <img src={p.logo_url} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 48, height: 48, borderRadius: 10, background: `hsl(${hue}, 45%, 92%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 18, fontWeight: 700, color: `hsl(${hue}, 45%, 45%)` }}>{p.name[0]}</span>
                      </div>
                    )}
                  </Link>

                  {/* Name + tagline */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link href={`/project/${p.id}`} style={{ textDecoration: 'none' }}>
                      <h3 style={{ fontSize: 15, fontWeight: 600, color: '#21293c', margin: 0, lineHeight: 1.3 }}>{p.name}</h3>
                    </Link>
                    <p style={{ fontSize: 13, color: '#6f7784', margin: '2px 0 0', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.tagline}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                      <span style={{ fontSize: 11, color: '#9b9b9b', padding: '1px 6px', borderRadius: 3, background: '#f5f5f5' }}>
                        {CATEGORY_LABELS[p.category] || p.category}
                      </span>
                      {p.twitter_handle && (
                        <span style={{ fontSize: 11, color: '#9b9b9b' }}>@{p.twitter_handle}</span>
                      )}
                    </div>
                  </div>

                  {/* Comments */}
                  <Link href={`/project/${p.id}`} style={{
                    flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    width: 48, height: 52, color: '#6f7784', textDecoration: 'none', gap: 4,
                  }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                    </svg>
                    <span style={{ fontSize: 12, fontWeight: 600, lineHeight: 1 }}>{commentCounts[p.id] || 0}</span>
                  </Link>

                  {/* Upvote count */}
                  <div style={{
                    flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                    width: 52, height: 52, borderRadius: 10,
                    border: rank === 1 ? '2px solid #0000FF' : '1px solid #e0e0e0',
                    background: rank === 1 ? '#f0f0ff' : '#ffffff',
                  }}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={rank === 1 ? '#0000FF' : '#21293c'} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                    <span style={{ fontSize: 14, fontWeight: 700, color: rank === 1 ? '#0000FF' : '#21293c', lineHeight: 1 }}>{p.upvotes}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </main>

      {/* Footer */}
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
            <Link href="/curation" style={{ color: '#6f7784', textDecoration: 'none' }}>Curation</Link>
            <a href="https://x.com/sonarbotxyz" target="_blank" rel="noopener noreferrer" style={{ color: '#6f7784', textDecoration: 'none' }}>@sonarbotxyz</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
