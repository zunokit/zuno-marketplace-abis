#!/usr/bin/env node

/**
 * Basic API Key Rate Limit Test Script
 *
 * Tests rate limiting behavior for basic (non-admin) API keys.
 * This key SHOULD hit rate limits to verify the rate limiting system works.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const fs = require('fs');

const BASIC_API_KEY = 'zuno_DETKZptWvTUmwINlCwZZvzWyVrNtXSOJ';
const BASE_URL = 'http://localhost:3000';
const TOTAL_REQUESTS = 2000; // Stress test to ensure rate limiting triggers
const REQUEST_DELAY = 10; // ms between requests (very fast to trigger rate limit)

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
};

const stats = {
  total: 0,
  success: 0,
  rateLimited: 0,
  errors: 0,
  startTime: Date.now(),
};

/**
 * Make a GET request to test endpoint
 */
async function makeGetRequest(requestNum) {
  const url = `${BASE_URL}/api/abis`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${BASIC_API_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    return handleResponse(response, 'GET', requestNum);
  } catch (error) {
    return handleError(error, 'GET', requestNum);
  }
}

/**
 * Handle API response
 */
async function handleResponse(response, method, requestNum) {
  stats.total++;

  const rateLimitHeaders = {
    limit: response.headers.get('x-ratelimit-limit'),
    remaining: response.headers.get('x-ratelimit-remaining'),
    reset: response.headers.get('x-ratelimit-reset'),
  };

  const result = {
    requestNum,
    method,
    status: response.status,
    statusText: response.statusText,
    rateLimitHeaders,
    timestamp: new Date().toISOString(),
  };

  let bodyPreview = '';
  try {
    const text = await response.text();
    bodyPreview = text.substring(0, 100);
    if (text.length > 100) bodyPreview += '...';
  } catch (e) {
    bodyPreview = '[Unable to read body]';
  }

  // Show detailed logs for first 20, last 20, and every 100th request, or always show rate limited
  const showDetailed = requestNum <= 20 || requestNum >= TOTAL_REQUESTS - 20 || requestNum % 100 === 0 || response.status === 429;

  if (response.status === 429) {
    stats.rateLimited++;
    if (showDetailed) {
      console.log(
        `${colors.red}[${requestNum}/${TOTAL_REQUESTS}] ${method} - RATE LIMITED (429)${colors.reset}`
      );
      console.log(
        `${colors.yellow}  ├─ Limit: ${rateLimitHeaders.limit || 'N/A'}${colors.reset}`
      );
      console.log(
        `${colors.yellow}  ├─ Remaining: ${rateLimitHeaders.remaining || 'N/A'}${colors.reset}`
      );
      console.log(
        `${colors.yellow}  └─ Reset: ${rateLimitHeaders.reset ? new Date(parseInt(rateLimitHeaders.reset) * 1000).toISOString() : 'N/A'}${colors.reset}`
      );
    }
    result.rateLimited = true;
  } else if (response.ok) {
    stats.success++;
    if (showDetailed) {
      console.log(
        `${colors.green}[${requestNum}/${TOTAL_REQUESTS}] ${method} - SUCCESS (${response.status})${colors.reset}`
      );
      console.log(
        `${colors.gray}  ├─ Limit: ${rateLimitHeaders.limit || 'N/A'}${colors.reset}`
      );
      console.log(
        `${colors.gray}  ├─ Remaining: ${rateLimitHeaders.remaining || 'N/A'}${colors.reset}`
      );
      console.log(
        `${colors.gray}  └─ Body: ${bodyPreview}${colors.reset}`
      );
    } else if (requestNum % 50 === 0) {
      // Show progress every 50 requests
      process.stdout.write(`${colors.gray}Progress: ${requestNum}/${TOTAL_REQUESTS} (${Math.round(requestNum/TOTAL_REQUESTS*100)}%) - Success: ${stats.success}, Rate Limited: ${stats.rateLimited}${colors.reset}\r`);
    }
  } else {
    stats.errors++;
    if (showDetailed) {
      console.log(
        `${colors.yellow}[${requestNum}/${TOTAL_REQUESTS}] ${method} - ERROR (${response.status})${colors.reset}`
      );
      console.log(
        `${colors.gray}  └─ Body: ${bodyPreview}${colors.reset}`
      );
    }
    result.error = true;
  }

  return result;
}

/**
 * Handle request error
 */
function handleError(error, method, requestNum) {
  stats.total++;
  stats.errors++;

  console.log(
    `${colors.red}[${requestNum}/${TOTAL_REQUESTS}] ${method} - EXCEPTION${colors.reset}`
  );
  console.log(
    `${colors.red}  └─ ${error.message}${colors.reset}`
  );

  return {
    requestNum,
    method,
    error: error.message,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Print summary statistics
 */
function printSummary() {
  const duration = ((Date.now() - stats.startTime) / 1000).toFixed(2);
  const avgRequestsPerSecond = (stats.total / parseFloat(duration)).toFixed(2);

  console.log('\n' + '='.repeat(60));
  console.log(`${colors.cyan}BASIC API KEY RATE LIMIT TEST SUMMARY${colors.reset}`);
  console.log('='.repeat(60));
  console.log(`${colors.blue}API Key:${colors.reset} ${BASIC_API_KEY.substring(0, 20)}...`);
  console.log(`${colors.blue}Total Requests:${colors.reset} ${stats.total}`);
  console.log(`${colors.green}Successful:${colors.reset} ${stats.success} (${((stats.success / stats.total) * 100).toFixed(1)}%)`);
  console.log(`${colors.red}Rate Limited:${colors.reset} ${stats.rateLimited} (${((stats.rateLimited / stats.total) * 100).toFixed(1)}%)`);
  console.log(`${colors.yellow}Errors:${colors.reset} ${stats.errors} (${((stats.errors / stats.total) * 100).toFixed(1)}%)`);
  console.log(`${colors.blue}Duration:${colors.reset} ${duration}s`);
  console.log(`${colors.blue}Avg Requests/Second:${colors.reset} ${avgRequestsPerSecond}`);
  console.log('='.repeat(60) + '\n');

  // Interpretation
  if (stats.rateLimited > 0) {
    console.log(`${colors.green}✓ Basic API key correctly enforced rate limiting (${stats.rateLimited} times)${colors.reset}`);
    console.log(`${colors.gray}  This confirms the rate limiting system is working as expected.${colors.reset}\n`);
  } else {
    console.log(`${colors.yellow}⚠ Basic API key was NOT rate limited - this may indicate a configuration issue${colors.reset}\n`);
  }
}

/**
 * Main test runner
 */
async function runTest() {
  console.log('\n' + '='.repeat(60));
  console.log(`${colors.cyan}BASIC API KEY RATE LIMIT TEST${colors.reset}`);
  console.log('='.repeat(60));
  console.log(`${colors.blue}API Key:${colors.reset} ${BASIC_API_KEY.substring(0, 20)}...`);
  console.log(`${colors.blue}Base URL:${colors.reset} ${BASE_URL}`);
  console.log(`${colors.blue}Total Requests:${colors.reset} ${TOTAL_REQUESTS}`);
  console.log(`${colors.blue}Delay Between Requests:${colors.reset} ${REQUEST_DELAY}ms`);
  console.log(`${colors.yellow}Expected: This key SHOULD be rate limited${colors.reset}`);
  console.log('='.repeat(60) + '\n');

  const results = [];

  for (let i = 1; i <= TOTAL_REQUESTS; i++) {
    // Only GET requests for basic key (no write permissions anyway)
    const result = await makeGetRequest(i);
    results.push(result);

    // If we hit rate limit 10 times in a row, we've proven the point
    const recentResults = results.slice(-10);
    if (recentResults.length === 10 && recentResults.every(r => r.rateLimited)) {
      console.log(`\n${colors.green}✓ Rate limiting confirmed! Hit limit 10 times consecutively.${colors.reset}`);
      console.log(`${colors.gray}Stopping test early as rate limiting is clearly working.${colors.reset}\n`);
      break;
    }

    // Add delay between requests
    if (i < TOTAL_REQUESTS) {
      await sleep(REQUEST_DELAY);
    }
  }

  printSummary();

  // Save results to file
  const resultsFile = `scripts/test-results-basic-${Date.now()}.json`;
  fs.writeFileSync(
    resultsFile,
    JSON.stringify({ stats, results }, null, 2)
  );
  console.log(`${colors.gray}Results saved to: ${resultsFile}${colors.reset}\n`);
}

// Check if server is running
async function checkServer() {
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    if (!response.ok) {
      console.error(`${colors.red}Server health check failed with status ${response.status}${colors.reset}`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`${colors.red}Cannot connect to server at ${BASE_URL}${colors.reset}`);
    console.error(`${colors.yellow}Make sure the dev server is running: pnpm dev${colors.reset}\n`);
    process.exit(1);
  }
}

// Run the test
(async () => {
  await checkServer();
  await runTest();
})();
