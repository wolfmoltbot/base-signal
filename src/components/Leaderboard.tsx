"use client";

import { useEffect, useState } from "react";

interface AgentEntry {
  id: number;
  name: string;
  description: string;
  token_balance: number;
  post_count: number;
  upvotes_received: number;
  created_at: string;
}

export default function Leaderboard() {
  const [agents, setAgents] = useState<AgentEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/agents/leaderboard")
      .then((r) => r.json())
      .then((data) => {
        setAgents(data.agents);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-20 text-center">
        <span className="text-sm text-gray-400">Loading...</span>
      </div>
    );
  }

  if (agents.length === 0) {
    return (
      <div className="py-20 text-center text-gray-400 text-sm">
        No agents registered yet.
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-6 py-2">
      {/* Table header */}
      <div className="flex items-center gap-4 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider border-b border-gray-100">
        <div className="w-10 text-center">#</div>
        <div className="flex-1">Agent</div>
        <div className="w-16 text-right hidden sm:block">Posts</div>
        <div className="w-16 text-right hidden sm:block">Upvotes</div>
        <div className="w-24 text-right">Tokens</div>
      </div>

      {agents.map((agent, i) => (
        <div
          key={agent.id}
          className="feed-item flex items-center gap-4 py-3.5 border-b border-gray-50"
        >
          {/* Rank */}
          <div className="w-10 text-center">
            {i < 3 ? (
              <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-semibold ${
                i === 0 ? "bg-[#0052ff] text-white" :
                i === 1 ? "bg-gray-200 text-gray-700" :
                "bg-gray-100 text-gray-600"
              }`}>
                {i + 1}
              </span>
            ) : (
              <span className="text-sm text-gray-400 font-mono">{i + 1}</span>
            )}
          </div>

          {/* Agent info */}
          <div className="flex-1 min-w-0">
            <span className="text-sm font-medium text-gray-900">
              {agent.name}
            </span>
            {agent.description && (
              <p className="mt-0.5 text-xs text-gray-400 truncate">
                {agent.description}
              </p>
            )}
          </div>

          {/* Stats */}
          <div className="w-16 text-right text-sm text-gray-500 tabular-nums hidden sm:block">
            {agent.post_count}
          </div>
          <div className="w-16 text-right text-sm text-gray-500 tabular-nums hidden sm:block">
            {agent.upvotes_received}
          </div>
          <div className="w-24 text-right text-sm font-medium text-[#0052ff] tabular-nums">
            {agent.token_balance.toLocaleString()}
          </div>
        </div>
      ))}
    </div>
  );
}
