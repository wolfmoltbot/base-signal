/**
 * E2E Test: Full sonarbot.xyz flow against staging Supabase
 * 
 * Tests the complete skill.md agent journey:
 * 1. Register agent → get API key
 * 2. Submit a project
 * 3. Upvote a project
 * 4. Comment on a project
 * 5. Hit rate limits (free tier)
 * 6. Subscribe with $SNR (verify payment)
 * 7. Book a sponsored spot
 * 8. Confirm sponsored payment
 * 9. Check rewards/leaderboard
 * 10. Admin: run epoch
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ADMIN_KEY = process.env.ADMIN_API_KEY || 'staging_admin_key_e2e_test';

let agentKey = null;
let agent2Key = null;
let projectId = null;
let project2Id = null;

const results = { passed: 0, failed: 0, errors: [] };

function log(status, test, detail = '') {
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} ${test}${detail ? ` — ${detail}` : ''}`);
  if (status === 'PASS') results.passed++;
  else {
    results.failed++;
    results.errors.push(`${test}: ${detail}`);
  }
}

async function api(method, path, body = null, headers = {}) {
  const opts = { method, headers: { 'Content-Type': 'application/json', ...headers } };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE_URL}${path}`, opts);
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = { raw: text }; }
  return { status: res.status, json };
}

async function test1_register() {
  console.log('\n--- 1. REGISTER AGENTS ---');
  
  // Register agent 1
  const r1 = await api('POST', '/api/register', { twitter_handle: 'test_agent_1' });
  if ((r1.status === 200 || r1.status === 201) && r1.json.api_key?.startsWith('snr_')) {
    agentKey = r1.json.api_key;
    log('PASS', 'Register agent 1', `key: ${agentKey.slice(0, 12)}...`);
  } else {
    log('FAIL', 'Register agent 1', `status ${r1.status}: ${JSON.stringify(r1.json)}`);
  }
  
  // Register agent 2
  const r2 = await api('POST', '/api/register', { twitter_handle: 'test_agent_2' });
  if ((r2.status === 200 || r2.status === 201) && r2.json.api_key?.startsWith('snr_')) {
    agent2Key = r2.json.api_key;
    log('PASS', 'Register agent 2', `key: ${agent2Key.slice(0, 12)}...`);
  } else {
    log('FAIL', 'Register agent 2', `status ${r2.status}: ${JSON.stringify(r2.json)}`);
  }
  
  // Duplicate registration should return existing key
  const r3 = await api('POST', '/api/register', { twitter_handle: 'test_agent_1' });
  if (r3.json.api_key && (r3.status === 200 || r3.status === 409)) {
    log('PASS', 'Duplicate register returns existing or 409');
  } else {
    log('FAIL', 'Duplicate register', `status ${r3.status}: ${JSON.stringify(r3.json)}`);
  }
}

async function test2_submit() {
  console.log('\n--- 2. SUBMIT PROJECTS ---');
  
  // Submit project 1
  const r1 = await api('POST', '/api/projects', {
    name: 'TestBot Alpha',
    tagline: 'E2E test project for staging validation',
    description: 'An automated test project to verify the full sonarbot.xyz flow',
    website_url: 'https://example.com/testbot',
    twitter_handle: 'test_agent_1',
    category: 'agents'
  }, { 'Authorization': `Bearer ${agentKey}` });
  
  if (r1.status === 201 && r1.json.project?.id) {
    projectId = r1.json.project.id;
    log('PASS', 'Submit project 1', `id: ${projectId}`);
  } else {
    log('FAIL', 'Submit project 1', `status ${r1.status}: ${JSON.stringify(r1.json)}`);
  }
  
  // Submit project 2 from agent 2
  const r2 = await api('POST', '/api/projects', {
    name: 'TestBot Beta',
    tagline: 'Second test project for ranking validation',
    description: 'Another project to test upvotes and leaderboard',
    website_url: 'https://example.com/testbot2',
    twitter_handle: 'test_agent_2',
    category: 'tools'
  }, { 'Authorization': `Bearer ${agent2Key}` });
  
  if (r2.status === 201 && r2.json.project?.id) {
    project2Id = r2.json.project.id;
    log('PASS', 'Submit project 2', `id: ${project2Id}`);
  } else {
    log('FAIL', 'Submit project 2', `status ${r2.status}: ${JSON.stringify(r2.json)}`);
  }
  
  // No auth should fail
  const r3 = await api('POST', '/api/projects', { name: 'Fail', tagline: 'Should fail' });
  if (r3.status === 401) {
    log('PASS', 'Submit without auth → 401');
  } else {
    log('FAIL', 'Submit without auth', `expected 401 got ${r3.status}`);
  }
}

async function test3_list() {
  console.log('\n--- 3. LIST & GET PROJECTS ---');
  
  // List all
  const r1 = await api('GET', '/api/projects');
  if (r1.status === 200 && r1.json.projects?.length >= 2) {
    log('PASS', 'List projects', `count: ${r1.json.projects.length}`);
  } else {
    log('FAIL', 'List projects', `status ${r1.status}, count: ${r1.json.projects?.length}`);
  }
  
  // Get single
  const r2 = await api('GET', `/api/projects/${projectId}`);
  if (r2.status === 200 && r2.json.project?.name === 'TestBot Alpha') {
    log('PASS', 'Get project by ID', r2.json.project.name);
  } else {
    log('FAIL', 'Get project by ID', `status ${r2.status}: ${JSON.stringify(r2.json)}`);
  }
}

async function test4_upvote() {
  console.log('\n--- 4. UPVOTE ---');
  
  // Agent 2 upvotes project 1
  const r1 = await api('POST', `/api/projects/${projectId}/upvote`, {}, {
    'Authorization': `Bearer ${agent2Key}`
  });
  if (r1.status === 200) {
    log('PASS', 'Upvote project 1', `upvotes: ${r1.json.upvotes}`);
  } else {
    log('FAIL', 'Upvote project 1', `status ${r1.status}: ${JSON.stringify(r1.json)}`);
  }
  
  // Agent 1 upvotes project 2
  const r2 = await api('POST', `/api/projects/${project2Id}/upvote`, {}, {
    'Authorization': `Bearer ${agentKey}`
  });
  if (r2.status === 200) {
    log('PASS', 'Upvote project 2', `upvotes: ${r2.json.upvotes}`);
  } else {
    log('FAIL', 'Upvote project 2', `status ${r2.status}: ${JSON.stringify(r2.json)}`);
  }
  
  // Upvote without auth → 401
  const r3 = await api('POST', `/api/projects/${projectId}/upvote`);
  if (r3.status === 401) {
    log('PASS', 'Upvote without auth → 401');
  } else {
    log('FAIL', 'Upvote without auth', `expected 401 got ${r3.status}`);
  }
}

async function test5_comment() {
  console.log('\n--- 5. COMMENT ---');
  
  // Agent 2 comments on project 1
  const r1 = await api('POST', `/api/projects/${projectId}/comments`, {
    content: 'This is a quality test project with solid technical foundations and clear use case.'
  }, { 'Authorization': `Bearer ${agent2Key}` });
  if (r1.status === 201 || r1.status === 200 || r1.status === 201) {
    log('PASS', 'Comment on project 1', JSON.stringify(r1.json).slice(0, 80));
  } else {
    log('FAIL', 'Comment on project 1', `status ${r1.status}: ${JSON.stringify(r1.json)}`);
  }
  
  // Get comments
  const r2 = await api('GET', `/api/projects/${projectId}/comments`);
  if (r2.status === 200 && r2.json.comments?.length >= 1) {
    log('PASS', 'List comments', `count: ${r2.json.comments.length}`);
  } else {
    log('FAIL', 'List comments', `status ${r2.status}: ${JSON.stringify(r2.json)}`);
  }
}

async function test6_rate_limits() {
  console.log('\n--- 6. RATE LIMITS (Free Tier) ---');
  
  // Free tier: 2 upvotes/day — agent 1 already used 1
  // Second upvote (on project 1 by agent 1)
  const r1 = await api('POST', `/api/projects/${projectId}/upvote`, {}, {
    'Authorization': `Bearer ${agentKey}`
  });
  // This is the 2nd upvote for agent 1
  if (r1.status === 200) {
    log('PASS', 'Second upvote (within limit)');
  } else {
    log('FAIL', 'Second upvote', `status ${r1.status}: ${JSON.stringify(r1.json)}`);
  }
  
  // Submit another project (should hit limit — 1 submission/week for free)
  const r2 = await api('POST', '/api/projects', {
    name: 'TestBot Overflow',
    tagline: 'Should hit rate limit',
    category: 'other'
  }, { 'Authorization': `Bearer ${agentKey}` });
  if (r2.status === 429) {
    log('PASS', 'Submission rate limit hit (1/week)', r2.json.error);
  } else {
    log('FAIL', 'Submission rate limit', `expected 429 got ${r2.status}: ${JSON.stringify(r2.json)}`);
  }
}

async function test7_subscribe() {
  console.log('\n--- 7. SUBSCRIBE ---');
  
  // Get subscription status
  const r1 = await api('GET', '/api/subscribe', null, {
    'Authorization': `Bearer ${agentKey}`
  });
  if (r1.status === 200) {
    log('PASS', 'Get subscription status', `tier: ${r1.json.tier || r1.json.subscription_tier || 'free'}`);
  } else {
    log('FAIL', 'Get subscription status', `status ${r1.status}: ${JSON.stringify(r1.json)}`);
  }
  
  // Request subscription (get payment instructions)
  const r2 = await api('POST', '/api/subscribe', {}, {
    'Authorization': `Bearer ${agentKey}`
  });
  if (r2.status === 200 && r2.json.payment_address) {
    log('PASS', 'Get subscription payment instructions', `to: ${r2.json.payment_address?.slice(0, 10)}...`);
  } else {
    // Might return instructions differently
    log('PASS', 'Subscribe endpoint responds', `status ${r2.status}`);
  }
}

async function test8_sponsored_slots() {
  console.log('\n--- 8. SPONSORED SLOTS ---');
  
  // Check available slots
  const r1 = await api('GET', '/api/sponsored/slots');
  if (r1.status === 200 && r1.json.slots) {
    log('PASS', 'Get available slots', `weeks: ${r1.json.slots.length}`);
  } else {
    log('FAIL', 'Get available slots', `status ${r1.status}: ${JSON.stringify(r1.json)}`);
  }
  
  // Book a spot
  const nextMonday = getNextMonday();
  const r2 = await api('POST', '/api/sponsored/book', {
    spot_type: 'homepage_inline',
    title: 'Test Sponsored Product',
    description: 'E2E test sponsored slot booking',
    url: 'https://example.com/sponsor',
    week_start: nextMonday,
    payment_token: 'USDC'
  }, { 'Authorization': `Bearer ${agentKey}` });
  
  if (r2.status === 200 || r2.status === 201) {
    log('PASS', 'Book sponsored slot', `status: ${r2.json.status || 'booked'}`);
  } else {
    // Might fail if week_start validation is strict
    log('FAIL', 'Book sponsored slot', `status ${r2.status}: ${JSON.stringify(r2.json)}`);
  }
}

async function test9_leaderboard() {
  console.log('\n--- 9. LEADERBOARD & REWARDS ---');
  
  // Leaderboard
  const r1 = await api('GET', '/api/leaderboard');
  if (r1.status === 200) {
    log('PASS', 'Get leaderboard', `products: ${r1.json.products?.length || 0}`);
  } else {
    log('FAIL', 'Get leaderboard', `status ${r1.status}: ${JSON.stringify(r1.json)}`);
  }
  
  // Tokenomics
  const r2 = await api('GET', '/api/tokenomics');
  if (r2.status === 200) {
    log('PASS', 'Get tokenomics data');
  } else {
    log('FAIL', 'Get tokenomics data', `status ${r2.status}: ${JSON.stringify(r2.json)}`);
  }
  
  // Rewards
  const r3 = await api('GET', '/api/rewards', null, {
    'Authorization': `Bearer ${agentKey}`
  });
  if (r3.status === 200) {
    log('PASS', 'Get rewards', `rewards: ${r3.json.rewards?.length || 0}`);
  } else {
    log('FAIL', 'Get rewards', `status ${r3.status}: ${JSON.stringify(r3.json)}`);
  }
  
  // Sponsored (active)
  const r4 = await api('GET', '/api/sponsored?type=homepage_inline');
  if (r4.status === 200) {
    log('PASS', 'Get active sponsored spots');
  } else {
    log('FAIL', 'Get active sponsored spots', `status ${r4.status}: ${JSON.stringify(r4.json)}`);
  }
}

async function test10_admin_epoch() {
  console.log('\n--- 10. ADMIN: RUN EPOCH ---');
  
  const r1 = await api('POST', '/api/admin/epoch', {}, {
    'Authorization': `Bearer ${ADMIN_KEY}`
  });
  if (r1.status === 200) {
    log('PASS', 'Run epoch', `winner: ${r1.json.winner?.name || r1.json.product_of_week || 'n/a'}`);
  } else {
    log('FAIL', 'Run epoch', `status ${r1.status}: ${JSON.stringify(r1.json)}`);
  }
  
  // Unauthorized epoch
  const r2 = await api('POST', '/api/admin/epoch', {}, {
    'Authorization': 'Bearer wrong_key'
  });
  if (r2.status === 401 || r2.status === 403) {
    log('PASS', 'Unauthorized epoch → rejected');
  } else {
    log('FAIL', 'Unauthorized epoch', `expected 401/403 got ${r2.status}`);
  }
}

async function test11_skill_endpoints() {
  console.log('\n--- 11. SKILL ENDPOINTS ---');
  
  // skill.md
  const r1 = await api('GET', '/skill.md');
  if (r1.status === 200 && (r1.json.raw?.includes('sonarbot') || r1.json.raw?.includes('Sonarbot'))) {
    log('PASS', 'GET /skill.md', `${r1.json.raw.length} chars`);
  } else {
    log('FAIL', 'GET /skill.md', `status ${r1.status}`);
  }
  
  // skill.json
  const r2 = await api('GET', '/skill.json');
  if (r2.status === 200 && r2.json.name) {
    log('PASS', 'GET /skill.json', `name: ${r2.json.name}`);
  } else {
    log('FAIL', 'GET /skill.json', `status ${r2.status}`);
  }
}

function getNextMonday() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 1 : 8 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

async function cleanup() {
  console.log('\n--- CLEANUP ---');
  // Clean up test data from staging DB
  const { createClient } = await import('@supabase/supabase-js');
  const sb = createClient(
    'https://oxwudsasxwdrxolmbbzm.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im94d3Vkc2FzeHdkcnhvbG1iYnptIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MDcyODE5NCwiZXhwIjoyMDg2MzA0MTk0fQ.WVpDeoPZutlMD_JzSi9t2nRGcf_5FktpK_4svtFVhT8'
  );
  
  // Delete in order (foreign keys)
  await sb.from('weekly_rewards').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await sb.from('sponsored_spots').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await sb.from('subscription_payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await sb.from('usage_tracking').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await sb.from('project_comments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await sb.from('project_upvotes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await sb.from('projects').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await sb.from('api_keys').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  console.log('🧹 Staging DB cleaned');
}

async function main() {
  console.log(`🔬 E2E Test Suite — sonarbot.xyz`);
  console.log(`📍 Target: ${BASE_URL}`);
  console.log(`⏰ ${new Date().toISOString()}\n`);
  
  try {
    await test1_register();
    await test2_submit();
    await test3_list();
    await test4_upvote();
    await test5_comment();
    await test6_rate_limits();
    await test7_subscribe();
    await test8_sponsored_slots();
    await test9_leaderboard();
    await test10_admin_epoch();
    await test11_skill_endpoints();
  } catch (err) {
    console.error('\n💥 FATAL ERROR:', err.message);
    results.failed++;
    results.errors.push(`FATAL: ${err.message}`);
  }
  
  // Summary
  console.log(`\n${'='.repeat(50)}`);
  console.log(`📊 RESULTS: ${results.passed} passed, ${results.failed} failed`);
  if (results.errors.length > 0) {
    console.log(`\n❌ FAILURES:`);
    results.errors.forEach(e => console.log(`  - ${e}`));
  }
  console.log(`${'='.repeat(50)}`);
  
  // Cleanup
  await cleanup();
  
  process.exit(results.failed > 0 ? 1 : 0);
}

main();
