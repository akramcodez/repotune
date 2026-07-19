import { getConfig } from '../config/store.js'
import { openaiAdapter } from './openai.js'
import { geminiAdapter } from './gemini.js'
import type { ProviderAdapter } from './types.js'

export function getAdapter(): ProviderAdapter {
  const { provider } = getConfig()
  
  switch (provider) {
    case 'openai':
      return openaiAdapter
    case 'gemini':
      return geminiAdapter
    default:
      // Fallback or unconfigured
      return openaiAdapter
  }
}
