import Conf from 'conf'
import { chmodSync } from 'fs'

export interface RepokitConfig {
  provider: 'openai' | 'anthropic' | 'gemini' | 'openrouter' | 'ollama'
  apiKey: string
  model: string
}

export const store = new Conf<RepokitConfig>({
  projectName: 'repokit',
})

// Immediately secure the file
try {
  chmodSync(store.path, 0o600)
} catch {
  // May fail in tests or environments without chmod
}

export function getConfig(): Partial<RepokitConfig> {
  return store.store as Partial<RepokitConfig>
}

export function setConfig(patch: Partial<RepokitConfig>): void {
  for (const [key, value] of Object.entries(patch)) {
    store.set(key, value)
  }
  try {
    chmodSync(store.path, 0o600)
  } catch {
    // Ignore chmod errors
  }
}

export function clearConfig(): void {
  store.clear()
}

export function hasConfig(): boolean {
  return store.has('provider') && store.has('apiKey')
}
