/* eslint-disable @typescript-eslint/no-explicit-any */
import { getConfig } from '../config/store.js'
import type { ProviderAdapter } from './types.js'

const BASE = 'http://localhost:11434'

export const ollamaAdapter: ProviderAdapter = {
  name: 'Ollama (Local)',
  requiresKey: false,
  defaultModel: 'llama3.2',
  availableModels: [], // dynamically fetched

  async validateKey(_key: string): Promise<{ valid: boolean; reason: string }> {
    try {
      const res = await fetch(`${BASE}/api/tags`)
      if (res.status === 200) {
        return { valid: true, reason: 'Successfully connected to local Ollama server' }
      }
      return { valid: false, reason: `HTTP error ${res.status}` }
    } catch {
      return { valid: false, reason: `Failed to connect to ${BASE}` }
    }
  },

  async fetchModels(): Promise<string[]> {
    try {
      const res = await fetch(`${BASE}/api/tags`)
      if (!res.ok) return []
      const data = (await res.json()) as any
      return data.models.map((m: any) => m.name)
    } catch {
      return []
    }
  },

  async generate(prompt: string, context: string): Promise<string> {
    const { model } = getConfig()
    const res = await fetch(`${BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model ?? this.defaultModel,
        prompt: prompt,
        stream: false,
        system: `Context:\n${context}\n\nOutput only the file contents, no explanation.`,
      }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Ollama error: ${res.status} - ${errorText}`)
    }
    const data = (await res.json()) as any
    let text = data.response.trim()

    // Strip markdown codeblocks
    const codeBlockMatch = text.match(/```[\w-]*\n([\s\S]*?)\n```/)
    if (codeBlockMatch) {
      text = codeBlockMatch[1].trim()
    }
    return text
  },
}
