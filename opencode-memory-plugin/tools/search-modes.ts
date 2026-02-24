/**
 * Search Mode Implementations for OpenCode Memory Plugin
 * 
 * This file contains the implementation for different search modes:
 * - hybrid: Vector + BM25 (best quality)
 * - vector: Vector-only (semantic search)
 * - bm25: BM25-only (keyword search)
 * - hash: Hash-based embeddings (fallback)
 */

import path from "path"
import Database from "better-sqlite3"
import { readFile, exists } from "fs/promises"
import { cosineSimilarity } from "./vector-memory"
import { loadConfig, type MemoryConfig } from "./config"

const VECTOR_DB_PATH = path.join(process.env.HOME || "", ".opencode", "memory", "vector-index.db")
const MEMORY_DIR = path.join(process.env.HOME || "", ".opencode", "memory")

/**
 * BM25-only search (fast keyword matching)
 */
export async function bm25OnlySearch(
  args: any,
  limit: number,
  config: MemoryConfig
): Promise<string> {
  await ensureVectorIndex()

  const daysToSearch = args.days || 7
  const query = args.query

  const db = new Database(VECTOR_DB_PATH, { readonly: true })

  try {
    const filesToSearch = getFilesToSearch(args, daysToSearch, config)

    if (filesToSearch.length === 0) {
      return "No files found matching the specified scope."
    }

    const results: {
      file: string
      snippet: string
      score: number
      line_start: number
      line_end: number
    }[] = []

    // Pure BM25 search (FTS5)
    const ftsResults = db
      .prepare(
        `
      SELECT memory_chunks.file_path, memory_chunks.chunk, memory_chunks.line_start, memory_chunks.line_end, bm25(memory_fts) as bm25_score
      FROM memory_fts
      JOIN memory_chunks ON memory_chunks.id = memory_fts.rowid
      WHERE memory_fts MATCH ? AND memory_chunks.file_path IN (${filesToSearch
        .map(() => "?")
        .join(", ")})
      ORDER BY bm25_score
      LIMIT ?
    `
      )
      .all(query, ...filesToSearch, limit)

    for (const row of ftsResults) {
      results.push({
        file: path.basename(row.file_path as string),
        snippet: (row.chunk as string).substring(0, 700),
        score: 1.0, // BM25 already ranked
        line_start: row.line_start as number,
        line_end: row.line_end as number
      })
    }

    return formatResults(results, query, "BM25 Keyword Search")
  } finally {
    db.close()
  }
}

/**
 * Vector-only search (pure semantic search)
 */
export async function vectorOnlySearch(
  args: any,
  limit: number,
  config: MemoryConfig
): Promise<string> {
  if (!config.embedding.enabled) {
    return "Error: Vector search requires embeddings to be enabled. Set embedding.enabled=true in config or use search_mode='bm25'."
  }

  await ensureVectorIndex()
  const daysToSearch = args.days || 7
  const query = args.query

  const db = new Database(VECTOR_DB_PATH, { readonly: true })

  try {
    const chunkCount = db.prepare("SELECT COUNT(*) as count FROM memory_chunks").get() as {
      count: number
    }

    if (chunkCount.count === 0) {
      db.close()
      return "Vector index is empty. Write some memories first, then try searching."
    }

    // Import getEmbedding dynamically to avoid circular dependency
    const { getEmbedding } = await import("./vector-memory")
    const queryEmbedding = await getEmbedding(query)

    const filesToSearch = getFilesToSearch(args, daysToSearch, config)
    const results: {
      file: string
      snippet: string
      score: number
      line_start: number
      line_end: number
    }[] = []

    // Pure vector similarity search
    const vectorResults = db
      .prepare(
        `
      SELECT file_path, chunk, line_start, line_end, embedding
      FROM memory_chunks
      WHERE file_path IN (${filesToSearch.map(() => "?").join(", ")})
    `
      )
      .all(...filesToSearch)

    for (const row of vectorResults) {
      const similarity = cosineSimilarity(queryEmbedding, JSON.parse(row.embedding as string))
      results.push({
        file: path.basename(row.file_path as string),
        snippet: (row.chunk as string).substring(0, 700),
        score: similarity,
        line_start: row.line_start as number,
        line_end: row.line_end as number
      })
    }

    results.sort((a, b) => b.score - a.score)
    const topResults = results.slice(0, limit)

    return formatResults(topResults, query, "Vector Semantic Search")
  } finally {
    db.close()
  }
}

/**
 * Hash-based search (emergency fallback, no model needed)
 */
export async function hashOnlySearch(
  args: any,
  limit: number,
  config: MemoryConfig
): Promise<string> {
  await ensureVectorIndex()
  const daysToSearch = args.days || 7
  const query = args.query

  const db = new Database(VECTOR_DB_PATH, { readonly: true })

  try {
    const chunkCount = db.prepare("SELECT COUNT(*) as count FROM memory_chunks").get() as {
      count: number
    }

    if (chunkCount.count === 0) {
      db.close()
      return "Vector index is empty. Write some memories first, then try searching."
    }

    // Use hash-based embedding (no model)
    const modelInfo = config.models.available["Xenova/all-MiniLM-L6-v2"]
    const dimensions = modelInfo?.dimensions || 384

    const words = query.toLowerCase().split(/\s+/)
    const queryEmbedding: number[] = []

    for (let i = 0; i < dimensions; i++) {
      let hash = 0
      for (const word of words) {
        for (let k = 0; k < word.length; k++) {
          hash = ((hash << 5) - hash) + word.charCodeAt(k)
          hash |= 0
        }
      }
      queryEmbedding.push((hash % 1000) / 1000)
    }

    const filesToSearch = getFilesToSearch(args, daysToSearch, config)
    const results: {
      file: string
      snippet: string
      score: number
      line_start: number
      line_end: number
    }[] = []

    const vectorResults = db
      .prepare(
        `
      SELECT file_path, chunk, line_start, line_end, embedding
      FROM memory_chunks
      WHERE file_path IN (${filesToSearch.map(() => "?").join(", ")})
    `
      )
      .all(...filesToSearch)

    for (const row of vectorResults) {
      const similarity = cosineSimilarity(queryEmbedding, JSON.parse(row.embedding as string))
      results.push({
        file: path.basename(row.file_path as string),
        snippet: (row.chunk as string).substring(0, 700),
        score: similarity,
        line_start: row.line_start as number,
        line_end: row.line_end as number
      })
    }

    results.sort((a, b) => b.score - a.score)
    const topResults = results.slice(0, limit)

    return formatResults(topResults, query, "Hash-based Search (low quality)")
  } finally {
    db.close()
  }
}

/**
 * Hybrid search (vector + BM25, best quality)
 */
export async function hybridSearch(
  args: any,
  limit: number,
  config: MemoryConfig
): Promise<string> {
  const useHybrid = args.hybrid !== false
  const vectorWeight = config.search.options.hybrid?.vectorWeight || 0.7
  const bm25Weight = config.search.options.hybrid?.bm25Weight || 0.3

  if (!config.embedding.enabled) {
    console.warn("Embeddings disabled, falling back to BM25-only search")
    return bm25OnlySearch(args, limit, config)
  }

  await ensureVectorIndex()
  const daysToSearch = args.days || 7
  const query = args.query

  const db = new Database(VECTOR_DB_PATH, { readonly: true })

  try {
    const chunkCount = db.prepare("SELECT COUNT(*) as count FROM memory_chunks").get() as {
      count: number
    }

    if (chunkCount.count === 0) {
      db.close()
      return "Vector index is empty. Write some memories first, then try searching."
    }

    // Import getEmbedding dynamically
    const { getEmbedding } = await import("./vector-memory")
    const queryEmbedding = await getEmbedding(query)

    const filesToSearch = getFilesToSearch(args, daysToSearch, config)
    const results: {
      file: string
      snippet: string
      score: number
      line_start: number
      line_end: number
    }[] = []

    // Vector similarity search
    const vectorResults = db
      .prepare(
        `
      SELECT file_path, chunk, line_start, line_end, embedding
      FROM memory_chunks
      WHERE file_path IN (${filesToSearch.map(() => "?").join(", ")})
    `
      )
      .all(...filesToSearch)

    for (const row of vectorResults) {
      const similarity = cosineSimilarity(queryEmbedding, JSON.parse(row.embedding as string))
      results.push({
        file: path.basename(row.file_path as string),
        snippet: (row.chunk as string).substring(0, 700),
        score: similarity,
        line_start: row.line_start as number,
        line_end: row.line_end as number
      })
    }

    // Hybrid search with BM25 if enabled
    if (useHybrid) {
      const ftsResults = db
        .prepare(
          `
        SELECT memory_chunks.file_path, memory_chunks.chunk, memory_chunks.line_start, memory_chunks.line_end, bm25(memory_fts) as bm25_score
        FROM memory_fts
        JOIN memory_chunks ON memory_chunks.id = memory_fts.rowid
        WHERE memory_fts MATCH ? AND memory_chunks.file_path IN (${filesToSearch
          .map(() => "?")
          .join(", ")})
        ORDER BY bm25_score
        LIMIT ${limit * 2}
      `
        )
        .all(query, ...filesToSearch)

      const vectorScores = new Map<string, number>()
      for (const r of results) {
        vectorScores.set(`${r.file}:${r.line_start}`, r.score)
      }

      for (const row of ftsResults) {
        const key = `${path.basename(row.file_path as string)}:${row.line_start as number}`
        const vectorScore = vectorScores.get(key) || 0
        const bm25Score = 1 / (1 + (row.bm25_score as number))

        const hybridScore = vectorWeight * vectorScore + bm25Weight * bm25Score

        const existingIndex = results.findIndex(
          (r) => r.file === path.basename(row.file_path as string) && r.line_start === row.line_start
        )
        if (existingIndex >= 0) {
          if (hybridScore > results[existingIndex].score) {
            results[existingIndex].score = hybridScore
          }
        } else if (hybridScore > 0.3) {
          results.push({
            file: path.basename(row.file_path as string),
            snippet: (row.chunk as string).substring(0, 700),
            score: hybridScore,
            line_start: row.line_start as number,
            line_end: row.line_end as number
          })
        }
      }
    }

    results.sort((a, b) => b.score - a.score)
    const topResults = results.slice(0, limit)

    const searchType = useHybrid
      ? `Hybrid Search (${Math.round(vectorWeight * 100)}% vector + ${Math.round(bm25Weight * 100)}% BM25)`
      : "Vector Search"

    return formatResults(topResults, query, searchType)
  } finally {
    db.close()
  }
}

/**
 * Get list of files to search based on scope
 */
export function getFilesToSearch(args: any, daysToSearch: number, config: MemoryConfig): string[] {
  const filesToSearch: string[] = []

  if (args.scope === "all" || args.scope === "long-term") {
    filesToSearch.push(path.join(MEMORY_DIR, "MEMORY.md"))
  }
  if (args.scope === "all" || args.scope === "preference") {
    filesToSearch.push(path.join(MEMORY_DIR, "PREFERENCES.md"))
  }
  if (args.scope === "all" || args.scope === "personality") {
    filesToSearch.push(path.join(MEMORY_DIR, "SOUL.md"))
  }
  if (args.scope === "all" || args.scope === "context") {
    filesToSearch.push(path.join(MEMORY_DIR, "CONTEXT.md"))
  }
  if (args.scope === "all" || args.scope === "tools") {
    filesToSearch.push(path.join(MEMORY_DIR, "TOOLS.md"))
  }
  if (args.scope === "all" || args.scope === "identity") {
    filesToSearch.push(path.join(MEMORY_DIR, "IDENTITY.md"))
  }
  if (args.scope === "all" || args.scope === "user") {
    filesToSearch.push(path.join(MEMORY_DIR, "USER.md"))
  }
  if (args.scope === "all" || args.scope === "daily") {
    const dailyDir = path.join(MEMORY_DIR, "daily")
    for (let i = 0; i < daysToSearch; i++) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split("T")[0]
      filesToSearch.push(path.join(dailyDir, `${dateStr}.md`))
    }
  }

  return filesToSearch
}

/**
 * Format search results for display
 */
export function formatResults(results: any[], query: string, searchType: string): string {
  if (results.length === 0) {
    return `No relevant memories found for: "${query}"\n\nTry different keywords or check if memories have been indexed.`
  }

  let output = `🔍 ${searchType} Results for: "${query}"\n\n`
  for (const r of results) {
    const scorePercent = (r.score * 100).toFixed(1)
    output += `### ${r.file} (Lines ${r.line_start}-${r.line_end})\n`
    output += `**Relevance**: ${scorePercent}%\n`
    output += `${r.snippet}${r.snippet.length >= 700 ? "..." : ""}\n\n`
  }

  return output.trim()
}

/**
 * Ensure vector index exists
 */
async function ensureVectorIndex(): Promise<void> {
  const { ensureDir } = await import("fs/promises")
  await ensureDir(MEMORY_DIR)

  const db = new Database(VECTOR_DB_PATH)

  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS memory_chunks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_path TEXT NOT NULL,
        chunk TEXT NOT NULL,
        line_start INTEGER NOT NULL,
        line_end INTEGER NOT NULL,
        embedding BLOB,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP,
        metadata TEXT
      )
    `)

    db.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS memory_fts USING fts5(
        chunk,
        content='memory_chunks',
        content_rowid='id'
      )
    `)
  } finally {
    db.close()
  }
}
