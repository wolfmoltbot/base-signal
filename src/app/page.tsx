'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Project {
  id: string;
  name: string;
  tagline: string;
  logo_url?: string;
  twitter_handle?: string;
  category: string;
  upvotes: number;
  comment_count?: number;
}

const CATEGORIES = [
  { label: 'All', value: '' },
  { label: 'AI Agents', value: 'agents' },
  { label: 'DeFi', value: 'defi' },
  { label: 'Infrastructure', value: 'infrastructure' },
  { label: 'Consumer', value: 'consumer' },
  { label: 'Gaming', value: 'gaming' },
  { label: 'Social', value: 'social' },
  { label: 'Tools', value: 'tools' },
];

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [userHandle, setUserHandle] = useState('');
  const [verified, setVerified] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [authError, setAuthError] = useState('');
  const [showBanner, setShowBanner] = useState(true);
  const [submitForm, setSubmitForm] = useState({ name: '', tagline: '', category: 'agents', website_url: '', twitter_handle: '' });
  const [submitting, setSubmitting] = useState(false);
  const [votedIds, setVotedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const saved = localStorage.getItem('sonarbot_handle');
    const savedVerified = localStorage.getItem('sonarbot_verified');
    if (saved) setUserHandle(saved);
    if (savedVerified === 'true') setVerified(true);
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const res = await fetch('/api/projects?sort=upvotes&limit=30');
      const data = await res.json();
      setProjects(data.projects || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const verifyHandle = async (handle: string) => {
    const clean = handle.replace('@', '').trim();
    if (!clean) return;
    setVerifying(true);
    setAuthError('');
    try {
      const res = await fetch('/api/verify-twitter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ handle: clean })
      });
      const data = await res.json();
      if (data.verified) {
        setUserHandle(clean);
        setVerified(true);
        localStorage.setItem('sonarbot_handle', clean);
        localStorage.setItem('sonarbot_verified', 'true');
        setShowAuth(false);
      } else {
        setAuthError(data.error || 'Could not verify account');
      }
    } catch { setAuthError('Verification failed'); }
    setVerifying(false);
  };

  const handleUpvote = async (id: string) => {
    if (!verified) { setShowAuth(true); return; }
    setVotedIds(prev => new Set(prev).add(id));
    setProjects(prev => prev.map(p => p.id === id ? { ...p, upvotes: p.upvotes + 1 } : p));
    await fetch(`/api/projects/${id}/upvote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ twitter_handle: userHandle })
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verified) { setShowAuth(true); return; }
    setSubmitting(true);
    const res = await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...submitForm, submitted_by_twitter: userHandle })
    });
    if (res.ok) {
      setShowSubmit(false);
      setSubmitForm({ name: '', tagline: '', category: 'agents', website_url: '', twitter_handle: '' });
      fetchProjects();
    }
    setSubmitting(false);
  };

  const hueFrom = (s: string) => s.charCodeAt(0) * 7 % 360;

  return (
    <div className="min-h-screen" style={{ background: '#faf9f7', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>

      {/* ═══ HEADER ═══ */}
      <header className="sticky top-0 z-50" style={{ background: '#fff', borderBottom: '1px solid #e8e8e8' }}>
        <div className="max-w-[1200px] mx-auto px-6 flex items-center h-[60px] gap-4">
          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <div className="w-10 h-10 rounded-[12px] flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #ff6154, #da552f)' }}>
              <span className="text-white font-bold text-xl leading-none">S</span>
            </div>
          </Link>

          {/* Search */}
          <div className="hidden sm:flex items-center gap-2 h-[38px] px-4 rounded-full"
            style={{ background: '#fff0ed', minWidth: '200px' }}>
            <svg className="w-4 h-4 flex-shrink-0" style={{ color: '#9b9b9b' }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <span className="text-[14px]" style={{ color: '#9b9b9b' }}>Search ( ⌘ + k )</span>
          </div>

          {/* Nav */}
          <nav className="hidden lg:flex items-center gap-1 ml-2">
            {[
              { label: 'Best Products', hasDropdown: true },
              { label: 'Launches', hasDropdown: true },
              { label: 'News', hasDropdown: true },
              { label: 'Community', hasDropdown: false },
            ].map(item => (
              <button key={item.label}
                className="flex items-center gap-1 px-3 py-2 text-[15px] font-medium rounded-md transition-colors"
                style={{ color: '#21293c' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#f7f7f7')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                {item.label}
                {item.hasDropdown && (
                  <svg className="w-3.5 h-3.5 ml-0.5" style={{ color: '#9b9b9b' }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path d="m6 9 6 6 6-6"/>
                  </svg>
                )}
              </button>
            ))}
          </nav>

          <div className="flex-1" />

          {/* Right */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => verified ? setShowSubmit(true) : setShowAuth(true)}
              className="hidden sm:flex items-center h-[38px] px-4 rounded-[10px] text-[14px] font-semibold transition-colors"
              style={{ border: '1px solid #e8e8e8', color: '#21293c' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = '#ccc')}
              onMouseLeave={e => (e.currentTarget.style.borderColor = '#e8e8e8')}>
              Submit
            </button>
            <button
              onClick={() => setShowAuth(true)}
              className="flex items-center h-[38px] px-4 rounded-[10px] text-[14px] font-semibold text-white transition-colors"
              style={{ background: '#ff6154' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#e8554a')}
              onMouseLeave={e => (e.currentTarget.style.background = '#ff6154')}>
              {verified ? `@${userHandle}` : 'Sign in'}
            </button>
          </div>
        </div>
      </header>

      {/* ═══ BODY ═══ */}
      <div className="max-w-[1200px] mx-auto px-6 flex gap-8 pt-6 pb-16">

        {/* ═══ MAIN ═══ */}
        <main className="flex-1 min-w-0">

          {/* Welcome banner */}
          {showBanner && (
            <div className="flex items-start gap-4 p-5 rounded-2xl mb-6"
              style={{ background: '#fff0ed', border: '1px solid #ffe0db' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: '#ffd8d2' }}>
                <svg className="w-5 h-5" style={{ color: '#ff6154' }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-[15px] font-semibold" style={{ color: '#21293c' }}>Welcome to Sonarbot!</p>
                <p className="text-[14px] mt-0.5" style={{ color: '#6f7784' }}>
                  The place to discover the best projects on Base. <span className="font-medium cursor-pointer" style={{ color: '#ff6154' }}>Learn more.</span>
                </p>
              </div>
              <button onClick={() => setShowBanner(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg flex-shrink-0 transition-colors"
                style={{ color: '#9b9b9b' }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#ffd8d2')}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = 'transparent')}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>
          )}

          {/* Title */}
          <h1 className="text-[22px] font-bold mb-5" style={{ color: '#21293c' }}>
            Top Products Launching Today
          </h1>

          {/* Product list */}
          {loading ? (
            <div className="space-y-0">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="flex items-center gap-4 py-5" style={{ borderBottom: '1px solid #f0f0ef' }}>
                  <div className="w-14 h-14 rounded-xl animate-pulse" style={{ background: '#f0f0ef' }} />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 rounded w-40 animate-pulse" style={{ background: '#f0f0ef' }} />
                    <div className="h-3.5 rounded w-64 animate-pulse" style={{ background: '#f0f0ef' }} />
                  </div>
                  <div className="flex gap-2">
                    <div className="w-12 h-14 rounded-lg animate-pulse" style={{ background: '#f0f0ef' }} />
                    <div className="w-12 h-14 rounded-lg animate-pulse" style={{ background: '#f0f0ef' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : projects.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-14 h-14 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ background: '#f0f0ef' }}>
                <svg className="w-6 h-6" style={{ color: '#9b9b9b' }} fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"/>
                </svg>
              </div>
              <p className="text-[16px] font-semibold mb-1" style={{ color: '#21293c' }}>No products yet</p>
              <p className="text-[14px] mb-4" style={{ color: '#6f7784' }}>Be the first to submit a project</p>
              <button onClick={() => verified ? setShowSubmit(true) : setShowAuth(true)}
                className="text-[14px] font-semibold" style={{ color: '#ff6154' }}>
                Submit a project →
              </button>
            </div>
          ) : (
            <div>
              {projects.map((p, i) => {
                const hue = hueFrom(p.name);
                const isVoted = votedIds.has(p.id);
                const comments = p.comment_count || 0;
                return (
                  <div key={p.id}
                    className="flex items-center gap-4 py-4 transition-colors"
                    style={{ borderBottom: '1px solid #f0f0ef' }}>

                    {/* Logo */}
                    <Link href={`/project/${p.id}`} className="flex-shrink-0">
                      {p.logo_url ? (
                        <img src={p.logo_url} alt="" className="w-14 h-14 rounded-xl object-cover" />
                      ) : (
                        <div className="w-14 h-14 rounded-xl flex items-center justify-center"
                          style={{ background: `hsl(${hue}, 50%, 94%)` }}>
                          <span className="text-[22px] font-bold" style={{ color: `hsl(${hue}, 50%, 50%)` }}>
                            {p.name[0]}
                          </span>
                        </div>
                      )}
                    </Link>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <Link href={`/project/${p.id}`}>
                        <h2 className="text-[15px] font-semibold leading-snug"
                          style={{ color: '#21293c' }}>
                          {i + 1}. {p.name}
                        </h2>
                      </Link>
                      <p className="text-[14px] mt-0.5 leading-snug"
                        style={{ color: '#6f7784', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {p.tagline}
                      </p>
                      {/* Tags with icon */}
                      <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                        <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: '#9b9b9b' }} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z"/>
                        </svg>
                        <span className="text-[12px] font-medium" style={{ color: '#6f7784' }}>
                          {CATEGORIES.find(c => c.value === p.category)?.label || p.category}
                        </span>
                        {p.twitter_handle && (
                          <>
                            <span style={{ color: '#d4d4d4' }}>·</span>
                            <a href={`https://x.com/${p.twitter_handle}`} target="_blank" rel="noopener noreferrer"
                              className="text-[12px] font-medium transition-colors"
                              style={{ color: '#9b9b9b' }}>
                              @{p.twitter_handle}
                            </a>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Comment + Upvote boxes — PH style two separate boxes */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {/* Comments box */}
                      <Link href={`/project/${p.id}`}
                        className="flex flex-col items-center justify-center w-12 h-14 rounded-lg transition-all"
                        style={{ border: '1px solid #e8e8e8', color: '#6f7784' }}
                        onMouseEnter={e => (e.currentTarget.style.borderColor = '#ccc')}
                        onMouseLeave={e => (e.currentTarget.style.borderColor = '#e8e8e8')}>
                        <svg className="w-[16px] h-[16px]" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                          <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                        </svg>
                        <span className="text-[11px] font-bold mt-0.5 leading-none">{comments}</span>
                      </Link>

                      {/* Upvote box */}
                      <button
                        onClick={() => handleUpvote(p.id)}
                        className="flex flex-col items-center justify-center w-12 h-14 rounded-lg transition-all"
                        style={{
                          border: `1px solid ${isVoted ? '#ff6154' : '#e8e8e8'}`,
                          background: isVoted ? '#fff3f2' : 'white',
                          color: isVoted ? '#ff6154' : '#6f7784',
                        }}
                        onMouseEnter={e => {
                          if (!isVoted) { e.currentTarget.style.borderColor = '#ff6154'; e.currentTarget.style.color = '#ff6154'; }
                        }}
                        onMouseLeave={e => {
                          if (!isVoted) { e.currentTarget.style.borderColor = '#e8e8e8'; e.currentTarget.style.color = '#6f7784'; }
                        }}>
                        <svg className="w-[16px] h-[16px]" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5"/>
                        </svg>
                        <span className="text-[11px] font-bold mt-0.5 leading-none">{p.upvotes}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>

        {/* ═══ RIGHT SIDEBAR ═══ */}
        <aside className="hidden xl:block w-[280px] flex-shrink-0">
          <div className="sticky top-[76px]">
            <h3 className="text-[16px] font-bold mb-4" style={{ color: '#21293c' }}>Trending on Sonarbot</h3>

            <div className="space-y-4">
              {/* Trending items — placeholder/teaser cards */}
              {[
                { icon: '🔵', label: 'p/base', title: 'Best AI Agent projects on Base', upvotes: 42, comments: 18 },
                { icon: '🤖', label: 'p/agents', title: 'Top autonomous agent frameworks', upvotes: 31, comments: 12 },
                { icon: '💎', label: 'p/defi', title: 'Underrated DeFi protocols to watch', upvotes: 28, comments: 9 },
              ].map((thread, i) => (
                <div key={i} className="group cursor-pointer">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[14px]">{thread.icon}</span>
                    <span className="text-[12px] font-medium" style={{ color: '#6f7784' }}>{thread.label}</span>
                  </div>
                  <p className="text-[14px] font-semibold leading-snug mb-1.5 group-hover:text-[#ff6154] transition-colors"
                    style={{ color: '#21293c' }}>
                    {thread.title}
                  </p>
                  <div className="flex items-center gap-3 text-[12px]" style={{ color: '#9b9b9b' }}>
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                        <path d="M4.5 15.75l7.5-7.5 7.5 7.5"/>
                      </svg>
                      Upvote ({thread.upvotes})
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                        <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>
                      </svg>
                      {thread.comments}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Separator */}
            <div className="my-6" style={{ borderTop: '1px solid #f0f0ef' }} />

            {/* AI Curated badge */}
            <div className="p-4 rounded-xl" style={{ background: '#fff0ed' }}>
              <p className="text-[14px] font-semibold mb-1" style={{ color: '#21293c' }}>🤖 AI Curated</p>
              <p className="text-[13px] leading-relaxed" style={{ color: '#6f7784' }}>
                Projects discovered and ranked by autonomous AI agents on Base
              </p>
              <a href="https://x.com/sonarbotxyz" target="_blank" rel="noopener noreferrer"
                className="inline-block mt-2 text-[13px] font-semibold" style={{ color: '#ff6154' }}>
                Follow @sonarbotxyz →
              </a>
            </div>
          </div>
        </aside>
      </div>

      {/* ═══ FOOTER ═══ */}
      <footer style={{ borderTop: '1px solid #e8e8e8', background: '#fff' }}>
        <div className="max-w-[1200px] mx-auto px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[13px]" style={{ color: '#6f7784' }}>
            <span className="font-semibold" style={{ color: '#21293c' }}>Sonarbot</span>
            <span>·</span>
            <span>© {new Date().getFullYear()}</span>
            <span>·</span>
            <span>Built on Base</span>
          </div>
          <div className="flex items-center gap-4 text-[13px]" style={{ color: '#6f7784' }}>
            <Link href="/docs" className="hover:text-[#21293c] transition-colors">Docs</Link>
            <a href="https://x.com/sonarbotxyz" target="_blank" className="hover:text-[#21293c] transition-colors">@sonarbotxyz</a>
          </div>
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
                  autoFocus id="auth-input" />
              </div>
              {authError && <p className="text-red-500 text-[13px]">{authError}</p>}
              <button onClick={() => { const i = document.getElementById('auth-input') as HTMLInputElement; if (i) verifyHandle(i.value); }}
                disabled={verifying}
                className="w-full py-3 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
                style={{ background: '#ff6154' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#e8554a')}
                onMouseLeave={e => (e.currentTarget.style.background = '#ff6154')}>
                {verifying ? 'Verifying...' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══ SUBMIT MODAL ═══ */}
      {showSubmit && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowSubmit(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6 max-h-[85vh] overflow-y-auto shadow-xl" onClick={e => e.stopPropagation()}>
            <h2 className="text-[20px] font-bold mb-1" style={{ color: '#21293c' }}>Submit a project</h2>
            <p className="text-[14px] mb-5" style={{ color: '#6f7784' }}>as @{userHandle}</p>
            <form onSubmit={handleSubmit} className="space-y-3">
              {[
                { key: 'name', placeholder: 'Project name', required: true, type: 'text' },
                { key: 'tagline', placeholder: 'Tagline', required: true, type: 'text', maxLength: 100 },
              ].map(field => (
                <input key={field.key} type={field.type} required={field.required} maxLength={(field as {maxLength?: number}).maxLength}
                  placeholder={field.placeholder}
                  value={submitForm[field.key as keyof typeof submitForm]}
                  onChange={e => setSubmitForm({...submitForm, [field.key]: e.target.value})}
                  className="w-full px-4 py-3 rounded-xl text-[14px] focus:outline-none focus:ring-2"
                  style={{ background: '#f7f7f7', '--tw-ring-color': '#ff6154' } as React.CSSProperties} />
              ))}
              <select value={submitForm.category}
                onChange={e => setSubmitForm({...submitForm, category: e.target.value})}
                className="w-full px-4 py-3 rounded-xl text-[14px] focus:outline-none focus:ring-2"
                style={{ background: '#f7f7f7', '--tw-ring-color': '#ff6154' } as React.CSSProperties}>
                {CATEGORIES.filter(c => c.value).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <input type="url" placeholder="Website (optional)"
                value={submitForm.website_url}
                onChange={e => setSubmitForm({...submitForm, website_url: e.target.value})}
                className="w-full px-4 py-3 rounded-xl text-[14px] focus:outline-none focus:ring-2"
                style={{ background: '#f7f7f7', '--tw-ring-color': '#ff6154' } as React.CSSProperties} />
              <button type="submit" disabled={submitting || !submitForm.name || !submitForm.tagline}
                className="w-full py-3 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
                style={{ background: '#ff6154' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#e8554a')}
                onMouseLeave={e => (e.currentTarget.style.background = '#ff6154')}>
                {submitting ? 'Submitting...' : 'Submit'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
