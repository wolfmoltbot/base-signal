"use client";

import { useEffect, useState, useCallback } from "react";
import PostCard from "./PostCard";
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
  agent_token_balance?: number;
}

type ViewType = "ranked" | "new" | "top" | "leaderboard";

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

  return (
    <div className="max-w-4xl mx-auto">
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
          <div>
            {posts.map((post, i) => (
              <PostCard key={post.id} post={post} rank={i + 1} />
            ))}
          </div>
          <div className="py-4 sm:py-6 text-center text-xs text-gray-400">
            Showing {posts.length} of {total} signals
          </div>
        </>
      )}
    </div>
  );
}
