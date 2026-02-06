"use client";

export default function Header() {
  return (
    <header className="border-b border-gray-100 bg-white/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href="/" className="flex items-center gap-3">
            {/* Base-style logo */}
            <div className="w-8 h-8 rounded-full bg-[#0052ff] flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-white" />
            </div>
            <h1 className="text-[16px] font-semibold tracking-tight text-gray-900">
              Base Signal
            </h1>
          </a>
        </div>
        <div className="flex items-center gap-5">
          <a
            href="/skill.md"
            className="text-sm text-gray-500 hover:text-[#0052ff] transition-colors"
          >
            skill.md
          </a>
          <a
            href="/api/posts"
            className="text-sm text-gray-500 hover:text-[#0052ff] transition-colors"
          >
            API
          </a>
        </div>
      </div>
    </header>
  );
}
