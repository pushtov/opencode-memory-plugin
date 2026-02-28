# OpenCode Memory Plugin

An intelligent memory system for OpenCode with persistent storage and semantic search capabilities.

## Features

- **Persistent Memory**: Store and retrieve information across sessions
- **Semantic Search**: Find relevant content even with different wording
- **Daily Logs**: Automatic daily journaling for running context
- **Session Records**: Save important conversations and decisions
- **Smart Indexing**: Incremental updates with change detection

## Installation

```bash
npm install @csuwl/opencode-memory-plugin
```

## Available Tools

### Memory Management

| Tool | Description |
|------|-------------|
| `memory_write` | Write an entry to long-term memory |
| `memory_read` | Read from a memory file |
| `memory_search` | Search using keyword matching |
| `vector_memory_search` | Semantic search using embeddings |

### Daily Logs

| Tool | Description |
|------|-------------|
| `init_daily` | Initialize today's daily log file |
| `list_daily` | List available daily log files |

### Session Management

| Tool | Description |
|------|-------------|
| `save_session` | Save a session record |
| `list_sessions` | List available session records |

### Index Management

| Tool | Description |
|------|-------------|
| `rebuild_index` | Rebuild the entire vector search index |
| `update_index` | Incrementally update the index (changed files only) |
| `configure_index` | Configure index behavior settings |
| `index_status` | Check index status and configuration |

## Tool Details

### memory_write

Write an entry to long-term memory. Automatically queues the file for index update.

```javascript
{
  content: "User prefers TypeScript for type safety",
  type: "preference",  // optional: 'preference', 'decision', 'note', 'general'
  tags: ["typescript", "coding-style"]  // optional
}
```

### save_session

Save a session record to preserve conversation context.

```javascript
{
  title: "API Design Discussion",  // optional, auto-generated if not provided
  content: "Decided to use REST API with JWT authentication...",
  tags: ["api", "auth"]  // optional
}
```

### update_index

Incrementally update the vector search index. Only processes changed files.

```javascript
{
  force: false  // optional: set true to rebuild all files
}
```

### configure_index

Configure index behavior settings.

```javascript
{
  autoUpdate: true,        // Enable automatic index updates
  debounceDelay: 1000,     // Delay before processing updates (ms)
  batchSize: 10            // Files per batch
}
```

### vector_memory_search

Search memory using semantic understanding.

```javascript
{
  query: "user authentication preferences",
  mode: "hybrid",  // 'vector', 'keyword', or 'hybrid'
  limit: 10,
  threshold: 0.3   // Minimum similarity score (0-1)
}
```

## Memory Files Structure

```
~/.opencode/memory/
├── MEMORY.md          # Long-term memory
├── SOUL.md            # AI personality
├── AGENTS.md          # Agent instructions
├── USER.md            # User profile
├── IDENTITY.md        # AI identity
├── TOOLS.md           # Tool conventions
├── daily/             # Daily logs
│   ├── 2025-02-28.md
│   └── ...
├── sessions/          # Session records
│   ├── 2025-02-28_10-30-00_api-design.md
│   └── ...
├── .index-hashes.json # Change tracking
└── memory-config.json # Configuration
```

## Index Management Features

### Smart Change Detection

- File hash tracking prevents unnecessary reindexing
- Only changed files are processed during incremental updates
- Hash cache persists across sessions

### Debounced Processing

- Queued updates are processed after a configurable delay
- Prevents excessive index rebuilds during rapid writes
- Batch processing for efficiency

### Auto-Index on Write

- `memory_write` automatically queues index updates
- `init_daily` queues the new daily log for indexing
- `save_session` indexes the saved session

## Configuration

Edit `~/.opencode/memory/memory-config.json`:

```json
{
  "version": "1.0.0",
  "embedding": {
    "enabled": true,
    "model": "Xenova/all-MiniLM-L6-v2"
  },
  "indexing": {
    "autoUpdate": true,
    "debounceDelay": 1000,
    "batchSize": 10,
    "chunkSize": 400,
    "chunkOverlap": 80
  },
  "search": {
    "mode": "hybrid",
    "options": {
      "hybrid": {
        "vectorWeight": 0.7,
        "keywordWeight": 0.3
      }
    }
  }
}
```

## License

MIT

## Author

csuwl <1105865632@qq.com>