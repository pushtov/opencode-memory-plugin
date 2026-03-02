/**
 * OpenCode Session Sync Module
 *
 * Syncs sessions from OpenCode's database to memory plugin's index
 * Enables searching through past conversations
 */

import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { getVectorStore } from './vector-store.js';

const HOME = process.env.HOME || process.env.USERPROFILE;
const OPENCODE_DB = path.join(HOME, '.local', 'share', 'opencode', 'opencode.db');
const MEMORY_DIR = path.join(HOME, '.opencode', 'memory');
const SYNC_STATE_FILE = path.join(MEMORY_DIR, '.session-sync-state.json');
const CONFIG_FILE = path.join(MEMORY_DIR, 'memory-config.json');

/**
 * Get configuration
 */
function getConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    }
  } catch (e) {}
  return {};
}

/**
 * Load sync state (tracks which sessions have been synced)
 */
function loadSyncState() {
  try {
    if (fs.existsSync(SYNC_STATE_FILE)) {
      return JSON.parse(fs.readFileSync(SYNC_STATE_FILE, 'utf-8'));
    }
  } catch (e) {}
  return { syncedSessions: {}, lastSync: null };
}

/**
 * Save sync state
 */
function saveSyncState(state) {
  try {
    if (!fs.existsSync(MEMORY_DIR)) {
      fs.mkdirSync(MEMORY_DIR, { recursive: true });
    }
    fs.writeFileSync(SYNC_STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to save sync state:', e.message);
  }
}

/**
 * Extract text content from message data
 */
function extractMessageContent(dataStr) {
  try {
    const data = JSON.parse(dataStr);
    let content = '';

    // Extract from different message formats
    if (data.content) {
      if (typeof data.content === 'string') {
        content = data.content;
      } else if (Array.isArray(data.content)) {
        // Handle array of content blocks
        for (const block of data.content) {
          if (block.type === 'text' && block.text) {
            content += block.text + '\n';
          } else if (block.type === 'tool_use' && block.name) {
            content += `[Tool: ${block.name}]\n`;
          }
        }
      }
    }

    // Also check for text field
    if (data.text && !content) {
      content = data.text;
    }

    return content.trim();
  } catch (e) {
    return '';
  }
}

/**
 * Format session for indexing
 */
function formatSessionForIndex(session, messages) {
  const lines = [];

  lines.push(`# Session: ${session.title || 'Untitled'}`);
  lines.push(`Date: ${new Date(session.time_created).toISOString()}`);
  lines.push(`Project: ${session.directory || 'Unknown'}`);
  lines.push('');

  // Add messages
  for (const msg of messages) {
    const role = msg.role === 'user' ? 'User' : 'Assistant';
    const content = extractMessageContent(msg.data);
    if (content) {
      lines.push(`## ${role}`);
      lines.push(content);
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Sync sessions from OpenCode database
 */
export async function syncSessions(options = {}) {
  const { force = false, limit = 100 } = options;
  const config = getConfig();

  // Check if OpenCode database exists
  if (!fs.existsSync(OPENCODE_DB)) {
    return {
      success: false,
      error: 'OpenCode database not found',
      path: OPENCODE_DB
    };
  }

  let db;
  try {
    db = new Database(OPENCODE_DB, { readonly: true });

    const syncState = loadSyncState();
    const now = Date.now();

    // Get sessions to sync
    let query = `
      SELECT id, title, directory, time_created, time_updated
      FROM session
      ORDER BY time_updated DESC
      LIMIT ?
    `;
    let sessions = db.prepare(query).all(limit);

    if (!force) {
      // Filter to only new/updated sessions
      sessions = sessions.filter(s => {
        const synced = syncState.syncedSessions[s.id];
        if (!synced) return true;
        return s.time_updated > synced.timeUpdated;
      });
    }

    if (sessions.length === 0) {
      return {
        success: true,
        message: 'No new sessions to sync',
        syncedCount: 0,
        lastSync: syncState.lastSync
      };
    }

    // Initialize vector store
    const vectorStore = getVectorStore();
    let vectorAvailable = true;
    if (!vectorStore.initialized) {
      const initResult = await vectorStore.initialize({
        model: config.embedding?.model
      });
      if (!initResult.success) {
        vectorAvailable = false;
        console.log('Vector search unavailable:', initResult.error);
      }
    }

    // Process each session
    const results = [];
    let totalChunks = 0;

    for (const session of sessions) {
      try {
        // Get messages for this session
        const messages = db.prepare(`
          SELECT id, session_id, data, time_created
          FROM message
          WHERE session_id = ?
          ORDER BY time_created ASC
        `).all(session.id);

        if (messages.length === 0) continue;

        // Format session content
        const content = formatSessionForIndex(session, messages);

        // Index the session if vector store is available
        let chunks = 0;
        if (vectorAvailable) {
          try {
            const indexResult = await vectorStore.indexDocument(
              content,
              `opencode-session:${session.id}`,
              {
                clearExisting: true,
                chunkSize: config.indexing?.chunkSize || 400,
                overlap: config.indexing?.chunkOverlap || 80
              }
            );
            chunks = indexResult.indexed || 0;
          } catch (idxErr) {
            console.error(`Failed to index session ${session.id}:`, idxErr.message);
          }
        }

        // Update sync state (always save, even if indexing failed)
        syncState.syncedSessions[session.id] = {
          timeUpdated: session.time_updated,
          syncedAt: now,
          messageCount: messages.length,
          chunks: chunks
        };

        totalChunks += chunks;
        results.push({
          sessionId: session.id,
          title: session.title,
          messages: messages.length,
          chunks: chunks
        });

      } catch (e) {
        results.push({
          sessionId: session.id,
          error: e.message
        });
      }
    }

    // Save sync state
    syncState.lastSync = now;
    saveSyncState(syncState);

    return {
      success: true,
      message: `Synced ${results.length} sessions`,
      syncedCount: results.length,
      totalChunks,
      results,
      lastSync: new Date(now).toISOString()
    };

  } catch (e) {
    return {
      success: false,
      error: e.message
    };
  } finally {
    if (db) db.close();
  }
}

/**
 * Get sync status
 */
export function getSyncStatus() {
  const syncState = loadSyncState();
  const sessionCount = Object.keys(syncState.syncedSessions).length;
  const config = getConfig();

  return {
    lastSync: syncState.lastSync ? new Date(syncState.lastSync).toISOString() : null,
    totalSessions: sessionCount,
    databaseExists: fs.existsSync(OPENCODE_DB),
    autoSync: config.sessionSync?.autoSync ?? true,
    syncInterval: config.sessionSync?.syncInterval ?? 3600000 // default 1 hour
  };
}

/**
 * Configure session sync
 */
export function configureSync(options) {
  const configPath = CONFIG_FILE;
  let config = {};

  try {
    if (fs.existsSync(configPath)) {
      config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    }
  } catch (e) {}

  // Update session sync config
  config.sessionSync = {
    autoSync: options.autoSync ?? config.sessionSync?.autoSync ?? true,
    syncInterval: options.syncInterval ?? config.sessionSync?.syncInterval ?? 3600000,
    lastSyncOnly: options.lastSyncOnly ?? config.sessionSync?.lastSyncOnly ?? false
  };

  try {
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
    return { success: true, config: config.sessionSync };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Auto sync if configured and needed
 */
export async function autoSyncIfNeeded() {
  const config = getConfig();
  const status = getSyncStatus();

  // Check if auto sync is enabled
  if (config.sessionSync?.autoSync === false) {
    return { synced: false, reason: 'Auto sync disabled' };
  }

  // Check if sync is needed based on interval
  const interval = config.sessionSync?.syncInterval || 3600000; // 1 hour default
  const lastSync = status.lastSync ? new Date(status.lastSync).getTime() : 0;
  const now = Date.now();

  if (lastSync && (now - lastSync) < interval) {
    return { synced: false, reason: 'Sync interval not reached' };
  }

  // Perform sync
  return await syncSessions({ limit: 50 });
}

export default { syncSessions, getSyncStatus, configureSync, autoSyncIfNeeded };