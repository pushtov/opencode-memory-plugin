import { tool } from '@opencode-ai/plugin/tool';
import fs from 'fs';
import path from 'path';

const HOME = process.env.HOME || process.env.USERPROFILE;
const MEMORY_DIR = path.join(HOME, '.opencode', 'memory');
const MEMORY_FILE = path.join(MEMORY_DIR, 'MEMORY.md');
const CONFIG_FILE = path.join(MEMORY_DIR, 'memory-config.json');
const DAILY_DIR = path.join(MEMORY_DIR, 'daily');

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
 * OpenCode Memory Plugin
 * Provides persistent memory functionality for OpenCode
 */
export const MemoryPlugin = async (ctx) => {
  return {
    tools: {
      memory_write: tool({
        description: "Write an entry to long-term memory. Use this to save important information that should persist across sessions.",
        args: {
          content: tool.schema.string().describe("The content to write to memory"),
          type: tool.schema.string().optional().default("general").describe("The type of entry (e.g., 'preference', 'decision', 'note', 'general')"),
          tags: tool.schema.array(tool.schema.string()).optional().default([]).describe("Tags for categorizing the entry")
        },
        async execute(args) {
          try {
            const { content, type, tags } = args;
            const timestamp = new Date().toISOString();

            const entry = `
## ${type.charAt(0).toUpperCase() + type.slice(1)} Entry

**Date**: ${timestamp}
**Type**: ${type}
**Tags**: ${tags.join(', ') || 'none'}

${content}

---
`;

            // Ensure memory directory exists
            if (!fs.existsSync(MEMORY_DIR)) {
              fs.mkdirSync(MEMORY_DIR, { recursive: true });
            }

            // Append to memory file
            fs.appendFileSync(MEMORY_FILE, entry, 'utf-8');

            return {
              success: true,
              message: "Entry written to memory",
              file: MEMORY_FILE,
              type,
              tags,
              length: content.length
            };
          } catch (e) {
            return {
              success: false,
              error: e.message
            };
          }
        }
      }),

      memory_read: tool({
        description: "Read from a memory file. Defaults to MEMORY.md for long-term memory.",
        args: {
          file: tool.schema.string().optional().default("MEMORY.md").describe("The memory file to read (e.g., 'MEMORY.md', 'SOUL.md', 'AGENTS.md')")
        },
        async execute(args) {
          try {
            const { file } = args;
            const filePath = path.join(MEMORY_DIR, file);

            if (!fs.existsSync(filePath)) {
              return {
                success: false,
                error: `File not found: ${file}`
              };
            }

            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split('\n').length;

            return {
              success: true,
              file,
              content,
              lines,
              size: Buffer.byteLength(content, 'utf-8')
            };
          } catch (e) {
            return {
              success: false,
              error: e.message
            };
          }
        }
      }),

      memory_search: tool({
        description: "Search memory files using keyword matching. Returns lines containing the search query.",
        args: {
          query: tool.schema.string().describe("The search query to look for in memory"),
          file: tool.schema.string().optional().default("MEMORY.md").describe("The memory file to search (default: MEMORY.md)")
        },
        async execute(args) {
          try {
            const { query, file } = args;
            const filePath = path.join(MEMORY_DIR, file);

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

            return {
              success: true,
              query,
              file,
              matches,
              count: matches.length
            };
          } catch (e) {
            return {
              success: false,
              error: e.message
            };
          }
        }
      }),

      vector_memory_search: tool({
        description: "Search memory using semantic vector search. Requires embedding model to be loaded.",
        args: {
          query: tool.schema.string().describe("The semantic search query"),
          mode: tool.schema.string().optional().default("hybrid").describe("Search mode: 'vector', 'bm25', 'hybrid', or 'hash'")
        },
        async execute(args) {
          try {
            const { query, mode } = args;
            const config = getConfig();

            if (!config) {
              return {
                success: false,
                error: "Memory configuration not found"
              };
            }

            // Check if embedding is enabled
            if (!config.embedding?.enabled) {
              return {
                success: false,
                error: "Embedding is not enabled in configuration",
                suggestion: "Try using memory_search for keyword search instead"
              };
            }

            // For now, return basic search results
            // TODO: Implement actual vector search
            const filePath = path.join(MEMORY_DIR, 'MEMORY.md');
            const content = fs.readFileSync(filePath, 'utf-8');
            const lines = content.split('\n');

            const matches = [];
            lines.forEach((line, index) => {
              if (line.toLowerCase().includes(query.toLowerCase())) {
                matches.push({
                  line: index + 1,
                  text: line.trim(),
                  score: 0.5 // Placeholder score
                });
              }
            });

            return {
              success: true,
              query,
              mode: mode || config.search?.mode || 'hybrid',
              matches: matches.slice(0, 10),
              count: matches.length,
              note: "Vector search not fully implemented, using keyword search"
            };
          } catch (e) {
            return {
              success: false,
              error: e.message
            };
          }
        }
      }),

      list_daily: tool({
        description: "List available daily log files from the past N days.",
        args: {
          days: tool.schema.number().optional().default(7).describe("Number of days to look back (default: 7)")
        },
        async execute(args) {
          try {
            const { days } = args;

            if (!fs.existsSync(DAILY_DIR)) {
              return {
                success: true,
                files: [],
                count: 0,
                message: "Daily directory not found"
              };
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

            return {
              success: true,
              files,
              count: files.length
            };
          } catch (e) {
            return {
              success: false,
              error: e.message
            };
          }
        }
      }),

      init_daily: tool({
        description: "Initialize today's daily log file if it doesn't exist.",
        args: {},
        async execute(args) {
          try {
            const today = new Date().toISOString().split('T')[0];
            const dailyFile = path.join(DAILY_DIR, `${today}.md`);

            if (fs.existsSync(dailyFile)) {
              return {
                success: true,
                message: "Daily log already exists",
                file: dailyFile,
                date: today
              };
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

            return {
              success: true,
              message: "Daily log created",
              file: dailyFile,
              date: today
            };
          } catch (e) {
            return {
              success: false,
              error: e.message
            };
          }
        }
      }),

      rebuild_index: tool({
        description: "Rebuild the vector search index for all memory files.",
        args: {
          force: tool.schema.boolean().optional().default(false).describe("Force rebuild even if index exists")
        },
        async execute(args) {
          try {
            const { force } = args;

            // TODO: Implement actual index rebuild
            return {
              success: true,
              message: "Index rebuild initiated",
              force,
              note: "Vector index rebuild not fully implemented",
              status: "pending"
            };
          } catch (e) {
            return {
              success: false,
              error: e.message
            };
          }
        }
      }),

      index_status: tool({
        description: "Check the status of the vector search index and memory configuration.",
        args: {},
        async execute(args) {
          try {
            const config = getConfig();

            if (!config) {
              return {
                success: false,
                error: "Configuration not found"
              };
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

            return {
              success: true,
              config: {
                version: config.version,
                searchMode: config.search?.mode,
                embeddingEnabled: config.embedding?.enabled,
                embeddingModel: config.embedding?.model,
                fallbackMode: config.embedding?.fallbackMode
              },
              files,
              dailyLogCount,
              indexStatus: "not_built",
              note: "Vector indexing not fully implemented"
            };
          } catch (e) {
            return {
              success: false,
              error: e.message
            };
          }
        }
      })
    }
  };
};
