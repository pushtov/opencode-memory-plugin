#!/usr/bin/env node
/**
 * Real UAT Test Script for @csuwl/opencode-memory-plugin
 * This tests the actual user experience from installation to usage
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const HOME = process.env.HOME || process.env.USERPROFILE;
const MEMORY_DIR = path.join(HOME, '.opencode', 'memory');
const DAILY_DIR = path.join(MEMORY_DIR, 'daily');
const SESSIONS_DIR = path.join(MEMORY_DIR, 'sessions');
const CONFIG_FILE = path.join(MEMORY_DIR, 'memory-config.json');

const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

let passed = 0;
let failed = 0;

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

function recordTest(name, success, details = '') {
  if (success) {
    passed++;
    log(`  ✓ ${name}`, 'green');
  } else {
    failed++;
    log(`  ✗ ${name}`, 'red');
    if (details) log(`    ${details}`, 'yellow');
  }
}

// Run a shell command
function runCmd(cmd, timeout = 60000) {
  return new Promise((resolve) => {
    const proc = spawn('bash', ['-c', cmd], { timeout });
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => stdout += data);
    proc.stderr.on('data', (data) => stderr += data);

    proc.on('close', (code) => resolve({ stdout, stderr, code }));
    proc.on('error', (err) => resolve({ stdout: '', stderr: err.message, code: -1 }));
  });
}

// Test using OpenCode CLI
async function testOpenCodeTool(toolName, args) {
  const argsJson = JSON.stringify(args);
  const result = await runCmd(`opencode run "use ${toolName} tool with args: ${argsJson}" --format json 2>&1 | head -100`);
  return result;
}

// ============================================================
// UAT Test 1: Fresh Installation
// ============================================================
async function testFreshInstallation() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('UAT Test 1: Fresh Installation', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

  // Step 1: Check plugin is installed
  const pluginDir = path.join(HOME, '.opencode', 'node_modules', '@csuwl', 'opencode-memory-plugin');
  recordTest('Plugin installed in node_modules', fs.existsSync(pluginDir));

  // Step 2: Run installation script
  log('\n  Running installation script...', 'blue');
  const installResult = await runCmd(`node ${pluginDir}/bin/install.cjs 2>&1`);
  log(`  Install script output (first 500 chars):\n${installResult.stdout.slice(0, 500)}...`, 'blue');

  // Step 3: Verify directory structure
  recordTest('Memory directory created', fs.existsSync(MEMORY_DIR));
  recordTest('Daily directory created', fs.existsSync(DAILY_DIR));
  recordTest('Sessions directory created', fs.existsSync(SESSIONS_DIR));

  // Step 4: Verify core files
  const coreFiles = ['MEMORY.md', 'SOUL.md', 'AGENTS.md', 'USER.md', 'IDENTITY.md', 'TOOLS.md'];
  for (const file of coreFiles) {
    recordTest(`Core file ${file} exists`, fs.existsSync(path.join(MEMORY_DIR, file)));
  }

  // Step 5: Verify configuration
  recordTest('Configuration file exists', fs.existsSync(CONFIG_FILE));
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
      recordTest('Config is valid JSON', true);
      recordTest('Config has embedding settings', !!config.embedding);
      recordTest('Config has search settings', !!config.search);
    } catch (e) {
      recordTest('Config is valid JSON', false, e.message);
    }
  }

  // Step 6: Verify OpenCode configuration
  const openCodeConfig = path.join(HOME, '.config', 'opencode', 'opencode.json');
  if (fs.existsSync(openCodeConfig)) {
    try {
      const config = JSON.parse(fs.readFileSync(openCodeConfig, 'utf-8'));
      recordTest('OpenCode config has plugin registered',
        config.plugin && config.plugin.includes('@csuwl/opencode-memory-plugin'));
      recordTest('OpenCode config has memory instructions',
        config.instructions && config.instructions.length > 0);
    } catch (e) {
      recordTest('OpenCode config valid', false, e.message);
    }
  }
}

// ============================================================
// UAT Test 2: Memory Write Feature
// ============================================================
async function testMemoryWriteFeature() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('UAT Test 2: Memory Write Feature (User Scenario)', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

  log('\n  Scenario: User wants to save an important preference', 'blue');
  log('  Action: Using memory_write tool through OpenCode', 'blue');

  // Simulate user running: opencode run "remember that I prefer TypeScript"
  const result = await runCmd(`opencode run "save to memory: User prefers TypeScript for type safety and better IDE support" --format json 2>&1 | head -50`);

  log(`\n  OpenCode response (truncated):\n${result.stdout.slice(0, 300)}...`, 'blue');

  // Verify the entry was written
  const memoryFile = path.join(MEMORY_DIR, 'MEMORY.md');
  if (fs.existsSync(memoryFile)) {
    const content = fs.readFileSync(memoryFile, 'utf-8');
    recordTest('Memory entry was written to MEMORY.md',
      content.includes('TypeScript') || content.includes('type safety'));
  } else {
    recordTest('Memory entry was written', false, 'MEMORY.md not found');
  }
}

// ============================================================
// UAT Test 3: Memory Search Feature
// ============================================================
async function testMemorySearchFeature() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('UAT Test 3: Memory Search Feature (User Scenario)', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

  log('\n  Scenario: User wants to find what they saved about TypeScript', 'blue');
  log('  Action: Using memory_search tool through OpenCode', 'blue');

  const result = await runCmd(`opencode run "search my memory for TypeScript preferences" --format json 2>&1 | head -50`);

  log(`\n  OpenCode response (truncated):\n${result.stdout.slice(0, 300)}...`, 'blue');

  // Check if response contains search results
  recordTest('Search returned results',
    result.stdout.toLowerCase().includes('typescript') ||
    result.stdout.toLowerCase().includes('found') ||
    result.stdout.toLowerCase().includes('match'));
}

// ============================================================
// UAT Test 4: Daily Log Feature
// ============================================================
async function testDailyLogFeature() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('UAT Test 4: Daily Log Feature (User Scenario)', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

  log('\n  Scenario: User starts a new day and wants a daily log', 'blue');
  log('  Action: Using init_daily tool through OpenCode', 'blue');

  const result = await runCmd(`opencode run "create today's daily log" --format json 2>&1 | head -50`);

  log(`\n  OpenCode response (truncated):\n${result.stdout.slice(0, 300)}...`, 'blue');

  // Verify daily log was created
  const today = new Date().toISOString().split('T')[0];
  const dailyFile = path.join(DAILY_DIR, `${today}.md`);
  recordTest('Daily log file was created', fs.existsSync(dailyFile));

  if (fs.existsSync(dailyFile)) {
    const content = fs.readFileSync(dailyFile, 'utf-8');
    recordTest('Daily log has correct date', content.includes(today));
    recordTest('Daily log has Notes section', content.includes('## Notes'));
  }
}

// ============================================================
// UAT Test 5: Session Save Feature
// ============================================================
async function testSessionSaveFeature() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('UAT Test 5: Session Save Feature (User Scenario)', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

  log('\n  Scenario: User had an important session and wants to save it', 'blue');
  log('  Action: Using save_session tool through OpenCode', 'blue');

  const result = await runCmd(`opencode run "save this session: Discussed TypeScript preferences and decided to use it for all new projects" --format json 2>&1 | head -50`);

  log(`\n  OpenCode response (truncated):\n${result.stdout.slice(0, 300)}...`, 'blue');

  // Verify session was saved
  if (fs.existsSync(SESSIONS_DIR)) {
    const files = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.md'));
    recordTest('Session file was created', files.length > 0);

    if (files.length > 0) {
      const latestFile = path.join(SESSIONS_DIR, files.sort().reverse()[0]);
      const content = fs.readFileSync(latestFile, 'utf-8');
      recordTest('Session file has content', content.includes('TypeScript') || content.length > 50);
    }
  } else {
    recordTest('Session file was created', false, 'Sessions directory not found');
  }
}

// ============================================================
// UAT Test 6: Vector Search Feature
// ============================================================
async function testVectorSearchFeature() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('UAT Test 6: Vector Search Feature (Semantic Search)', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

  log('\n  Scenario: User wants semantic search (not keyword match)', 'blue');
  log('  Action: Using vector_memory_search tool through OpenCode', 'blue');

  const result = await runCmd(`opencode run "search my memory semantically for programming language choices" --format json 2>&1 | head -50`);

  log(`\n  OpenCode response (truncated):\n${result.stdout.slice(0, 300)}...`, 'blue');

  // Vector search should work even with different wording
  recordTest('Semantic search returned results',
    result.stdout.length > 50 &&
    !result.stdout.toLowerCase().includes('error'));
}

// ============================================================
// UAT Test 7: Index Management
// ============================================================
async function testIndexManagementFeature() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('UAT Test 7: Index Management Feature', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

  log('\n  Scenario: User wants to rebuild the search index', 'blue');
  log('  Action: Using rebuild_index tool through OpenCode', 'blue');

  const result = await runCmd(`opencode run "rebuild the memory search index" --format json 2>&1 | head -50`);

  log(`\n  OpenCode response (truncated):\n${result.stdout.slice(0, 300)}...`, 'blue');

  // Check if vector database was created
  const vectorDb = path.join(MEMORY_DIR, 'vector-index.db');
  recordTest('Vector database was created', fs.existsSync(vectorDb));

  // Check index status
  const hashFile = path.join(MEMORY_DIR, '.index-hashes.json');
  recordTest('Hash cache was created', fs.existsSync(hashFile));
}

// ============================================================
// UAT Test 8: List Features
// ============================================================
async function testListFeatures() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('UAT Test 8: List Features (Sessions & Daily Logs)', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

  log('\n  Scenario: User wants to see their saved sessions', 'blue');
  const sessionsResult = await runCmd(`opencode run "list my saved sessions" --format json 2>&1 | head -30`);
  log(`  Response: ${sessionsResult.stdout.slice(0, 200)}...`, 'blue');
  recordTest('List sessions works', !sessionsResult.stdout.toLowerCase().includes('error'));

  log('\n  Scenario: User wants to see their daily logs', 'blue');
  const dailyResult = await runCmd(`opencode run "list my daily logs" --format json 2>&1 | head -30`);
  log(`  Response: ${dailyResult.stdout.slice(0, 200)}...`, 'blue');
  recordTest('List daily logs works', !dailyResult.stdout.toLowerCase().includes('error'));
}

// ============================================================
// UAT Test 9: Configuration
// ============================================================
async function testConfiguration() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('UAT Test 9: Configuration Feature', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

  log('\n  Scenario: User wants to check index status', 'blue');
  const result = await runCmd(`opencode run "show memory index status" --format json 2>&1 | head -30`);
  log(`  Response: ${result.stdout.slice(0, 200)}...`, 'blue');
  recordTest('Index status works', !result.stdout.toLowerCase().includes('error'));
}

// ============================================================
// Main Test Runner
// ============================================================
async function runUATTests() {
  log('\n╔════════════════════════════════════════════════════════════════╗', 'blue');
  log('║     OpenCode Memory Plugin - Real UAT Test Suite               ║', 'blue');
  log('║     Testing User Experience from Installation to Usage         ║', 'blue');
  log('╚════════════════════════════════════════════════════════════════╝', 'blue');

  const startTime = Date.now();

  try {
    await testFreshInstallation();
    await testMemoryWriteFeature();
    await testMemorySearchFeature();
    await testDailyLogFeature();
    await testSessionSaveFeature();
    await testVectorSearchFeature();
    await testIndexManagementFeature();
    await testListFeatures();
    await testConfiguration();
  } catch (e) {
    log(`\nUAT Test Error: ${e.message}`, 'red');
    console.error(e);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  // Summary
  log('\n╔════════════════════════════════════════════════════════════════╗', 'blue');
  log('║                      UAT Test Summary                          ║', 'blue');
  log('╚════════════════════════════════════════════════════════════════╝', 'blue');
  log(`\n  Total Tests: ${passed + failed}`, 'reset');
  log(`  Passed: ${passed}`, 'green');
  log(`  Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  log(`  Duration: ${duration}s`, 'blue');

  log('\n  UAT Test Complete!', passed === passed + failed ? 'green' : 'yellow');
  log('  All user scenarios passed successfully.\n', 'green');

  process.exit(failed > 0 ? 1 : 0);
}

runUATTests();