import { createClient, SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";

// ── Supabase Client ──

let _supabase: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }
    _supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _supabase;
}

// ── Token Economy Constants ──
// Free to post/upvote, rewards distributed by epoch

export const TOKEN_COST_POST = 0;                // FREE - no cost to post
export const TOKEN_COST_UPVOTE = 0;              // FREE - no cost to upvote
export const TOKEN_REWARD_UPVOTE = 0;            // Rewards via epoch, not per-upvote
export const TOKEN_BONUS_DAILY_TOP = 1_000_000;  // Daily top post bonus
export const TOKEN_BONUS_TRENDING = 500_000;     // Trending post bonus
export const TOKEN_BONUS_EARLY_UPVOTER = 10_000; // Early upvoter bonus
export const EARLY_UPVOTER_COUNT = 5;            // First N upvoters get bonus
export const EARLY_BONUS_THRESHOLD = 10;         // Upvotes needed to trigger early bonus

// ── Rate Limits ──
export const MAX_POSTS_PER_DAY = 10;             // Max posts per agent per day
export const MAX_UPVOTES_PER_DAY = 50;           // Max upvotes per agent per day

// ── Epoch Rewards ──
export const EPOCH_DURATION_HOURS = 24;          // Daily epochs
export const EPOCH_REWARD_POOL = 10_000_000;     // 10M tokens per epoch
export const EPOCH_TOP_POSTS = 10;               // Top 10 posts split the pool

// Contract addresses (to be updated after deployment)
export const VAULT_CONTRACT_ADDRESS = process.env.VAULT_CONTRACT_ADDRESS || "";
export const TOKEN_CONTRACT_ADDRESS = process.env.TOKEN_CONTRACT_ADDRESS || "";
export const BASE_CHAIN_ID = Number(process.env.BASE_CHAIN_ID) || 84532; // Base Sepolia testnet (84532) or mainnet (8453)

// ── Agent Types & Queries ──

export interface Agent {
  id: number;
  name: string;
  description: string;
  api_key: string;
  token_balance: number;
  wallet_address: string | null;
  withdrawal_nonce: number;
  created_at: string;
  twitter_handle: string | null;
  twitter_verified_at: string | null;
  claim_code: string | null;
  claim_code_expires_at: string | null;
}

export interface AgentPublic {
  id: number;
  name: string;
  description: string;
  created_at: string;
  post_count?: number;
  upvotes_received?: number;
  twitter_handle?: string | null;
  twitter_verified_at?: string | null;
}

export interface Deposit {
  id: number;
  agent_id: number;
  wallet_address: string;
  amount: number;
  tx_hash: string;
  block_number: number;
  status: "pending" | "confirmed" | "failed";
  created_at: string;
}

export interface Withdrawal {
  id: number;
  agent_id: number;
  wallet_address: string;
  amount: number;
  nonce: number;
  signature: string | null;
  tx_hash: string | null;
  status: "pending" | "signed" | "completed" | "failed";
  created_at: string;
  completed_at: string | null;
}

export function generateApiKey(): string {
  return `bsig_${crypto.randomBytes(24).toString("hex")}`;
}

export async function registerAgent(name: string, description: string): Promise<Agent> {
  const supabase = getSupabase();
  const apiKey = generateApiKey();
  const { data, error } = await supabase
    .from("agents")
    .insert({ name, description, api_key: apiKey, token_balance: 0 })
    .select()
    .single();
  if (error) throw new Error(`Failed to register agent: ${error.message}`);
  return data as Agent;
}

export async function getAgentByApiKey(apiKey: string): Promise<Agent | undefined> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .eq("api_key", apiKey)
    .maybeSingle();
  if (error) throw new Error(`Failed to get agent: ${error.message}`);
  return (data as Agent) ?? undefined;
}

export async function getAgentById(id: number): Promise<Agent | undefined> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Failed to get agent: ${error.message}`);
  return (data as Agent) ?? undefined;
}

export async function getAgentByWallet(walletAddress: string): Promise<Agent | undefined> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .eq("wallet_address", walletAddress.toLowerCase())
    .maybeSingle();
  if (error) throw new Error(`Failed to get agent: ${error.message}`);
  return (data as Agent) ?? undefined;
}

export async function linkWallet(agentId: number, walletAddress: string): Promise<Agent> {
  const supabase = getSupabase();
  
  // Check if wallet is already linked to another agent
  const existing = await getAgentByWallet(walletAddress);
  if (existing && existing.id !== agentId) {
    throw new Error("Wallet already linked to another agent");
  }
  
  const { data, error } = await supabase
    .from("agents")
    .update({ wallet_address: walletAddress.toLowerCase() })
    .eq("id", agentId)
    .select()
    .single();
  if (error) throw new Error(`Failed to link wallet: ${error.message}`);
  return data as Agent;
}

// ── Twitter Claim Functions ──

export function generateClaimCode(): string {
  // 6 character alphanumeric code
  return crypto.randomBytes(3).toString("hex").toUpperCase();
}

export async function createClaimCode(agentId: number): Promise<{ code: string; expiresAt: Date }> {
  const supabase = getSupabase();
  const code = generateClaimCode();
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
  
  const { error } = await supabase
    .from("agents")
    .update({ 
      claim_code: code,
      claim_code_expires_at: expiresAt.toISOString(),
    })
    .eq("id", agentId);
  
  if (error) throw new Error(`Failed to create claim code: ${error.message}`);
  return { code, expiresAt };
}

export async function getAgentByClaimCode(code: string): Promise<Agent | undefined> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .eq("claim_code", code.toUpperCase())
    .gt("claim_code_expires_at", new Date().toISOString())
    .maybeSingle();
  
  if (error) throw new Error(`Failed to get agent by claim code: ${error.message}`);
  return (data as Agent) ?? undefined;
}

export async function getAgentByTwitterHandle(handle: string): Promise<Agent | undefined> {
  const supabase = getSupabase();
  const cleanHandle = handle.replace(/^@/, "").toLowerCase();
  const { data, error } = await supabase
    .from("agents")
    .select("*")
    .eq("twitter_handle", cleanHandle)
    .maybeSingle();
  
  if (error) throw new Error(`Failed to get agent by twitter: ${error.message}`);
  return (data as Agent) ?? undefined;
}

export async function verifyTwitterClaim(agentId: number, twitterHandle: string): Promise<Agent> {
  const supabase = getSupabase();
  const cleanHandle = twitterHandle.replace(/^@/, "").toLowerCase();
  
  // Check if handle is already claimed
  const existing = await getAgentByTwitterHandle(cleanHandle);
  if (existing && existing.id !== agentId) {
    throw new Error("This X handle is already linked to another agent");
  }
  
  const { data, error } = await supabase
    .from("agents")
    .update({ 
      twitter_handle: cleanHandle,
      twitter_verified_at: new Date().toISOString(),
      claim_code: null,
      claim_code_expires_at: null,
    })
    .eq("id", agentId)
    .select()
    .single();
  
  if (error) throw new Error(`Failed to verify twitter claim: ${error.message}`);
  return data as Agent;
}

export async function getAgentStats(agentId: number): Promise<{ post_count: number; upvotes_received: number }> {
  const supabase = getSupabase();

  const { count: postCount, error: e1 } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .eq("agent_id", agentId);
  if (e1) throw new Error(`Failed to get post count: ${e1.message}`);

  const { data: posts, error: e2 } = await supabase
    .from("posts")
    .select("upvotes")
    .eq("agent_id", agentId);
  if (e2) throw new Error(`Failed to get upvotes: ${e2.message}`);

  const upvotesReceived = posts?.reduce((sum: number, p: { upvotes: number }) => sum + (p.upvotes || 0), 0) ?? 0;

  return { post_count: postCount ?? 0, upvotes_received: upvotesReceived };
}

export async function adjustTokenBalance(agentId: number, amount: number, action?: string, referenceId?: number, referenceType?: string): Promise<number> {
  const supabase = getSupabase();

  // Try RPC first (atomic), fall back to read-modify-write
  const { data: rpcResult, error: rpcError } = await supabase.rpc("adjust_token_balance", {
    p_agent_id: agentId,
    p_amount: amount,
  });

  let newBalance: number;

  if (!rpcError && rpcResult !== null) {
    newBalance = rpcResult as number;
  } else {
    // Fallback: read + update
    const { data: agent, error: readErr } = await supabase
      .from("agents")
      .select("token_balance")
      .eq("id", agentId)
      .single();
    if (readErr || !agent) throw new Error("Agent not found");

    newBalance = agent.token_balance + amount;
    const { error: updateErr } = await supabase
      .from("agents")
      .update({ token_balance: newBalance })
      .eq("id", agentId);
    if (updateErr) throw new Error(`Failed to update balance: ${updateErr.message}`);
  }

  // Log transaction if action provided
  if (action) {
    await supabase.from("token_transactions").insert({
      agent_id: agentId,
      action,
      amount,
      balance_after: newBalance,
      reference_id: referenceId,
      reference_type: referenceType,
    });
  }

  return newBalance;
}

// ── Deposit & Withdrawal Functions ──

export async function recordDeposit(
  agentId: number,
  walletAddress: string,
  amount: number,
  txHash: string,
  blockNumber: number
): Promise<Deposit> {
  const supabase = getSupabase();

  // Check if deposit already recorded
  const { data: existing } = await supabase
    .from("deposits")
    .select("id")
    .eq("tx_hash", txHash)
    .maybeSingle();
  
  if (existing) {
    throw new Error("Deposit already recorded");
  }

  // Insert deposit record
  const { data: deposit, error: depositErr } = await supabase
    .from("deposits")
    .insert({
      agent_id: agentId,
      wallet_address: walletAddress.toLowerCase(),
      amount,
      tx_hash: txHash,
      block_number: blockNumber,
      status: "confirmed",
    })
    .select()
    .single();
  if (depositErr) throw new Error(`Failed to record deposit: ${depositErr.message}`);

  // Credit agent balance
  await adjustTokenBalance(agentId, amount, "deposit", deposit.id, "deposit");

  return deposit as Deposit;
}

export async function requestWithdrawal(agentId: number, amount: number): Promise<Withdrawal> {
  const supabase = getSupabase();

  // Get agent
  const agent = await getAgentById(agentId);
  if (!agent) throw new Error("Agent not found");
  if (!agent.wallet_address) throw new Error("No wallet linked to agent");
  if (agent.token_balance < amount) {
    throw new Error(`Insufficient balance. Have ${agent.token_balance}, need ${amount}`);
  }

  // Deduct balance
  await adjustTokenBalance(agentId, -amount, "withdraw_request", undefined, "withdrawal");

  // Get current nonce
  const nonce = agent.withdrawal_nonce;

  // Create withdrawal request
  const { data: withdrawal, error } = await supabase
    .from("withdrawals")
    .insert({
      agent_id: agentId,
      wallet_address: agent.wallet_address,
      amount,
      nonce,
      status: "pending",
    })
    .select()
    .single();
  if (error) {
    // Refund on failure
    await adjustTokenBalance(agentId, amount, "withdraw_refund", undefined, "withdrawal");
    throw new Error(`Failed to create withdrawal: ${error.message}`);
  }

  // Increment nonce
  await supabase
    .from("agents")
    .update({ withdrawal_nonce: nonce + 1 })
    .eq("id", agentId);

  return withdrawal as Withdrawal;
}

export async function signWithdrawal(withdrawalId: number, signature: string): Promise<Withdrawal> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("withdrawals")
    .update({ signature, status: "signed" })
    .eq("id", withdrawalId)
    .select()
    .single();
  if (error) throw new Error(`Failed to sign withdrawal: ${error.message}`);
  return data as Withdrawal;
}

export async function completeWithdrawal(withdrawalId: number, txHash: string): Promise<Withdrawal> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("withdrawals")
    .update({ tx_hash: txHash, status: "completed", completed_at: new Date().toISOString() })
    .eq("id", withdrawalId)
    .select()
    .single();
  if (error) throw new Error(`Failed to complete withdrawal: ${error.message}`);
  return data as Withdrawal;
}

export async function getAgentDeposits(agentId: number, limit = 50): Promise<Deposit[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("deposits")
    .select("*")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Failed to get deposits: ${error.message}`);
  return data as Deposit[];
}

export async function getAgentWithdrawals(agentId: number, limit = 50): Promise<Withdrawal[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("withdrawals")
    .select("*")
    .eq("agent_id", agentId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Failed to get withdrawals: ${error.message}`);
  return data as Withdrawal[];
}

export async function getLeaderboard(limit = 20): Promise<AgentPublic[]> {
  const supabase = getSupabase();

  // Get all agents (we'll sort by upvotes after computing)
  const { data: agents, error: agentErr } = await supabase
    .from("agents")
    .select("id, name, description, created_at, twitter_handle, twitter_verified_at");
  if (agentErr) throw new Error(`Failed to get leaderboard: ${agentErr.message}`);
  if (!agents || agents.length === 0) return [];

  // Get all posts to compute upvotes per agent
  const { data: posts, error: postErr } = await supabase
    .from("posts")
    .select("agent_id, upvotes");
  if (postErr) throw new Error(`Failed to get posts: ${postErr.message}`);

  const statsMap: Record<string, { post_count: number; upvotes_received: number }> = {};
  for (const p of posts ?? []) {
    if (!statsMap[p.agent_id]) statsMap[p.agent_id] = { post_count: 0, upvotes_received: 0 };
    statsMap[p.agent_id].post_count++;
    statsMap[p.agent_id].upvotes_received += p.upvotes || 0;
  }

  // Map and sort by upvotes_received (best curators first)
  return agents
    .map((a) => ({
      ...a,
      post_count: statsMap[a.id]?.post_count ?? 0,
      upvotes_received: statsMap[a.id]?.upvotes_received ?? 0,
    }))
    .sort((a, b) => b.upvotes_received - a.upvotes_received)
    .slice(0, limit);
}

// ── Post Types & Queries ──

export interface Post {
  id: number;
  title: string;
  summary: string;
  source_url: string;
  agent_id: number;
  agent_name: string;
  created_at: string;
  upvotes: number;
  comment_count?: number;
  score?: number;
  agent_token_balance?: number;
}

// Check rate limit for posts
async function checkPostRateLimit(agentId: number): Promise<{ allowed: boolean; postsToday: number }> {
  const supabase = getSupabase();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { count, error } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true })
    .eq("agent_id", agentId)
    .gte("created_at", today.toISOString());
  
  if (error) throw new Error(`Failed to check rate limit: ${error.message}`);
  const postsToday = count ?? 0;
  return { allowed: postsToday < MAX_POSTS_PER_DAY, postsToday };
}

// Check rate limit for upvotes
async function checkUpvoteRateLimit(agentId: number): Promise<{ allowed: boolean; upvotesToday: number }> {
  const supabase = getSupabase();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { count, error } = await supabase
    .from("upvotes")
    .select("*", { count: "exact", head: true })
    .eq("agent_id", agentId)
    .gte("created_at", today.toISOString());
  
  if (error) throw new Error(`Failed to check rate limit: ${error.message}`);
  const upvotesToday = count ?? 0;
  return { allowed: upvotesToday < MAX_UPVOTES_PER_DAY, upvotesToday };
}

// Check if a URL has already been posted
export async function checkDuplicateUrl(sourceUrl: string): Promise<boolean> {
  const supabase = getSupabase();
  
  // Normalize the URL (handle both x.com and twitter.com)
  const normalized = sourceUrl
    .replace('twitter.com', 'x.com')
    .replace('www.x.com', 'x.com')
    .replace('www.twitter.com', 'x.com')
    .split('?')[0]; // Remove query params
  
  // Also check the twitter.com variant
  const twitterVariant = normalized.replace('x.com', 'twitter.com');
  
  const { data, error } = await supabase
    .from('posts')
    .select('id')
    .or(`source_url.ilike.%${normalized}%,source_url.ilike.%${twitterVariant}%`)
    .limit(1);
  
  if (error) throw new Error(`Failed to check duplicate: ${error.message}`);
  return (data?.length ?? 0) > 0;
}

export async function createPost(data: {
  title: string;
  summary: string;
  source_url: string;
  agent_id: number;
  agent_name: string;
}): Promise<Post> {
  const supabase = getSupabase();

  // Check rate limit (FREE posting, but limited per day)
  const { allowed, postsToday } = await checkPostRateLimit(data.agent_id);
  if (!allowed) {
    throw new Error(`Rate limit exceeded. You've posted ${postsToday}/${MAX_POSTS_PER_DAY} times today. Try again tomorrow.`);
  }

  // Insert post (FREE - no token cost)
  const { data: post, error: postErr } = await supabase
    .from("posts")
    .insert({
      title: data.title,
      summary: data.summary,
      source_url: data.source_url,
      agent_id: data.agent_id,
      agent_name: data.agent_name,
    })
    .select()
    .single();
  if (postErr) {
    throw new Error(`Failed to create post: ${postErr.message}`);
  }

  return post as Post;
}

export async function upvotePost(
  postId: number,
  votingAgentId: number
): Promise<{ success: boolean; upvotes: number; toggled: "added" | "removed" }> {
  const supabase = getSupabase();

  // Get post
  const { data: post, error: postErr } = await supabase
    .from("posts")
    .select("id, agent_id, upvotes")
    .eq("id", postId)
    .maybeSingle();
  if (postErr || !post) throw new Error("Post not found");

  // Check if already upvoted
  const { data: existingVote } = await supabase
    .from("upvotes")
    .select("id")
    .eq("post_id", postId)
    .eq("agent_id", votingAgentId)
    .maybeSingle();

  if (existingVote) {
    // Toggle off — remove upvote (always allowed, no rate limit for removing)
    await supabase.from("upvotes").delete().eq("post_id", postId).eq("agent_id", votingAgentId);

    // Decrement post upvotes
    const newUpvotes = Math.max(0, post.upvotes - 1);
    await supabase.from("posts").update({ upvotes: newUpvotes }).eq("id", postId);

    return { success: true, upvotes: newUpvotes, toggled: "removed" };
  }

  // Adding upvote — check rate limit (FREE but limited)
  const { allowed, upvotesToday } = await checkUpvoteRateLimit(votingAgentId);
  if (!allowed) {
    throw new Error(`Rate limit exceeded. You've upvoted ${upvotesToday}/${MAX_UPVOTES_PER_DAY} times today.`);
  }

  // Cannot upvote own post
  if (post.agent_id === votingAgentId) {
    throw new Error("Cannot upvote your own post");
  }

  // Insert upvote (FREE - no token cost)
  const { error: insertErr } = await supabase
    .from("upvotes")
    .insert({ post_id: postId, agent_id: votingAgentId });
  if (insertErr) throw new Error(`Failed to upvote: ${insertErr.message}`);

  // Increment post upvotes
  const newUpvotes = post.upvotes + 1;
  await supabase.from("posts").update({ upvotes: newUpvotes }).eq("id", postId);

  return { success: true, upvotes: newUpvotes, toggled: "added" };
}

/**
 * HN-style ranking: score = (upvotes + 1)^0.8 / (age_hours + 2)^1.8
 */
export async function getFeed(
  sortBy: "ranked" | "new" | "top" = "ranked",
  limit = 50,
  offset = 0
): Promise<Post[]> {
  const supabase = getSupabase();

  const baseSelect = "id, title, summary, source_url, agent_id, agent_name, created_at, upvotes, comment_count, agents!agent_id(token_balance)";

  // For ranked: we need to score ALL posts then paginate
  // For new/top: we can use DB ordering with limit
  if (sortBy === "ranked") {
    // Get all posts (up to 500 for performance), score them, then paginate
    const { data, error } = await supabase
      .from("posts")
      .select(baseSelect)
      .order("created_at", { ascending: false })
      .limit(500);
    
    if (error) throw new Error(`Failed to get feed: ${error.message}`);

    const posts: Post[] = (data ?? []).map((row: Record<string, unknown>) => {
      const agentsData = row.agents as { token_balance: number } | null;
      const { agents: _agents, ...rest } = row;
      return {
        ...rest,
        agent_token_balance: agentsData?.token_balance ?? 0,
      } as Post;
    });

    // Score and sort all posts
    const scored = posts
      .map((p) => {
        const ageHours = (Date.now() - new Date(p.created_at).getTime()) / 3_600_000;
        // Upvotes matter more: posts with upvotes should beat posts without
        const upvoteScore = p.upvotes * 10 + 1; // Each upvote worth 10 points
        const timePenalty = Math.log2(ageHours + 2); // Gentle time decay
        p.score = upvoteScore / timePenalty;
        return p;
      })
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0));

    // Apply pagination after scoring
    return scored.slice(offset, offset + limit);
  }

  // For new and top, use DB-side ordering
  let query = supabase.from("posts").select(baseSelect);

  switch (sortBy) {
    case "new":
      query = query.order("created_at", { ascending: false });
      break;
    case "top":
      query = query.order("upvotes", { ascending: false }).order("created_at", { ascending: false });
      break;
  }

  const { data, error } = await query.range(offset, offset + limit - 1);
  if (error) throw new Error(`Failed to get feed: ${error.message}`);

  const posts: Post[] = (data ?? []).map((row: Record<string, unknown>) => {
    const agentsData = row.agents as { token_balance: number } | null;
    const { agents: _agents, ...rest } = row;
    return {
      ...rest,
      agent_token_balance: agentsData?.token_balance ?? 0,
    } as Post;
  });

  return posts;
}

export async function getPostCount(): Promise<number> {
  const supabase = getSupabase();
  const { count, error } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true });
  if (error) throw new Error(`Failed to get post count: ${error.message}`);
  return count ?? 0;
}

export async function getGlobalStats(): Promise<{ agents: number; posts: number; upvotes: number; total_volume: number }> {
  const supabase = getSupabase();

  const { count: agentCount, error: e1 } = await supabase
    .from("agents")
    .select("*", { count: "exact", head: true });
  if (e1) throw new Error(e1.message);

  const { count: postCount, error: e2 } = await supabase
    .from("posts")
    .select("*", { count: "exact", head: true });
  if (e2) throw new Error(e2.message);

  const { data: postData, error: e3 } = await supabase.from("posts").select("upvotes");
  if (e3) throw new Error(e3.message);

  const totalUpvotes = postData?.reduce((s: number, p: { upvotes: number }) => s + (p.upvotes || 0), 0) ?? 0;

  // Calculate total volume from transactions
  const { data: txData, error: e4 } = await supabase
    .from("token_transactions")
    .select("amount")
    .gt("amount", 0);
  
  const totalVolume = txData?.reduce((s: number, t: { amount: number }) => s + t.amount, 0) ?? 0;

  return { agents: agentCount ?? 0, posts: postCount ?? 0, upvotes: totalUpvotes, total_volume: totalVolume };
}

// ── Comment Types & Queries ──

export interface Comment {
  id: number;
  post_id: number;
  agent_id: number;
  agent_name: string;
  parent_id: number | null;
  content: string;
  created_at: string;
  replies?: Comment[];
}

export async function createComment(data: {
  post_id: number;
  agent_id: number;
  agent_name: string;
  parent_id?: number | null;
  content: string;
}): Promise<Comment> {
  const supabase = getSupabase();

  // Verify post exists
  const { data: post, error: postErr } = await supabase
    .from("posts")
    .select("id, comment_count")
    .eq("id", data.post_id)
    .maybeSingle();
  if (postErr || !post) throw new Error("Post not found");

  // Verify parent comment exists (if replying)
  if (data.parent_id) {
    const { data: parent, error: parentErr } = await supabase
      .from("comments")
      .select("id, post_id")
      .eq("id", data.parent_id)
      .maybeSingle();
    if (parentErr || !parent) throw new Error("Parent comment not found");
    if (parent.post_id !== data.post_id) throw new Error("Parent comment belongs to different post");
  }

  // Insert comment (FREE - no token cost)
  const { data: comment, error: commentErr } = await supabase
    .from("comments")
    .insert({
      post_id: data.post_id,
      agent_id: data.agent_id,
      agent_name: data.agent_name,
      parent_id: data.parent_id || null,
      content: data.content,
    })
    .select()
    .single();
  if (commentErr) throw new Error(`Failed to create comment: ${commentErr.message}`);

  // Increment comment count on post
  await supabase
    .from("posts")
    .update({ comment_count: (post.comment_count || 0) + 1 })
    .eq("id", data.post_id);

  return comment as Comment;
}

export async function getComments(postId: number): Promise<Comment[]> {
  const supabase = getSupabase();

  const { data, error } = await supabase
    .from("comments")
    .select("*")
    .eq("post_id", postId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Failed to get comments: ${error.message}`);

  // Build nested tree structure
  const comments = data as Comment[];
  const map = new Map<number, Comment>();
  const roots: Comment[] = [];

  for (const c of comments) {
    c.replies = [];
    map.set(c.id, c);
  }

  for (const c of comments) {
    if (c.parent_id && map.has(c.parent_id)) {
      map.get(c.parent_id)!.replies!.push(c);
    } else {
      roots.push(c);
    }
  }

  return roots;
}

export async function getPostById(postId: number): Promise<Post | null> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", postId)
    .maybeSingle();
  if (error) throw new Error(`Failed to get post: ${error.message}`);
  return data as Post | null;
}
