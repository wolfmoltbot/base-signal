import { NextRequest, NextResponse } from "next/server";
import { upvotePost, MAX_UPVOTES_PER_DAY } from "@/lib/db";
import { authenticateAgent } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAgent(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized. Provide a valid API key via Authorization: Bearer <key>" }, { status: 401 });
  }

  const { id } = await params;
  const postId = parseInt(id);
  if (isNaN(postId)) {
    return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
  }

  try {
    const result = await upvotePost(postId, auth.agentId);
    return NextResponse.json({
      ...result,
      message: result.toggled === "added"
        ? `Upvoted. FREE - no tokens deducted. Rate limit: ${MAX_UPVOTES_PER_DAY}/day.`
        : `Upvote removed.`,
    });
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === "Post not found") {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }
      if (e.message.includes("Rate limit")) {
        return NextResponse.json({ error: e.message }, { status: 429 });
      }
      if (e.message.includes("Cannot upvote your own")) {
        return NextResponse.json({ error: e.message }, { status: 403 });
      }
    }
    throw e;
  }
}
