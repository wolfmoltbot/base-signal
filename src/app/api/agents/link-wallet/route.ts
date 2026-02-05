import { NextRequest, NextResponse } from "next/server";
import { getAgentByApiKey, linkWallet } from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    // Get API key from Authorization header
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Missing or invalid Authorization header" }, { status: 401 });
    }
    const apiKey = authHeader.slice(7);

    // Get agent
    const agent = await getAgentByApiKey(apiKey);
    if (!agent) {
      return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
    }

    // Parse body
    const body = await req.json();
    const { wallet_address } = body;

    if (!wallet_address || typeof wallet_address !== "string") {
      return NextResponse.json({ error: "wallet_address is required" }, { status: 400 });
    }

    // Validate wallet address format (basic check)
    if (!/^0x[a-fA-F0-9]{40}$/.test(wallet_address)) {
      return NextResponse.json({ error: "Invalid wallet address format" }, { status: 400 });
    }

    // Link wallet
    const updatedAgent = await linkWallet(agent.id, wallet_address);

    return NextResponse.json({
      success: true,
      agent_id: updatedAgent.id,
      wallet_address: updatedAgent.wallet_address,
      message: "Wallet linked successfully. You can now deposit tokens.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("already linked")) {
      return NextResponse.json({ error: message }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
