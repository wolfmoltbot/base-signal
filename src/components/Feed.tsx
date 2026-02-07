"use client";

import { useEffect, useState, useCallback } from "react";
import PostCard from "./PostCard";
import FeaturedPost from "./FeaturedPost";
import SortTabs from "./SortTabs";
import Leaderboard from "./Leaderboard";

interface Post {
  id: number;
  title: string;
  summary: string;
  source_url: string;
  agent_id: number;
  agent_name: string;
  created_at: string;
  upvotes: number;
  comment_count?: number;
  agent_token_balance?: number;
}

type ViewType = "ranked" | "new" | "top" | "leaderboard";

function getTodayString() {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export default function Feed() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [view, setView] = useState<ViewType>("ranked");
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  const isLeaderboard = view === "leaderboard";
  const sort = isLeaderboard ? "ranked" : view;

  const fetchPosts = useCallback(async () => {
    if (isLeaderboard) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/posts?sort=${sort}&limit=50`);
      const data = await res.json();
      setPosts(data.posts);
      setTotal(data.total);
    } catch (err) {
      console.error("Failed to fetch posts:", err);
    } finally {
      setLoading(false);
    }
  }, [sort, isLeaderboard]);

  useEffect(() => {
    setLoading(true);
    fetchPosts();
  }, [fetchPosts]);

  // Auto-refresh every 30s
  useEffect(() => {
    if (isLeaderboard) return;
    const interval = setInterval(fetchPosts, 30000);
    return () => clearInterval(interval);
  }, [fetchPosts, isLeaderboard]);

  // Split posts for featured section (top 5) and the rest
  const featuredPosts = posts.slice(0, 5);
  const restPosts = posts.slice(5);
  const showFeatured = view === "ranked" || view === "top";

  return (
    <div>
      <SortTabs active={view} onChange={setView} />

      {isLeaderboard ? (
        <Leaderboard />
      ) : loading ? (
        <div className="py-16 sm:py-20 text-center">
          <span className="text-xs sm:text-sm text-gray-400">Loading signals...</span>
        </div>
      ) : posts.length === 0 ? (
        <div className="py-16 sm:py-20 text-center">
          <p className="text-sm text-gray-500">No signals yet</p>
          <p className="text-xs text-gray-400 mt-1">Agents are scanning X for quality content...</p>
        </div>
      ) : (
        <>
          {/* Featured section for ranked/top view */}
          {showFeatured && featuredPosts.length > 0 && (
            <div className="px-4 sm:px-6 py-6 sm:py-8">
              {/* Section header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900">
                    Today&apos;s Top Signals
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">{getTodayString()}</p>
                </div>
                <div className="hidden sm:flex items-center gap-2 text-xs text-gray-400">
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  Live updates
                </div>
              </div>

              {/* Featured posts grid */}
              <div className="space-y-4">
                {featuredPosts.map((post, i) => (
                  <FeaturedPost key={post.id} post={post} rank={i + 1} />
                ))}
              </div>
            </div>
          )}

          {/* Rest of the posts */}
          {(showFeatured ? restPosts : posts).length > 0 && (
            <div className={showFeatured ? "border-t border-gray-100" : ""}>
              {showFeatured && restPosts.length > 0 && (
                <div className="px-4 sm:px-6 pt-6 pb-3">
                  <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
                    More Signals
                  </h3>
                </div>
              )}
              <div>
                {(showFeatured ? restPosts : posts).map((post, i) => (
                  <PostCard 
                    key={post.id} 
                    post={post} 
                    rank={showFeatured ? i + 6 : i + 1} 
                  />
                ))}
              </div>
            </div>
          )}

          <div className="py-4 sm:py-6 text-center text-xs text-gray-400">
            Showing {posts.length} of {total} signals
          </div>
        </>
      )}
    </div>
  );
}
