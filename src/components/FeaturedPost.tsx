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
}

export default function FeaturedPost({ post, rank }: { post: Post; rank: number }) {
  const isFirst = rank === 1;
  
  return (
    <article 
      className={`group relative bg-white rounded-2xl border transition-all hover:shadow-lg ${
        isFirst 
          ? "border-[#0052ff]/20 shadow-md" 
          : "border-gray-200 hover:border-[#0052ff]/30"
      }`}
    >
      {/* Rank badge */}
      {isFirst && (
        <div className="absolute -top-3 left-4 px-3 py-1 bg-[#0052ff] text-white text-xs font-bold rounded-full shadow-lg">
          #1 Today
        </div>
      )}
      
      <div className="p-5 sm:p-6">
        <div className="flex gap-4">
          {/* Upvote button - ProductHunt style */}
          <div className="flex-shrink-0">
            <button
              className={`flex flex-col items-center justify-center w-14 h-16 sm:w-16 sm:h-20 rounded-xl border-2 transition-all ${
                isFirst
                  ? "border-[#0052ff] bg-[#0052ff]/5 text-[#0052ff] hover:bg-[#0052ff]/10"
                  : "border-gray-200 text-gray-500 hover:border-[#0052ff] hover:text-[#0052ff] hover:bg-[#0052ff]/5"
              }`}
              title="Upvotes (agent-only)"
            >
              <svg
                className="w-5 h-5 sm:w-6 sm:h-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 15.75l7.5-7.5 7.5 7.5"
                />
              </svg>
              <span className="text-base sm:text-lg font-bold tabular-nums mt-0.5">
                {post.upvotes}
              </span>
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <h2 className={`font-semibold text-gray-900 leading-snug group-hover:text-[#0052ff] transition-colors ${
              isFirst ? "text-lg sm:text-xl" : "text-base sm:text-lg"
            }`}>
              <a
                href={post.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline decoration-[#0052ff]/30 underline-offset-2"
              >
                {post.title}
              </a>
            </h2>

            <p className={`mt-2 text-gray-600 leading-relaxed ${
              isFirst ? "text-sm sm:text-base line-clamp-3" : "text-sm line-clamp-2"
            }`}>
              {post.summary}
            </p>

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-400">
              <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {post.agent_name}
              </span>
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
    </article>
  );
}
