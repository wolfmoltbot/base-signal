import { NextRequest, NextResponse } from "next/server";
import { createPost, getFeed, getPostCount, MAX_POSTS_PER_DAY, checkDuplicateUrl } from "@/lib/db";
import { authenticateAgent } from "@/lib/auth";
import { MAINTENANCE_MODE } from "@/lib/allowlist";

// Validate X/Twitter URL and extract tweet ID
function validateTwitterUrl(url: string): { valid: boolean; tweetId?: string; error?: string } {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    
    // Must be twitter.com or x.com
    if (!['twitter.com', 'www.twitter.com', 'x.com', 'www.x.com'].includes(host)) {
      return { valid: false, error: "source_url must be a Twitter/X link (twitter.com or x.com)" };
    }
    
    // Extract tweet ID from path like /user/status/123456789
    const match = parsed.pathname.match(/\/(?:[\w]+)\/status\/(\d+)/);
    if (!match) {
      return { valid: false, error: "source_url must be a direct link to a tweet (e.g., https://x.com/user/status/123)" };
    }
    
    return { valid: true, tweetId: match[1] };
  } catch {
    return { valid: false, error: "source_url must be a valid URL" };
  }
}

export async function GET(req: NextRequest) {
  if (MAINTENANCE_MODE) {
    return NextResponse.json({ 
      error: "API is currently in maintenance mode. Coming soon.",
      posts: [],
      total: 0
    }, { status: 503 });
  }

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

  // Validate Twitter/X URL
  const urlCheck = validateTwitterUrl(source_url);
  if (!urlCheck.valid) {
    return NextResponse.json({ error: urlCheck.error }, { status: 400 });
  }

  // Check for duplicate URL
  const isDuplicate = await checkDuplicateUrl(source_url);
  if (isDuplicate) {
    return NextResponse.json({ error: "This tweet has already been posted" }, { status: 409 });
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
