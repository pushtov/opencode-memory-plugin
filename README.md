# OpenCode Memory Plugin

> OpenClaw-style persistent memory system for OpenCode with true semantic vector search powered by Transformers.js

[![MIT License](https://img.shields.io/badge/License-MIT-blue.svg)](https://github.com/opencode-memory-plugin/blob/main/LICENSE)
[![npm version](https://img.shields.io/npm/v/@csuwl/opencode-memory-plugin.svg)](https://www.npmjs.com/package/@csuwl/opencode-memory-plugin)
[![Downloads](https://img.shields.io/npm/dt/@csuwl/opencode-memory-plugin.svg)](https://www.npmjs.com/package/@csuwl/opencode-memory-plugin)

[![OpenCode](https://img.shields.io/badge/OpenCode-compatible-success.svg)](https://docs.opencode.ai)
[![Transformers.js](https://img.shields.io/badge/Transformers.js-3.8.1-orange.svg)](https://huggingface.co/docs/transformers.js)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](https://github.com/opencode-memory-plugin/blob/main/LICENSE)

## 🎯 Features

- ✅ **OpenClaw-Style Memory System** - Complete 9 core memory files (SOUL, AGENTS, USER, IDENTITY, TOOLS, MEMORY, HEARTBEAT, BOOT, BOOTSTRAP)
- ✅ **True Semantic Search** - Real vector embeddings using @huggingface/transformers (all-MiniLM-L6-v2 model)
- ✅ **Fully Automated** - Automatically saves important information without being asked
- ✅ **Local Vector Search** - Semantic search using local embeddings (no API calls needed)
- ✅ **Daily Memory Logs** - Running context with automatic consolidation
- ✅ **Long-Term Memory** - Persistent knowledge across sessions and projects
- ✅ **Hybrid Search** - BM25 + vector search for optimal results
- ✅ **Model Auto-Download** - Embedding model downloads automatically on first use (~80MB)
- ✅ **Flexible Configuration** - 5 embedding models, 4 search modes
- **2 Automation Agents**:
  - `@memory-automation` - Auto-saves important information
  - `@memory-consolidate` - Auto-organizes daily logs
- **8 Memory Tools**:
  - `memory_write` - Write entries to memory
  - `memory_read` - Read from memory files
  - `memory_search` - Keyword search across memory
  - `vector_memory_search` - Semantic search with embeddings
  - `list_daily` - List available daily logs
  - `init_daily` - Initialize today's daily log
  - `rebuild_index` - Rebuild vector index
  - `index_status` - Check vector index status

## 📦 Installation

### Method 1: NPM Installation (Recommended - Easiest!)

#### Global Installation
```bash
# Install the latest version
npm install -g @csuwl/opencode-memory-plugin

# Or install a specific version
npm install -g @csuwl/opencode-memory-plugin@1.1.0

# That's it! The plugin will be automatically configured for you! 🧠
```

#### Local Installation
```bash
# Install locally in your project
npm install @csuwl/opencode-memory-plugin

# Or install a specific version
npm install @csuwl/opencode-memory-plugin@1.1.0
```

**What happens during installation**:
- ✅ Creates memory directory structure (`~/.opencode/memory/`)
- ✅ Copies all 9 memory files
- ✅ Configures OpenCode to load memory into every session
- ✅ Sets up automation agents
- ✅ Initializes today's daily log
- ✅ Creates configuration file (v2.0)
- ✅ On first search, automatically downloads embedding model (~80MB)

### Method 2: Manual Installation from Git

```bash
# Clone repository
git clone https://github.com/csuwl/opencode-memory-plugin.git
cd opencode-memory-plugin

# Run installation script
bash opencode-memory-plugin/scripts/init.sh

# That's it! Your OpenCode now has memory 🧠
```

## 🔍 Search Modes

The plugin supports 4 configurable search modes:

| Mode | Description | Speed | Quality | Model Required |
|------|-------------|-------|---------|----------------|
| `hybrid` | Vector + BM25 (default) | Medium | ⭐⭐⭐⭐ | ✅ Yes |
| `vector` | Vector-only | Medium | ⭐⭐⭐ | ✅ Yes |
| `bm25` | BM25-only (keywords) | Fast | ⭐⭐ | ❌ No |
| `hash` | Hash-based (fallback) | Fast | ⭐ | ❌ No |

**Default**: `hybrid` mode (70% vector + 30% BM25)

## 🧠 Available Embedding Models

The plugin supports 5 pre-configured embedding models:

| Model | Size | Quality | Speed | Best For |
|-------|------|---------|-------|----------|
| **Xenova/all-MiniLM-L6-v2** | 80MB | ⭐⭐ | ⚡⚡⚡ | Baseline (default) |
| **Xenova/bge-small-en-v1.5** ⭐ | 130MB | ⭐⭐⭐⭐ | ⚡⚡ | **Best balance** (recommended) |
| **Xenova/bge-base-en-v1.5** | 400MB | ⭐⭐⭐⭐⭐ | ⚡⚡ | Maximum quality |
| **Xenova/gte-small** | 70MB | ⭐⭐⭐⭐ | ⚡⚡⚡ | Small + fast |
| **Xenova/nomic-embed-text-v1.5** | 270MB | ⭐⭐⭐⭐ | ⚡⚡ | Long documents |

**Default**: `Xenova/all-MiniLM-L6-v2` (80MB, fast, good quality)

## ⚙️ Configuration

The plugin creates a configuration file at `~/.opencode/memory/memory-config.json`:

### Quick Configuration Examples

**Default (Balanced)** - Works out of the box:
```json
{
  "search": { "mode": "hybrid" },
  "embedding": {
    "model": "Xenova/bge-small-en-v1.5"
  }
}
```

**Fast Search** (No model, keywords only):
```json
{
  "search": { "mode": "bm25" },
  "embedding": { "enabled": false }
}
```

**High Quality** (Best model):
```json
{
  "search": { "mode": "vector" },
  "embedding": {
    "model": "Xenova/bge-base-en-v1.5"
  }
}
```

For complete configuration guide, see [CONFIGURATION.md](https://github.com/opencode-memory-plugin/blob/main/opencode-memory-plugin/CONFIGURATION.md).

## 📖 Usage

After installation, all memory tools are available in OpenCode:

### Basic Usage

```bash
# Write to memory
memory_write content="User prefers TypeScript for all new features" type="long-term" tags=["typescript","code-style"]

# Search memory
memory_search query="async patterns"

# Semantic search (NEW: uses real embeddings!)
vector_memory_search query="how do I handle async errors"

# The model understands meaning, not just keywords!

# List recent daily logs
list_daily days=7

# Initialize today's log
init_daily

# Check vector index status
index_status

# Rebuild vector index
rebuild_index force=true
```

### Using Automation Agents

```bash
# Auto-save important information
@memory-automation review conversation and save important information

# Organize daily logs
@memory-consolidate review and consolidate recent memories
```

## 📂 Project Structure

```
opencode-memory-plugin/
├── memory/              # Core memory files (OpenClaw style)
│   ├── SOUL.md            # Personality, tone, boundaries
│   ├── AGENTS.md          # Operating instructions
│   ├── USER.md            # User profile
│   ├── IDENTITY.md        # Assistant identity
│   ├── TOOLS.md           # Tool conventions
│   ├── MEMORY.md          # Long-term memory
│   ├── HEARTBEAT.md       # Health checklist
│   ├── BOOT.md            # Startup checklist
│   ├── BOOTSTRAP.md       # One-time ritual
│   └── daily/             # Daily logs
├── tools/               # Custom OpenCode tools
│   ├── memory.ts            # Basic memory tools
│   ├── config.ts            # Configuration management ⭐ NEW
│   ├── search-modes.ts      # Search implementations ⭐ NEW
│   └── vector-memory.ts     # Vector search tools (with Transformers.js)
├── agents/              # Custom OpenCode agents
│   ├── memory-automation.md    # Auto-save agent
│   └── memory-consolidate.md   # Auto-consolidate agent
├── scripts/             # Utility scripts
│   └── uninstall.sh      # Uninstall script ⭐ NEW
└── package.json           # NPM package configuration
```

## 🔬 Under the Hood

### Embedding Model

**Model**: all-MiniLM-L6-v2 (converted to ONNX)
- **Dimensions**: 384
- **File size**: ~80MB
- **Max sequence length**: 256 tokens
- **Inference**: Local (ONNX Runtime)

**Performance**:
- First search: ~2-3 seconds (model loading + inference)
- Subsequent searches: ~50-100ms per query
- Memory usage: ~150-200MB RAM

### Hybrid Search Algorithm

```
final_score = 0.7 × vector_similarity + 0.3 × bm25_score
```

This combines semantic understanding (70%) with keyword matching (30%) for optimal results.

## 📚 Documentation

- [Configuration Guide](https://github.com/opencode-memory-plugin/blob/main/opencode-memory-plugin/CONFIGURATION.md) - Complete configuration options
- [OpenCode Docs](https://docs.opencode.ai) - Official OpenCode documentation
- [Transformers.js Docs](https://huggingface.co/docs/transformers.js) - Embedding model documentation

## 🤝 Contributing

We welcome contributions! Here's how you can help:

1. **Report Issues** - Open an issue on GitHub for bugs or feature requests
2. **Submit Pull Requests** - Fork the repository and create a pull request
3. **Improve Documentation** - Help improve README and examples
4. **Add Features** - Add new tools or agents
5. **Share Ideas** - Suggest improvements or new use cases

### Development Guidelines

- Follow OpenCode plugin conventions
- Use TypeScript for tools
- Test changes thoroughly
- Update documentation with new features
- Respect the memory-first approach

## 📄 License

MIT License - see [LICENSE](LICENSE) for details

## 🙏 Acknowledgments

- OpenClaw team for the memory system design
- OpenCode team for the plugin system
- Hugging Face for Transformers.js and the all-MiniLM-L6-v2 model
- All contributors and users

## 📊 Version

**Current Version**: v1.1.0

**Changes in v1.1.0**:
- ✨ True semantic search with Transformers.js
- ✨ Flexible configuration system (v2.0)
- ✨ 5 embedding models available
- ✨ 4 search modes (hybrid, vector, bm25, hash)
- ✨ TypeScript support
- ✨ Uninstall script
- ✨ Complete documentation

For detailed changes, see [CHANGELOG.md](https://github.com/opencode-memory-plugin/blob/main/CHANGELOG.md).

---

**Made with ❤️ for OpenCode community**

*Your OpenCode instance now has perfect memory with true semantic understanding! 🧠✨*
