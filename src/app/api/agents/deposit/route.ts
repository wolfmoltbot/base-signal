import { NextRequest, NextResponse } from "next/server";
import { getAgentByApiKey, recordDeposit, getAgentDeposits, VAULT_CONTRACT_ADDRESS, TOKEN_CONTRACT_ADDRESS, BASE_CHAIN_ID } from "@/lib/db";
import { createPublicClient, http, parseAbiItem } from "viem";
import { base } from "viem/chains";

// Viem client for Base
const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL || "https://mainnet.base.org"),
});

// Deposit event signature
const DEPOSIT_EVENT = parseAbiItem("event Deposited(address indexed user, uint256 amount, uint256 timestamp)");

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
    const { tx_hash } = body;

    if (!tx_hash || typeof tx_hash !== "string") {
      return NextResponse.json({ error: "tx_hash is required" }, { status: 400 });
    }

    // Validate tx hash format
    if (!/^0x[a-fA-F0-9]{64}$/.test(tx_hash)) {
      return NextResponse.json({ error: "Invalid transaction hash format" }, { status: 400 });
    }

    // Skip on-chain verification if vault not deployed yet (dev mode)
    if (!VAULT_CONTRACT_ADDRESS) {
      return NextResponse.json({ 
        error: "Vault contract not deployed yet. Set VAULT_CONTRACT_ADDRESS in environment." 
      }, { status: 503 });
    }

    // Get transaction receipt
    const receipt = await publicClient.getTransactionReceipt({ hash: tx_hash as `0x${string}` });
    
    if (!receipt) {
      return NextResponse.json({ error: "Transaction not found or not confirmed" }, { status: 404 });
    }

    if (receipt.status !== "success") {
      return NextResponse.json({ error: "Transaction failed" }, { status: 400 });
    }

    // Find Deposited event in logs
    const depositLog = receipt.logs.find(
      (log) =>
        log.address.toLowerCase() === VAULT_CONTRACT_ADDRESS.toLowerCase() &&
        log.topics[0] === "0x2d87480f50083e2b2759522a8fdda59802650a8055e609a7772cf70c07748f52" // keccak256("Deposited(address,uint256,uint256)")
    );

    if (!depositLog) {
      return NextResponse.json({ error: "No deposit event found in transaction" }, { status: 400 });
    }

    // Decode event data
    const userAddress = `0x${depositLog.topics[1]?.slice(26)}`.toLowerCase();
    const amount = BigInt(depositLog.data.slice(0, 66));

    // Verify the deposit is from the agent's wallet
    if (userAddress !== agent.wallet_address.toLowerCase()) {
      return NextResponse.json({ error: "Deposit is not from your linked wallet" }, { status: 403 });
    }

    // Record deposit
    const deposit = await recordDeposit(
      agent.id,
      userAddress,
      Number(amount),
      tx_hash,
      Number(receipt.blockNumber)
    );

    return NextResponse.json({
      success: true,
      deposit: {
        id: deposit.id,
        amount: Number(amount),
        tx_hash: deposit.tx_hash,
        status: deposit.status,
      },
      new_balance: deposit.amount, // Will be updated by recordDeposit
      message: `Successfully deposited ${Number(amount).toLocaleString()} tokens`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("already recorded")) {
      return NextResponse.json({ error: "Deposit already processed" }, { status: 409 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET - List deposits
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

    const deposits = await getAgentDeposits(agent.id);

    return NextResponse.json({
      deposits,
      total: deposits.reduce((sum, d) => sum + d.amount, 0),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
