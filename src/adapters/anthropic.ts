/* eslint-disable @typescript-eslint/no-explicit-any */
import { getConfig } from '../config/store.js'
import type { ProviderAdapter } from './types.js'

const BASE = 'https://api.anthropic.com/v1'

export const anthropicAdapter: ProviderAdapter = {
  name: 'Anthropic',
  requiresKey: true,
  defaultModel: 'claude-sonnet-5',
  availableModels: [
    'claude-fable-5',
    'claude-sonnet-5',
    'claude-opus-4-8',
    'claude-haiku-4-5-20251001',
  ],

  async validateKey(key: string): Promise<{ valid: boolean; reason: string }> {
    try {
      const res = await fetch(`${BASE}/models`, {
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
        },
      })
      if (res.status === 200) {
        return { valid: true, reason: 'Successfully connected to Anthropic' }
      }
      const data = await res.json().catch(() => ({})) as any
      return { valid: false, reason: data.error?.message || `HTTP error ${res.status}` }
    } catch (e: any) {
      return { valid: false, reason: e.message }
    }
  },

  async generate(prompt: string, context: string): Promise<string> {
    const { apiKey, model } = getConfig()
    if (!apiKey) throw new Error('Missing Anthropic API key')

    const res = await fetch(`${BASE}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model ?? this.defaultModel,
        max_tokens: 2000,
        messages: [
          { role: 'user', content: prompt },
        ],
        system: `Context:\n${context}\n\nYou generate open source repository health files. Output only the file contents, no explanation.`,
      }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Anthropic error: ${res.status} - ${errorText}`)
    }
    const data = await res.json() as any
    return data.content[0].text.trim()
  },
}
