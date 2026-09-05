/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ProviderAdapter } from './types.js'
import { getConfig } from '../config/store.js'

const BASE = 'https://api.openai.com/v1'

export const openaiAdapter: ProviderAdapter = {
  name: 'OpenAI',
  requiresKey: true,
  defaultModel: 'gpt-5.6-luna',
  availableModels: [
    'gpt-5.6-sol',
    'gpt-5.6-terra',
    'gpt-5.6-luna',
    'gpt-5.5',
    'gpt-5.4-mini',
    'gpt-5.4-nano',
    'gpt-4o',
  ],

  async validateKey(key: string): Promise<{ valid: boolean; reason: string }> {
    try {
      const res = await fetch(`${BASE}/models`, {
        headers: { Authorization: `Bearer ${key}` },
      })
      if (res.status === 200) {
        return { valid: true, reason: 'Successfully connected to OpenAI' }
      }
      const data = (await res.json().catch(() => ({}))) as any
      return { valid: false, reason: data.error?.message || `HTTP error ${res.status}` }
    } catch (e: any) {
      return { valid: false, reason: e.message }
    }
  },

  async generate(prompt: string, context: string): Promise<string> {
    const { apiKey, model } = getConfig()
    const res = await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model ?? 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Context:\n${context}\n\nYou generate open source repository health files. Output only the file contents, no explanation.`,
          },
          { role: 'user', content: prompt },
        ],
        max_tokens: 2000,
      }),
    })

    if (!res.ok) {
      let errorMessage = `OpenAI API error: ${res.status}`
      try {
        const errorData = (await res.json()) as any
        if (errorData.error && errorData.error.message) {
          errorMessage += ` - ${errorData.error.message}`
        } else {
          errorMessage += ` - ${JSON.stringify(errorData)}`
        }
      } catch {
        const errorText = await res.text()
        errorMessage += ` - ${errorText}`
      }
      throw new Error(errorMessage)
    }

    const data = (await res.json()) as any
    return data.choices[0].message.content.trim()
  },
}
