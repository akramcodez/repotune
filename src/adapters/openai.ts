import type { ProviderAdapter } from './types.js'
import { getConfig } from '../config/store.js'

const BASE = 'https://api.openai.com/v1'

export const openaiAdapter: ProviderAdapter = {
  name: 'openai',

  async validateKey(key: string): Promise<boolean> {
    try {
      const res = await fetch(`${BASE}/models`, {
        headers: { Authorization: `Bearer ${key}` },
      })
      return res.status === 200
    } catch {
      return false
    }
  },

  async generate(prompt: string, context: string): Promise<string> {
    const { apiKey, model } = getConfig()
    const res = await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model ?? 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You generate open source repository health files. Output only the file contents, no explanation.' },
          { role: 'user', content: `${prompt}\n\nContext:\n${context}` },
        ],
        max_tokens: 2000,
      }),
    })

    if (!res.ok) {
      let errorMessage = `OpenAI API error: ${res.status}`
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const errorData = await res.json() as any
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await res.json() as any
    return data.choices[0].message.content.trim()
  },
}
