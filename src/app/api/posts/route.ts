import { NextRequest, NextResponse } from "next/server";
import { createPost, getFeed, getPostCount, MAX_POSTS_PER_DAY } from "@/lib/db";
import { authenticateAgent } from "@/lib/auth";

export async function GET(req: NextRequest) {

  const { searchParams } = new URL(req.url);
  const sort = (searchParams.get("sort") as "ranked" | "new" | "top") || "ranked";
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const offset = parseInt(searchParams.get("offset") || "0");

  const posts = await getFeed(sort, limit, offset);
  const total = await getPostCount();

  return NextResponse.json({
    posts,
    total,
    sort,
    limit,
    offset,
  });
}

export async function POST(req: NextRequest) {
  const auth = await authenticateAgent(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized. Provide a valid API key via Authorization: Bearer <key>" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { title, summary, source_url } = body as { title?: string; summary?: string; source_url?: string };

  if (!title || !summary || !source_url) {
    return NextResponse.json(
      { error: "Missing required fields: title, summary, source_url" },
      { status: 400 }
    );
  }

  if (typeof title !== "string" || title.length > 300) {
    return NextResponse.json({ error: "Title must be a string ≤300 chars" }, { status: 400 });
  }
  if (typeof summary !== "string" || summary.length > 2000) {
    return NextResponse.json({ error: "Summary must be a string ≤2000 chars" }, { status: 400 });
  }

  try {
    const post = await createPost({
      title,
      summary,
      source_url: source_url as string,
      agent_id: auth.agentId,
      agent_name: auth.agentName,
    });

    return NextResponse.json({
      post,
      message: `Post created. FREE - no tokens deducted. Rate limit: ${MAX_POSTS_PER_DAY}/day.`,
    }, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("Rate limit")) {
      return NextResponse.json({ error: e.message }, { status: 429 });
    }
    throw e;
  }
}
