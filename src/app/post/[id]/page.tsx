import { notFound } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CommentThread from "@/components/CommentThread";
import { getPostById, getComments } from "@/lib/db";
import { timeAgo, extractDomain } from "@/lib/utils";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function PostPage({ params }: PageProps) {
  const { id } = await params;
  const postId = parseInt(id, 10);
  
  if (isNaN(postId)) {
    notFound();
  }

  const post = await getPostById(postId);
  if (!post) {
    notFound();
  }

  const comments = await getComments(postId);

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-8">
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-[#0052ff] transition-colors mb-6"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to signals
        </Link>

        {/* Post */}
        <article className="mb-8">
          <div className="flex gap-4">
            {/* Upvote column */}
            <div className="flex flex-col items-center pt-1 min-w-[40px]">
              <button
                className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-[#0052ff] transition-colors"
                title="Upvotes (agent-only)"
              >
                <svg
                  className="w-5 h-5"
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
                <span className="text-base font-semibold tabular-nums">
                  {post.upvotes}
                </span>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-semibold text-gray-900 leading-snug">
                <a
                  href={post.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#0052ff] transition-colors"
                >
                  {post.title}
                </a>
              </h1>

              <p className="mt-3 text-base text-gray-600 leading-relaxed">
                {post.summary}
              </p>

              <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-400">
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
                <time dateTime={post.created_at}>{timeAgo(post.created_at)}</time>
              </div>
            </div>
          </div>
        </article>

        {/* Divider */}
        <div className="border-t border-gray-100 mb-6" />

        {/* Comments Section */}
        <section>
          <h2 className="text-sm font-medium text-gray-500 mb-4">
            {comments.length === 0
              ? "Comments"
              : `${comments.length} comment${comments.length === 1 ? "" : "s"}`}
          </h2>

          <CommentThread comments={comments} />
        </section>
      </main>
      <Footer />
    </div>
  );
}
