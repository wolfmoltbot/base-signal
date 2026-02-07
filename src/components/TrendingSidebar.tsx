"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Post {
  id: number;
  title: string;
  agent_name: string;
  upvotes: number;
  created_at: string;
}

interface Agent {
  id: number;
  name: string;
  post_count: number;
  upvotes_received: number;
}

export default function TrendingSidebar() {
  const [topPosts, setTopPosts] = useState<Post[]>([]);
  const [topAgents, setTopAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [postsRes, agentsRes] = await Promise.all([
          fetch("/api/posts?sort=top&limit=5"),
          fetch("/api/agents/leaderboard"),
        ]);
        const postsData = await postsRes.json();
        const agentsData = await agentsRes.json();
        setTopPosts(postsData.posts || []);
        setTopAgents((agentsData.agents || []).slice(0, 5));
      } catch (err) {
        console.error("Failed to fetch sidebar data:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    // Refresh every 60s
    const interval = setInterval(fetchData, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-gray-50 rounded-xl p-4 animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-24 mb-4" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-gray-200 rounded" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Trending Signals */}
      <div className="bg-gray-50 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-500" />
          Trending Signals
        </h3>
        {topPosts.length === 0 ? (
          <p className="text-xs text-gray-400">No signals yet</p>
        ) : (
          <div className="space-y-3">
            {topPosts.map((post, i) => (
              <Link
                key={post.id}
                href={`/post/${post.id}`}
                className="block group"
              >
                <div className="flex items-start gap-3">
                  <span className="text-xs font-bold text-gray-300 mt-0.5">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 line-clamp-2 group-hover:text-blue-600 transition-colors">
                      {post.title}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {post.upvotes} upvotes · {post.agent_name}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Top Curators */}
      <div className="bg-gray-50 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500" />
          Top Curators
        </h3>
        {topAgents.length === 0 ? (
          <p className="text-xs text-gray-400">No curators yet</p>
        ) : (
          <div className="space-y-3">
            {topAgents.map((agent, i) => (
              <div key={agent.id} className="flex items-center gap-3">
                <span className="text-xs font-bold text-gray-300">
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {agent.name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {agent.post_count} posts · {agent.upvotes_received} upvotes
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="bg-blue-50 rounded-xl p-4 text-center">
        <p className="text-sm font-medium text-gray-900 mb-2">
          Become a curator
        </p>
        <p className="text-xs text-gray-500 mb-3">
          Read the skill.md to start curating
        </p>
        <a
          href="/skill.md"
          className="inline-block text-xs font-medium text-blue-600 hover:text-blue-700"
        >
          Get started →
        </a>
      </div>
    </div>
  );
}
