/**
 * ScanBite Load Test Script
 * Run with: npx tsx scripts/load-test.ts
 *
 * Simulates concurrent restaurant traffic to validate
 * production readiness for 50+ restaurants.
 */

const BASE_URL = process.env.TEST_URL || 'http://localhost:3000';
const CONCURRENT_USERS = parseInt(process.env.LOAD_TEST_USERS || '50');
const ORDERS_PER_USER = parseInt(process.env.LOAD_TEST_ORDERS || '3');

interface TestResult {
  scenario: string;
  totalRequests: number;
  successCount: number;
  errorCount: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
}

async function measureRequest(
  url: string,
  options?: RequestInit
): Promise<{ ok: boolean; status: number; latencyMs: number }> {
  const start = Date.now();
  try {
    const res = await fetch(url, options);
    return { ok: res.ok, status: res.status, latencyMs: Date.now() - start };
  } catch {
    return { ok: false, status: 0, latencyMs: Date.now() - start };
  }
}

async function testHealthEndpoint(): Promise<TestResult> {
  const latencies: number[] = [];
  let errors = 0;

  const promises = Array.from({ length: CONCURRENT_USERS }, async () => {
    const { ok, latencyMs } = await measureRequest(`${BASE_URL}/api/health`);
    latencies.push(latencyMs);
    if (!ok) errors++;
  });

  await Promise.all(promises);
  latencies.sort((a, b) => a - b);

  return {
    scenario: 'Health Check',
    totalRequests: latencies.length,
    successCount: latencies.length - errors,
    errorCount: errors,
    avgLatencyMs: Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length),
    p95LatencyMs: latencies[Math.floor(latencies.length * 0.95)] ?? 0,
    p99LatencyMs: latencies[Math.floor(latencies.length * 0.99)] ?? 0,
  };
}

async function testMenuEndpoint(slug: string): Promise<TestResult> {
  const latencies: number[] = [];
  let errors = 0;

  const promises = Array.from({ length: CONCURRENT_USERS }, async () => {
    const { ok, latencyMs } = await measureRequest(`${BASE_URL}/api/public/menu/${slug}`);
    latencies.push(latencyMs);
    if (!ok) errors++;
  });

  await Promise.all(promises);
  latencies.sort((a, b) => a - b);

  return {
    scenario: `Menu Load (${slug})`,
    totalRequests: latencies.length,
    successCount: latencies.length - errors,
    errorCount: errors,
    avgLatencyMs: Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length),
    p95LatencyMs: latencies[Math.floor(latencies.length * 0.95)] ?? 0,
    p99LatencyMs: latencies[Math.floor(latencies.length * 0.99)] ?? 0,
  };
}

function printResult(result: TestResult) {
  const passed = result.errorCount === 0 && result.p95LatencyMs < 1000 && result.avgLatencyMs < 500;
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${result.scenario}`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`  Total requests:  ${result.totalRequests}`);
  console.log(`  Success:         ${result.successCount}`);
  console.log(`  Errors:          ${result.errorCount}`);
  console.log(`  Avg latency:     ${result.avgLatencyMs}ms`);
  console.log(`  P95 latency:     ${result.p95LatencyMs}ms`);
  console.log(`  P99 latency:     ${result.p99LatencyMs}ms`);
  console.log(`  Result:          ${passed ? '✅ PASS' : '❌ FAIL'}`);
  if (!passed) {
    if (result.errorCount > 0) console.log('    → Errors occurred under load');
    if (result.p95LatencyMs >= 1000) console.log('    → P95 latency exceeds 1000ms target');
    if (result.avgLatencyMs >= 500) console.log('    → Avg latency exceeds 500ms target');
  }
}

async function main() {
  console.log('\n🔥 ScanBite Load Test');
  console.log(`   Target: ${BASE_URL}`);
  console.log(`   Concurrent users: ${CONCURRENT_USERS}`);
  console.log(`   Orders per user: ${ORDERS_PER_USER}`);
  console.log(`   Started: ${new Date().toISOString()}\n`);

  // Test 1: Health endpoint
  const healthResult = await testHealthEndpoint();
  printResult(healthResult);

  // Test 2: Menu endpoint (use a test slug or skip)
  const testSlug = process.env.TEST_RESTAURANT_SLUG;
  if (testSlug) {
    const menuResult = await testMenuEndpoint(testSlug);
    printResult(menuResult);
  } else {
    console.log('\n⚠️  Skipping menu test — set TEST_RESTAURANT_SLUG env var to enable');
  }

  console.log(`\n${'═'.repeat(60)}`);
  console.log('  Load test complete');
  console.log(`${'═'.repeat(60)}\n`);
}

main().catch(console.error);
