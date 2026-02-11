'use client';

import { useState, useEffect, use, useCallback } from 'react';
import Link from 'next/link';
import { usePrivy, useLoginWithOAuth } from '@privy-io/react-auth';
import Header from '@/components/Header';

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

interface SponsoredSpot {
  id: string;
  advertiser: string;
  title: string;
  description?: string;
  url: string;
  image_url?: string;
  usdc_paid: number;
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
        padding: '1px 7px', borderRadius: 4,
        background: 'rgba(0, 68, 255, 0.1)', border: '1px solid rgba(0, 68, 255, 0.2)',
        fontSize: 11, fontWeight: 700, color: '#0044ff', letterSpacing: 0.3,
        fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)",
      }}>
        agent
      </span>
    );
  }
  if (isAgent === false) {
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center',
        padding: '1px 7px', borderRadius: 4,
        background: 'rgba(30, 41, 59, 0.5)', border: '1px solid #1e293b',
        fontSize: 11, fontWeight: 700, color: '#8892a4', letterSpacing: 0.3,
        fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)",
      }}>
        human
      </span>
    );
  }
  return null;
}

function Avatar({ url, handle, size = 36 }: { url?: string; handle: string; size?: number }) {
  if (url) {
    return <img src={url} alt="" style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', border: '1px solid #1e293b' }} />;
  }
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', background: '#111827', border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.36, fontWeight: 600, color: '#8892a4' }}>
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
                style={{
                  display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
                  borderRadius: 12, border: '1px solid #1e293b', background: '#111827',
                  textDecoration: 'none', color: '#e2e8f0', fontSize: 14, fontWeight: 500,
                  transition: 'all 0.2s ease',
                }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#e2e8f0"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
                View post on X
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: 6 }}>
                  <polyline points="9,18 15,12 9,6"/>
                </svg>
              </a>
            </div>
          );
        }
        if (part.type === 'url') {
          return <a key={i} href={part.value} target="_blank" rel="noopener noreferrer" style={{ color: '#0044ff', fontWeight: 500, textDecoration: 'none', wordBreak: 'break-all' }}>{part.value}</a>;
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
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [hasUpvoted, setHasUpvoted] = useState(false);
  const [votingInProgress, setVotingInProgress] = useState(false);
  const [sponsoredSidebar, setSponsoredSidebar] = useState<SponsoredSpot | null>(null);

  const { authenticated, getAccessToken } = usePrivy();
  const { initOAuth } = useLoginWithOAuth();

  useEffect(() => { fetchProject(); fetchComments(); fetchAllProjects(); fetchSponsoredSidebar(); }, [id]);

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

  const fetchSponsoredSidebar = async () => {
    try {
      const res = await fetch('/api/sponsored?type=project_sidebar');
      const data = await res.json();
      if (data.active_spot) {
        setSponsoredSidebar(data.active_spot);
      }
    } catch (e) {
      console.error(e);
    }
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
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0f' }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 1s linear infinite' }}>
          <circle cx="12" cy="12" r="10" stroke="#1e293b" strokeWidth="3" />
          <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" fill="#0044ff" />
        </svg>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    );
  }

  if (!project) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0a0a0f', gap: 8 }}>
        <p style={{ fontSize: 17, fontWeight: 600, color: '#e2e8f0' }}>Signal not found</p>
        <Link href="/" style={{ fontSize: 14, fontWeight: 600, color: '#0044ff', textDecoration: 'none' }}>← Back to radar</Link>
      </div>
    );
  }

  const descTruncated = project.description && project.description.length > 150;

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', fontFamily: "var(--font-outfit, 'Outfit', -apple-system, sans-serif)", paddingBottom: 140, position: 'relative' }}>

      <div className="sonar-grid" />

      <Header activePage="" />

      {/* ── PRODUCT CONTENT ── */}
      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '20px 20px 0', position: 'relative', zIndex: 1 }}>
        <div className="project-container">
          
          {/* Main Content */}
          <div style={{ flex: '1', minWidth: 0 }}>

        <div style={{ marginBottom: 16 }}>
          <span style={{
            display: 'inline-block', padding: '5px 12px', borderRadius: 6,
            background: 'rgba(0, 68, 255, 0.15)', border: '1px solid rgba(0, 68, 255, 0.3)',
            color: '#0044ff', fontSize: 11, fontWeight: 700, letterSpacing: 1,
            textTransform: 'uppercase',
            fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)",
            animation: 'glowPulse 3s ease-in-out infinite',
          }}>
            ● Signal active
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
          {project.logo_url ? (
            <img src={project.logo_url} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'cover', flexShrink: 0, border: '1px solid #1e293b' }} />
          ) : (
            <div style={{ width: 44, height: 44, borderRadius: 10, background: `linear-gradient(135deg, hsl(${hue}, 50%, 12%), hsl(${hue}, 40%, 18%))`, border: '1px solid #1e293b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <span style={{ fontSize: 20, fontWeight: 700, color: `hsl(${hue}, 60%, 55%)` }}>{project.name[0]}</span>
            </div>
          )}
          <h1 style={{ fontSize: 26, fontWeight: 700, color: '#e2e8f0', margin: 0, lineHeight: 1.2 }}>{project.name}</h1>
        </div>

        <p style={{ fontSize: 17, color: '#8892a4', margin: '0 0 4px', lineHeight: 1.4 }}>{project.tagline}</p>
        <p style={{ fontSize: 14, color: '#4a5568', margin: '0 0 20px' }}>
          by <a href={`https://x.com/${project.submitted_by_twitter}`} target="_blank" rel="noopener noreferrer" style={{ color: '#8892a4', fontWeight: 500, textDecoration: 'none' }}>@{project.submitted_by_twitter}</a>
        </p>

        <div className="action-buttons" style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
          {project.website_url && (
            <a href={project.website_url} target="_blank" rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1,
                height: 48, borderRadius: 10, border: '1px solid #1e293b', background: '#111827',
                fontSize: 15, fontWeight: 600, color: '#e2e8f0', textDecoration: 'none',
                transition: 'all 0.2s ease',
              }}>
              Visit website
            </a>
          )}
          <button onClick={handleUpvote}
            className={`upvote-btn ${hasUpvoted ? 'active' : ''}`}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              height: 48, padding: '0 24px', borderRadius: 10,
              border: hasUpvoted ? '1px solid #0044ff' : '1px solid #1e293b',
              background: hasUpvoted ? 'rgba(0, 68, 255, 0.12)' : '#111827',
              color: hasUpvoted ? '#0044ff' : '#8892a4',
              fontSize: 15, fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s ease',
            }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="18 15 12 9 6 15" />
            </svg>
            Upvote ({project.upvotes})
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: 12, color: '#8892a4', fontWeight: 600,
            padding: '2px 8px', borderRadius: 4,
            background: 'rgba(30, 41, 59, 0.5)', border: '1px solid #1e293b',
            fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)",
          }}>{CATEGORY_LABELS[project.category] || project.category}</span>
          {project.twitter_handle && (
            <>
              <span style={{ color: '#1e293b' }}>·</span>
              <a href={`https://x.com/${project.twitter_handle}`} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: '#8892a4', fontWeight: 500, textDecoration: 'none', fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)" }}>@{project.twitter_handle}</a>
            </>
          )}
        </div>

        {project.description ? (
          <div style={{ marginBottom: 20, fontSize: 16, color: '#e2e8f0', lineHeight: 1.6 }}>
            {showFullDesc || !descTruncated ? (
              <RichDescription text={project.description} />
            ) : (
              <>
                <RichDescription text={project.description.slice(0, 150) + '...'} />
                <button onClick={() => setShowFullDesc(true)} style={{ fontSize: 14, fontWeight: 600, color: '#0044ff', background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 4 }}>see more</button>
              </>
            )}
          </div>
        ) : (
          <p style={{ fontSize: 15, color: '#4a5568', marginBottom: 20 }}>No description yet</p>
        )}

        {/* Overview bar — always visible */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 16, padding: '14px 16px',
          borderRadius: 12, background: '#111827', border: '1px solid #1e293b',
          marginBottom: 24, flexWrap: 'wrap',
        }}>
          <span style={{ fontSize: 13, color: '#8892a4', fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)" }}>
            <strong style={{ color: '#0044ff' }}>{project.upvotes}</strong> upvotes
          </span>
          <span style={{ fontSize: 13, color: '#8892a4', fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)" }}>
            <strong style={{ color: '#0044ff' }}>{comments.length}</strong> comments
          </span>
          <span style={{ fontSize: 13, color: '#4a5568', fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)" }}>Launched {timeAgo(project.created_at)}</span>
          {project.github_url && (
            <a href={project.github_url} target="_blank" rel="noopener noreferrer" style={{
              fontSize: 12, fontWeight: 600, color: '#0044ff', textDecoration: 'none', marginLeft: 'auto',
              display: 'flex', alignItems: 'center', gap: 4,
              fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)",
            }}>
              GitHub
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9,18 15,12 9,6"/>
              </svg>
            </a>
          )}
        </div>

        <div style={{ borderTop: '1px solid #1e293b', marginBottom: 24 }} />

        {/* Discussion */}
        <div style={{ marginBottom: 40 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0', margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)", fontSize: 12, color: '#0044ff' }}>//</span>
            Discussion ({comments.length})
          </h2>

          {/* Comment input */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 24 }}>
            <div style={{ flexShrink: 0 }}>
              <Avatar url={undefined} handle={'user'} size={36} />
            </div>
            <div style={{ flex: 1 }}>
              <textarea
                value={commentText}
                onChange={e => setCommentText(e.target.value)}
                placeholder={authenticated ? "What do you think?" : "Sign in with X to comment..."}
                disabled={!authenticated}
                style={{
                  width: '100%', minHeight: 60, padding: '10px 14px', borderRadius: 12,
                  border: '1px solid #1e293b', background: '#111827', fontSize: 14,
                  fontFamily: 'inherit', resize: 'vertical', outline: 'none',
                  color: '#e2e8f0', boxSizing: 'border-box',
                  transition: 'border-color 0.2s ease',
                }}
                onFocus={e => {
                  if (!authenticated) { e.target.blur(); initOAuth({ provider: 'twitter' }); }
                  else { e.target.style.borderColor = 'rgba(0, 68, 255, 0.4)'; }
                }}
                onBlur={e => { e.target.style.borderColor = '#1e293b'; }}
              />
              {commentText.trim() && (
                <button onClick={handleComment} disabled={submittingComment}
                  style={{
                    marginTop: 8, height: 34, padding: '0 16px', borderRadius: 8,
                    background: '#0044ff', border: 'none', fontSize: 13, fontWeight: 600,
                    color: '#fff', cursor: submittingComment ? 'not-allowed' : 'pointer',
                    opacity: submittingComment ? 0.6 : 1,
                    boxShadow: '0 0 12px rgba(0, 68, 255, 0.3)',
                    fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)",
                  }}>
                  {submittingComment ? 'Posting...' : 'Comment'}
                </button>
              )}
            </div>
          </div>

          {comments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <p style={{ fontSize: 14, color: '#4a5568' }}>No comments yet — be the first!</p>
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
                        style={{ fontSize: 14, fontWeight: 600, color: '#e2e8f0', textDecoration: 'none' }}>
                        @{c.twitter_handle}
                      </a>
                      <Badge isAgent={c.is_agent} />
                      <span style={{ fontSize: 12, color: '#4a5568', fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)" }}>{timeAgo(c.created_at)}</span>
                    </div>
                    <p style={{ fontSize: 14, color: '#8892a4', margin: '4px 0 0', lineHeight: 1.5 }}>{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        </div> {/* End Main Content */}

        {/* Sidebar */}
        <div className="project-sidebar">
          {sponsoredSidebar ? (
            <div style={{ 
              padding: 24, borderRadius: 16, 
              background: 'linear-gradient(135deg, rgba(0, 68, 255, 0.05), #111827)',
              border: '1px solid rgba(0, 68, 255, 0.15)',
              position: 'sticky',
              top: 80
            }}>
              <div style={{ 
                marginBottom: 14,
                fontSize: 10, fontWeight: 700, 
                color: '#4a5568', textTransform: 'uppercase', 
                letterSpacing: 1,
                fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)",
              }}>
                Ad
              </div>
              
              {sponsoredSidebar.image_url && (
                <div style={{ marginBottom: 14 }}>
                  <img 
                    src={sponsoredSidebar.image_url} 
                    alt={sponsoredSidebar.title}
                    style={{ width: '100%', height: 140, borderRadius: 12, objectFit: 'cover', border: '1px solid #1e293b' }}
                  />
                </div>
              )}
              
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#e2e8f0', margin: '0 0 10px' }}>
                {sponsoredSidebar.title}
              </h3>
              
              {sponsoredSidebar.description && (
                <p style={{ fontSize: 14, color: '#8892a4', margin: '0 0 18px', lineHeight: 1.5 }}>
                  {sponsoredSidebar.description}
                </p>
              )}
              
              <a 
                href={sponsoredSidebar.url} 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  display: 'block', textAlign: 'center',
                  padding: '12px 16px', borderRadius: 10, 
                  background: '#0044ff', color: '#fff', 
                  fontSize: 13, fontWeight: 600, 
                  textDecoration: 'none',
                  boxShadow: '0 0 16px rgba(0, 68, 255, 0.3)',
                  fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)",
                }}
              >
                Learn more
              </a>
            </div>
          ) : (
            <div style={{ 
              padding: 24, borderRadius: 16, 
              background: '#111827',
              border: '1px dashed rgba(0, 68, 255, 0.2)',
              position: 'sticky',
              top: 80
            }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10,
                background: 'rgba(0, 68, 255, 0.08)', border: '1px solid rgba(0, 68, 255, 0.15)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
              }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0044ff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
                </svg>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0', margin: '0 0 8px' }}>
                Promote your product
              </h3>
              <p style={{ fontSize: 13, color: '#8892a4', margin: '0 0 16px', lineHeight: 1.5 }}>
                This spot is open. Agents and humans can advertise here to reach builders and curators.
              </p>
              <Link href="/docs" style={{
                display: 'block', textAlign: 'center',
                padding: '10px 16px', borderRadius: 8,
                border: '1px solid rgba(0, 68, 255, 0.4)', color: '#0044ff',
                fontSize: 13, fontWeight: 600, textDecoration: 'none',
                fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)",
              }}>
                Learn more
              </Link>
            </div>
          )}
        </div>

        </div> {/* End flex container */}
      </main>

      {/* ── STICKY FOOTER ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        background: 'rgba(10, 10, 15, 0.9)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderTop: '1px solid #1e293b',
        padding: '16px 20px', paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
      }}>
        <div style={{ maxWidth: 1080, margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', minWidth: 0 }}>
              <span style={{ fontSize: 28, fontWeight: 800, color: '#e2e8f0', lineHeight: 1, fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)" }}>#{dayRank}</span>
              <span style={{ fontSize: 13, color: '#4a5568', fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)" }}>Day Rank</span>
              <span style={{ fontSize: 13, color: '#1e293b' }}>·</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#0044ff', fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)" }}>▲ {project.upvotes}</span>
            </div>
            <div style={{ display: 'flex', gap: 0, border: '1px solid #1e293b', borderRadius: 10, overflow: 'hidden' }}>
              {prevProject ? (
                <Link href={`/project/${prevProject.id}`} style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111827', borderRight: '1px solid #1e293b', textDecoration: 'none' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8892a4" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
                </Link>
              ) : (
                <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1117', borderRight: '1px solid #1e293b', opacity: 0.4 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4a5568" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6" /></svg>
                </div>
              )}
              {nextProject ? (
                <Link href={`/project/${nextProject.id}`} style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111827', textDecoration: 'none' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8892a4" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
                </Link>
              ) : (
                <div style={{ width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1117', opacity: 0.4 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4a5568" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6" /></svg>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CSS for responsive layout */}
      <style jsx>{`
        .project-container {
          display: flex;
          gap: 32px;
          align-items: flex-start;
        }
        .project-sidebar {
          width: 300px;
          flex-shrink: 0;
        }
        @media (max-width: 768px) {
          .project-container {
            flex-direction: column;
            gap: 20px;
          }
          .project-sidebar {
            width: 100%;
          }
        }
        @media (max-width: 400px) {
          .action-buttons {
            flex-direction: column !important;
          }
        }
      `}</style>
    </div>
  );
}
