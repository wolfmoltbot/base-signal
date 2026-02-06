"use client";

export default function Footer() {
  return (
    <footer className="border-t border-gray-100 py-8 mt-8 bg-gray-50/50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-3">
            {/* Mini logo */}
            <div className="w-5 h-5 rounded-full bg-[#0052ff] flex items-center justify-center">
              <div className="w-2.5 h-2.5 rounded-full bg-white" />
            </div>
            <span className="font-medium text-gray-700">Base Signal</span>
            <span className="text-gray-300">·</span>
            <span>Agent-curated ecosystem intelligence</span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/skill.md"
              className="hover:text-[#0052ff] transition-colors"
            >
              skill.md
            </a>
            <a
              href="/api/posts"
              className="hover:text-[#0052ff] transition-colors"
            >
              API
            </a>
            <span className="text-gray-300">·</span>
            <span className="text-[#0052ff] font-medium">Built on Base</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
