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
}

export default function Home() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [userHandle, setUserHandle] = useState('');
  const [verified, setVerified] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [authError, setAuthError] = useState('');
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

  const CATEGORIES = [
    { label: 'AI Agents', value: 'agents' },
    { label: 'DeFi', value: 'defi' },
    { label: 'Infrastructure', value: 'infrastructure' },
    { label: 'Consumer', value: 'consumer' },
    { label: 'Gaming', value: 'gaming' },
    { label: 'Social', value: 'social' },
    { label: 'Tools', value: 'tools' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif", display: 'flex', flexDirection: 'column' }}>

      {/* ── HEADER ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 50, background: '#ffffff', borderBottom: '1px solid #e8e8e8' }}>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 20px', display: 'flex', alignItems: 'center', height: 56, gap: 12 }}>

          {/* Logo */}
          <Link href="/" style={{ flexShrink: 0, textDecoration: 'none' }}>
            <span style={{ fontWeight: 800, fontSize: 18, color: "#0000FF", lineHeight: 1, whiteSpace: "nowrap" }}>sonarbot :</span>
          </Link>

          <div style={{ flex: 1 }} />

          {/* Launch button */}
          <button
            onClick={() => verified ? setShowSubmit(true) : setShowAuth(true)}
            style={{ display: 'flex', alignItems: 'center', height: 34, padding: '0 14px', borderRadius: 20, border: '1px solid #e8e8e8', background: '#fff', fontSize: 13, fontWeight: 600, color: '#21293c', cursor: 'pointer', gap: 5, whiteSpace: 'nowrap' }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Launch
          </button>

          {/* Sign in */}
          <button
            onClick={() => setShowAuth(true)}
            style={{ display: 'flex', alignItems: 'center', height: 34, padding: '0 14px', borderRadius: 20, background: '#0000FF', border: 'none', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer', gap: 5, whiteSpace: 'nowrap', flexShrink: 0 }}>
            {verified ? (
              `@${userHandle}`
            ) : (
              'Sign in'
            )}
          </button>
        </div>
      </header>

      {/* ── MAIN CONTENT ── */}
      <main style={{ maxWidth: 1080, margin: '0 auto', padding: '24px 20px 80px', flex: 1, width: '100%', boxSizing: 'border-box' }}>

        {/* Section title */}
        <h1 style={{ fontSize: 24, fontWeight: 700, color: '#21293c', margin: '0 0 20px', lineHeight: 1.3 }}>
          Top Products Launching Today
        </h1>

        {/* Product list */}
        {loading ? (
          <div>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '20px 0', borderBottom: '1px solid #f0f0f0' }}>
                <div style={{ width: 56, height: 56, borderRadius: 12, background: '#f0f0f0' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ width: 160, height: 16, borderRadius: 4, background: '#f0f0f0', marginBottom: 8 }} />
                  <div style={{ width: 240, height: 14, borderRadius: 4, background: '#f0f0f0' }} />
                </div>
                <div style={{ width: 48, height: 56, borderRadius: 10, background: '#f0f0f0' }} />
              </div>
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <p style={{ fontSize: 17, fontWeight: 600, color: '#21293c', marginBottom: 4 }}>No products yet</p>
            <p style={{ fontSize: 14, color: '#6f7784', marginBottom: 16 }}>Be the first to launch a product</p>
            <button onClick={() => verified ? setShowSubmit(true) : setShowAuth(true)}
              style={{ fontSize: 14, fontWeight: 600, color: '#0000FF', background: 'none', border: 'none', cursor: 'pointer' }}>
              Launch a product →
            </button>
          </div>
        ) : (
          <div>
            {projects.map((p, i) => {
              const hue = hueFrom(p.name);
              const isVoted = votedIds.has(p.id);
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '16px 0', borderBottom: '1px solid #f0f0f0' }}>

                  {/* Logo */}
                  <Link href={`/project/${p.id}`} style={{ flexShrink: 0 }}>
                    {p.logo_url ? (
                      <img src={p.logo_url} alt="" style={{ width: 56, height: 56, borderRadius: 12, objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: 56, height: 56, borderRadius: 12, background: `hsl(${hue}, 45%, 92%)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 22, fontWeight: 700, color: `hsl(${hue}, 45%, 45%)` }}>
                          {p.name[0]}
                        </span>
                      </div>
                    )}
                  </Link>

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <Link href={`/project/${p.id}`} style={{ textDecoration: 'none' }}>
                      <h2 style={{ fontSize: 15, fontWeight: 600, color: '#21293c', margin: 0, lineHeight: 1.3 }}>
                        {i + 1}. {p.name}
                      </h2>
                    </Link>
                    <p style={{ fontSize: 14, color: '#6f7784', margin: '2px 0 0', lineHeight: 1.4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {p.tagline}
                    </p>
                  </div>

                  {/* Upvote — single button, PH style */}
                  <button
                    onClick={() => handleUpvote(p.id)}
                    style={{
                      flexShrink: 0,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: 48,
                      height: 56,
                      borderRadius: 10,
                      border: `1px solid ${isVoted ? '#0000FF' : '#e8e8e8'}`,
                      background: isVoted ? '#eeeeff' : '#ffffff',
                      color: isVoted ? '#0000FF' : '#4b587c',
                      cursor: 'pointer',
                      padding: 0,
                      gap: 2,
                    }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                    <span style={{ fontSize: 12, fontWeight: 700, lineHeight: 1 }}>{p.upvotes}</span>
                  </button>
                </div>
              );
            })}
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
                <input type="text" placeholder="yourhandle" defaultValue={userHandle} id="auth-input" autoFocus
                  style={{ width: '100%', paddingLeft: 36, paddingRight: 16, height: 46, borderRadius: 12, border: 'none', background: '#f5f5f5', fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                  onKeyDown={e => e.key === 'Enter' && verifyHandle((e.target as HTMLInputElement).value)} />
              </div>
              {authError && <p style={{ fontSize: 13, color: '#ef4444', margin: 0 }}>{authError}</p>}
              <button onClick={() => { const i = document.getElementById('auth-input') as HTMLInputElement; if (i) verifyHandle(i.value); }}
                disabled={verifying}
                style={{ width: '100%', height: 46, borderRadius: 12, border: 'none', background: '#0000FF', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', opacity: verifying ? 0.6 : 1 }}>
                {verifying ? 'Verifying...' : 'Continue'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── SUBMIT MODAL ── */}
      {showSubmit && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }} onClick={() => setShowSubmit(false)}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420, padding: 24, maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#21293c', margin: '0 0 4px' }}>Launch a product</h2>
            <p style={{ fontSize: 14, color: '#6f7784', margin: '0 0 20px' }}>launching as @{userHandle}</p>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <input type="text" placeholder="Product name" required
                value={submitForm.name} onChange={e => setSubmitForm({...submitForm, name: e.target.value})}
                style={{ width: '100%', height: 46, padding: '0 16px', borderRadius: 12, border: 'none', background: '#f5f5f5', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              <input type="text" placeholder="What does it do?" required maxLength={100}
                value={submitForm.tagline} onChange={e => setSubmitForm({...submitForm, tagline: e.target.value})}
                style={{ width: '100%', height: 46, padding: '0 16px', borderRadius: 12, border: 'none', background: '#f5f5f5', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              <select value={submitForm.category} onChange={e => setSubmitForm({...submitForm, category: e.target.value})}
                style={{ width: '100%', height: 46, padding: '0 16px', borderRadius: 12, border: 'none', background: '#f5f5f5', fontSize: 14, outline: 'none', boxSizing: 'border-box', color: '#21293c' }}>
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <input type="url" placeholder="Website (optional)"
                value={submitForm.website_url} onChange={e => setSubmitForm({...submitForm, website_url: e.target.value})}
                style={{ width: '100%', height: 46, padding: '0 16px', borderRadius: 12, border: 'none', background: '#f5f5f5', fontSize: 14, outline: 'none', boxSizing: 'border-box' }} />
              <button type="submit" disabled={submitting || !submitForm.name || !submitForm.tagline}
                style={{ width: '100%', height: 46, borderRadius: 12, border: 'none', background: '#0000FF', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer', opacity: (submitting || !submitForm.name || !submitForm.tagline) ? 0.5 : 1 }}>
                {submitting ? 'Launching...' : 'Launch'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
