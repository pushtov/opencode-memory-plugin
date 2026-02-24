/**
 * Configuration Management for OpenCode Memory Plugin
 * 
 * This module handles loading, validating, and managing configuration
 * for the memory system including model selection and search modes.
 */

import path from "path"
import { readFile, exists } from "fs/promises"

// Configuration file paths
const MEMORY_DIR = path.join(process.env.HOME || "", ".opencode", "memory")
const CONFIG_PATH = path.join(MEMORY_DIR, "memory-config.json")

// Default configuration
const DEFAULT_CONFIG: MemoryConfig = {
  version: "2.0",
  search: {
    mode: "hybrid",
    options: {
      hybrid: {
        vectorWeight: 0.7,
        bm25Weight: 0.3
      }
    }
  },
  embedding: {
    enabled: true,
    provider: "transformers",
    model: "Xenova/all-MiniLM-L6-v2",
    fallbackMode: "hash",
    cache: {
      enabled: true,
      directory: path.join(process.env.HOME || "", ".cache", "huggingface")
    }
  },
  models: {
    available: {
      "Xenova/all-MiniLM-L6-v2": {
        dimensions: 384,
        size: "80MB",
        language: "en",
        useCase: "general",
        quality: "good",
        speed: "fast"
      },
      "Xenova/bge-small-en-v1.5": {
        dimensions: 384,
        size: "130MB",
        language: "en",
        useCase: "high-quality",
        quality: "excellent",
        speed: "medium"
      },
      "Xenova/bge-base-en-v1.5": {
        dimensions: 768,
        size: "400MB",
        language: "en",
        useCase: "best-quality",
        quality: "best",
        speed: "slow"
      },
      "Xenova/e5-small-v2": {
        dimensions: 384,
        size: "130MB",
        language: "en",
        useCase: "question-answer",
        quality: "good",
        speed: "medium"
      },
      "Xenova/nomic-embed-text-v1.5": {
        dimensions: 768,
        size: "270MB",
        language: "en",
        useCase: "long-documents",
        quality: "excellent",
        speed: "medium"
      }
    }
  },
  indexing: {
    chunkSize: 400,
    chunkOverlap: 80,
    autoRebuild: true
  }
}

// Type definitions
export interface MemoryConfig {
  version: string
  search: SearchConfig
  embedding: EmbeddingConfig
  models: ModelsConfig
  indexing: IndexingConfig
  // Legacy v1.0 fields (for backward compatibility)
  auto_save?: boolean
  vector_search?: {
    enabled: boolean
    hybrid: boolean
    rebuild_interval_hours?: number
  }
  consolidation?: {
    enabled: boolean
    run_daily: boolean
    run_hour: number
    archive_days: number
    delete_days: number
  }
  retention?: {
    max_daily_files: number
    max_entries_per_file: number
    chunk_size: number
    chunk_overlap: number
  }
}

export interface SearchConfig {
  mode: "hybrid" | "vector" | "bm25" | "hash"
  options: {
    hybrid?: {
      vectorWeight: number
      bm25Weight: number
    }
  }
}

export interface EmbeddingConfig {
  enabled: boolean
  provider: "transformers" | "openai" | "none"
  model: string
  fallbackMode: "hash" | "bm25" | "error"
  cache: {
    enabled: boolean
    directory: string
  }
}

export interface ModelInfo {
  dimensions: number
  size: string
  language: string
  useCase: string
  quality: "good" | "excellent" | "best"
  speed: "fast" | "medium" | "slow"
}

export interface ModelsConfig {
  available: Record<string, ModelInfo>
}

export interface IndexingConfig {
  chunkSize: number
  chunkOverlap: number
  autoRebuild: boolean
}

// Configuration cache
let cachedConfig: MemoryConfig | null = null

/**
 * Load configuration from file
 * @param reload Force reload from disk
 * @returns Configuration object
 */
export async function loadConfig(reload = false): Promise<MemoryConfig> {
  // Return cached config if available
  if (cachedConfig && !reload) {
    return cachedConfig
  }

  try {
    // Check if config file exists
    if (!(await exists(CONFIG_PATH))) {
      console.warn(`Config file not found: ${CONFIG_PATH}, using defaults`)
      cachedConfig = { ...DEFAULT_CONFIG }
      return cachedConfig
    }

    // Read config file
    const configData = await readFile(CONFIG_PATH, "utf-8")
    const userConfig = JSON.parse(configData) as Partial<MemoryConfig>

    // Merge with defaults (user config overrides defaults)
    cachedConfig = mergeConfig(DEFAULT_CONFIG, userConfig)

    // Validate configuration
    validateConfig(cachedConfig)

    return cachedConfig
  } catch (error) {
    console.error("Failed to load config, using defaults:", error)
    cachedConfig = { ...DEFAULT_CONFIG }
    return cachedConfig
  }
}

/**
 * Merge user configuration with defaults
 */
function mergeConfig(
  defaults: MemoryConfig,
  user: Partial<MemoryConfig>
): MemoryConfig {
  return {
    ...defaults,
    ...user,
    search: {
      ...defaults.search,
      ...user.search,
      options: {
        ...defaults.search.options,
        ...user.search?.options
      }
    },
    embedding: {
      ...defaults.embedding,
      ...user.embedding,
      cache: {
        ...defaults.embedding.cache,
        ...user.embedding?.cache
      }
    },
    models: {
      ...defaults.models,
      ...user.models
    },
    indexing: {
      ...defaults.indexing,
      ...user.indexing
    }
  }
}

/**
 * Validate configuration
 * @throws Error if configuration is invalid
 */
function validateConfig(config: MemoryConfig): void {
  // Validate search mode
  const validModes = ["hybrid", "vector", "bm25", "hash"]
  if (!validModes.includes(config.search.mode)) {
    throw new Error(
      `Invalid search mode: ${config.search.mode}. Must be one of: ${validModes.join(", ")}`
    )
  }

  // Validate embedding model
  if (config.embedding.enabled && config.embedding.provider === "transformers") {
    if (!config.models.available[config.embedding.model]) {
      throw new Error(
        `Unknown embedding model: ${config.embedding.model}. ` +
        `Available models: ${Object.keys(config.models.available).join(", ")}`
      )
    }
  }

  // Validate hybrid weights
  if (config.search.mode === "hybrid" && config.search.options.hybrid) {
    const { vectorWeight, bm25Weight } = config.search.options.hybrid
    if (vectorWeight < 0 || vectorWeight > 1) {
      throw new Error(`vectorWeight must be between 0 and 1, got: ${vectorWeight}`)
    }
    if (bm25Weight < 0 || bm25Weight > 1) {
      throw new Error(`bm25Weight must be between 0 and 1, got: ${bm25Weight}`)
    }
    if (Math.abs(vectorWeight + bm25Weight - 1.0) > 0.01) {
      console.warn(
        `Hybrid weights don't sum to 1.0 (vector: ${vectorWeight}, bm25: ${bm25Weight}). ` +
        `Weights will be normalized.`
      )
    }
  }

  // Validate fallback mode
  const validFallbacks = ["hash", "bm25", "error"]
  if (!validFallbacks.includes(config.embedding.fallbackMode)) {
    throw new Error(
      `Invalid fallback mode: ${config.embedding.fallbackMode}. ` +
      `Must be one of: ${validFallbacks.join(", ")}`
    )
  }

  // Validate indexing parameters
  if (config.indexing.chunkSize < 100 || config.indexing.chunkSize > 2000) {
    throw new Error(
      `chunkSize must be between 100 and 2000, got: ${config.indexing.chunkSize}`
    )
  }
  if (config.indexing.chunkOverlap < 0 || config.indexing.chunkOverlap >= config.indexing.chunkSize) {
    throw new Error(
      `chunkOverlap must be between 0 and chunkSize, got: ${config.indexing.chunkOverlap}`
    )
  }
}

/**
 * Get current configuration
 */
export async function getConfig(): Promise<MemoryConfig> {
  return loadConfig()
}

/**
 * Get search mode
 */
export async function getSearchMode(): Promise<SearchConfig["mode"]> {
  const config = await getConfig()
  return config.search.mode
}

/**
 * Get embedding model name
 */
export async function getEmbeddingModel(): Promise<string> {
  const config = await getConfig()
  return config.embedding.model
}

/**
 * Check if embeddings are enabled
 */
export async function isEmbeddingEnabled(): Promise<boolean> {
  const config = await getConfig()
  return config.embedding.enabled && config.embedding.provider !== "none"
}

/**
 * Get model info
 */
export async function getModelInfo(modelName?: string): Promise<ModelInfo | null> {
  const config = await getConfig()
  const model = modelName || config.embedding.model
  return config.models.available[model] || null
}

/**
 * List available models
 */
export async function listAvailableModels(): Promise<Record<string, ModelInfo>> {
  const config = await getConfig()
  return config.models.available
}

/**
 * Clear config cache (for testing)
 */
export function clearConfigCache(): void {
  cachedConfig = null
}

/**
 * Get configuration file path
 */
export function getConfigPath(): string {
  return CONFIG_PATH
}
