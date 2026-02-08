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
  const [activeTab, setActiveTab] = useState<'overview' | 'discussion'>('overview');
  const [showAuth, setShowAuth] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [authError, setAuthError] = useState('');

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
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#faf9f7' }}>
        <svg className="w-8 h-8 animate-spin" style={{ color: '#ff6154' }} fill="none" viewBox="0 0 24 24">
          <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
        </svg>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ background: '#faf9f7' }}>
        <p className="text-[16px] font-semibold" style={{ color: '#21293c' }}>Project not found</p>
        <Link href="/" className="text-[14px] font-medium" style={{ color: '#ff6154' }}>← Back to home</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: '#faf9f7', fontFamily: "'Inter', -apple-system, sans-serif" }}>

      {/* ═══ HEADER ═══ */}
      <header className="sticky top-0 z-50" style={{ background: '#fff', borderBottom: '1px solid #e8e8e8' }}>
        <div className="max-w-[1200px] mx-auto px-6 flex items-center h-[60px] gap-4">
          <Link href="/" className="flex-shrink-0">
            <div className="w-10 h-10 rounded-[12px] flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #ff6154, #da552f)' }}>
              <span className="text-white font-bold text-xl leading-none">S</span>
            </div>
          </Link>
          <div className="hidden sm:flex items-center gap-2 h-[38px] px-4 rounded-full" style={{ background: '#fff0ed', minWidth: '200px' }}>
            <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#9b9b9b' }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <span className="text-[14px]" style={{ color: '#9b9b9b' }}>Search ( ⌘ + k )</span>
          </div>
          <nav className="hidden lg:flex items-center gap-1 ml-2">
            {['Best Products', 'Launches', 'News', 'Community'].map(item => (
              <Link key={item} href="/"
                className="px-3 py-2 text-[15px] font-medium rounded-md transition-colors"
                style={{ color: '#21293c' }}>
                {item}
              </Link>
            ))}
          </nav>
          <div className="flex-1" />
          <button onClick={() => setShowAuth(true)}
            className="flex items-center h-[38px] px-4 rounded-[10px] text-[14px] font-semibold text-white"
            style={{ background: '#ff6154' }}>
            {verified ? `@${userHandle}` : 'Sign in'}
          </button>
        </div>
      </header>

      {/* ═══ HERO ═══ */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e8e8e8' }}>
        <div className="max-w-[1200px] mx-auto px-6 py-6">
          {/* Breadcrumb */}
          <Link href="/" className="text-[13px] font-medium mb-4 inline-flex items-center gap-1 transition-colors"
            style={{ color: '#9b9b9b' }}
            onMouseEnter={e => (e.currentTarget.style.color = '#ff6154')}
            onMouseLeave={e => (e.currentTarget.style.color = '#9b9b9b')}>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path d="m15 18-6-6 6-6"/>
            </svg>
            Back
          </Link>

          {/* Product info */}
          <div className="flex items-start gap-5 mt-3">
            {/* Logo */}
            {project.logo_url ? (
              <img src={project.logo_url} alt="" className="w-[80px] h-[80px] rounded-2xl object-cover flex-shrink-0" />
            ) : (
              <div className="w-[80px] h-[80px] rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: `hsl(${hue}, 50%, 94%)` }}>
                <span className="text-[32px] font-bold" style={{ color: `hsl(${hue}, 50%, 50%)` }}>
                  {project.name[0]}
                </span>
              </div>
            )}

            {/* Text */}
            <div className="flex-1 min-w-0">
              <h1 className="text-[24px] font-bold leading-tight" style={{ color: '#21293c' }}>{project.name}</h1>
              <p className="text-[16px] mt-1" style={{ color: '#6f7784' }}>{project.tagline}</p>
              
              {/* Tags */}
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[12px] font-medium"
                  style={{ background: '#f0f0ef', color: '#6f7784' }}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"/>
                  </svg>
                  {CATEGORY_LABELS[project.category] || project.category}
                </span>
                {project.twitter_handle && (
                  <a href={`https://x.com/${project.twitter_handle}`} target="_blank" rel="noopener noreferrer"
                    className="text-[12px] font-medium transition-colors"
                    style={{ color: '#9b9b9b' }}>
                    @{project.twitter_handle}
                  </a>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2.5 mt-4">
                {project.website_url && (
                  <a href={project.website_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 h-[40px] px-5 rounded-[10px] text-[14px] font-semibold text-white transition-colors"
                    style={{ background: '#ff6154' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#e8554a')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#ff6154')}>
                    Visit website
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                    </svg>
                  </a>
                )}
                {project.github_url && (
                  <a href={project.github_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 h-[40px] px-4 rounded-[10px] text-[14px] font-medium transition-colors"
                    style={{ border: '1px solid #e8e8e8', color: '#21293c' }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = '#ccc')}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = '#e8e8e8')}>
                    GitHub
                  </a>
                )}
              </div>
            </div>

            {/* Upvote + Comment boxes */}
            <div className="flex items-start gap-2 flex-shrink-0">
              <button onClick={() => setActiveTab('discussion')}
                className="flex flex-col items-center justify-center w-14 h-16 rounded-xl transition-all"
                style={{ border: '1px solid #e8e8e8', color: '#6f7784' }}
                onMouseEnter={e => (e.currentTarget.style.borderColor = '#ccc')}
                onMouseLeave={e => (e.currentTarget.style.borderColor = '#e8e8e8')}>
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                </svg>
                <span className="text-[12px] font-bold mt-1">{comments.length}</span>
              </button>

              <button onClick={handleUpvote}
                className="flex flex-col items-center justify-center w-14 h-16 rounded-xl transition-all"
                style={{
                  border: `1px solid ${voted ? '#ff6154' : '#e8e8e8'}`,
                  background: voted ? '#fff3f2' : 'white',
                  color: voted ? '#ff6154' : '#6f7784',
                }}
                onMouseEnter={e => { if (!voted) { e.currentTarget.style.borderColor = '#ff6154'; e.currentTarget.style.color = '#ff6154'; }}}
                onMouseLeave={e => { if (!voted) { e.currentTarget.style.borderColor = '#e8e8e8'; e.currentTarget.style.color = '#6f7784'; }}}>
                <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5"/>
                </svg>
                <span className="text-[12px] font-bold mt-1">{upvotes}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="flex gap-0" style={{ borderTop: '1px solid #f0f0ef' }}>
            {(['overview', 'discussion'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className="px-5 py-3 text-[14px] font-semibold capitalize transition-colors relative"
                style={{ color: activeTab === tab ? '#ff6154' : '#6f7784' }}>
                {tab === 'discussion' ? `Discussion (${comments.length})` : tab}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: '#ff6154' }} />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ═══ BODY ═══ */}
      <div className="max-w-[1200px] mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Left column */}
          <div className="flex-1 min-w-0">
            {activeTab === 'overview' ? (
              <div>
                {/* About */}
                {project.description ? (
                  <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #e8e8e8' }}>
                    <h2 className="text-[16px] font-bold mb-3" style={{ color: '#21293c' }}>About</h2>
                    <p className="text-[15px] leading-[1.7] whitespace-pre-wrap" style={{ color: '#6f7784' }}>
                      {project.description}
                    </p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl p-8 text-center" style={{ border: '1px solid #e8e8e8' }}>
                    <p className="text-[14px]" style={{ color: '#9b9b9b' }}>No description yet</p>
                  </div>
                )}

                {/* Activity section */}
                <div className="mt-6 bg-white rounded-2xl p-6" style={{ border: '1px solid #e8e8e8' }}>
                  <h2 className="text-[16px] font-bold mb-3" style={{ color: '#21293c' }}>Activity</h2>
                  <div className="flex items-center gap-6 text-[14px]" style={{ color: '#6f7784' }}>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" style={{ color: '#ff6154' }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path d="M4.5 15.75l7.5-7.5 7.5 7.5"/>
                      </svg>
                      <span><strong style={{ color: '#21293c' }}>{upvotes}</strong> upvotes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" style={{ color: '#ff6154' }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                      </svg>
                      <span><strong style={{ color: '#21293c' }}>{comments.length}</strong> comments</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <svg className="w-4 h-4" style={{ color: '#ff6154' }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                      </svg>
                      <span>Launched {timeAgo(project.created_at)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Discussion tab */
              <div className="bg-white rounded-2xl p-6" style={{ border: '1px solid #e8e8e8' }}>
                <h2 className="text-[16px] font-bold mb-4" style={{ color: '#21293c' }}>
                  Discussion ({comments.length})
                </h2>

                {/* Comment form */}
                {verified ? (
                  <form onSubmit={handleComment} className="mb-6">
                    <div className="flex gap-3">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-[13px] font-semibold"
                        style={{ background: '#fff0ed', color: '#ff6154' }}>
                        {userHandle[0]?.toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <textarea value={newComment} onChange={e => setNewComment(e.target.value)}
                          placeholder="What do you think?" rows={3}
                          className="w-full px-4 py-3 rounded-xl text-[14px] resize-none focus:outline-none focus:ring-2"
                          style={{ background: '#f7f7f7', '--tw-ring-color': '#ff6154' } as React.CSSProperties} />
                        <div className="flex justify-end mt-2">
                          <button type="submit" disabled={!newComment.trim() || submitting}
                            className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white disabled:opacity-50"
                            style={{ background: '#ff6154' }}>
                            {submitting ? 'Posting...' : 'Comment'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="mb-6 p-4 rounded-xl" style={{ background: '#f7f7f7' }}>
                    <p className="text-[14px]" style={{ color: '#6f7784' }}>
                      <button onClick={() => setShowAuth(true)} className="font-semibold" style={{ color: '#ff6154' }}>
                        Sign in
                      </button> to join the discussion
                    </p>
                  </div>
                )}

                {/* Comments list */}
                {comments.length === 0 ? (
                  <div className="text-center py-10">
                    <svg className="w-8 h-8 mx-auto mb-2" style={{ color: '#d4d4d4' }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                      <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                    </svg>
                    <p className="text-[14px]" style={{ color: '#9b9b9b' }}>No comments yet. Be the first!</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    {comments.map(c => (
                      <div key={c.id} className="flex gap-3">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 text-[13px] font-semibold"
                          style={{ background: '#f0f0ef', color: '#6f7784' }}>
                          {c.twitter_handle[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <a href={`https://x.com/${c.twitter_handle}`} target="_blank" rel="noopener noreferrer"
                              className="text-[14px] font-semibold transition-colors"
                              style={{ color: '#21293c' }}
                              onMouseEnter={e => (e.currentTarget.style.color = '#ff6154')}
                              onMouseLeave={e => (e.currentTarget.style.color = '#21293c')}>
                              @{c.twitter_handle}
                            </a>
                            <span className="text-[12px]" style={{ color: '#9b9b9b' }}>{timeAgo(c.created_at)}</span>
                          </div>
                          <p className="text-[14px] mt-1 leading-relaxed" style={{ color: '#6f7784' }}>{c.content}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <button className="text-[12px] font-medium flex items-center gap-1 transition-colors"
                              style={{ color: '#9b9b9b' }}>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path d="M4.5 15.75l7.5-7.5 7.5 7.5"/>
                              </svg>
                              Upvote
                            </button>
                            <button className="text-[12px] font-medium flex items-center gap-1 transition-colors"
                              style={{ color: '#9b9b9b' }}>
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                                <path d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
                              </svg>
                              Reply
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right sidebar */}
          <aside className="hidden lg:block w-[280px] flex-shrink-0">
            <div className="sticky top-[76px] space-y-4">
              {/* Links card */}
              <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid #e8e8e8' }}>
                <h3 className="text-[14px] font-bold mb-3" style={{ color: '#21293c' }}>Links</h3>
                <div className="space-y-2.5">
                  {project.website_url && (
                    <a href={project.website_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-[13px] font-medium transition-colors"
                      style={{ color: '#6f7784' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#ff6154')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#6f7784')}>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                      </svg>
                      Website
                    </a>
                  )}
                  {project.twitter_handle && (
                    <a href={`https://x.com/${project.twitter_handle}`} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-[13px] font-medium transition-colors"
                      style={{ color: '#6f7784' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#ff6154')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#6f7784')}>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                      </svg>
                      @{project.twitter_handle}
                    </a>
                  )}
                  {project.github_url && (
                    <a href={project.github_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-2 text-[13px] font-medium transition-colors"
                      style={{ color: '#6f7784' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#ff6154')}
                      onMouseLeave={e => (e.currentTarget.style.color = '#6f7784')}>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/>
                      </svg>
                      GitHub
                    </a>
                  )}
                </div>
              </div>

              {/* Submitted by */}
              <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid #e8e8e8' }}>
                <h3 className="text-[14px] font-bold mb-3" style={{ color: '#21293c' }}>Submitted by</h3>
                <a href={`https://x.com/${project.submitted_by_twitter}`} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-3 group">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-semibold"
                    style={{ background: '#fff0ed', color: '#ff6154' }}>
                    {project.submitted_by_twitter[0]?.toUpperCase()}
                  </div>
                  <span className="text-[14px] font-medium group-hover:text-[#ff6154] transition-colors"
                    style={{ color: '#21293c' }}>
                    @{project.submitted_by_twitter}
                  </span>
                </a>
              </div>

              {/* Share */}
              <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid #e8e8e8' }}>
                <h3 className="text-[14px] font-bold mb-3" style={{ color: '#21293c' }}>Share</h3>
                <div className="flex gap-2">
                  <button className="flex-1 h-[36px] rounded-lg text-[13px] font-medium flex items-center justify-center gap-1.5 transition-colors"
                    style={{ background: '#f0f0ef', color: '#6f7784' }}
                    onClick={() => navigator.clipboard?.writeText(window.location.href)}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                    </svg>
                    Copy link
                  </button>
                  <a href={`https://x.com/intent/tweet?text=${encodeURIComponent(`Check out ${project.name} on @sonarbotxyz`)}&url=${encodeURIComponent(typeof window !== 'undefined' ? window.location.href : '')}`}
                    target="_blank" rel="noopener noreferrer"
                    className="h-[36px] w-[36px] rounded-lg flex items-center justify-center transition-colors"
                    style={{ background: '#f0f0ef', color: '#6f7784' }}>
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ borderTop: '1px solid #e8e8e8', background: '#fff' }}>
        <div className="max-w-[1200px] mx-auto px-6 py-5 flex items-center justify-between text-[13px]" style={{ color: '#6f7784' }}>
          <div className="flex items-center gap-2">
            <span className="font-semibold" style={{ color: '#21293c' }}>Sonarbot</span>
            <span>·</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
          <a href="https://x.com/sonarbotxyz" target="_blank" className="hover:text-[#21293c] transition-colors">@sonarbotxyz</a>
        </div>
      </footer>

      {/* ═══ AUTH MODAL ═══ */}
      {showAuth && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowAuth(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-[20px] font-bold mb-1" style={{ color: '#21293c' }}>Sign in with X</h2>
            <p className="text-[14px] mb-5" style={{ color: '#6f7784' }}>We'll verify your account exists</p>
            <div className="space-y-3">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[14px]" style={{ color: '#9b9b9b' }}>@</span>
                <input type="text" placeholder="yourhandle" defaultValue={userHandle}
                  className="w-full pl-9 pr-4 py-3 rounded-xl text-[14px] focus:outline-none focus:ring-2"
                  style={{ background: '#f7f7f7', '--tw-ring-color': '#ff6154' } as React.CSSProperties}
                  onKeyDown={e => e.key === 'Enter' && verifyHandle((e.target as HTMLInputElement).value)}
                  autoFocus id="auth-input-detail" />
              </div>
              {authError && <p className="text-red-500 text-[13px]">{authError}</p>}
              <button onClick={() => { const i = document.getElementById('auth-input-detail') as HTMLInputElement; if (i) verifyHandle(i.value); }}
                disabled={verifying}
                className="w-full py-3 text-white font-semibold rounded-xl disabled:opacity-50"
                style={{ background: '#ff6154' }}>
                {verifying ? 'Verifying...' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
