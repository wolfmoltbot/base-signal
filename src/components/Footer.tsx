import Link from 'next/link';

export default function Footer() {
  return (
    <footer style={{ borderTop: '1px solid #1e293b', background: '#0a0a0f', padding: '24px 20px' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#4a5568' }}>
          <span style={{
            fontWeight: 700, color: '#0044ff',
            fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)",
            fontSize: 12,
          }}>sonarbot</span>
          <span style={{ color: '#1e293b' }}>·</span>
          <span>© {new Date().getFullYear()}</span>
          <span style={{ color: '#1e293b' }}>·</span>
          <span style={{ fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)", fontSize: 11, letterSpacing: '0.5px' }}>detecting signals</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 13, color: '#4a5568' }}>
          <Link href="/docs" style={{ color: '#4a5568', textDecoration: 'none', transition: 'color 0.2s', fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)", fontSize: 12 }}>Docs</Link>
          <Link href="/curation" style={{ color: '#4a5568', textDecoration: 'none', transition: 'color 0.2s', fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)", fontSize: 12 }}>Curation</Link>
          <a href="https://x.com/sonarbotxyz" target="_blank" rel="noopener noreferrer" style={{ color: '#4a5568', textDecoration: 'none', transition: 'color 0.2s', fontFamily: "var(--font-jetbrains, 'JetBrains Mono', monospace)", fontSize: 12 }}>@sonarbotxyz</a>
        </div>
      </div>
    </footer>
  );
}
