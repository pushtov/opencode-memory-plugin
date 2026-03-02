import { tool } from '@opencode-ai/plugin/tool';
import fs from 'fs';
import path from 'path';
import { getVectorStore } from './lib/vector-store.js';
import { BM25Index, createBM25Index } from './lib/bm25.js';
import { getIndexManager } from './lib/index-manager.js';
import { syncSessions, getSyncStatus, configureSync, autoSyncIfNeeded } from './lib/session-sync.js';

const HOME = process.env.HOME || process.env.USERPROFILE;
const MEMORY_DIR = path.join(HOME, '.opencode', 'memory');
const MEMORY_FILE = path.join(MEMORY_DIR, 'MEMORY.md');
const CONFIG_FILE = path.join(MEMORY_DIR, 'memory-config.json');
const DAILY_DIR = path.join(MEMORY_DIR, 'daily');
const SESSIONS_DIR = path.join(MEMORY_DIR, 'sessions');

/**
 * Read memory configuration
 */
function getConfig() {
  try {
    const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (e) {
    return null;
  }
}

/**
 * Get all memory files to index (unlimited - no time restriction)
 */
function getMemoryFiles() {
  const files = [];
  
  // Core memory files
  const coreFiles = ['MEMORY.md', 'SOUL.md', 'AGENTS.md', 'USER.md', 'IDENTITY.md', 'TOOLS.md'];
  for (const file of coreFiles) {
    const filePath = path.join(MEMORY_DIR, file);
    if (fs.existsSync(filePath)) {
      files.push({ path: filePath, name: file });
    }
  }
  
  // Daily logs - ALL files, no limit
  if (fs.existsSync(DAILY_DIR)) {
    const dailyFiles = fs.readdirSync(DAILY_DIR)
      .filter(f => f.endsWith('.md'))
      .sort()
      .reverse(); // Most recent first
    
    for (const file of dailyFiles) {
      files.push({ 
        path: path.join(DAILY_DIR, file), 
        name: `daily/${file}` 
      });
    }
  }
  
  // Session records - ALL files, no limit
  if (fs.existsSync(SESSIONS_DIR)) {
    const sessionFiles = fs.readdirSync(SESSIONS_DIR)
      .filter(f => f.endsWith('.md'))
      .sort()
      .reverse();
    
    for (const file of sessionFiles) {
      files.push({ 
        path: path.join(SESSIONS_DIR, file), 
        name: `sessions/${file}` 
      });
    }
  }
  
  return files;
}

/**
 * Generate a slug from content
 * @param {string} content - Content to extract keywords from
 * @returns {string} URL-friendly slug
 */
function generateSlug(content) {
  // Extract key phrases from content
  const lines = content.split('\n').filter(l => l.trim());
  
  // Get first meaningful line (title or first paragraph)
  let title = '';
  for (const line of lines) {
    const trimmed = line.trim();
    // Skip markdown headings and empty lines
    if (trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('*') && trimmed.length > 5) {
      title = trimmed;
      break;
    }
    // Use heading if no paragraph found
    if (trimmed.startsWith('#') && !title) {
      title = trimmed.replace(/^#+\s*/, '');
    }
  }
  
  if (!title) {
    title = 'session';
  }
  
  // Generate slug
  return title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50)
    .replace(/^-|-$/g, '');
}

/**
 * OpenCode Memory Plugin
 * Provides persistent memory functionality for OpenCode
 */
export const MemoryPlugin = async (ctx) => {
  return {
    tool: {
      memory_write: tool({
        description: "Write an entry to long-term memory. Use this to save important information that should persist across sessions.",
        args: {
          content: tool.schema.string().describe("The content to write to memory"),
          type: tool.schema.string().optional().default("general").describe("The type of entry (e.g., 'preference', 'decision', 'note', 'general')"),
          tags: tool.schema.array(tool.schema.string()).optional().default([]).describe("Tags for categorizing the entry")
        },
        async execute(args, context) {
          try {
            const { content, type, tags = [] } = args;
            const timestamp = new Date().toISOString();

            const entry = `
## ${(type || 'general').charAt(0).toUpperCase() + (type || 'general').slice(1)} Entry

**Date**: ${timestamp}
**Type**: ${type || 'general'}
**Tags**: ${tags.length > 0 ? tags.join(', ') : 'none'}

${content}

---
`;

            // Ensure memory directory exists
            if (!fs.existsSync(MEMORY_DIR)) {
              fs.mkdirSync(MEMORY_DIR, { recursive: true });
            }

            // Append to memory file
            fs.appendFileSync(MEMORY_FILE, entry, 'utf-8');

            // Queue index update
            try {
              const indexManager = getIndexManager();
              indexManager.queueUpdate(MEMORY_FILE, 'MEMORY.md');
            } catch (e) {
              // Ignore indexing errors
            }

            return JSON.stringify({ success: true, 
              message: "Entry written to memory",
              file: MEMORY_FILE,
              type,
              tags,
              length: content.length
             });
          } catch (e) {
            return JSON.stringify({ success: false, 
              error: e.message
             });
          }
        }
      }),

      memory_read: tool({
        description: "Read from a memory file. Defaults to MEMORY.md for long-term memory.",
        args: {
          file: tool.schema.string().optional().default("MEMORY.md").describe("The memory file to read (e.g., 'MEMORY.md', 'SOUL.md', 'AGENTS.md')")
        },
        async execute(args, context) {
          try {
            const file = args.file || 'MEMORY.md';
            
            // Security: Validate path to prevent directory traversal
            const resolvedPath = path.resolve(MEMORY_DIR, file);
            if (!resolvedPath.startsWith(path.resolve(MEMORY_DIR))) {
              return JSON.stringify({ success: false,  error: "Invalid file path: directory traversal not allowed"  });
            }
            
            const filePath = resolvedPath;

            if (!fs.existsSync(filePath)) {
              return {
                success: false,
                error: `File not found: ${file}`
              };
            }

            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split('\n').length;

            return JSON.stringify({ success: true, 
              file,
              content,
              lines,
              size: Buffer.byteLength(content, 'utf-8')
             });
          } catch (e) {
            return JSON.stringify({ success: false, 
              error: e.message
             });
          }
        }
      }),

      memory_search: tool({
        description: "Search memory files using keyword matching. Returns lines containing the search query.",
        args: {
          query: tool.schema.string().describe("The search query to look for in memory"),
          file: tool.schema.string().optional().default("MEMORY.md").describe("The memory file to search (default: MEMORY.md)")
        },
        async execute(args, context) {
          try {
            const query = args.query;
            const file = args.file || 'MEMORY.md';
            
            // Security: Validate path to prevent directory traversal
            const resolvedPath = path.resolve(MEMORY_DIR, file);
            if (!resolvedPath.startsWith(path.resolve(MEMORY_DIR))) {
              return JSON.stringify({ success: false,  error: "Invalid file path: directory traversal not allowed"  });
            }
            
            const filePath = resolvedPath;

            if (!fs.existsSync(filePath)) {
              return {
                success: false,
                error: `File not found: ${file}`
              };
            }

            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split('\n');

            // Find matching lines
            const matches = [];
            lines.forEach((line, index) => {
              if (line.toLowerCase().includes(query.toLowerCase())) {
                matches.push({
                  line: index + 1,
                  text: line.trim()
                });
              }
            });

            return JSON.stringify({ success: true, 
              query,
              file,
              matches,
              count: matches.length
             });
          } catch (e) {
            return JSON.stringify({ success: false, 
              error: e.message
             });
          }
        }
      }),

      vector_memory_search: tool({
        description: "Search memory using semantic vector search. Finds relevant content even when keywords don't match exactly.",
        args: {
          query: tool.schema.string().describe("The semantic search query"),
          mode: tool.schema.string().optional().default("hybrid").describe("Search mode: 'vector' (semantic only), 'keyword' (exact match), or 'hybrid' (both)"),
          limit: tool.schema.number().optional().default(10).describe("Maximum number of results to return"),
          threshold: tool.schema.number().optional().default(0.3).describe("Minimum similarity score (0-1)")
        },
        async execute(args, context) {
          const { query, mode, limit, threshold } = args;
          
          // Input validation
          if (threshold !== undefined && (threshold < 0 || threshold > 1)) {
            return JSON.stringify({ success: false,  error: "threshold must be between 0 and 1"  });
          }
          if (limit !== undefined && limit < 1) {
            return JSON.stringify({ success: false,  error: "limit must be at least 1"  });
          }
          
          try {
            const config = getConfig();

            if (!config) {
              return JSON.stringify({ success: false, 
                error: "Memory configuration not found. Please run the initialization script."
               });
            }

            // Check if embedding is enabled
            if (!config.embedding?.enabled && config.embedding?.enabled !== undefined) {
              return JSON.stringify({ success: false, 
                error: "Embedding is disabled in configuration",
                suggestion: "Try using memory_search for keyword search instead"
               });
            }

            // Get vector store instance
            const vectorStore = getVectorStore();
            
            // Initialize if needed
            let initResult;
            if (!vectorStore.initialized) {
              initResult = await vectorStore.initialize({ 
                model: config.embedding?.model 
              });
              
              if (!initResult.success) {
                // Fall back to keyword search
                return JSON.stringify({
                  success: true,
                  query,
                  mode: 'keyword',
                  matches: await fallbackKeywordSearch(query, limit),
                  count: (await fallbackKeywordSearch(query, limit)).length,
                  note: `Vector search unavailable: ${initResult.error}. Using keyword search instead.`
                });
              }
            }

            // Perform search based on mode
            let results;
            const searchMode = mode || config.search?.mode || 'hybrid';
            
            if (searchMode === 'vector') {
              results = await vectorStore.search(query, { limit, threshold });
            } else if (searchMode === 'keyword') {
              results = vectorStore.keywordSearch(query, { limit });
            } else {
              // Hybrid mode (default)
              results = await vectorStore.hybridSearch(query, { 
                limit,
                vectorWeight: config.search?.options?.hybrid?.vectorWeight || 0.7,
                keywordWeight: config.search?.options?.hybrid?.keywordWeight || 0.3
              });
            }

            return JSON.stringify({
              success: true,
              query,
              mode: searchMode,
              matches: results.map(r => ({
                source: r.source,
                line: r.line,
                text: r.content.substring(0, 200) + (r.content.length > 200 ? '...' : ''),
                score: Math.round(r.score * 100) / 100,
                fullContent: r.content
              })),
              count: results.length,
              model: vectorStore.modelName,
              indexed: vectorStore.getIndexedCount()
            });
          } catch (e) {
            // Fall back to keyword search on error
            return JSON.stringify({
              success: true,
              query,
              mode: 'keyword',
              matches: await fallbackKeywordSearch(query, 10),
              count: (await fallbackKeywordSearch(query, 10)).length,
              note: `Vector search failed: ${e.message}. Using keyword search.`
            });
          }
        }
      }),

      list_daily: tool({
        description: "List available daily log files from the past N days.",
        args: {
          days: tool.schema.number().optional().default(7).describe("Number of days to look back (default: 7)")
        },
        async execute(args, context) {
          try {
            const { days } = args;

            if (!fs.existsSync(DAILY_DIR)) {
              return JSON.stringify({ success: true, 
                files: [],
                count: 0,
                message: "Daily directory not found"
               });
            }

            const allFiles = fs.readdirSync(DAILY_DIR)
              .filter(f => f.endsWith('.md'))
              .sort()
              .reverse()
              .slice(0, days);

            const files = allFiles.map(file => {
              const filePath = path.join(DAILY_DIR, file);
              const stats = fs.statSync(filePath);
              return {
                name: file,
                size: stats.size,
                modified: stats.mtime
              };
            });

            return JSON.stringify({ success: true, 
              files,
              count: files.length
             });
          } catch (e) {
            return JSON.stringify({ success: false, 
              error: e.message
             });
          }
        }
      }),

      init_daily: tool({
        description: "Initialize today's daily log file if it doesn't exist.",
        args: {},
        async execute(args, context) {
          try {
            const today = new Date().toISOString().split('T')[0];
            const dailyFile = path.join(DAILY_DIR, `${today}.md`);

            if (fs.existsSync(dailyFile)) {
              return JSON.stringify({ success: true, 
                message: "Daily log already exists",
                file: dailyFile,
                date: today
               });
            }

            // Create daily directory if needed
            if (!fs.existsSync(DAILY_DIR)) {
              fs.mkdirSync(DAILY_DIR, { recursive: true });
            }

            const content = `# Daily Memory Log - ${today}

*Session starts: ${new Date().toISOString()}*

## Notes

## Tasks

## Learnings

---
`;

            fs.writeFileSync(dailyFile, content, 'utf-8');

            // Queue index update
            try {
              const indexManager = getIndexManager();
              indexManager.queueUpdate(dailyFile, `daily/${today}.md`);
            } catch (e) {
              // Ignore indexing errors
            }

            return JSON.stringify({ success: true, 
              message: "Daily log created",
              file: dailyFile,
              date: today
             });
          } catch (e) {
            return JSON.stringify({ success: false, 
              error: e.message
             });
          }
        }
      }),

      rebuild_index: tool({
        description: "Rebuild the vector search index for all memory files. This processes all memory files and creates embeddings for semantic search.",
        args: {
          force: tool.schema.boolean().optional().default(false).describe("Force rebuild even if index exists")
        },
        async execute(args, context) {
          try {
            const { force } = args;
            const config = getConfig();

            if (!config) {
              return JSON.stringify({ success: false,
                error: "Memory configuration not found. Please run the initialization script."
               });
            }

            // Get vector store instance
            const vectorStore = getVectorStore();

            // Initialize
            const initResult = await vectorStore.initialize({
              model: config.embedding?.model
            });

            // Get all memory files
            const files = getMemoryFiles();

            if (files.length === 0) {
              return JSON.stringify({ success: true,
                message: "No memory files found to index",
                indexedFiles: 0,
                totalChunks: 0
               });
            }

            // If model failed to load, return success with warning (keyword search still works)
            if (!initResult.success) {
              return JSON.stringify({
                success: true,
                message: "Index created with keyword search only (vector search unavailable)",
                warning: `Vector indexing skipped: ${initResult.error}`,
                model: initResult.model || config.embedding?.model || 'Xenova/all-MiniLM-L6-v2',
                dimensions: initResult.dimensions || 384,
                indexedFiles: files.length,
                totalChunks: 0,
                fallback: true
              });
            }

            // Clear existing index if force rebuild
            if (force) {
              vectorStore.clearIndex();
            }

            // Index each file
            const results = [];
            let totalChunks = 0;

            for (const file of files) {
              try {
                const content = fs.readFileSync(file.path, 'utf-8');
                const result = await vectorStore.indexDocument(content, file.name, {
                  clearExisting: true,
                  chunkSize: config.indexing?.chunkSize || 400,
                  overlap: config.indexing?.chunkOverlap || 80
                });
                results.push({ file: file.name, indexed: result.indexed });
                totalChunks += result.indexed;
              } catch (e) {
                results.push({ file: file.name, error: e.message });
              }
            }

            // Get final status
            const status = vectorStore.getStatus();

            return JSON.stringify({ success: true,
              message: "Index rebuild completed",
              force,
              model: status.model,
              dimensions: status.dimensions,
              indexedFiles: files.length,
              totalChunks,
              results,
              lastIndexed: status.lastIndexed
             });
          } catch (e) {
            return JSON.stringify({ success: false,
              error: e.message
             });
          }
        }
      }),

      index_status: tool({
        description: "Check the status of the vector search index and memory configuration.",
        args: {},
        async execute(args, context) {
          try {
            const config = getConfig();

            if (!config) {
              return JSON.stringify({ success: false, 
                error: "Configuration not found"
               });
            }

            // Check memory files
            const memoryFiles = ['MEMORY.md', 'SOUL.md', 'AGENTS.md', 'USER.md'];
            const files = {};
            memoryFiles.forEach(file => {
              const filePath = path.join(MEMORY_DIR, file);
              files[file] = {
                exists: fs.existsSync(filePath),
                size: fs.existsSync(filePath) ? fs.statSync(filePath).size : 0
              };
            });

            // Check daily logs
            let dailyLogCount = 0;
            if (fs.existsSync(DAILY_DIR)) {
              const dailyFiles = fs.readdirSync(DAILY_DIR).filter(f => f.endsWith('.md'));
              dailyLogCount = dailyFiles.length;
            }

            // Get vector store status
            const vectorStore = getVectorStore();
            let vectorStatus = { initialized: false };
            
            try {
              vectorStatus = vectorStore.getStatus();
            } catch (e) {
              // Vector store not initialized
            }

            return JSON.stringify({
              success: true,
              config: {
                version: config.version,
                searchMode: config.search?.mode,
                embeddingEnabled: config.embedding?.enabled !== false,
                embeddingModel: config.embedding?.model || 'Xenova/all-MiniLM-L6-v2',
                fallbackMode: config.embedding?.fallbackMode
              },
              files,
              dailyLogCount,
              vectorIndex: {
                initialized: vectorStatus.initialized || false,
                model: vectorStatus.model || null,
                dimensions: vectorStatus.dimensions || 384,
                totalChunks: vectorStatus.totalChunks || 0,
                lastIndexed: vectorStatus.lastIndexed || null,
                dbPath: vectorStatus.dbPath || null
              }
            });
          } catch (e) {
            return JSON.stringify({ success: false, 
              error: e.message
             });
          }
        }
      })
,

      update_index: tool({
        description: "Incrementally update the vector search index. Only processes files that have changed since last indexing.",
        args: {
          force: tool.schema.boolean().optional().default(false).describe("Force rebuild of all files, not just changed ones")
        },
        async execute(args, context) {
          try {
            const { force } = args;
            const indexManager = getIndexManager();
            const result = await indexManager.rebuildIndex(force);
            return JSON.stringify({
              success: result.success,
              ...result
            });
          } catch (e) {
            return JSON.stringify({ success: false,
              error: e.message
             });
          }
        }
      }),

      configure_index: tool({
        description: "Configure index behavior settings like auto-update, debounce delay, and batch size.",
        args: {
          autoUpdate: tool.schema.boolean().optional().describe("Enable/disable automatic index updates on file changes"),
          debounceDelay: tool.schema.number().optional().describe("Delay in milliseconds before processing queued updates (default: 1000)"),
          batchSize: tool.schema.number().optional().describe("Number of files to process in each batch (default: 10)")
        },
        async execute(args, context) {
          try {
            // Input validation
            if (args.debounceDelay !== undefined && args.debounceDelay < 0) {
              return JSON.stringify({ success: false,  error: "debounceDelay must be a positive number"  });
            }
            if (args.batchSize !== undefined && args.batchSize < 1) {
              return JSON.stringify({ success: false,  error: "batchSize must be at least 1"  });
            }
            
            const indexManager = getIndexManager();
            const config = indexManager.configure(args);
            return JSON.stringify({ success: true, 
              message: "Index configuration updated",
              config: config.indexing
             });
          } catch (e) {
            return JSON.stringify({ success: false, 
              error: e.message
             });
          }
        }
      }),

      save_session: tool({
        description: "Save a session record to preserve conversation context and important decisions.",
        args: {
          title: tool.schema.string().optional().describe("Title for the session (auto-generated from content if not provided)"),
          content: tool.schema.string().describe("The session content to save"),
          tags: tool.schema.array(tool.schema.string()).optional().default([]).describe("Tags for categorizing the session")
        },
        async execute(args, context) {
          try {
            const { title, content, tags = [] } = args;
            const timestamp = new Date().toISOString();
            const date = timestamp.split('T')[0];
            const time = timestamp.split('T')[1].split('.')[0].replace(/:/g, '-');

            // Create sessions directory if needed
            if (!fs.existsSync(SESSIONS_DIR)) {
              fs.mkdirSync(SESSIONS_DIR, { recursive: true });
            }

            // Generate filename
            const slug = generateSlug(content);
            const sessionTitle = title || slug;
            const fileName = `${date}_${time}_${slug}.md`;
            const sessionFile = path.join(SESSIONS_DIR, fileName);

            const sessionContent = `# Session: ${sessionTitle}

**Date**: ${timestamp}
**Tags**: ${tags.length > 0 ? tags.join(', ') : 'none'}

## Summary

${content}

---
`;

            fs.writeFileSync(sessionFile, sessionContent, 'utf-8');

            // Queue index update
            try {
              const indexManager = getIndexManager();
              indexManager.queueUpdate(sessionFile, `sessions/${fileName}`);
            } catch (e) {
              // Ignore indexing errors
            }

            return JSON.stringify({ success: true, 
              message: "Session saved",
              file: sessionFile,
              title: sessionTitle,
              tags
             });
          } catch (e) {
            return JSON.stringify({ success: false, 
              error: e.message
             });
          }
        }
      }),

      list_sessions: tool({
        description: "List available session records.",
        args: {
          limit: tool.schema.number().optional().default(20).describe("Maximum number of sessions to list")
        },
        async execute(args, context) {
          try {
            const { limit } = args;

            if (!fs.existsSync(SESSIONS_DIR)) {
              return JSON.stringify({ success: true, 
                sessions: [],
                count: 0,
                message: "Sessions directory not found"
               });
            }

            const files = fs.readdirSync(SESSIONS_DIR)
              .filter(f => f.endsWith('.md'))
              .sort()
              .reverse()
              .slice(0, limit);

            const sessions = files.map(file => {
              const filePath = path.join(SESSIONS_DIR, file);
              const stats = fs.statSync(filePath);
              return {
                name: file,
                size: stats.size,
                modified: stats.mtime,
                path: filePath
              };
            });

            return JSON.stringify({ success: true,
              sessions,
              count: sessions.length
             });
          } catch (e) {
            return JSON.stringify({ success: false,
              error: e.message
             });
          }
        }
      }),

      sync_sessions: tool({
        description: "Sync OpenCode conversation sessions to memory index. This allows searching through past conversations. Run this periodically to index new sessions.",
        args: {
          force: tool.schema.boolean().optional().default(false).describe("Force re-sync all sessions (default: only sync new/updated sessions)"),
          limit: tool.schema.number().optional().default(100).describe("Maximum number of sessions to sync (default: 100)")
        },
        async execute(args, context) {
          try {
            const { force, limit } = args;
            const result = await syncSessions({ force, limit });
            return JSON.stringify(result);
          } catch (e) {
            return JSON.stringify({ success: false, error: e.message });
          }
        }
      }),

      sync_status: tool({
        description: "Check the status of OpenCode session synchronization.",
        args: {},
        async execute(args, context) {
          try {
            const status = getSyncStatus();
            return JSON.stringify({ success: true, ...status });
          } catch (e) {
            return JSON.stringify({ success: false, error: e.message });
          }
        }
      }),

      configure_sync: tool({
        description: "Configure automatic session synchronization settings.",
        args: {
          autoSync: tool.schema.boolean().optional().describe("Enable/disable automatic session syncing (default: true)"),
          syncInterval: tool.schema.number().optional().describe("Sync interval in milliseconds (default: 3600000 = 1 hour)"),
          lastSyncOnly: tool.schema.boolean().optional().describe("Only sync the most recent session (default: false)")
        },
        async execute(args, context) {
          try {
            const result = configureSync(args);
            return JSON.stringify(result);
          } catch (e) {
            return JSON.stringify({ success: false, error: e.message });
          }
        }
      })
    }
  };
};

/**
 * Fallback BM25 search when vector search is unavailable
 * Uses BM25 algorithm for better relevance ranking
 */
async function fallbackBM25Search(query, limit = 10) {
  const files = getMemoryFiles();
  
  // Collect all documents
  const documents = [];
  let docId = 0;
  
  for (const file of files) {
    try {
      const content = fs.readFileSync(file.path, 'utf-8');
      const lines = content.split('\n');
      
      // Index each line as a separate document for better granularity
      lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        if (trimmedLine.length > 10) {  // Skip very short lines
          documents.push({
            id: `${file.name}:${index + 1}`,
            content: trimmedLine,
            metadata: {
              source: file.name,
              line: index + 1
            }
          });
        }
      });
    } catch (e) {
      // Skip files that can't be read
    }
  }
  
  if (documents.length === 0) {
    return [];
  }
  
  // Create BM25 index and search
  const index = createBM25Index(documents);
  const results = index.search(query, { limit, minScore: 0.01 });
  
  return results.map(r => ({
    source: r.metadata.source,
    line: r.metadata.line,
    text: r.content.substring(0, 200) + (r.content.length > 200 ? '...' : ''),
    score: Math.min(1, r.score / 5)  // Normalize score to 0-1 range
  }));
}

/**
 * Legacy fallback keyword search (kept for compatibility)
 * @deprecated Use fallbackBM25Search instead
 */
async function fallbackKeywordSearch(query, limit = 10) {
  return fallbackBM25Search(query, limit);
}