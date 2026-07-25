/* eslint-disable @typescript-eslint/no-explicit-any */
import { getConfig } from '../config/store.js'
import type { ProviderAdapter } from './types.js'

const BASE = 'https://openrouter.ai/api/v1'

export const openrouterAdapter: ProviderAdapter = {
  name: 'OpenRouter',
  requiresKey: true,
  defaultModel: 'anthropic/claude-haiku-4-5',
  availableModels: [
    'anthropic/claude-fable-5',
    'anthropic/claude-sonnet-5',
    'anthropic/claude-haiku-4-5',
    'openai/gpt-5.6-sol',
    'openai/gpt-5.6-terra',
    'openai/gpt-5.6-luna',
    'google/gemini-3.5-flash',
    'google/gemini-3.1-pro-preview',
    'meta-llama/llama-3.3-70b-instruct',
    'meta-llama/llama-3.3-8b-instruct:free',
  ],

  async validateKey(key: string): Promise<{ valid: boolean; reason: string }> {
    try {
      const res = await fetch(`${BASE}/auth/key`, {
        headers: { Authorization: `Bearer ${key}` },
      })
      if (res.status === 200) {
        return { valid: true, reason: 'Successfully connected to OpenRouter' }
      }
      const data = await res.json().catch(() => ({})) as any
      return { valid: false, reason: data.error?.message || `HTTP error ${res.status}` }
    } catch (e: any) {
      return { valid: false, reason: e.message }
    }
  },

  async generate(prompt: string, context: string): Promise<string> {
    const { apiKey, model } = getConfig()
    if (!apiKey) throw new Error('Missing OpenRouter API key')

    const res = await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/akramcodez/repokit',
        'X-Title': 'RepoKit CLI',
      },
      body: JSON.stringify({
        model: model ?? this.defaultModel,
        messages: [
          { role: 'system', content: 'Output only the file contents, no explanation.' },
          { role: 'user', content: `${prompt}\n\nContext:\n${context}` },
        ],
      }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(`OpenRouter error: ${res.status} - ${errorText}`)
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
