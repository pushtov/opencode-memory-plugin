#!/usr/bin/env node
/**
 * Direct UAT Test Script for @csuwl/opencode-memory-plugin
 * Tests all 12 tools directly without requiring OpenCode CLI
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
const VECTOR_DB = path.join(MEMORY_DIR, 'vector-index.db');
const HASH_FILE = path.join(MEMORY_DIR, '.index-hashes.json');

// Colors for output
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
let tests = [];

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function recordTest(name, success, details = '') {
  tests.push({ name, success, details });
  if (success) {
    passed++;
    log(`  ✓ ${name}`, 'green');
  } else {
    failed++;
    log(`  ✗ ${name}`, 'red');
    if (details) log(`    Details: ${details}`, 'yellow');
  }
}

// Import the plugin
async function loadPlugin() {
  const pluginPath = path.join(HOME, '.opencode', 'node_modules', '@csuwl', 'opencode-memory-plugin', 'plugin.js');
  const { MemoryPlugin } = await import(pluginPath);
  return MemoryPlugin({});
}

// Test 1: Installation and Directory Structure
async function testInstallation() {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('Test Suite 1: Installation and Directory Structure', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

  // Check memory directory exists
  recordTest('Memory directory exists', fs.existsSync(MEMORY_DIR));

  // Check daily directory exists
  recordTest('Daily directory exists', fs.existsSync(DAILY_DIR));

  // Check sessions directory exists
  recordTest('Sessions directory exists', fs.existsSync(SESSIONS_DIR));

  // Check configuration file exists
  recordTest('Configuration file exists', fs.existsSync(CONFIG_FILE));

  // Check core memory files
  const coreFiles = ['MEMORY.md', 'SOUL.md', 'AGENTS.md', 'USER.md', 'IDENTITY.md', 'TOOLS.md'];
  for (const file of coreFiles) {
    recordTest(`Core file ${file} exists`, fs.existsSync(path.join(MEMORY_DIR, file)));
  }

  // Check configuration structure
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    recordTest('Config has version', !!config.version);
    recordTest('Config has embedding settings', !!config.embedding);
    recordTest('Config has search settings', !!config.search);
    recordTest('Config has indexing settings', !!config.indexing);
  } catch (e) {
    recordTest('Configuration is valid JSON', false, e.message);
  }
}

// Test 2: memory_write tool
async function testMemoryWrite(plugin) {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('Test Suite 2: memory_write Tool', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

  const { memory_write } = plugin.tool;

  // Test basic write
  try {
    const result = await memory_write.execute({
      content: 'UAT Test Entry 1 - Basic write test',
      type: 'note',
      tags: ['uat', 'test']
    });
    const parsed = JSON.parse(result);
    recordTest('memory_write basic success', parsed.success === true);
    recordTest('memory_write returns file path', !!parsed.file);
  } catch (e) {
    recordTest('memory_write basic', false, e.message);
  }

  // Test write with different types
  const types = ['preference', 'decision', 'note', 'general'];
  for (const type of types) {
    try {
      const result = await memory_write.execute({
        content: `UAT Test ${type} entry`,
        type: type,
        tags: [`uat-${type}`]
      });
      const parsed = JSON.parse(result);
      recordTest(`memory_write type: ${type}`, parsed.success === true && parsed.type === type);
    } catch (e) {
      recordTest(`memory_write type: ${type}`, false, e.message);
    }
  }

  // Test write creates entry in file
  try {
    const content = fs.readFileSync(path.join(MEMORY_DIR, 'MEMORY.md'), 'utf-8');
    recordTest('memory_write appends to MEMORY.md', content.includes('UAT Test Entry 1'));
  } catch (e) {
    recordTest('memory_write appends to file', false, e.message);
  }
}

// Test 3: memory_read tool
async function testMemoryRead(plugin) {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('Test Suite 3: memory_read Tool', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

  const { memory_read } = plugin.tool;

  // Test read default MEMORY.md
  try {
    const result = await memory_read.execute({ file: 'MEMORY.md' });
    const parsed = JSON.parse(result);
    recordTest('memory_read MEMORY.md success', parsed.success === true);
    recordTest('memory_read returns content', !!parsed.content);
    recordTest('memory_read returns lines count', typeof parsed.lines === 'number');
    recordTest('memory_read returns size', typeof parsed.size === 'number');
  } catch (e) {
    recordTest('memory_read MEMORY.md', false, e.message);
  }

  // Test read other core files
  const coreFiles = ['SOUL.md', 'AGENTS.md', 'USER.md'];
  for (const file of coreFiles) {
    try {
      const result = await memory_read.execute({ file });
      const parsed = JSON.parse(result);
      recordTest(`memory_read ${file}`, parsed.success === true);
    } catch (e) {
      recordTest(`memory_read ${file}`, false, e.message);
    }
  }

  // Test read non-existent file
  try {
    const result = await memory_read.execute({ file: 'NONEXISTENT.md' });
    const parsed = JSON.parse(result);
    recordTest('memory_read handles missing file', parsed.success === false);
  } catch (e) {
    recordTest('memory_read handles missing file', true);
  }

  // Test directory traversal protection
  try {
    const result = await memory_read.execute({ file: '../etc/passwd' });
    const parsed = JSON.parse(result);
    recordTest('memory_read blocks directory traversal', parsed.success === false);
  } catch (e) {
    recordTest('memory_read blocks directory traversal', true);
  }
}

// Test 4: memory_search tool
async function testMemorySearch(plugin) {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('Test Suite 4: memory_search Tool', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

  const { memory_search } = plugin.tool;

  // Test basic search
  try {
    const result = await memory_search.execute({ query: 'UAT Test' });
    const parsed = JSON.parse(result);
    recordTest('memory_search basic success', parsed.success === true);
    recordTest('memory_search finds matches', parsed.count > 0);
    recordTest('memory_search returns matches array', Array.isArray(parsed.matches));
  } catch (e) {
    recordTest('memory_search basic', false, e.message);
  }

  // Test case-insensitive search
  try {
    const result = await memory_search.execute({ query: 'uat test' });
    const parsed = JSON.parse(result);
    recordTest('memory_search case-insensitive', parsed.count > 0);
  } catch (e) {
    recordTest('memory_search case-insensitive', false, e.message);
  }

  // Test search in specific file
  try {
    const result = await memory_search.execute({ query: 'personality', file: 'SOUL.md' });
    const parsed = JSON.parse(result);
    recordTest('memory_search specific file', parsed.success === true);
  } catch (e) {
    recordTest('memory_search specific file', false, e.message);
  }
}

// Test 5: vector_memory_search tool
async function testVectorMemorySearch(plugin) {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('Test Suite 5: vector_memory_search Tool', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

  const { vector_memory_search } = plugin.tool;

  // Test semantic search
  try {
    const result = await vector_memory_search.execute({
      query: 'testing memory system',
      limit: 5
    });
    // Result might be object or string
    const parsed = typeof result === 'string' ? JSON.parse(result) : result;
    recordTest('vector_memory_search basic success', parsed.success === true);
    recordTest('vector_memory_search returns mode', !!parsed.mode);
    recordTest('vector_memory_search returns matches', Array.isArray(parsed.matches));

    if (parsed.note) {
      log(`    Note: ${parsed.note}`, 'yellow');
    }
  } catch (e) {
    recordTest('vector_memory_search basic', false, e.message);
  }

  // Test different search modes
  const modes = ['vector', 'keyword', 'hybrid'];
  for (const mode of modes) {
    try {
      const result = await vector_memory_search.execute({
        query: 'test query',
        mode: mode,
        limit: 3
      });
      const parsed = typeof result === 'string' ? JSON.parse(result) : result;
      recordTest(`vector_memory_search mode: ${mode}`, parsed.success === true);
    } catch (e) {
      recordTest(`vector_memory_search mode: ${mode}`, false, e.message);
    }
  }

  // Test threshold parameter
  try {
    const result = await vector_memory_search.execute({
      query: 'test',
      threshold: 0.5
    });
    const parsed = typeof result === 'string' ? JSON.parse(result) : result;
    recordTest('vector_memory_search with threshold', parsed.success === true);
  } catch (e) {
    recordTest('vector_memory_search with threshold', false, e.message);
  }

  // Test invalid threshold
  try {
    const result = await vector_memory_search.execute({
      query: 'test',
      threshold: 2.0
    });
    const parsed = typeof result === 'string' ? JSON.parse(result) : result;
    recordTest('vector_memory_search rejects invalid threshold', parsed.success === false);
  } catch (e) {
    recordTest('vector_memory_search rejects invalid threshold', true);
  }
}

// Test 6: init_daily and list_daily tools
async function testDailyLogs(plugin) {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('Test Suite 6: Daily Logs (init_daily & list_daily)', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

  const { init_daily, list_daily } = plugin.tool;

  // Test init_daily
  try {
    const result = await init_daily.execute({});
    const parsed = JSON.parse(result);
    recordTest('init_daily success', parsed.success === true);
    recordTest('init_daily returns date', !!parsed.date);
  } catch (e) {
    recordTest('init_daily', false, e.message);
  }

  // Check daily file was created
  const today = new Date().toISOString().split('T')[0];
  const dailyFile = path.join(DAILY_DIR, `${today}.md`);
  recordTest('Daily log file exists', fs.existsSync(dailyFile));

  // Test daily file content
  try {
    const content = fs.readFileSync(dailyFile, 'utf-8');
    recordTest('Daily log has correct date', content.includes(today));
    recordTest('Daily log has Notes section', content.includes('## Notes'));
    recordTest('Daily log has Tasks section', content.includes('## Tasks'));
    recordTest('Daily log has Learnings section', content.includes('## Learnings'));
  } catch (e) {
    recordTest('Daily log content validation', false, e.message);
  }

  // Test list_daily
  try {
    const result = await list_daily.execute({ days: 7 });
    const parsed = JSON.parse(result);
    recordTest('list_daily success', parsed.success === true);
    recordTest('list_daily returns files array', Array.isArray(parsed.files));
    recordTest('list_daily returns count', typeof parsed.count === 'number');

    if (parsed.files.length > 0) {
      const firstFile = parsed.files[0];
      recordTest('list_daily file has name', !!firstFile.name);
      recordTest('list_daily file has size', typeof firstFile.size === 'number');
      recordTest('list_daily file has modified', !!firstFile.modified);
    }
  } catch (e) {
    recordTest('list_daily', false, e.message);
  }
}

// Test 7: save_session and list_sessions tools
async function testSessions(plugin) {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('Test Suite 7: Sessions (save_session & list_sessions)', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

  const { save_session, list_sessions } = plugin.tool;

  // Test save_session with title
  try {
    const result = await save_session.execute({
      title: 'UAT Test Session',
      content: 'This is a test session for UAT testing. We are verifying session save functionality.',
      tags: ['uat', 'test']
    });
    const parsed = JSON.parse(result);
    recordTest('save_session with title success', parsed.success === true);
    recordTest('save_session returns file path', !!parsed.file);
    recordTest('save_session returns title', parsed.title === 'UAT Test Session');
  } catch (e) {
    recordTest('save_session with title', false, e.message);
  }

  // Test save_session without title (auto-generate)
  try {
    const result = await save_session.execute({
      content: 'Auto-generated title test session for UAT verification purposes.'
    });
    const parsed = JSON.parse(result);
    recordTest('save_session auto-title success', parsed.success === true);
    recordTest('save_session auto-generates title', !!parsed.title);
  } catch (e) {
    recordTest('save_session auto-title', false, e.message);
  }

  // Check session files exist
  const sessionFiles = fs.existsSync(SESSIONS_DIR)
    ? fs.readdirSync(SESSIONS_DIR).filter(f => f.endsWith('.md'))
    : [];
  recordTest('Session files exist in directory', sessionFiles.length > 0);

  // Test list_sessions
  try {
    const result = await list_sessions.execute({ limit: 10 });
    const parsed = JSON.parse(result);
    recordTest('list_sessions success', parsed.success === true);
    recordTest('list_sessions returns sessions array', Array.isArray(parsed.sessions));
    recordTest('list_sessions returns count', typeof parsed.count === 'number');

    if (parsed.sessions.length > 0) {
      const firstSession = parsed.sessions[0];
      recordTest('list_sessions session has name', !!firstSession.name);
      recordTest('list_sessions session has size', typeof firstSession.size === 'number');
      recordTest('list_sessions session has modified', !!firstSession.modified);
      recordTest('list_sessions session has path', !!firstSession.path);
    }
  } catch (e) {
    recordTest('list_sessions', false, e.message);
  }
}

// Test 8: Index Management tools
async function testIndexManagement(plugin) {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('Test Suite 8: Index Management', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

  const { index_status, configure_index, update_index, rebuild_index } = plugin.tool;

  // Test index_status
  try {
    const result = await index_status.execute({});
    const parsed = typeof result === 'string' ? JSON.parse(result) : result;
    recordTest('index_status success', parsed.success === true);
    recordTest('index_status returns config', !!parsed.config);
    recordTest('index_status returns files', !!parsed.files);
    recordTest('index_status returns vectorIndex', !!parsed.vectorIndex);
  } catch (e) {
    recordTest('index_status', false, e.message);
  }

  // Test configure_index
  try {
    const result = await configure_index.execute({
      autoUpdate: true,
      debounceDelay: 2000,
      batchSize: 5
    });
    const parsed = JSON.parse(result);
    recordTest('configure_index success', parsed.success === true);
    recordTest('configure_index returns config', !!parsed.config);
  } catch (e) {
    recordTest('configure_index', false, e.message);
  }

  // Test configure_index validation
  try {
    const result = await configure_index.execute({ debounceDelay: -100 });
    const parsed = JSON.parse(result);
    recordTest('configure_index rejects negative delay', parsed.success === false);
  } catch (e) {
    recordTest('configure_index rejects negative delay', true);
  }

  // Test update_index
  try {
    const result = await update_index.execute({ force: false });
    const parsed = typeof result === 'string' ? JSON.parse(result) : result;
    recordTest('update_index success', parsed.success === true);
  } catch (e) {
    recordTest('update_index', false, e.message);
  }

  // Test rebuild_index
  try {
    const result = await rebuild_index.execute({ force: false });
    const parsed = JSON.parse(result);
    recordTest('rebuild_index success', parsed.success === true);
    recordTest('rebuild_index returns indexedFiles', typeof parsed.indexedFiles === 'number');
    recordTest('rebuild_index returns totalChunks', typeof parsed.totalChunks === 'number');
  } catch (e) {
    recordTest('rebuild_index', false, e.message);
  }

  // Check vector database file exists (may take time to create)
  await new Promise(resolve => setTimeout(resolve, 1000));
  recordTest('Vector database file exists', fs.existsSync(VECTOR_DB));

  // Check hash cache file
  recordTest('Hash cache file exists', fs.existsSync(HASH_FILE));
}

// Test 9: Vector Store and Search
async function testVectorStore(plugin) {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('Test Suite 9: Vector Store and Search', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

  const { rebuild_index, vector_memory_search } = plugin.tool;

  // Test rebuild with force to ensure index is populated
  try {
    const result = await rebuild_index.execute({ force: true });
    const parsed = JSON.parse(result);
    recordTest('rebuild_index force success', parsed.success === true);

    if (parsed.model) {
      recordTest('rebuild_index returns model', true);
      log(`    Model: ${parsed.model}`, 'blue');
    }
    if (parsed.dimensions) {
      recordTest('rebuild_index returns dimensions', true);
      log(`    Dimensions: ${parsed.dimensions}`, 'blue');
    }
  } catch (e) {
    recordTest('rebuild_index force', false, e.message);
  }

  // Test semantic search after indexing
  try {
    const result = await vector_memory_search.execute({
      query: 'test memory system functionality',
      mode: 'hybrid',
      limit: 5
    });
    const parsed = typeof result === 'string' ? JSON.parse(result) : result;
    recordTest('Semantic search after indexing', parsed.success === true);

    if (parsed.model) {
      log(`    Search model: ${parsed.model}`, 'blue');
    }
    if (parsed.indexed !== undefined) {
      log(`    Indexed chunks: ${parsed.indexed}`, 'blue');
    }
  } catch (e) {
    recordTest('Semantic search after indexing', false, e.message);
  }
}

// Test 10: Error Handling
async function testErrorHandling(plugin) {
  log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');
  log('Test Suite 10: Error Handling', 'cyan');
  log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━', 'cyan');

  const { memory_write, memory_read, vector_memory_search, configure_index } = plugin.tool;

  // Test memory_write missing content (should still succeed with undefined)
  try {
    const result = await memory_write.execute({});
    const parsed = JSON.parse(result);
    recordTest('memory_write handles empty args', parsed.success !== undefined);
  } catch (e) {
    recordTest('memory_write handles empty args', true);
  }

  // Test memory_read invalid path
  try {
    const result = await memory_read.execute({ file: '../../etc/passwd' });
    const parsed = JSON.parse(result);
    recordTest('memory_read blocks path traversal', parsed.success === false);
  } catch (e) {
    recordTest('memory_read blocks path traversal', true);
  }

  // Test vector_memory_search invalid threshold
  try {
    const result = await vector_memory_search.execute({
      query: 'test',
      threshold: -0.5
    });
    const parsed = typeof result === 'string' ? JSON.parse(result) : result;
    recordTest('vector_memory_search rejects negative threshold', parsed.success === false);
  } catch (e) {
    recordTest('vector_memory_search rejects negative threshold', true);
  }

  // Test configure_index invalid batchSize
  try {
    const result = await configure_index.execute({ batchSize: 0 });
    const parsed = JSON.parse(result);
    recordTest('configure_index rejects zero batchSize', parsed.success === false);
  } catch (e) {
    recordTest('configure_index rejects zero batchSize', true);
  }
}

// Main test runner
async function runTests() {
  log('\n╔════════════════════════════════════════════════════════════════╗', 'blue');
  log('║     OpenCode Memory Plugin - UAT Test Suite                    ║', 'blue');
  log('╚════════════════════════════════════════════════════════════════╝', 'blue');

  const startTime = Date.now();

  try {
    // Load plugin
    log('\nLoading plugin...', 'yellow');
    const plugin = await loadPlugin();
    log('Plugin loaded successfully\n', 'green');

    await testInstallation();
    await testMemoryWrite(plugin);
    await testMemoryRead(plugin);
    await testMemorySearch(plugin);
    await testVectorMemorySearch(plugin);
    await testDailyLogs(plugin);
    await testSessions(plugin);
    await testIndexManagement(plugin);
    await testVectorStore(plugin);
    await testErrorHandling(plugin);
  } catch (e) {
    log(`\nTest suite error: ${e.message}`, 'red');
    console.error(e);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  // Summary
  log('\n╔════════════════════════════════════════════════════════════════╗', 'blue');
  log('║                      Test Summary                              ║', 'blue');
  log('╚════════════════════════════════════════════════════════════════╝', 'blue');
  log(`\n  Total Tests: ${passed + failed}`, 'reset');
  log(`  Passed: ${passed}`, 'green');
  log(`  Failed: ${failed}`, failed > 0 ? 'red' : 'green');
  log(`  Duration: ${duration}s`, 'blue');

  if (failed > 0) {
    log('\n  Failed Tests:', 'red');
    tests.filter(t => !t.success).forEach(t => {
      log(`    - ${t.name}`, 'red');
      if (t.details) log(`      ${t.details}`, 'yellow');
    });
  }

  log('\n');

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

runTests();