/* eslint-disable @typescript-eslint/no-explicit-any */
import { getConfig } from '../config/store.js'
import type { ProviderAdapter } from './types.js'

const BASE = 'https://api.groq.com/openai/v1'

export const groqAdapter: ProviderAdapter = {
  name: 'Groq',
  requiresKey: true,
  defaultModel: 'llama-3.3-70b-versatile',
  availableModels: [
    'openai/gpt-oss-120b',
    'llama-3.3-70b-versatile',
    'llama-3.3-8b-instant',
    'gemma2-9b-it',
  ],

  async validateKey(key: string): Promise<{ valid: boolean; reason: string }> {
    try {
      const res = await fetch(`${BASE}/models`, {
        headers: { Authorization: `Bearer ${key}` },
      })
      if (res.status === 200) {
        return { valid: true, reason: 'Successfully connected to Groq' }
      }
      const data = await res.json().catch(() => ({})) as any
      return { valid: false, reason: data.error?.message || `HTTP error ${res.status}` }
    } catch (e: any) {
      return { valid: false, reason: e.message }
    }
  },

  async generate(prompt: string, context: string): Promise<string> {
    const { apiKey, model } = getConfig()
    if (!apiKey) throw new Error('Missing Groq API key')

    const res = await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model ?? this.defaultModel,
        messages: [
          { role: 'system', content: 'You generate open source repository health files. Output only the file contents, no explanation.' },
          { role: 'user', content: `${prompt}\n\nContext:\n${context}` },
        ],
        max_tokens: 2000,
      }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`Groq error: ${res.status} - ${errorText}`)
    }
    const data = await res.json() as any
    let text = data.choices[0].message.content.trim()

    // Strip markdown codeblocks
    const codeBlockMatch = text.match(/```[\w-]*\n([\s\S]*?)\n```/)
    if (codeBlockMatch) {
      text = codeBlockMatch[1].trim()
    }
    return text
  },
}
