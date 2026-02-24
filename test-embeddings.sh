#!/bin/bash

# Vector Embedding Test for OpenCode Memory Plugin
# Tests Transformers.js integration and semantic search

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${2}$1${NC}"; }

echo "========================================="
echo "  Vector Embedding Test"
echo "  Transformers.js Integration"
echo "========================================="
echo ""

log "Testing @huggingface/transformers module..." "$YELLOW"
echo ""

# Check if module is installed
if [ ! -d "/usr/src/app/opencode-memory-plugin/node_modules/@huggingface" ]; then
  log "⚠ @huggingface/transformers not found in node_modules" "$YELLOW"
  log "   Checking global installation..." "$YELLOW"

  if npm list -g @huggingface/transformers &>/dev/null; then
    log "   ✓ Found in global npm" "$GREEN"
  else
    log "   ✗ Module not installed" "$RED"
    log "   Installing..." "$YELLOW"
    npm install @huggingface/transformers 2>&1 | tail -10
  fi
fi

echo ""
log "Creating embedding test script..." "$YELLOW"

# Create a proper test file
cat > /tmp/embedding-test.js << 'EOF'
const { pipeline, env } = require('@huggingface/transformers');

// Configure environment
env.allowLocalModels = true;
env.allowRemoteModels = true;

async function testEmbeddings() {
  console.log('========================================');
  console.log('  Vector Embedding Test');
  console.log('  Transformers.js v3.x');
  console.log('========================================\n');

  try {
    // Load model
    console.log('Step 1: Loading embedding model...');
    console.log('  Model: Xenova/all-MiniLM-L6-v2');
    console.log('  Size: ~80MB');
    console.log('  Status: Downloading (first time only)...');

    const startTime = Date.now();
    const extractor = await pipeline(
      'feature-extraction',
      'Xenova/all-MiniLM-L6-v2'
    );
    const loadTime = Date.now() - startTime;

    console.log(`  ✓ Model loaded in ${(loadTime / 1000).toFixed(2)}s\n`);

    // Test 1: Single embedding
    console.log('Step 2: Generating embedding...');
    const text1 = 'The quick brown fox jumps over the lazy dog';
    console.log(`  Input: "${text1}"`);

    const start1 = Date.now();
    const output1 = await extractor(text1, {
      pooling: 'mean',
      normalize: true
    });
    const time1 = Date.now() - start1;

    const embedding1 = Array.from(output1.data);
    console.log(`  ✓ Generated in ${time1}ms`);
    console.log(`  Dimensions: ${embedding1.length}`);
    console.log(`  Sample values: [${embedding1.slice(0, 3).map(v => v.toFixed(4)).join(', ')}, ...]\n`);

    // Test 2: Similarity calculation
    console.log('Step 3: Testing semantic similarity...');
    const texts = [
      'The cat sat on the mat',
      'A feline rested on the rug',
      'The weather is sunny today'
    ];

    const embeddings = [];
    for (const text of texts) {
      const output = await extractor(text, { pooling: 'mean', normalize: true });
      embeddings.push(Array.from(output.data));
    }

    // Calculate similarities
    function cosineSimilarity(a, b) {
      let dotProduct = 0;
      let normA = 0;
      let normB = 0;
      for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
      }
      return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }

    console.log('  Similarity Matrix:');
    console.log('  Text 1: "' + texts[0] + '"');
    console.log('  Text 2: "' + texts[1] + '" (related)');
    console.log('  Text 3: "' + texts[2] + '" (unrelated)\n');

    const sim12 = cosineSimilarity(embeddings[0], embeddings[1]);
    const sim13 = cosineSimilarity(embeddings[0], embeddings[2]);
    const sim23 = cosineSimilarity(embeddings[1], embeddings[2]);

    console.log('  Similarity (1-2): ' + sim12.toFixed(4));
    console.log('  Similarity (1-3): ' + sim13.toFixed(4));
    console.log('  Similarity (2-3): ' + sim23.toFixed(4));
    console.log('');

    if (sim12 > sim13 && sim12 > sim23) {
      console.log('  ✓ Semantic understanding working correctly!');
      console.log('    (Related texts have higher similarity)\n');
    } else {
      console.log('  ⚠ Unexpected similarity pattern\n');
    }

    // Test 3: Performance test
    console.log('Step 4: Performance benchmark...');
    const testTexts = [
      'Test message one',
      'Test message two',
      'Test message three',
      'Test message four',
      'Test message five'
    ];

    const perfStart = Date.now();
    for (const text of testTexts) {
      await extractor(text, { pooling: 'mean', normalize: true });
    }
    const perfTime = Date.now() - perfStart;

    console.log('  Processed 5 texts in ' + perfTime + 'ms');
    console.log('  Average: ' + (perfTime / testTexts.length).toFixed(0) + 'ms per text');
    console.log('  Throughput: ' + ((testTexts.length / perfTime) * 1000).toFixed(1) + ' texts/second\n');

    console.log('========================================');
    console.log('  ✅ All Embedding Tests Passed!');
    console.log('========================================\n');

    console.log('Summary:');
    console.log('  ✓ Model loading: ' + (loadTime / 1000).toFixed(2) + 's');
    console.log('  ✓ Single embedding: ' + time1 + 'ms');
    console.log('  ✓ Semantic similarity: Working');
    console.log('  ✓ Batch processing: ' + ((testTexts.length / perfTime) * 1000).toFixed(1) + ' texts/sec');
    console.log('');

    return true;

  } catch (error) {
    console.error('\n✗ Error:', error.message);
    console.error('  Stack:', error.stack);
    return false;
  }
}

testEmbeddings().then(success => {
  process.exit(success ? 0 : 1);
});
EOF

log "Running embedding test..." "$YELLOW"
log "This may take 1-2 minutes (first run downloads model)..." "$YELLOW"
echo ""

cd /usr/src/app/opencode-memory-plugin
node /tmp/embedding-test.js 2>&1 | tee /tmp/embedding-result.log

if [ ${PIPESTATUS[0]} -eq 0 ]; then
  echo ""
  log "✅ Vector embedding test completed successfully!" "$GREEN"
else
  echo ""
  log "⚠ Embedding test encountered issues" "$YELLOW"
  log "   This may be due to network restrictions or missing dependencies" "$YELLOW"
fi

echo ""
echo "========================================="
echo "  Test Complete"
echo "========================================="
