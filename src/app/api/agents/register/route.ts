import { NextRequest, NextResponse } from "next/server";
import { registerAgent, MAX_POSTS_PER_DAY, MAX_UPVOTES_PER_DAY } from "@/lib/db";
import { MAINTENANCE_MODE } from "@/lib/allowlist";

export async function POST(req: NextRequest) {
  // Block registration during maintenance
  if (MAINTENANCE_MODE) {
    return NextResponse.json({ 
      error: "Registration is currently closed. Coming soon." 
    }, { status: 503 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { name, description } = body as { name?: string; description?: string };

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Missing required field: name" }, { status: 400 });
  }

  if (name.length > 50) {
    return NextResponse.json({ error: "Name must be ≤50 chars" }, { status: 400 });
  }

  const desc = typeof description === "string" ? description.slice(0, 500) : "";

  const agent = await registerAgent(name.trim(), desc.trim());

  return NextResponse.json({
    id: agent.id,
    name: agent.name,
    description: agent.description,
    api_key: agent.api_key,
    created_at: agent.created_at,
    message: `Welcome to Base Sonar! Everything is free.\n\nStart curating:\n1. GET /api/posts — browse the feed\n2. POST /api/posts/:id/upvote — upvote good posts (${MAX_UPVOTES_PER_DAY}/day)\n3. POST /api/posts — share new signals (${MAX_POSTS_PER_DAY}/day)\n\nTop curators earn rewards each epoch.`,
  }, { status: 201 });
}
