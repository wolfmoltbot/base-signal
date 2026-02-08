'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';

interface Project {
  id: string;
  name: string;
  tagline: string;
  description: string;
  website_url?: string;
  demo_url?: string;
  github_url?: string;
  logo_url?: string;
  twitter_handle?: string;
  category: string;
  upvotes: number;
  created_at: string;
  submitted_by_twitter: string;
}

interface Comment {
  id: string;
  twitter_handle: string;
  content: string;
  created_at: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  agents: 'AI Agents', defi: 'DeFi', infrastructure: 'Infrastructure',
  consumer: 'Consumer', gaming: 'Gaming', social: 'Social', tools: 'Tools', other: 'Other',
};

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [userHandle, setUserHandle] = useState('');
  const [verified, setVerified] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [upvotes, setUpvotes] = useState(0);
  const [voted, setVoted] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [authError, setAuthError] = useState('');
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [overviewOpen, setOverviewOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('sonarbot_handle');
    const savedV = localStorage.getItem('sonarbot_verified');
    if (saved) setUserHandle(saved);
    if (savedV === 'true') setVerified(true);
  }, []);

  useEffect(() => { fetchProject(); fetchComments(); }, [id]);

  const fetchProject = async () => {
    try {
      const res = await fetch(`/api/projects/${id}`);
      const data = await res.json();
      if (data.project) { setProject(data.project); setUpvotes(data.project.upvotes); }
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const fetchComments = async () => {
    try {
      const res = await fetch(`/api/projects/${id}/comments`);
      const data = await res.json();
      setComments(data.comments || []);
    } catch (e) { console.error(e); }
  };

  const handleUpvote = async () => {
    if (!verified) { setShowAuth(true); return; }
    setVoted(true); setUpvotes(prev => prev + 1);
    await fetch(`/api/projects/${id}/upvote`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ twitter_handle: userHandle })
    });
  };

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verified) { setShowAuth(true); return; }
    if (!newComment.trim()) return;
    setSubmitting(true);
    await fetch(`/api/projects/${id}/comments`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ twitter_handle: userHandle, content: newComment.trim() })
    });
    setNewComment(''); fetchComments(); setSubmitting(false);
  };

  const verifyHandle = async (handle: string) => {
    const clean = handle.replace('@', '').trim();
    if (!clean) return;
    setVerifying(true); setAuthError('');
    try {
      const res = await fetch('/api/verify-twitter', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: clean })
      });
      const data = await res.json();
      if (data.verified) {
        setUserHandle(clean); setVerified(true);
        localStorage.setItem('sonarbot_handle', clean);
        localStorage.setItem('sonarbot_verified', 'true');
        setShowAuth(false);
      } else setAuthError(data.error || 'Could not verify');
    } catch { setAuthError('Verification failed'); }
    setVerifying(false);
  };

  const timeAgo = (date: string) => {
    const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
  };

  const hue = project ? project.name.charCodeAt(0) * 7 % 360 : 0;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
          <circle cx="12" cy="12" r="10" stroke="#f0f0f0" strokeWidth="3" />
          <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="#ff6154" />
        </svg>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  if (!project) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff', gap: 8 }}>
        <p style={{ fontSize: 17, fontWeight: 600, color: '#21293c' }}>Project not found</p>
        <Link href="/" style={{ fontSize: 14, fontWeight: 600, color: '#ff6154', textDecoration: 'none' }}>← Back to home</Link>
      </div>
    );
  }

  const descTruncated = project.description && project.description.length > 150;

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>

      {/* ── HEADER ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: '#ffffff', borderBottom: '1px solid #e8e8e8' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', height: 56, gap: 12 }}>
          <button style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#21293c" strokeWidth="2" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          <Link href="/" style={{ flexShrink: 0 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: '#ff6154', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: 18, lineHeight: 1 }}>S</span>
            </div>
          </Link>
          <div style={{ flex: 1 }} />
          <button onClick={() => setShowAuth(true)}
            style={{ display: 'flex', alignItems: 'center', height: 34, padding: '0 16px', borderRadius: 20, background: '#ff6154', border: 'none', fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer', gap: 6 }}>
            {verified ? `@${userHandle}` : (
              <>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 3h4a2 2 0 012 2v14a2 2 0 01-2 2h-4M10 17l5-5-5-5M15 12H3" />
                </svg>
                Sign in
              </>
            )}
          </button>
        </div>
      </header>

      {/* ── PRODUCT CONTENT ── */}
      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '20px 20px 40px' }}>

        {/* Launching today badge */}
        <div style={{ marginBottom: 16 }}>
          <span style={{ display: 'inline-block', padding: '5px 12px', borderRadius: 6, background: '#ff6154', color: '#fff', fontSize: 12, fontWeight: 700, letterSpacing: 0.3 }}>
            Launching today
          </span>
        </div>

        {/* Product name row: logo + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
          {project.logo_url ? (
            <img src={project.logo_url} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }} />
          ) : (
            <div style={{ width: 44, height: 44, borderRadius: 10, background: `hsl(${hue}, 45%, 92%)`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: `hsl(${hue}, 45%, 45%)` }}>{project.name[0]}</span>
            </div>
          )}
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#21293c', margin: 0, lineHeight: 1.2 }}>{project.name}</h1>
        </div>

        {/* Tagline */}
        <p style={{ fontSize: 17, color: '#6f7784', margin: '0 0 4px', lineHeight: 1.4 }}>{project.tagline}</p>

        {/* Submitted by */}
        <p style={{ fontSize: 14, color: '#9b9b9b', margin: '0 0 20px' }}>
          by{' '}
          <a href={`https://x.com/${project.submitted_by_twitter}`} target="_blank" rel="noopener noreferrer"
            style={{ color: '#6f7784', fontWeight: 500, textDecoration: 'none' }}>
            @{project.submitted_by_twitter}
          </a>
        </p>

        {/* Visit website — full width pill */}
        {project.website_url && (
          <a href={project.website_url} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', height: 48, borderRadius: 24, border: '1px solid #e8e8e8', background: '#fff', fontSize: 16, fontWeight: 600, color: '#21293c', textDecoration: 'none', marginBottom: 20 }}>
            Visit website
          </a>
        )}

        {/* Categories */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9b9b9b" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
          </svg>
          <span style={{ fontSize: 14, color: '#6f7784', fontWeight: 500 }}>
            {CATEGORY_LABELS[project.category] || project.category}
          </span>
          {project.twitter_handle && (
            <>
              <span style={{ color: '#d4d4d4' }}>·</span>
              <a href={`https://x.com/${project.twitter_handle}`} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 14, color: '#6f7784', fontWeight: 500, textDecoration: 'none' }}>
                @{project.twitter_handle}
              </a>
            </>
          )}
        </div>

        {/* Description */}
        {project.description ? (
          <div style={{ marginBottom: 20 }}>
            <p style={{ fontSize: 16, color: '#21293c', lineHeight: 1.6, margin: 0 }}>
              {showFullDesc || !descTruncated
                ? project.description
                : project.description.slice(0, 150) + '...'}
            </p>
            {descTruncated && !showFullDesc && (
              <button onClick={() => setShowFullDesc(true)}
                style={{ fontSize: 15, fontWeight: 600, color: '#21293c', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 4 }}>
                see more
              </button>
            )}
          </div>
        ) : (
          <p style={{ fontSize: 15, color: '#9b9b9b', marginBottom: 20 }}>No description yet</p>
        )}

        {/* Overview collapsible */}
        <button onClick={() => setOverviewOpen(!overviewOpen)}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '14px 16px', borderRadius: 12, background: '#f5f5f5', border: 'none', cursor: 'pointer', marginBottom: 24 }}>
          <span style={{ fontSize: 15, fontWeight: 600, color: '#21293c' }}>Overview</span>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6f7784" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ transform: overviewOpen ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.2s' }}>
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {overviewOpen && (
          <div style={{ padding: '0 0 24px', marginTop: -12 }}>
            <div style={{ padding: '16px', borderRadius: 12, background: '#f9f9f9', border: '1px solid #f0f0f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: 14, color: '#6f7784' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff6154" strokeWidth="2.5"><polyline points="18 15 12 9 6 15" /></svg>
                  <span><strong style={{ color: '#21293c' }}>{upvotes}</strong> upvotes</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ff6154" strokeWidth="1.5">
                    <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span><strong style={{ color: '#21293c' }}>{comments.length}</strong> comments</span>
                </div>
                <span>Launched {timeAgo(project.created_at)}</span>
              </div>
              {project.github_url && (
                <a href={project.github_url} target="_blank" rel="noopener noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 13, fontWeight: 600, color: '#6f7784', textDecoration: 'none' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
                  </svg>
                  View on GitHub
                </a>
              )}
            </div>
          </div>
        )}

        {/* Divider */}
        <div style={{ borderTop: '1px solid #f0f0f0', marginBottom: 24 }} />

        {/* Launching Today rank section */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: '#21293c', margin: '0 0 8px' }}>Launching Today</h2>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 36, fontWeight: 800, color: '#21293c', margin: 0, lineHeight: 1 }}>#1</p>
              <p style={{ fontSize: 14, color: '#6f7784', margin: '4px 0 0' }}>Day Rank</p>
            </div>
            <div style={{ display: 'flex', gap: 0, border: '1px solid #e8e8e8', borderRadius: 24, overflow: 'hidden' }}>
              <button style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', border: 'none', cursor: 'pointer', borderRight: '1px solid #e8e8e8' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9b9b9b" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
              </button>
              <button style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', border: 'none', cursor: 'pointer' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9b9b9b" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Big upvote button — full width orange pill */}
        <button onClick={handleUpvote}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            width: '100%', height: 52, borderRadius: 26,
            background: voted ? '#e8554a' : '#ff6154',
            border: 'none', cursor: 'pointer',
            fontSize: 17, fontWeight: 700, color: '#fff',
            marginBottom: 32,
          }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="18 15 12 9 6 15" />
          </svg>
          {voted ? 'Upvoted' : 'Upvote'} · {upvotes} points
        </button>

        {/* Divider */}
        <div style={{ borderTop: '1px solid #f0f0f0', marginBottom: 24 }} />

        {/* Discussion */}
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#21293c', margin: '0 0 20px' }}>
            Discussion ({comments.length})
          </h2>

          {/* Comment form */}
          {verified ? (
            <form onSubmit={handleComment} style={{ marginBottom: 24 }}>
              <div style={{ display: 'flex', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#fff0ed', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, fontWeight: 600, color: '#ff6154' }}>
                  {userHandle[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <textarea value={newComment} onChange={e => setNewComment(e.target.value)}
                    placeholder="What do you think?"
                    rows={3}
                    style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: 'none', background: '#f5f5f5', fontSize: 14, resize: 'none', outline: 'none', lineHeight: 1.5, boxSizing: 'border-box' }} />
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
                    <button type="submit" disabled={!newComment.trim() || submitting}
                      style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: '#ff6154', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: (!newComment.trim() || submitting) ? 0.5 : 1 }}>
                      {submitting ? 'Posting...' : 'Comment'}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <div style={{ padding: 16, borderRadius: 12, background: '#f5f5f5', marginBottom: 24 }}>
              <p style={{ fontSize: 14, color: '#6f7784', margin: 0 }}>
                <button onClick={() => setShowAuth(true)} style={{ fontWeight: 600, color: '#ff6154', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>Sign in</button>
                {' '}to join the discussion
              </p>
            </div>
          )}

          {/* Comments */}
          {comments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <p style={{ fontSize: 14, color: '#9b9b9b' }}>No comments yet. Be the first!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {comments.map(c => (
                <div key={c.id} style={{ display: 'flex', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, fontWeight: 600, color: '#6f7784' }}>
                    {c.twitter_handle[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <a href={`https://x.com/${c.twitter_handle}`} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 14, fontWeight: 600, color: '#21293c', textDecoration: 'none' }}>
                        @{c.twitter_handle}
                      </a>
                      <span style={{ fontSize: 12, color: '#9b9b9b' }}>{timeAgo(c.created_at)}</span>
                    </div>
                    <p style={{ fontSize: 14, color: '#6f7784', margin: '4px 0 0', lineHeight: 1.5 }}>{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* ── FOOTER ── */}
      <footer style={{ borderTop: '1px solid #e8e8e8', background: '#ffffff', padding: '20px 20px' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#6f7784' }}>
            <span style={{ fontWeight: 600, color: '#21293c' }}>Sonarbot</span>
            <span>·</span>
            <span>© {new Date().getFullYear()}</span>
            <span>·</span>
            <span>Built on Base</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: '#6f7784' }}>
            <Link href="/docs" style={{ color: '#6f7784', textDecoration: 'none' }}>Docs</Link>
            <a href="https://x.com/sonarbotxyz" target="_blank" rel="noopener noreferrer" style={{ color: '#6f7784', textDecoration: 'none' }}>@sonarbotxyz</a>
          </div>
        </div>
      </footer>

      {/* ── AUTH MODAL ── */}
      {showAuth && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }} onClick={() => setShowAuth(false)}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 380, padding: 24 }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#21293c', margin: '0 0 4px' }}>Sign in with X</h2>
            <p style={{ fontSize: 14, color: '#6f7784', margin: '0 0 20px' }}>We'll verify your account exists</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 14, color: '#9b9b9b' }}>@</span>
                <input type="text" placeholder="yourhandle" defaultValue={userHandle} id="auth-input-detail" autoFocus
                  style={{ width: '100%', paddingLeft: 36, paddingRight: 16, height: 46, borderRadius: 12, border: 'none', background: '#f5f5f5', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                  onKeyDown={e => e.key === 'Enter' && verifyHandle((e.target as HTMLInputElement).value)} />
              </div>
              {authError && <p style={{ fontSize: 13, color: '#ef4444', margin: 0 }}>{authError}</p>}
              <button onClick={() => { const i = document.getElementById('auth-input-detail') as HTMLInputElement; if (i) verifyHandle(i.value); }}
                disabled={verifying}
                style={{ width: '100%', height: 46, borderRadius: 12, border: 'none', background: '#ff6154', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', opacity: verifying ? 0.6 : 1 }}>
                {verifying ? 'Verifying...' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
