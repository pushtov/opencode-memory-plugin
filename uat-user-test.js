#!/usr/bin/env node
/**
 * UAT Test - Simulating Real User Experience
 * Tests the complete user journey from installation to daily usage
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HOME = process.env.HOME || process.env.USERPROFILE;
const MEMORY_DIR = path.join(HOME, '.opencode', 'memory');
const DAILY_DIR = path.join(MEMORY_DIR, 'daily');
const SESSIONS_DIR = path.join(MEMORY_DIR, 'sessions');
const CONFIG_FILE = path.join(MEMORY_DIR, 'memory-config.json');
const OPENCODE_CONFIG = path.join(HOME, '.config', 'opencode', 'opencode.json');

const colors = {
  green: '\x1b[32m', red: '\x1b[31m', yellow: '\x1b[33m', blue: '\x1b[34m', cyan: '\x1b[36m', reset: '\x1b[0m'
};

let passed = 0, failed = 0;

function log(msg, color = 'reset') { console.log(`${colors[color]}${msg}${colors.reset}`); }
function record(name, success, detail = '') {
  if (success) { passed++; log(`  ✓ ${name}`, 'green'); }
  else { failed++; log(`  ✗ ${name}`, 'red'); if (detail) log(`    ${detail}`, 'yellow'); }
}

console.log(`
╔════════════════════════════════════════════════════════════════╗
║     UAT Test: Real User Experience Simulation                  ║
╚════════════════════════════════════════════════════════════════╝
`);

// ============================================
// Test 1: Fresh Installation Verification
// ============================================
log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
log('UAT 1: Fresh Installation (User installs plugin)', 'cyan');
log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

log('\n  User action: npm install @csuwl/opencode-memory-plugin', 'blue');

// Verify installation
record('Plugin directory exists', fs.existsSync(MEMORY_DIR));
record('Daily logs directory exists', fs.existsSync(DAILY_DIR));
record('Sessions directory exists', fs.existsSync(SESSIONS_DIR));
record('Configuration file exists', fs.existsSync(CONFIG_FILE));

// Verify core memory files
const coreFiles = ['MEMORY.md', 'SOUL.md', 'AGENTS.md', 'USER.md', 'IDENTITY.md', 'TOOLS.md', 'BOOT.md', 'HEARTBEAT.md'];
let filesExist = 0;
coreFiles.forEach(f => { if (fs.existsSync(path.join(MEMORY_DIR, f))) filesExist++; });
record(`Core memory files exist (${filesExist}/${coreFiles.length})`, filesExist === coreFiles.length);

// Verify OpenCode configuration
if (fs.existsSync(OPENCODE_CONFIG)) {
  try {
    const config = JSON.parse(fs.readFileSync(OPENCODE_CONFIG, 'utf-8'));
    record('OpenCode config has plugin registered', config.plugin?.includes('@csuwl/opencode-memory-plugin'));
    record('OpenCode config has memory instructions', (config.instructions?.length || 0) > 0);
    record('OpenCode config has memory tools', Object.keys(config.tools || {}).length > 0);
    record('OpenCode config has memory agents', Object.keys(config.agent || {}).length > 0);
  } catch (e) {
    record('OpenCode configuration valid', false, e.message);
  }
}

// ============================================
// Test 2: User Saves Memory
// ============================================
log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
log('UAT 2: User Saves Important Information', 'cyan');
log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

log('\n  User action: "Remember that I prefer TypeScript for type safety"', 'blue');

// Import and test the plugin directly
const pluginPath = path.join(HOME, '.opencode', 'node_modules', '@csuwl', 'opencode-memory-plugin', 'plugin.js');

if (fs.existsSync(pluginPath)) {
  const module = await import(pluginPath);
  const plugin = await module.MemoryPlugin({});

  // Test memory_write
  try {
    const result = await plugin.tool.memory_write.execute({
      content: 'User prefers TypeScript for type safety and better IDE support',
      type: 'preference',
      tags: ['programming', 'typescript']
    });
    const parsed = JSON.parse(result);
    record('memory_write: Save user preference', parsed.success);

    // Verify it was written
    const memoryContent = fs.readFileSync(path.join(MEMORY_DIR, 'MEMORY.md'), 'utf-8');
    record('memory_write: Content persisted to MEMORY.md', memoryContent.includes('TypeScript'));
  } catch (e) {
    record('memory_write tool', false, e.message);
  }

  // ============================================
  // Test 3: User Searches Memory
  // ============================================
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('UAT 3: User Searches Their Memory', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

  log('\n  User action: "What did I say about TypeScript?"', 'blue');

  try {
    const result = await plugin.tool.memory_search.execute({ query: 'TypeScript' });
    const parsed = JSON.parse(result);
    record('memory_search: Search works', parsed.success);
    record('memory_search: Found matches', parsed.count > 0);
  } catch (e) {
    record('memory_search tool', false, e.message);
  }

  // ============================================
  // Test 4: User Reads Memory File
  // ============================================
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('UAT 4: User Reads Their Memory File', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

  log('\n  User action: "Show me my MEMORY.md"', 'blue');

  try {
    const result = await plugin.tool.memory_read.execute({ file: 'MEMORY.md' });
    const parsed = JSON.parse(result);
    record('memory_read: Read works', parsed.success);
    record('memory_read: Returns content', parsed.content && parsed.content.length > 0);
    record('memory_read: Returns metadata', parsed.lines !== undefined && parsed.size !== undefined);
  } catch (e) {
    record('memory_read tool', false, e.message);
  }

  // ============================================
  // Test 5: Semantic Search
  // ============================================
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('UAT 5: User Uses Semantic Search', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

  log('\n  User action: "Search for programming language choices"', 'blue');

  try {
    const result = await plugin.tool.vector_memory_search.execute({ query: 'programming language choices', limit: 5 });
    const parsed = JSON.parse(result);
    record('vector_memory_search: Search works', parsed.success);
    record('vector_memory_search: Returns matches', Array.isArray(parsed.matches));
    if (parsed.warning) log(`    Note: ${parsed.warning}`, 'yellow');
  } catch (e) {
    record('vector_memory_search tool', false, e.message);
  }

  // ============================================
  // Test 6: Daily Log
  // ============================================
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('UAT 6: User Creates Daily Log', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

  log('\n  User action: "Create today\'s daily log"', 'blue');

  try {
    const result = await plugin.tool.init_daily.execute({});
    const parsed = JSON.parse(result);
    record('init_daily: Creates daily log', parsed.success);

    const today = new Date().toISOString().split('T')[0];
    const dailyFile = path.join(DAILY_DIR, `${today}.md`);
    record('init_daily: File exists', fs.existsSync(dailyFile));
  } catch (e) {
    record('init_daily tool', false, e.message);
  }

  // ============================================
  // Test 7: List Daily Logs
  // ============================================
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('UAT 7: User Lists Their Daily Logs', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

  log('\n  User action: "Show my recent daily logs"', 'blue');

  try {
    const result = await plugin.tool.list_daily.execute({ days: 7 });
    const parsed = JSON.parse(result);
    record('list_daily: Lists logs', parsed.success);
    record('list_daily: Returns files array', Array.isArray(parsed.files));
  } catch (e) {
    record('list_daily tool', false, e.message);
  }

  // ============================================
  // Test 8: Save Session
  // ============================================
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('UAT 8: User Saves a Session', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

  log('\n  User action: "Save this session about TypeScript preferences"', 'blue');

  try {
    const result = await plugin.tool.save_session.execute({
      title: 'TypeScript Preferences Discussion',
      content: 'User discussed their preference for TypeScript due to type safety and IDE support.',
      tags: ['typescript', 'preferences']
    });
    const parsed = JSON.parse(result);
    record('save_session: Saves session', parsed.success);
    record('save_session: Returns file path', !!parsed.file);

    // Verify session was saved
    const sessionFiles = fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.md'));
    record('save_session: File created', sessionFiles.length > 0);
  } catch (e) {
    record('save_session tool', false, e.message);
  }

  // ============================================
  // Test 9: List Sessions
  // ============================================
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('UAT 9: User Lists Their Sessions', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

  log('\n  User action: "Show my saved sessions"', 'blue');

  try {
    const result = await plugin.tool.list_sessions.execute({ limit: 10 });
    const parsed = JSON.parse(result);
    record('list_sessions: Lists sessions', parsed.success);
    record('list_sessions: Returns sessions array', Array.isArray(parsed.sessions));
  } catch (e) {
    record('list_sessions tool', false, e.message);
  }

  // ============================================
  // Test 10: Index Management
  // ============================================
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('UAT 10: User Manages Search Index', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

  log('\n  User action: "Rebuild the search index"', 'blue');

  try {
    const result = await plugin.tool.rebuild_index.execute({ force: true });
    const parsed = JSON.parse(result);
    record('rebuild_index: Rebuilds index', parsed.success);
    record('rebuild_index: Returns indexed files count', parsed.indexedFiles !== undefined);
  } catch (e) {
    record('rebuild_index tool', false, e.message);
  }

  // Check index status
  try {
    const result = await plugin.tool.index_status.execute({});
    const parsed = JSON.parse(result);
    record('index_status: Returns status', parsed.success);
  } catch (e) {
    record('index_status tool', false, e.message);
  }

  // Check vector database
  const vectorDb = path.join(MEMORY_DIR, 'vector-index.db');
  record('Vector database file exists', fs.existsSync(vectorDb));

} else {
  record('Plugin installed', false, 'Plugin not found at ' + pluginPath);
}

// ============================================
// Summary
// ============================================
console.log(`
╔════════════════════════════════════════════════════════════════╗
║                      UAT Test Summary                          ║
╚════════════════════════════════════════════════════════════════╝

  Total Tests: ${passed + failed}
  Passed: ${passed}
  Failed: ${failed}
`);

if (failed === 0) {
  log('  ✓ All UAT tests passed! Plugin is ready for production.', 'green');
} else {
  log(`  ✗ ${failed} tests failed. Please fix issues before release.`, 'red');
}

process.exit(failed > 0 ? 1 : 0);