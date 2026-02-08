import { NextRequest } from "next/server";
import { getAgentByApiKey, Agent } from "./db";
import { isAllowlisted, MAINTENANCE_MODE } from "./allowlist";

export interface AgentAuth {
  agentId: number;
  agentName: string;
  agent: Agent;
}

export async function authenticateAgent(req: NextRequest): Promise<AgentAuth | null> {
  const authHeader = req.headers.get("authorization");
  const apiKey = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : req.headers.get("x-api-key");

  if (!apiKey) return null;

  // Check allowlist (blocks all if MAINTENANCE_MODE is true)
  if (!isAllowlisted(apiKey)) {
    return null;
  }

  const agent = await getAgentByApiKey(apiKey);
  if (!agent) return null;

  return {
    agentId: agent.id,
    agentName: agent.name,
    agent,
  };
}

// Check if API is in maintenance mode
export function isMaintenanceMode(): boolean {
  return MAINTENANCE_MODE;
}
