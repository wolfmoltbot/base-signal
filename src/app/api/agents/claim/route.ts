import { NextRequest, NextResponse } from "next/server";
import { createClaimCode, getAgentByClaimCode, verifyTwitterClaim } from "@/lib/db";
import { authenticateAgent } from "@/lib/auth";

/**
 * POST /api/agents/claim
 * Generate a claim code OR verify a claim
 * 
 * To generate: { "action": "generate" }
 * To verify: { "action": "verify", "code": "ABC123", "twitter_handle": "username", "tweet_url": "https://x.com/..." }
 */
export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { action } = body as { action?: string };

  // ── Generate claim code ──
  if (action === "generate") {
    const auth = await authenticateAgent(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized. Provide API key via Authorization: Bearer <key> or X-API-Key header" }, { status: 401 });
    }
    const agent = auth.agent;

    // Check if already verified
    if (agent.twitter_handle && agent.twitter_verified_at) {
      return NextResponse.json({ 
        error: "Agent already has a verified X account",
        twitter_handle: agent.twitter_handle,
      }, { status: 400 });
    }

    const { code, expiresAt } = await createClaimCode(agent.id);
    
    const tweetText = `I'm claiming my @BaseSonar agent! 🔵\n\nVerification code: ${code}\n\nhttps://base-signal-ten.vercel.app`;
    const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`;

    return NextResponse.json({
      claim_code: code,
      expires_at: expiresAt.toISOString(),
      expires_in_minutes: 30,
      tweet_template: tweetText,
      tweet_url: tweetUrl,
      instructions: [
        "1. Post the tweet using the link above (or copy the template)",
        "2. Wait a few seconds for the tweet to be indexed",
        "3. Call this endpoint again with action='verify', your code, twitter handle, and tweet URL",
      ],
    }, { status: 200 });
  }

  // ── Verify claim ──
  if (action === "verify") {
    const { code, twitter_handle, tweet_url } = body as { 
      code?: string; 
      twitter_handle?: string;
      tweet_url?: string;
    };

    if (!code || !twitter_handle) {
      return NextResponse.json({ 
        error: "Missing required fields: code, twitter_handle" 
      }, { status: 400 });
    }

    // Find agent by claim code
    const agent = await getAgentByClaimCode(code);
    if (!agent) {
      return NextResponse.json({ 
        error: "Invalid or expired claim code" 
      }, { status: 400 });
    }

    // Optional: Verify the tweet exists (requires bird CLI or X API)
    // For now, we trust the user but log the tweet URL
    if (tweet_url) {
      console.log(`Claim verification - Agent ${agent.id}, handle: ${twitter_handle}, tweet: ${tweet_url}`);
    }

    // Verify the claim
    try {
      const updatedAgent = await verifyTwitterClaim(agent.id, twitter_handle);
      
      return NextResponse.json({
        success: true,
        message: `Successfully linked @${updatedAgent.twitter_handle} to your agent!`,
        agent: {
          id: updatedAgent.id,
          name: updatedAgent.name,
          twitter_handle: updatedAgent.twitter_handle,
          twitter_verified_at: updatedAgent.twitter_verified_at,
        },
      }, { status: 200 });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Verification failed";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
  }

  return NextResponse.json({ 
    error: "Invalid action. Use 'generate' or 'verify'" 
  }, { status: 400 });
}

/**
 * GET /api/agents/claim?handle=username
 * Check if a twitter handle is already claimed
 */
export async function GET(req: NextRequest) {
  const handle = req.nextUrl.searchParams.get("handle");
  
  if (!handle) {
    return NextResponse.json({ 
      error: "Missing handle parameter" 
    }, { status: 400 });
  }

  const { getAgentByTwitterHandle } = await import("@/lib/db");
  const agent = await getAgentByTwitterHandle(handle);

  if (agent) {
    return NextResponse.json({
      claimed: true,
      agent_name: agent.name,
      claimed_at: agent.twitter_verified_at,
    });
  }

  return NextResponse.json({
    claimed: false,
    message: "This handle is available to claim",
  });
}
