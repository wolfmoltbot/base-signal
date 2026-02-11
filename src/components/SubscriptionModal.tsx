'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/components/ThemeProvider';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  limitMessage: string;
  getAccessToken?: () => Promise<string | null>;
}

const PAYMENT_WALLET = '0xE3aC289bC25404A2c66A02459aB99dcD746E52b2';
const SNR_CONTRACT = '0xE1231f809124e4Aa556cD9d8c28CB33f02c75b07';

export default function SubscriptionModal({ isOpen, onClose, limitMessage, getAccessToken }: SubscriptionModalProps) {
  const { theme, colors } = useTheme();
  const [copied, setCopied] = useState<'wallet' | 'contract' | null>(null);
  const [snrAmount, setSnrAmount] = useState<string | null>(null);
  const [txHash, setTxHash] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    setTxHash('');
    setResult(null);
    setSubmitting(false);
    // Fetch live price (no auth needed for price check, but endpoint requires it — skip if no token)
    if (getAccessToken) {
      getAccessToken().then(token => {
        if (!token) return;
        fetch('/api/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: '{}',
        })
          .then(r => r.ok ? r.json() : null)
          .then(d => { if (d?.snr_amount_required) setSnrAmount(d.snr_amount_required); })
          .catch(() => {});
      });
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen, getAccessToken]);

  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  const handleConfirm = async () => {
    if (!txHash.trim() || submitting || !getAccessToken) return;
    setSubmitting(true);
    setResult(null);
    try {
      const token = await getAccessToken();
      if (!token) { setResult({ ok: false, msg: 'Not authenticated' }); setSubmitting(false); return; }
      const res = await fetch('/api/subscribe/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ tx_hash: txHash.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ ok: true, msg: `Premium activated until ${new Date(data.expires).toLocaleDateString()}` });
      } else {
        setResult({ ok: false, msg: data.error || data.details || 'Verification failed' });
      }
    } catch {
      setResult({ ok: false, msg: 'Network error — try again' });
    }
    setSubmitting(false);
  };

  if (!isOpen) return null;

  const accent = colors.accent;
  const mono = "var(--font-jetbrains, 'JetBrains Mono', monospace)";

  const copyText = (text: string, which: 'wallet' | 'contract') => {
    navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  };

  const addrBox: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '7px 10px', borderRadius: 8, cursor: 'pointer',
    background: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : colors.border}`,
    fontSize: 11, fontFamily: mono,
    color: colors.textMuted, wordBreak: 'break-all', lineHeight: 1.4,
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(6px)', WebkitBackdropFilter: 'blur(6px)',
        animation: 'subModalFadeIn 0.2s ease-out',
        padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 380, borderRadius: 16, padding: '22px 20px', position: 'relative',
          background: theme === 'dark' ? 'rgba(17, 24, 39, 0.97)' : '#ffffff',
          border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : colors.border}`,
          boxShadow: theme === 'dark' ? '0 20px 60px rgba(0,0,0,0.5)' : '0 20px 60px rgba(0,0,0,0.1)',
          animation: 'subModalSlideUp 0.25s ease-out',
        }}
      >
        {/* Close */}
        <button onClick={onClose} style={{
          position: 'absolute', top: 12, right: 12, width: 28, height: 28, borderRadius: 6,
          background: 'transparent', border: 'none', cursor: 'pointer',
          color: colors.textDim, fontSize: 16, lineHeight: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>✕</button>

        {/* Header */}
        <p style={{ fontSize: 13, color: accent, fontWeight: 700, margin: '0 0 4px', fontFamily: mono }}>UPGRADE TO PREMIUM</p>
        <p style={{ fontSize: 14, color: colors.text, fontWeight: 600, margin: '0 0 4px' }}>
          Free tier: {limitMessage || 'limit reached'}
        </p>
        <p style={{ fontSize: 12, color: colors.textMuted, margin: '0 0 16px', lineHeight: 1.5 }}>
          Send <strong style={{ color: colors.text }}>{snrAmount ? `${snrAmount} $SNR` : '$9.99 worth of $SNR'}</strong> to unlock unlimited access for 30 days.
        </p>

        {/* Wallet */}
        <p style={{ fontSize: 10, color: colors.textDim, margin: '0 0 3px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Send $SNR to:</p>
        <div onClick={() => copyText(PAYMENT_WALLET, 'wallet')} style={addrBox}>
          <span style={{ flex: 1 }}>{PAYMENT_WALLET}</span>
          <span style={{ flexShrink: 0, fontSize: 10, color: copied === 'wallet' ? '#22c55e' : accent }}>
            {copied === 'wallet' ? '✓' : 'copy'}
          </span>
        </div>

        {/* Token contract */}
        <p style={{ fontSize: 10, color: colors.textDim, margin: '10px 0 3px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>$SNR contract (Base):</p>
        <div onClick={() => copyText(SNR_CONTRACT, 'contract')} style={addrBox}>
          <span style={{ flex: 1 }}>{SNR_CONTRACT}</span>
          <span style={{ flexShrink: 0, fontSize: 10, color: copied === 'contract' ? '#22c55e' : accent }}>
            {copied === 'contract' ? '✓' : 'copy'}
          </span>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : colors.border, margin: '16px 0' }} />

        {/* TX hash input + submit */}
        <p style={{ fontSize: 10, color: colors.textDim, margin: '0 0 4px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>Paste your tx hash:</p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <input
            type="text"
            value={txHash}
            onChange={e => { setTxHash(e.target.value); setResult(null); }}
            placeholder="0x..."
            disabled={submitting || (result?.ok ?? false)}
            style={{
              flex: 1, padding: '9px 10px', borderRadius: 8,
              background: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
              border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.1)' : colors.border}`,
              color: colors.text, fontSize: 12, fontFamily: mono,
              outline: 'none', transition: 'border-color 0.15s',
            }}
            onFocus={e => { e.target.style.borderColor = accent; }}
            onBlur={e => { e.target.style.borderColor = theme === 'dark' ? 'rgba(255,255,255,0.1)' : colors.border; }}
          />
          <button
            onClick={handleConfirm}
            disabled={!txHash.trim() || submitting || (result?.ok ?? false)}
            style={{
              padding: '9px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: (!txHash.trim() || submitting || result?.ok) ? (theme === 'dark' ? '#1e293b' : '#e2e8f0') : accent,
              color: (!txHash.trim() || submitting || result?.ok) ? colors.textDim : '#ffffff',
              fontSize: 12, fontWeight: 700, fontFamily: mono,
              transition: 'background 0.15s, transform 0.1s',
              flexShrink: 0,
            }}
          >
            {submitting ? '...' : result?.ok ? '✓' : 'Confirm'}
          </button>
        </div>

        {/* Result message */}
        {result && (
          <div style={{
            padding: '8px 10px', borderRadius: 8, fontSize: 12, lineHeight: 1.4,
            background: result.ok
              ? (theme === 'dark' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(34, 197, 94, 0.06)')
              : (theme === 'dark' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.06)'),
            border: `1px solid ${result.ok ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
            color: result.ok ? '#22c55e' : '#ef4444',
            fontFamily: mono,
          }}>
            {result.msg}
          </div>
        )}

        {/* Perks */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 12 }}>
          {['∞ upvotes', '∞ comments', '∞ submissions'].map(p => (
            <span key={p} style={{
              fontSize: 10, padding: '3px 7px', borderRadius: 5,
              background: theme === 'dark' ? `${accent}15` : `${accent}08`,
              color: accent, fontWeight: 600, fontFamily: mono,
            }}>{p}</span>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes subModalFadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes subModalSlideUp { from { opacity: 0; transform: translateY(12px) scale(0.98) } to { opacity: 1; transform: translateY(0) scale(1) } }
      `}</style>
    </div>
  );
}
