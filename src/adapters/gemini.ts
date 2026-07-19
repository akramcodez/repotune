import { getConfig } from '../config/store.js'
import type { ProviderAdapter } from './types.js'

export const geminiAdapter: ProviderAdapter = {
  name: 'Google Gemini',

  async validateKey(key: string): Promise<boolean> {
    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`)
      return response.ok
    } catch {
      return false
    }
  },

  async generate(prompt: string, context: string): Promise<string> {
    const { apiKey, model } = getConfig()
    if (!apiKey) throw new Error('Missing Gemini API key')

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `${context}\n\n${prompt}` }]
        }]
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      let cleanError = errorText
      try {
        const parsed = JSON.parse(errorText)
        if (parsed.error?.message) {
          cleanError = `${parsed.error.status} - ${parsed.error.message}`
        }
      } catch {
        // ignore
      }
      throw new Error(`Gemini API error: ${response.status} ${cleanError}`)
    }

    const data = await response.json() as any
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) {
      throw new Error('Gemini API returned an empty or invalid response')
    }

    // Strip markdown codeblocks if they exist, otherwise use the whole text
    const codeBlockMatch = text.match(/```[\w-]*\n([\s\S]*?)\n```/)
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim()
    }

    return text.trim()
  }
}
