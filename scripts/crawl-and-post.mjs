#!/usr/bin/env node
/**
 * Base Sonar Crawler
 * Searches X for Base ecosystem content and posts quality signals
 */

import { execSync } from 'child_process';

const API_KEY = 'bsig_6c930087b7348a181e8cbaef8651d125494be59d55540311';
const BASE_URL = 'https://base-signal-ten.vercel.app';

const SEARCH_QUERIES = [
  'deployed on Base',
  'launching on Base',
  'shipped on Base',
  'Base L2 TVL',
  'BuildOnBase',
];

// Keywords that indicate quality content
const QUALITY_INDICATORS = [
  'deployed', 'launched', 'live', 'shipped', 'released',
  'TVL', 'volume', 'users', 'transactions',
  'tutorial', 'guide', 'how to',
  'open source', 'github',
  'milestone', 'achievement',
];

// Skip these (low quality)
const SKIP_PATTERNS = [
  /giveaway/i, /airdrop/i, /free mint/i,
  /follow.*retweet/i, /rt to win/i,
  /🚀{3,}/, /💰{3,}/, /🔥{3,}/,  // Excessive emojis
  /100x/i, /moon/i, /pump/i,
];

async function searchX(query) {
  try {
    const result = execSync(`bird search "${query}" -n 10 --json 2>&1`, {
      encoding: 'utf-8',
      timeout: 30000,
    });
    const data = JSON.parse(result);
    // bird returns array directly
    return Array.isArray(data) ? data : (data.tweets || []);
  } catch (e) {
    console.error(`Search failed for "${query}":`, e.message);
    return [];
  }
}

function isQualityTweet(tweet) {
  const text = tweet.text || tweet.full_text || '';
  
  // Skip low quality
  for (const pattern of SKIP_PATTERNS) {
    if (pattern.test(text)) return false;
  }
  
  // Skip replies
  if (tweet.inReplyToStatusId) return false;
  
  // Must have quality indicators
  const hasQuality = QUALITY_INDICATORS.some(kw => 
    text.toLowerCase().includes(kw.toLowerCase())
  );
  
  // Must have some engagement
  const hasEngagement = (tweet.likeCount || tweet.favorite_count || 0) > 3 || 
                        (tweet.retweetCount || tweet.retweet_count || 0) > 1;
  
  return hasQuality || hasEngagement;
}

function createSummary(tweet) {
  const text = tweet.text || tweet.full_text || '';
  // Clean up and truncate
  let summary = text
    .replace(/https?:\/\/\S+/g, '') // Remove URLs
    .replace(/\s+/g, ' ')
    .trim();
  
  if (summary.length > 280) {
    summary = summary.slice(0, 277) + '...';
  }
  
  return summary;
}

function createTitle(tweet) {
  const text = tweet.text || tweet.full_text || '';
  // Extract first sentence or first 80 chars
  const firstSentence = text.split(/[.!?]/)[0];
  let title = firstSentence
    .replace(/https?:\/\/\S+/g, '')
    .replace(/[@#]\w+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  if (title.length > 100) {
    title = title.slice(0, 97) + '...';
  }
  
  const username = tweet.author?.username || tweet.user?.screen_name || 'unknown';
  return title || `Update from @${username}`;
}

async function postToBaseSonar(tweet) {
  const username = tweet.author?.username || tweet.user?.screen_name || 'unknown';
  const tweetId = tweet.id || tweet.id_str;
  const tweetUrl = `https://x.com/${username}/status/${tweetId}`;
  
  const payload = {
    title: createTitle(tweet),
    summary: createSummary(tweet),
    source_url: tweetUrl,
  };
  
  try {
    const response = await fetch(`${BASE_URL}/api/posts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log(`✅ Posted: ${payload.title.slice(0, 50)}...`);
      return true;
    } else {
      console.log(`❌ Failed: ${data.error || response.status}`);
      return false;
    }
  } catch (e) {
    console.error('Post failed:', e.message);
    return false;
  }
}

async function getExistingUrls() {
  try {
    const response = await fetch(`${BASE_URL}/api/posts?limit=100`);
    const data = await response.json();
    return new Set((data.posts || []).map(p => p.source_url));
  } catch (e) {
    return new Set();
  }
}

async function main() {
  console.log('🔍 Base Sonar Crawler starting...\n');
  
  // Get existing posts to avoid duplicates
  const existingUrls = await getExistingUrls();
  console.log(`📚 Found ${existingUrls.size} existing posts\n`);
  
  const allTweets = [];
  
  // Search each query
  for (const query of SEARCH_QUERIES) {
    console.log(`🔎 Searching: ${query}`);
    const tweets = await searchX(query);
    console.log(`   Found ${tweets.length} tweets`);
    allTweets.push(...tweets);
    
    // Rate limit protection
    await new Promise(r => setTimeout(r, 2000));
  }
  
  // Dedupe by tweet ID
  const uniqueTweets = [...new Map(allTweets.map(t => [t.id || t.id_str, t])).values()];
  console.log(`\n📊 Total unique tweets: ${uniqueTweets.length}`);
  
  // Filter for quality
  const qualityTweets = uniqueTweets.filter(isQualityTweet);
  console.log(`✨ Quality tweets: ${qualityTweets.length}`);
  
  // Filter out already posted
  const newTweets = qualityTweets.filter(t => {
    const username = t.author?.username || t.user?.screen_name || 'unknown';
    const tweetId = t.id || t.id_str;
    const url = `https://x.com/${username}/status/${tweetId}`;
    return !existingUrls.has(url);
  });
  console.log(`🆕 New tweets to post: ${newTweets.length}\n`);
  
  // Post up to 5 new signals
  let posted = 0;
  for (const tweet of newTweets.slice(0, 5)) {
    const success = await postToBaseSonar(tweet);
    if (success) posted++;
    await new Promise(r => setTimeout(r, 1000));
  }
  
  console.log(`\n✅ Crawler complete. Posted ${posted} new signals.`);
}

main().catch(console.error);
