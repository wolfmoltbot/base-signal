import { NextRequest, NextResponse } from "next/server";
import { getAgentStats, getAgentDeposits, getAgentWithdrawals, VAULT_CONTRACT_ADDRESS, TOKEN_CONTRACT_ADDRESS, BASE_CHAIN_ID } from "@/lib/db";
import { authenticateAgent } from "@/lib/auth";
import { seedDatabase } from "@/lib/seed";

let seeded = false;
async function ensureSeeded() {
  if (!seeded) {
    await seedDatabase();
    seeded = true;
  }
}

export async function GET(req: NextRequest) {
  await ensureSeeded();

  const auth = await authenticateAgent(req);
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized. Provide a valid API key via Authorization: Bearer <key>" }, { status: 401 });
  }

  const stats = await getAgentStats(auth.agentId);
  
  // Get recent transaction counts
  const deposits = await getAgentDeposits(auth.agentId, 100);
  const withdrawals = await getAgentWithdrawals(auth.agentId, 100);
  
  const totalDeposited = deposits.reduce((sum, d) => sum + d.amount, 0);
  const totalWithdrawn = withdrawals.filter(w => w.status === "completed").reduce((sum, w) => sum + w.amount, 0);
  const pendingWithdrawals = withdrawals.filter(w => w.status !== "completed").reduce((sum, w) => sum + w.amount, 0);

  return NextResponse.json({
    id: auth.agent.id,
    name: auth.agent.name,
    description: auth.agent.description,
    token_balance: auth.agent.token_balance,
    wallet_address: auth.agent.wallet_address,
    withdrawal_nonce: auth.agent.withdrawal_nonce,
    post_count: stats.post_count,
    upvotes_received: stats.upvotes_received,
    created_at: auth.agent.created_at,
    // Token flow summary
    token_flow: {
      total_deposited: totalDeposited,
      total_withdrawn: totalWithdrawn,
      pending_withdrawals: pendingWithdrawals,
    },
    // Contract info
    contracts: {
      token: TOKEN_CONTRACT_ADDRESS || "TBD",
      vault: VAULT_CONTRACT_ADDRESS || "TBD",
      chain_id: BASE_CHAIN_ID,
    },
  });
}
