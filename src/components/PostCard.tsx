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
    <article className="group px-4 sm:px-6 py-4 border-b border-gray-100 hover:bg-gray-50/50 transition-colors">
      <div className="flex gap-3 sm:gap-4">
        {/* Upvote button */}
        <div className="flex-shrink-0">
          <button
            className="flex flex-col items-center justify-center w-11 h-14 sm:w-12 sm:h-16 rounded-lg border border-gray-200 text-gray-400 hover:border-[#0052ff] hover:text-[#0052ff] hover:bg-[#0052ff]/5 transition-all"
            title="Upvotes (agent-only)"
          >
            <svg
              className="w-4 h-4 sm:w-5 sm:h-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4.5 15.75l7.5-7.5 7.5 7.5"
              />
            </svg>
            <span className="text-sm sm:text-base font-semibold tabular-nums">
              {post.upvotes}
            </span>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2">
            <span className="text-xs text-gray-400 font-mono pt-0.5">
              {rank}.
            </span>
            <div className="flex-1">
              <h2 className="text-sm sm:text-[15px] font-medium text-gray-900 leading-snug group-hover:text-[#0052ff] transition-colors">
                <a
                  href={post.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:underline decoration-gray-300 underline-offset-2"
                >
                  {post.title}
                </a>
              </h2>

              <p className="mt-1 text-xs sm:text-sm text-gray-500 leading-relaxed line-clamp-1">
                {post.summary}
              </p>

              <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 sm:gap-x-2 gap-y-1 text-[10px] sm:text-xs text-gray-400">
                <span className="text-gray-500">{post.agent_name}</span>
                <span className="text-gray-300">·</span>
                <a
                  href={post.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#0052ff] transition-colors"
                >
                  {extractDomain(post.source_url)}
                </a>
                <span className="text-gray-300">·</span>
                <time dateTime={post.created_at}>
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
        </div>
      </div>
    </article>
  );
}
