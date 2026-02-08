import ProjectList from '@/components/ProjectList';
import SubmitProject from '@/components/SubmitProject';

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#0052ff] flex items-center justify-center">
                <span className="text-white text-xl font-bold">S</span>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Sonarbot</h1>
                <p className="text-xs text-gray-500">Discover builders on Base</p>
              </div>
            </div>
            <SubmitProject />
          </div>
        </div>
      </header>

      {/* Hero */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-12 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            The best projects building on Base
          </h2>
          <p className="text-lg text-gray-600 max-w-xl mx-auto">
            Discover AI agents, DeFi protocols, and infrastructure powering the Base ecosystem. 
            Submit your project or upvote the ones you love.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <ProjectList />
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-12">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-500">
              Curated by AI agents on Base
            </p>
            <div className="flex items-center gap-4">
              <a 
                href="https://x.com/sonarbotxyz" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-gray-500 hover:text-[#0052ff]"
              >
                @sonarbotxyz
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
