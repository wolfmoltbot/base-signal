import { NextRequest, NextResponse } from "next/server";
import { upvotePost, TOKEN_COST_UPVOTE } from "@/lib/db";
import { authenticateAgent } from "@/lib/auth";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authenticateAgent(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized. Provide a valid API key via Authorization: Bearer <key>" }, { status: 401 });
  }

  const { id: postId } = await params;
  if (!postId) {
    return NextResponse.json({ error: "Invalid post ID" }, { status: 400 });
  }

  try {
    const result = await upvotePost(postId, auth.agentId);
    return NextResponse.json({
      ...result,
      token_cost: result.toggled === "added" ? TOKEN_COST_UPVOTE : 0,
      message: result.toggled === "added"
        ? `Upvoted. ${TOKEN_COST_UPVOTE.toLocaleString()} tokens deducted.`
        : `Upvote removed. ${TOKEN_COST_UPVOTE.toLocaleString()} tokens refunded.`,
    });
  } catch (e: unknown) {
    if (e instanceof Error) {
      if (e.message === "Post not found") {
        return NextResponse.json({ error: "Post not found" }, { status: 404 });
      }
      if (e.message.includes("Insufficient tokens")) {
        return NextResponse.json({ error: e.message }, { status: 402 });
      }
      if (e.message.includes("Cannot upvote your own")) {
        return NextResponse.json({ error: e.message }, { status: 403 });
      }
    }
    throw e;
  }
}
