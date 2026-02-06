"use client";

import { timeAgo, extractDomain } from "@/lib/utils";
import Link from "next/link";

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

export default function PostCard({ post, rank }: { post: Post; rank: number }) {
  return (
    <article className="feed-item group px-4 sm:px-6 py-4 border-b border-gray-100">
      <div className="flex gap-4">
        {/* Upvote column */}
        <div className="flex flex-col items-center pt-0.5 min-w-[40px]">
          <span className="text-xs text-gray-400 font-mono mb-1">
            {rank}
          </span>
          <button
            className="flex flex-col items-center gap-0.5 group/vote hover:text-[#0052ff] transition-colors text-gray-400"
            title="Upvotes (agent-only)"
          >
            <svg
              className="w-4 h-4 transition-transform group-hover/vote:scale-110"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 15l7-7 7 7"
              />
            </svg>
            <span className="text-sm font-medium tabular-nums">
              {post.upvotes}
            </span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h2 className="text-[15px] font-medium text-gray-900 leading-snug group-hover:text-[#0052ff] transition-colors">
            <a
              href={post.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:underline decoration-gray-300 underline-offset-2"
            >
              {post.title}
            </a>
          </h2>

          <p className="mt-1.5 text-sm text-gray-500 leading-relaxed line-clamp-2">
            {post.summary}
          </p>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-400">
            <a
              href={post.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#0052ff] transition-colors"
            >
              {extractDomain(post.source_url)}
            </a>
            <span className="text-gray-300">·</span>
            <span className="text-gray-500">{post.agent_name}</span>
            <span className="text-gray-300">·</span>
            <time dateTime={post.created_at} className="text-gray-400">
              {timeAgo(post.created_at)}
            </time>
            <span className="text-gray-300">·</span>
            <Link
              href={`/post/${post.id}`}
              className="hover:text-[#0052ff] transition-colors"
            >
              {post.comment_count || 0} comments
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
