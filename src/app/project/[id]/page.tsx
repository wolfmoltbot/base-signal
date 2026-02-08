'use client';

import { useState, useEffect, use, useCallback, useRef } from 'react';
import Link from 'next/link';
import { usePrivy, useLoginWithOAuth } from '@privy-io/react-auth';

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
  is_agent?: boolean;
  avatar_url?: string;
}

interface UserInfo {
  twitter_handle: string;
  name: string;
  avatar: string | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  agents: 'AI Agents', defi: 'DeFi', infrastructure: 'Infrastructure',
  consumer: 'Consumer', gaming: 'Gaming', social: 'Social', tools: 'Tools', other: 'Other',
};

function Badge({ isAgent }: { isAgent?: boolean }) {
  if (isAgent === true) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center',
        padding: '1px 7px', borderRadius: 4, background: '#f0f0ff',
        fontSize: 11, fontWeight: 700, color: '#0000FF', letterSpacing: 0.2,
      }}>
        agent
      </span>
    );
  }
  if (isAgent === false) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center',
        padding: '1px 7px', borderRadius: 4, background: '#f5f5f5',
        fontSize: 11, fontWeight: 700, color: '#6f7784', letterSpacing: 0.2,
      }}>
        human
      </span>
    );
  }
  return null;
}

function Avatar({ url, handle, size = 36 }: { url?: string; handle: string; size?: number }) {
  if (url) {
    return <img src={url} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover' }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.36, fontWeight: 600, color: '#6f7784' }}>
      {handle[0]?.toUpperCase()}
    </div>
  );
}

function RichDescription({ text }: { text: string }) {
  const tweetRegex = /https?:\/\/(x\.com|twitter\.com)\/\w+\/status\/(\d+)\S*/g;
  const parts: { type: 'text' | 'url' | 'tweet'; value: string }[] = [];
  let offset = 0;
  let m;
  const tweetMatches: { index: number; length: number; url: string }[] = [];
  while ((m = tweetRegex.exec(text)) !== null) {
    tweetMatches.push({ index: m.index, length: m[0].length, url: m[0] });
  }
  for (const tweet of tweetMatches) {
    const before = text.slice(offset, tweet.index);
    if (before) pushTextAndUrls(parts, before);
    parts.push({ type: 'tweet', value: tweet.url });
    offset = tweet.index + tweet.length;
  }
  const tail = text.slice(offset);
  if (tail) pushTextAndUrls(parts, tail);

  return (
    <div>
      {parts.map((part, i) => {
        if (part.type === 'tweet') {
          return (
            <div key={i} style={{ margin: '12px 0' }}>
              <a href={part.value} target="_blank" rel="noopener noreferrer"
                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', borderRadius: 12, border: '1px solid #e8e8e8', background: '#fafafa', textDecoration: 'none', color: '#21293c', fontSize: 14, fontWeight: 500 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#21293c"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                View post on X →
              </a>
            </div>
          );
        }
        if (part.type === 'url') {
          return <a key={i} href={part.value} target="_blank" rel="noopener noreferrer" style={{ color: '#0000FF', fontWeight: 500, textDecoration: 'none', wordBreak: 'break-all' }}>{part.value}</a>;
        }
        return <span key={i} style={{ whiteSpace: 'pre-wrap' }}>{part.value}</span>;
      })}
    </div>
  );
}

function pushTextAndUrls(parts: { type: 'text' | 'url' | 'tweet'; value: string }[], text: string) {
  let urlLast = 0;
  let um;
  const urlRe = /(https?:\/\/[^\s]+)/g;
  while ((um = urlRe.exec(text)) !== null) {
    if (um.index > urlLast) parts.push({ type: 'text', value: text.slice(urlLast, um.index) });
    parts.push({ type: 'url', value: um[0] });
    urlLast = um.index + um[0].length;
  }
  if (urlLast < text.length) parts.push({ type: 'text', value: text.slice(urlLast) });
}

export default function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<Project | null>(null);
  const [allProjects, setAllProjects] = useState<{ id: string; name: string }[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [overviewOpen, setOverviewOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [votingInProgress, setVotingInProgress] = useState(false);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const { ready, authenticated, logout, getAccessToken } = usePrivy();
  const { initOAuth } = useLoginWithOAuth();

  useEffect(() => { fetchProject(); fetchComments(); fetchAllProjects(); }, [id]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fetchUserInfo = useCallback(async () => {
    if (!authenticated) { setUserInfo(null); return; }
    try {
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setUserInfo(await res.json());
    } catch (e) { console.error(e); }
  }, [authenticated, getAccessToken]);

  useEffect(() => { if (ready && authenticated) fetchUserInfo(); }, [ready, authenticated, fetchUserInfo]);

  const fetchProject = async () => {
    try { const res = await fetch(`/api/projects/${id}`); const data = await res.json(); if (data.project) setProject(data.project); } catch (e) { console.error(e); }
    setLoading(false);
  };
  const fetchComments = async () => {
    try { const res = await fetch(`/api/projects/${id}/comments`); const data = await res.json(); setComments(data.comments || []); } catch (e) { console.error(e); }
  };
  const fetchAllProjects = async () => {
    try { const res = await fetch('/api/projects?sort=upvotes&limit=50'); const data = await res.json(); setAllProjects((data.projects || []).map((p: { id: string; name: string }) => ({ id: p.id, name: p.name }))); } catch (e) { console.error(e); }
  };

  const handleUpvote = async () => {
    if (!authenticated) { initOAuth({ provider: 'twitter' }); return; }
    if (votingInProgress) return;
    setVotingInProgress(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/projects/${id}/upvote`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) { const data = await res.json(); setProject(prev => prev ? { ...prev, upvotes: data.upvotes } : prev); setHasUpvoted(data.action === 'added'); }
    } catch (e) { console.error(e); }
    setVotingInProgress(false);
  };

  const handleComment = async () => {
    if (!authenticated) { initOAuth({ provider: 'twitter' }); return; }
    if (!commentText.trim() || submittingComment) return;
    setSubmittingComment(true);
    try {
      const token = await getAccessToken();
      const res = await fetch(`/api/projects/${id}/comments`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: commentText.trim() }),
      });
      if (res.ok) { const data = await res.json(); setComments(prev => [...prev, data.comment]); setCommentText(''); }
    } catch (e) { console.error(e); }
    setSubmittingComment(false);
  };

  const timeAgo = (date: string) => {
    const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (s < 60) return 'just now'; if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`; return `${Math.floor(s / 86400)}d ago`;
  };

  const currentIndex = allProjects.findIndex(p => p.id === id);
  const prevProject = currentIndex > 0 ? allProjects[currentIndex - 1] : null;
  const nextProject = currentIndex < allProjects.length - 1 ? allProjects[currentIndex + 1] : null;
  const dayRank = currentIndex >= 0 ? currentIndex + 1 : 1;
  const hue = project ? project.name.charCodeAt(0) * 7 % 360 : 0;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff' }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
          <circle cx="12" cy="12" r="10" stroke="#f0f0f0" strokeWidth="3" />
          <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="#0000FF" />
        </svg>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  if (!project) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#fff', gap: 8 }}>
        <p style={{ fontSize: 17, fontWeight: 600, color: '#21293c' }}>Project not found</p>
        <Link href="/" style={{ fontSize: 14, fontWeight: 600, color: '#0000FF', textDecoration: 'none' }}>← Back to home</Link>
      </div>
    );
  }

  const descTruncated = project.description && project.description.length > 150;

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", paddingBottom: 140 }}>

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
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#6f7784" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>
                {menuOpen && (
                  <div style={{ position: 'absolute', right: 0, top: 40, background: '#fff', border: '1px solid #e8e8e8', borderRadius: 12, padding: 4, minWidth: 160, boxShadow: '0 4px 16px rgba(0,0,0,0.08)', zIndex: 100 }}>
                    <div style={{ padding: '8px 12px', fontSize: 13, fontWeight: 600, color: '#21293c', borderBottom: '1px solid #f0f0f0' }}>
                      @{userInfo.twitter_handle}
                    </div>
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

      {/* ── PRODUCT CONTENT ── */}
      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '20px 20px 0' }}>

        <div style={{ marginBottom: 16 }}>
          <span style={{ display: 'inline-block', padding: '5px 12px', borderRadius: 6, background: '#0000FF', color: '#fff', fontSize: 12, fontWeight: 700, letterSpacing: 0.3 }}>
            Launching today
          </span>
        </div>

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

        <p style={{ fontSize: 17, color: '#6f7784', margin: '0 0 4px', lineHeight: 1.4 }}>{project.tagline}</p>
        <p style={{ fontSize: 14, color: '#9b9b9b', margin: '0 0 20px' }}>
          by <a href={`https://x.com/${project.submitted_by_twitter}`} target="_blank" rel="noopener noreferrer" style={{ color: '#6f7784', fontWeight: 500, textDecoration: 'none' }}>@{project.submitted_by_twitter}</a>
        </p>

        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {project.website_url && (
            <a href={project.website_url} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1, height: 48, borderRadius: 24, border: '1px solid #e8e8e8', background: '#fff', fontSize: 16, fontWeight: 600, color: '#21293c', textDecoration: 'none' }}>
              Visit website
            </a>
          )}
          <button onClick={handleUpvote}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              height: 48, padding: '0 24px', borderRadius: 24,
              border: hasUpvoted ? '2px solid #0000FF' : '1px solid #e8e8e8',
              background: hasUpvoted ? '#f0f0ff' : '#fff',
              color: hasUpvoted ? '#0000FF' : '#4b587c',
              fontSize: 16, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s ease',
            }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="18 15 12 9 6 15" />
            </svg>
            Upvote ({project.upvotes})
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, color: '#6f7784', fontWeight: 500 }}>{CATEGORY_LABELS[project.category] || project.category}</span>
          {project.twitter_handle && (
            <>
              <span style={{ color: '#d4d4d4' }}>·</span>
              <a href={`https://x.com/${project.twitter_handle}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, color: '#6f7784', fontWeight: 500, textDecoration: 'none' }}>@{project.twitter_handle}</a>
            </>
          )}
        </div>

        {project.description ? (
          <div style={{ marginBottom: 20, fontSize: 16, color: '#21293c', lineHeight: 1.6 }}>
            {showFullDesc || !descTruncated ? (
              <RichDescription text={project.description} />
            ) : (
              <>
                <RichDescription text={project.description.slice(0, 150) + '...'} />
                <button onClick={() => setShowFullDesc(true)} style={{ fontSize: 15, fontWeight: 600, color: '#21293c', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 4 }}>see more</button>
              </>
            )}
          </div>
        ) : (
          <p style={{ fontSize: 15, color: '#9b9b9b', marginBottom: 20 }}>No description yet</p>
        )}

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
            <div style={{ padding: 16, borderRadius: 12, background: '#f9f9f9', border: '1px solid #f0f0f0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 24, fontSize: 14, color: '#6f7784', flexWrap: 'wrap' }}>
                <span><strong style={{ color: '#21293c' }}>{project.upvotes}</strong> upvotes</span>
                <span><strong style={{ color: '#21293c' }}>{comments.length}</strong> comments</span>
                <span>Launched {timeAgo(project.created_at)}</span>
              </div>
              {project.github_url && (
                <a href={project.github_url} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 12, fontSize: 13, fontWeight: 600, color: '#6f7784', textDecoration: 'none' }}>View on GitHub →</a>
              )}
            </div>
          </div>
        )}

        <div style={{ borderTop: '1px solid #f0f0f0', marginBottom: 24 }} />

        {/* Discussion */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#21293c', margin: '0 0 20px' }}>Discussion ({comments.length})</h2>

          {/* Comment input */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <div style={{ flexShrink: 0 }}>
              <Avatar url={userInfo?.avatar || undefined} handle={userInfo?.twitter_handle || '?'} size={36} />
            </div>
            <div style={{ flex: 1 }}>
              <textarea
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder={authenticated ? "What do you think?" : "Sign in with X to comment..."}
                disabled={!authenticated}
                style={{
                  width: '100%', minHeight: 60, padding: '10px 14px', borderRadius: 12,
                  border: '1px solid #e8e8e8', background: '#fafafa', fontSize: 14,
                  fontFamily: 'inherit', resize: 'vertical', outline: 'none',
                  color: '#21293c', boxSizing: 'border-box',
                }}
                onFocus={e => { if (!authenticated) { e.target.blur(); initOAuth({ provider: 'twitter' }); } }}
              />
              {commentText.trim() && (
                <button onClick={handleComment} disabled={submittingComment}
                  style={{
                    marginTop: 8, height: 34, padding: '0 16px', borderRadius: 20,
                    background: '#0000FF', border: 'none', fontSize: 13, fontWeight: 600,
                    color: '#fff', cursor: submittingComment ? 'not-allowed' : 'pointer',
                    opacity: submittingComment ? 0.6 : 1,
                  }}>
                  {submittingComment ? 'Posting...' : 'Comment'}
                </button>
              )}
            </div>
          </div>

          {comments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <p style={{ fontSize: 14, color: '#9b9b9b' }}>No comments yet — be the first!</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {comments.map(c => (
                <div key={c.id} style={{ display: 'flex', gap: 12 }}>
                  <div style={{ flexShrink: 0 }}>
                    <Avatar url={c.avatar_url} handle={c.twitter_handle} size={36} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                      <a href={`https://x.com/${c.twitter_handle}`} target="_blank" rel="noopener noreferrer"
                        style={{ fontSize: 14, fontWeight: 600, color: '#21293c', textDecoration: 'none' }}>
                        @{c.twitter_handle}
                      </a>
                      <Badge isAgent={c.is_agent} />
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

      {/* ── STICKY FOOTER ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        background: '#ffffff', borderTop: '1px solid #e8e8e8',
        padding: '16px 20px', paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
      }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: '#21293c', lineHeight: 1 }}>#{dayRank}</span>
              <span style={{ fontSize: 13, color: '#6f7784' }}>Day Rank</span>
              <span style={{ fontSize: 13, color: '#6f7784' }}>·</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0000FF' }}>▲ {project.upvotes}</span>
            </div>
            <div style={{ display: 'flex', gap: 0, border: '1px solid #e8e8e8', borderRadius: 24, overflow: 'hidden' }}>
              {prevProject ? (
                <Link href={`/project/${prevProject.id}`} style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', borderRight: '1px solid #e8e8e8', textDecoration: 'none' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9b9b9b" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
                </Link>
              ) : (
                <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa', borderRight: '1px solid #e8e8e8', opacity: 0.4 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9b9b9b" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
                </div>
              )}
              {nextProject ? (
                <Link href={`/project/${nextProject.id}`} style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', textDecoration: 'none' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9b9b9b" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
                </Link>
              ) : (
                <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa', opacity: 0.4 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9b9b9b" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
