import Conf from 'conf'
import { chmodSync } from 'fs'
import { randomUUID } from 'crypto'

export interface TelemetryConfig {
  enabled?: boolean
  sessionId?: string
}

export interface RepotuneConfig {
  provider: 'openai' | 'anthropic' | 'gemini' | 'openrouter' | 'ollama' | 'groq'
  apiKey: string
  model: string
  telemetry?: TelemetryConfig
  hasSeenOfflineWarning?: boolean
  customAgent?: string
}

export const store = new Conf<RepotuneConfig>({
  projectName: 'repotune',
})

// Immediately secure the file
try {
  if (process.platform !== 'win32') {
    chmodSync(store.path, 0o600)
  }
} catch {
  // May fail in tests or environments without chmod
}

export function getConfig(): Partial<RepotuneConfig> {
  return store.store as Partial<RepotuneConfig>
}

export function setConfig(patch: Partial<RepotuneConfig>): void {
  for (const [key, value] of Object.entries(patch)) {
    store.set(key, value)
  }
  try {
    if (process.platform !== 'win32') {
      chmodSync(store.path, 0o600)
    }
  } catch {
    // Ignore chmod errors
  }
}

export function clearConfig(): void {
  store.clear()
}

export function hasConfig(): boolean {
  if (!store.has('provider')) return false
  if (store.get('provider') === 'ollama') return true
  return store.has('apiKey')
}

export function getTelemetryConfig(): TelemetryConfig {
  let tel = store.get('telemetry') as TelemetryConfig | undefined
  if (!tel) tel = {}
  if (!tel.sessionId) {
    tel.sessionId = randomUUID()
    store.set('telemetry', tel)
  }
  return tel
}

export function setTelemetryEnabled(enabled: boolean): void {
  const tel = getTelemetryConfig()
  tel.enabled = enabled
  store.set('telemetry', tel)
}

export function hasSeenOfflineWarning(): boolean {
  return !!store.get('hasSeenOfflineWarning')
}

export function setHasSeenOfflineWarning(): void {
  store.set('hasSeenOfflineWarning', true)
}
