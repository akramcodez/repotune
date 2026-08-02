import { getConfig } from '../config/store.js'
import { openaiAdapter } from './openai.js'
import { geminiAdapter } from './gemini.js'
import { anthropicAdapter } from './anthropic.js'
import { openrouterAdapter } from './openrouter.js'
import { ollamaAdapter } from './ollama.js'
import { groqAdapter } from './groq.js'
import type { ProviderAdapter } from './types.js'

const ADAPTERS: Record<string, ProviderAdapter> = {
  openai: openaiAdapter,
  anthropic: anthropicAdapter,
  gemini: geminiAdapter,
  openrouter: openrouterAdapter,
  ollama: ollamaAdapter,
  groq: groqAdapter,
}

export function getAdapter(): ProviderAdapter {
  const { provider } = getConfig()
  if (!provider || !ADAPTERS[provider]) {
    throw new Error('No AI provider configured. Run: repotune config')
  }
  return ADAPTERS[provider]
}
