/**
 * E2E Onchain Payment Test
 * 
 * Sends REAL $SNR and USDC from the test wallet, then confirms via API.
 * Tests the full payment verification loop.
 */

import { ethers } from 'ethers';
import { readFileSync } from 'fs';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const WALLET_PATH = '/Users/degenwolf/.openclaw/wallets/test-agent.json';
const PAYMENT_ADDRESS = '0xE3aC289bC25404A2c66A02459aB99dcD746E52b2';

// Token contracts on Base
const SNR_CONTRACT = '0xE1231f809124e4Aa556cD9d8c28CB33f02c75b07';
const USDC_CONTRACT = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

const ERC20_ABI = [
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)'
];

const results = { passed: 0, failed: 0, errors: [] };

function log(status, test, detail = '') {
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`${icon} ${test}${detail ? ` — ${detail}` : ''}`);
  if (status === 'PASS') results.passed++;
  else { results.failed++; results.errors.push(`${test}: ${detail}`); }
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

function getNextMonday() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 1 : 8 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split('T')[0];
}

async function main() {
  console.log('🔬 E2E ONCHAIN PAYMENT TEST');
  console.log(`📍 Target: ${BASE_URL}`);
  console.log(`⏰ ${new Date().toISOString()}\n`);

  // Load wallet
  const walletData = JSON.parse(readFileSync(WALLET_PATH, 'utf8'));
  const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
  const wallet = new ethers.Wallet(walletData.privateKey, provider);
  
  console.log(`💰 Wallet: ${wallet.address}`);
  const ethBalance = await provider.getBalance(wallet.address);
  console.log(`   ETH: ${ethers.formatEther(ethBalance)}`);
  
  const snr = new ethers.Contract(SNR_CONTRACT, ERC20_ABI, wallet);
  const usdc = new ethers.Contract(USDC_CONTRACT, ERC20_ABI, wallet);
  
  const snrBalance = await snr.balanceOf(wallet.address);
  const usdcBalance = await usdc.balanceOf(wallet.address);
  console.log(`   SNR: ${ethers.formatUnits(snrBalance, 18)}`);
  console.log(`   USDC: ${ethers.formatUnits(usdcBalance, 6)}`);
  console.log(`   Payment addr: ${PAYMENT_ADDRESS}\n`);

  // --- Step 1: Register agent ---
  console.log('--- 1. REGISTER ---');
  const reg = await api('POST', '/api/register', { twitter_handle: 'onchain_test_agent' });
  const agentKey = reg.json.api_key;
  if (agentKey) {
    log('PASS', 'Register agent', `key: ${agentKey.slice(0, 12)}...`);
  } else {
    log('FAIL', 'Register agent', JSON.stringify(reg.json));
    return summarize();
  }
  const authHeader = { 'Authorization': `Bearer ${agentKey}` };

  // --- Step 2: Subscribe — get payment instructions ---
  console.log('\n--- 2. SUBSCRIBE: GET INSTRUCTIONS ---');
  const subInstructions = await api('POST', '/api/subscribe', { 
    wallet_address: wallet.address 
  }, authHeader);
  
  if (subInstructions.json.payment_address) {
    log('PASS', 'Get subscribe instructions', `pay to: ${subInstructions.json.payment_address}`);
  } else {
    log('FAIL', 'Get subscribe instructions', JSON.stringify(subInstructions.json));
  }

  // --- Step 3: Send $SNR for subscription ---
  console.log('\n--- 3. SEND $SNR FOR SUBSCRIPTION ---');
  // Send 1000 $SNR (minimum required by verifyPayment.ts)
  const snrAmount = ethers.parseUnits('1000', 18);
  
  try {
    console.log('   Sending 1000 $SNR...');
    const snrTx = await snr.transfer(PAYMENT_ADDRESS, snrAmount);
    console.log(`   TX hash: ${snrTx.hash}`);
    console.log('   Waiting for confirmation...');
    const snrReceipt = await snrTx.wait();
    
    if (snrReceipt.status === 1) {
      log('PASS', 'Send 1000 $SNR', `tx: ${snrTx.hash}`);
      
      // --- Step 4: Confirm subscription ---
      console.log('\n--- 4. CONFIRM SUBSCRIPTION ---');
      const confirmSub = await api('POST', '/api/subscribe/confirm', {
        tx_hash: snrTx.hash
      }, authHeader);
      
      if (confirmSub.json.status === 'active') {
        log('PASS', 'Subscription confirmed', `expires: ${confirmSub.json.expires}, amount: ${confirmSub.json.amount_paid} SNR`);
      } else {
        log('FAIL', 'Subscription confirm', `status ${confirmSub.status}: ${JSON.stringify(confirmSub.json)}`);
      }
      
      // Verify subscription is now premium
      const subStatus = await api('GET', '/api/subscribe', null, authHeader);
      if (subStatus.json.tier === 'premium') {
        log('PASS', 'Subscription tier is premium', `days: ${subStatus.json.days_remaining}`);
      } else {
        log('FAIL', 'Subscription tier check', `got: ${subStatus.json.tier}`);
      }
      
      // Try duplicate tx hash (should fail)
      const dupConfirm = await api('POST', '/api/subscribe/confirm', {
        tx_hash: snrTx.hash
      }, authHeader);
      if (dupConfirm.status === 409) {
        log('PASS', 'Duplicate tx hash rejected');
      } else {
        log('FAIL', 'Duplicate tx hash', `expected 409 got ${dupConfirm.status}`);
      }
    } else {
      log('FAIL', 'SNR transfer', 'tx reverted');
    }
  } catch (err) {
    log('FAIL', 'SNR transfer', err.message);
  }

  // --- Step 5: Book sponsored spot ---
  console.log('\n--- 5. BOOK SPONSORED SPOT ---');
  const nextMonday = getNextMonday();
  const bookSpot = await api('POST', '/api/sponsored/book', {
    spot_type: 'homepage_inline',
    title: 'E2E Test Sponsor',
    description: 'Testing the onchain payment flow',
    url: 'https://example.com/test-sponsor',
    week_start: nextMonday,
    payment_token: 'USDC'
  }, authHeader);
  
  if (bookSpot.json.status === 'booked' || bookSpot.status === 200 || bookSpot.status === 201) {
    log('PASS', 'Book sponsored spot', `week: ${nextMonday}, amount: ${bookSpot.json.payment_amount || bookSpot.json.amount}`);
    
    const usdcAmount = bookSpot.json.payment_amount || bookSpot.json.amount || 299;
    
    // --- Step 6: Send USDC for sponsored spot ---
    console.log('\n--- 6. SEND USDC FOR SPONSORED SPOT ---');
    const usdcPay = ethers.parseUnits(String(usdcAmount), 6);
    
    try {
      console.log(`   Sending ${usdcAmount} USDC...`);
      const usdcTx = await usdc.transfer(PAYMENT_ADDRESS, usdcPay);
      console.log(`   TX hash: ${usdcTx.hash}`);
      console.log('   Waiting for confirmation...');
      const usdcReceipt = await usdcTx.wait();
      
      if (usdcReceipt.status === 1) {
        log('PASS', `Send ${usdcAmount} USDC`, `tx: ${usdcTx.hash}`);
        
        // --- Step 7: Confirm sponsored payment ---
        console.log('\n--- 7. CONFIRM SPONSORED PAYMENT ---');
        const confirmSpot = await api('POST', '/api/sponsored/confirm', {
          spot_id: bookSpot.json.spot_id || bookSpot.json.id,
          tx_hash: usdcTx.hash
        }, authHeader);
        
        if (confirmSpot.json.status === 'active' || confirmSpot.status === 200) {
          log('PASS', 'Sponsored spot confirmed', `status: ${confirmSpot.json.status}`);
        } else {
          log('FAIL', 'Sponsored spot confirm', `status ${confirmSpot.status}: ${JSON.stringify(confirmSpot.json)}`);
        }
      } else {
        log('FAIL', 'USDC transfer', 'tx reverted');
      }
    } catch (err) {
      log('FAIL', 'USDC transfer', err.message);
    }
  } else {
    log('FAIL', 'Book sponsored spot', `status ${bookSpot.status}: ${JSON.stringify(bookSpot.json)}`);
  }

  // --- Step 8: Verify final balances ---
  console.log('\n--- 8. FINAL BALANCES ---');
  const finalSnr = await snr.balanceOf(wallet.address);
  const finalUsdc = await usdc.balanceOf(wallet.address);
  const finalEth = await provider.getBalance(wallet.address);
  
  const paymentSnr = await snr.balanceOf(PAYMENT_ADDRESS);
  const paymentUsdc = await usdc.balanceOf(PAYMENT_ADDRESS);
  
  console.log(`   Test wallet:`);
  console.log(`     ETH: ${ethers.formatEther(finalEth)}`);
  console.log(`     SNR: ${ethers.formatUnits(finalSnr, 18)}`);
  console.log(`     USDC: ${ethers.formatUnits(finalUsdc, 6)}`);
  console.log(`   Payment wallet (${PAYMENT_ADDRESS}):`);
  console.log(`     SNR received: ${ethers.formatUnits(paymentSnr, 18)}`);
  console.log(`     USDC received: ${ethers.formatUnits(paymentUsdc, 6)}`);
  
  if (paymentSnr > 0n) {
    log('PASS', 'Payment wallet received $SNR');
  } else {
    log('FAIL', 'Payment wallet $SNR balance', '0');
  }
  if (paymentUsdc > 0n) {
    log('PASS', 'Payment wallet received USDC');
  } else {
    log('FAIL', 'Payment wallet USDC balance', '0');
  }

  summarize();
}

function summarize() {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`📊 RESULTS: ${results.passed} passed, ${results.failed} failed`);
  if (results.errors.length > 0) {
    console.log(`\n❌ FAILURES:`);
    results.errors.forEach(e => console.log(`  - ${e}`));
  }
  console.log(`${'='.repeat(50)}`);
  process.exit(results.failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('💥 FATAL:', err.message);
  process.exit(1);
});
