import { getConfig } from '../config/store.js'
import { openaiAdapter } from './openai.js'
import type { ProviderAdapter } from './types.js'

export function getAdapter(): ProviderAdapter {
  const { provider } = getConfig()
  
  switch (provider) {
    case 'openai':
      return openaiAdapter
    // Future providers go here
    default:
      // Fallback or unconfigured
      return openaiAdapter
  }
}
