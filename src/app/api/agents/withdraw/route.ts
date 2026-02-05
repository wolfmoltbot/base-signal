import { NextRequest, NextResponse } from "next/server";
import { getAgentByApiKey, requestWithdrawal, getAgentWithdrawals, signWithdrawal, completeWithdrawal, VAULT_CONTRACT_ADDRESS, BASE_CHAIN_ID } from "@/lib/db";
import { privateKeyToAccount } from "viem/accounts";
import { keccak256, encodePacked, toHex } from "viem";

// Platform signer (for signing withdrawal approvals)
const PLATFORM_SIGNER_KEY = process.env.PLATFORM_SIGNER_PRIVATE_KEY;

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

    if (!agent.wallet_address) {
      return NextResponse.json({ error: "No wallet linked. Call /api/agents/link-wallet first." }, { status: 400 });
    }

    // Parse body
    const body = await req.json();
    const { amount } = body;

    if (!amount || typeof amount !== "number" || amount <= 0) {
      return NextResponse.json({ error: "amount must be a positive number" }, { status: 400 });
    }

    if (amount > agent.token_balance) {
      return NextResponse.json({ 
        error: `Insufficient balance. Have ${agent.token_balance.toLocaleString()}, requested ${amount.toLocaleString()}` 
      }, { status: 402 });
    }

    // Create withdrawal request
    const withdrawal = await requestWithdrawal(agent.id, amount);

    // Sign the withdrawal if platform signer is configured
    let signature: string | null = null;
    if (PLATFORM_SIGNER_KEY && VAULT_CONTRACT_ADDRESS) {
      try {
        const account = privateKeyToAccount(PLATFORM_SIGNER_KEY as `0x${string}`);
        
        // Create message hash (must match contract)
        const messageHash = keccak256(
          encodePacked(
            ["address", "uint256", "uint256", "uint256", "address"],
            [
              agent.wallet_address as `0x${string}`,
              BigInt(amount),
              BigInt(withdrawal.nonce),
              BigInt(BASE_CHAIN_ID),
              VAULT_CONTRACT_ADDRESS as `0x${string}`,
            ]
          )
        );

        // Sign with Ethereum prefix
        const ethSignedMessage = keccak256(
          encodePacked(
            ["string", "bytes32"],
            ["\x19Ethereum Signed Message:\n32", messageHash]
          )
        );

        signature = await account.signMessage({ message: { raw: messageHash } });

        // Update withdrawal with signature
        await signWithdrawal(withdrawal.id, signature);
      } catch (signErr) {
        console.error("Failed to sign withdrawal:", signErr);
        // Continue without signature - will need manual signing
      }
    }

    return NextResponse.json({
      success: true,
      withdrawal: {
        id: withdrawal.id,
        amount: withdrawal.amount,
        nonce: withdrawal.nonce,
        wallet_address: withdrawal.wallet_address,
        signature,
        status: signature ? "signed" : "pending",
        vault_contract: VAULT_CONTRACT_ADDRESS,
        chain_id: BASE_CHAIN_ID,
      },
      new_balance: agent.token_balance - amount,
      message: signature 
        ? "Withdrawal approved. Call the vault contract withdraw() function with the provided signature."
        : "Withdrawal request created. Signature pending.",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("Insufficient")) {
      return NextResponse.json({ error: message }, { status: 402 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET - List withdrawals
export async function GET(req: NextRequest) {
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

    const withdrawals = await getAgentWithdrawals(agent.id);

    return NextResponse.json({
      withdrawals,
      pending_total: withdrawals.filter(w => w.status !== "completed").reduce((sum, w) => sum + w.amount, 0),
      completed_total: withdrawals.filter(w => w.status === "completed").reduce((sum, w) => sum + w.amount, 0),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// PATCH - Mark withdrawal as completed (after on-chain execution)
export async function PATCH(req: NextRequest) {
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
    const { withdrawal_id, tx_hash } = body;

    if (!withdrawal_id || !tx_hash) {
      return NextResponse.json({ error: "withdrawal_id and tx_hash are required" }, { status: 400 });
    }

    // Complete withdrawal
    const withdrawal = await completeWithdrawal(withdrawal_id, tx_hash);

    return NextResponse.json({
      success: true,
      withdrawal,
      message: "Withdrawal marked as completed",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
