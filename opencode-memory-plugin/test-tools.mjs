#!/usr/bin/env node

import { MemoryPlugin } from '/usr/src/app/opencode-memory-plugin/plugin.js';

async function testTools() {
  console.log('==========================================');
  console.log('OpenCode Memory Plugin - Tool Execution Test');
  console.log('==========================================\n');

  // Initialize plugin
  const ctx = {};
  const plugin = await MemoryPlugin(ctx);

  console.log('Available tools:');
  const toolNames = Object.keys(plugin.tools || {});
  toolNames.forEach(name => console.log(`  - ${name}`));
  console.log('\n');

  // Test 1: memory_write
  console.log('Test 1: memory_write');
  console.log('----------------------------------------');
  try {
    const result = await plugin.tools.memory_write.execute({
      content: 'User prefers TypeScript for all new projects with strict type checking',
      type: 'preference',
      tags: ['typescript', 'code-style', 'best-practices']
    });
    console.log('Result:', JSON.stringify(result, null, 2));
    console.log('✓ PASS\n');
  } catch (e) {
    console.log('✗ FAIL:', e.message, '\n');
  }

  // Test 2: memory_read
  console.log('Test 2: memory_read');
  console.log('----------------------------------------');
  try {
    const result = await plugin.tools.memory_read.execute({
      file: 'MEMORY.md'
    });
    console.log('Result:', {
      success: result.success,
      file: result.file,
      lines: result.lines,
      size: result.size,
      contentPreview: result.content.substring(0, 200) + '...'
    });
    console.log('✓ PASS\n');
  } catch (e) {
    console.log('✗ FAIL:', e.message, '\n');
  }

  // Test 3: memory_search
  console.log('Test 3: memory_search');
  console.log('----------------------------------------');
  try {
    const result = await plugin.tools.memory_search.execute({
      query: 'typescript',
      file: 'MEMORY.md'
    });
    console.log('Result:', {
      success: result.success,
      query: result.query,
      matches: result.count,
      firstMatch: result.matches[0] || 'No matches'
    });
    console.log('✓ PASS\n');
  } catch (e) {
    console.log('✗ FAIL:', e.message, '\n');
  }

  // Test 4: list_daily
  console.log('Test 4: list_daily');
  console.log('----------------------------------------');
  try {
    const result = await plugin.tools.list_daily.execute({
      days: 7
    });
    console.log('Result:', {
      success: result.success,
      count: result.count,
      files: result.files.map(f => ({ name: f.name, size: f.size }))
    });
    console.log('✓ PASS\n');
  } catch (e) {
    console.log('✗ FAIL:', e.message, '\n');
  }

  // Test 5: index_status
  console.log('Test 5: index_status');
  console.log('----------------------------------------');
  try {
    const result = await plugin.tools.index_status.execute({});
    console.log('Result:', {
      success: result.success,
      config: result.config,
      dailyLogCount: result.dailyLogCount
    });
    console.log('✓ PASS\n');
  } catch (e) {
    console.log('✗ FAIL:', e.message, '\n');
  }

  console.log('==========================================');
  console.log('All tests completed!');
  console.log('==========================================');
}

testTools().catch(console.error);
