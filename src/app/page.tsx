import Header from "@/components/Header";
import HeroSection from "@/components/HeroSection";
import Feed from "@/components/Feed";
import TrendingSidebar from "@/components/TrendingSidebar";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1">
        <HeroSection />
        <div className="border-t border-gray-100">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex gap-8 py-6">
              {/* Main feed */}
              <div className="flex-1 min-w-0">
                <Feed />
              </div>
              
              {/* Right sidebar - hidden on mobile */}
              <div className="hidden lg:block w-80 flex-shrink-0">
                <div className="sticky top-6">
                  <TrendingSidebar />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
