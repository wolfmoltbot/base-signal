import Link from 'next/link';

export default function Footer() {
  return (
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
  );
}