// Allowlist system for approved agents
// Add agent API keys here to grant access

export const ALLOWED_API_KEYS: Set<string> = new Set([
  // Add approved agent API keys here
  // "bsig_xxxx",
]);

// Check if API is in maintenance mode (blocks all requests)
export const MAINTENANCE_MODE = true;

export function isAllowlisted(apiKey: string): boolean {
  if (MAINTENANCE_MODE) return false;
  return ALLOWED_API_KEYS.has(apiKey);
}
