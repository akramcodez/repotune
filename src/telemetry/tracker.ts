import { getTelemetryConfig } from '../config/store.js'

export interface TelemetryEvent {
  event: 'scan' | 'doctor_generate' | 'doctor_deny' | 'doctor_allow_all'
  checkId?: string
  provider?: string
  score?: number
  timestamp: string
  sessionId: string
}

export async function track(event: Omit<TelemetryEvent, 'timestamp' | 'sessionId'>): Promise<void> {
  const config = getTelemetryConfig()

  if (config.enabled !== true) {
    return
  }

  const fullEvent: TelemetryEvent = {
    ...event,
    timestamp: new Date().toISOString().split('T')[0] as string, // ISO date only
    sessionId: config.sessionId || 'anonymous',
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2000)

    await fetch('https://telemetry.repotune.dev/event', {
      method: 'POST',
      body: JSON.stringify(fullEvent),
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout))
  } catch {
    // Silently swallow - telemetry should never crash the CLI
  }
}
