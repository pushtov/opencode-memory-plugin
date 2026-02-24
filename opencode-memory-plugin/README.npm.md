# @csuwl/opencode-memory-plugin

> OpenClaw-style persistent memory system for OpenCode with **true semantic vector search** powered by Transformers.js

## Installation

```bash
# Install latest version
npm install @csuwl/opencode-memory-plugin -g

# Or install a specific version
npm install -g @csuwl/opencode-memory-plugin@1.1.0

# Or install locally without -g
npm install @csuwl/opencode-memory-plugin
```

The plugin will be automatically configured for you!

## Features

- 9 core memory files (OpenClaw-style)
- 8 memory tools (write, read, search, vector search)
- 2 automation agents (auto-save, auto-consolidate)
- Daily memory logs with automatic consolidation
- **True semantic search** using @huggingface/transformers (all-MiniLM-L6-v2 model)
- **100% local** - No API calls, model auto-downloads on first use (~80MB)

## Usage

After installation, all memory tools are available in OpenCode:

```bash
# Write to memory
memory_write content="User prefers TypeScript" type="long-term"

# Search memory
memory_search query="typescript"

# Semantic search (NEW: real embeddings!)
vector_memory_search query="how to handle errors"

# The model understands meaning, not just keywords!

# List daily logs
list_daily days=7
```

## Configuration

Memory files are located at `~/.opencode/memory/`:

- `SOUL.md` - AI personality and boundaries
- `AGENTS.md` - Operating instructions
- `USER.md` - User profile and preferences
- `IDENTITY.md` - Assistant identity
- `TOOLS.md` - Tool usage conventions
- `MEMORY.md` - Long-term memory
- And more...

## What's New in v1.1.0

✨ **True Semantic Search** - Real vector embeddings using all-MiniLM-L6-v2
- No more hash-based fake embeddings
- Understands meaning, not just keywords
- 384-dimensional embeddings for high-quality semantic search
- Model auto-downloads on first use (~80MB)
- Works 100% offline after download

## Documentation

For full documentation, visit: https://github.com/csuwl/opencode-memory-plugin

## License

MIT
