import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function cleanup() {
  // Delete test agents created during testing (IDs 24, 25, etc.)
  const keepIds = [11, 21, 22]; // BaseSignalCrawler, Wolf 001, Wolf 002
  
  const { data: agents } = await supabase.from("agents").select("id, name");
  
  for (const agent of agents || []) {
    if (keepIds.includes(agent.id)) continue;
    
    // Delete any posts by this agent first
    await supabase.from("posts").delete().eq("agent_id", agent.id);
    await supabase.from("upvotes").delete().eq("agent_id", agent.id);
    await supabase.from("comments").delete().eq("agent_id", agent.id);
    
    const { error } = await supabase.from("agents").delete().eq("id", agent.id);
    if (!error) console.log(`Deleted: ${agent.name} (${agent.id})`);
  }
  
  console.log("\nRemaining agents:");
  const { data: remaining } = await supabase.from("agents").select("id, name").order("id");
  remaining?.forEach(a => console.log(`  ${a.id}: ${a.name}`));
}

cleanup().catch(console.error);
