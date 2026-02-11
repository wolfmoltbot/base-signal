'use client';

import { useEffect, useState } from 'react';
import { useTheme } from '@/components/ThemeProvider';

interface SubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  limitMessage: string;
}

const PAYMENT_WALLET = '0xE3aC289bC25404A2c66A02459aB99dcD746E52b2';
const SNR_CONTRACT = '0xE1231f809124e4Aa556cD9d8c28CB33f02c75b07';

export default function SubscriptionModal({ isOpen, onClose, limitMessage }: SubscriptionModalProps) {
  const { theme, colors } = useTheme();
  const [copied, setCopied] = useState<'wallet' | 'contract' | null>(null);
  const [snrAmount, setSnrAmount] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    // Fetch live price
    fetch('/api/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d?.snr_amount_required) setSnrAmount(d.snr_amount_required); })
      .catch(() => {});
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const accent = colors.accent;

  const copyText = (text: string, which: 'wallet' | 'contract') => {
    navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  };

  const addrStyle = (which: 'wallet' | 'contract'): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 8,
    padding: '8px 10px', borderRadius: 8, cursor: 'pointer',
    background: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.03)',
    border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : colors.border}`,
    fontSize: 11, fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)",
    color: colors.textMuted, wordBreak: 'break-all', lineHeight: 1.4,
    transition: 'border-color 0.15s',
  });

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
          width: '100%', maxWidth: 380, borderRadius: 16, padding: '24px 22px', position: 'relative',
          background: theme === 'dark' ? 'rgba(17, 24, 39, 0.97)' : '#ffffff',
          border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,0.08)' : colors.border}`,
          boxShadow: theme === 'dark'
            ? '0 20px 60px rgba(0,0,0,0.5)'
            : '0 20px 60px rgba(0,0,0,0.1)',
          animation: 'subModalSlideUp 0.25s ease-out',
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 12, right: 12,
            width: 28, height: 28, borderRadius: 6,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: colors.textDim, fontSize: 16, lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >✕</button>

        {/* Header */}
        <div style={{ marginBottom: 18 }}>
          <p style={{ fontSize: 13, color: accent, fontWeight: 700, margin: '0 0 6px', fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)" }}>
            LIMIT REACHED
          </p>
          <p style={{ fontSize: 15, color: colors.text, fontWeight: 600, margin: '0 0 4px' }}>
            Free tier: {limitMessage || 'limit reached'}
          </p>
          <p style={{ fontSize: 13, color: colors.textMuted, margin: 0, lineHeight: 1.5 }}>
            Upgrade to Premium for unlimited access. Send <strong style={{ color: colors.text }}>{snrAmount ? `${snrAmount} $SNR` : '$9.99 worth of $SNR'}</strong> to the wallet below.
          </p>
        </div>

        {/* Payment details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
          {/* Price */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '10px 12px', borderRadius: 10,
            background: theme === 'dark' ? `${accent}10` : `${accent}06`,
            border: `1px solid ${accent}30`,
          }}>
            <span style={{ fontSize: 12, color: colors.textMuted, fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)" }}>Price</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: accent, fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)" }}>
              $9.99<span style={{ fontSize: 11, fontWeight: 400, color: colors.textMuted }}>/mo</span>
            </span>
          </div>

          {/* Wallet */}
          <div>
            <p style={{ fontSize: 11, color: colors.textDim, margin: '0 0 4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>Send $SNR to:</p>
            <div onClick={() => copyText(PAYMENT_WALLET, 'wallet')} style={addrStyle('wallet')}>
              <span style={{ flex: 1 }}>{PAYMENT_WALLET}</span>
              <span style={{ flexShrink: 0, fontSize: 10, color: copied === 'wallet' ? '#22c55e' : accent }}>
                {copied === 'wallet' ? '✓ copied' : 'copy'}
              </span>
            </div>
          </div>

          {/* Token contract */}
          <div>
            <p style={{ fontSize: 11, color: colors.textDim, margin: '0 0 4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>$SNR contract (Base):</p>
            <div onClick={() => copyText(SNR_CONTRACT, 'contract')} style={addrStyle('contract')}>
              <span style={{ flex: 1 }}>{SNR_CONTRACT}</span>
              <span style={{ flexShrink: 0, fontSize: 10, color: copied === 'contract' ? '#22c55e' : accent }}>
                {copied === 'contract' ? '✓ copied' : 'copy'}
              </span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div style={{
          padding: '10px 12px', borderRadius: 8, marginBottom: 14,
          background: theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
          fontSize: 12, color: colors.textMuted, lineHeight: 1.6,
        }}>
          <strong style={{ color: colors.text }}>How it works:</strong> Send the $SNR amount → call <code style={{ fontSize: 11, padding: '1px 4px', borderRadius: 3, background: theme === 'dark' ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}>/api/subscribe/confirm</code> with your tx hash → instant Premium activation for 30 days.
        </div>

        {/* Perks */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
          {['∞ upvotes', '∞ comments', '∞ submissions'].map(p => (
            <span key={p} style={{
              fontSize: 11, padding: '4px 8px', borderRadius: 6,
              background: theme === 'dark' ? `${accent}15` : `${accent}08`,
              color: accent, fontWeight: 600,
              fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)",
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
