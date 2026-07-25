/* eslint-disable @typescript-eslint/no-explicit-any */
import { getConfig } from '../config/store.js'
import type { ProviderAdapter } from './types.js'

export const geminiAdapter: ProviderAdapter = {
  name: 'Google Gemini',
  requiresKey: true,
  defaultModel: 'gemini-3.5-flash',
  availableModels: [
    'gemini-3.5-flash',
    'gemini-3.1-pro-preview',
    'gemini-3.1-flash-lite',
    'gemini-3-pro-preview',
    'gemini-2.5-pro',
    'gemini-2.5-flash'
  ],

  async validateKey(key: string): Promise<{ valid: boolean; reason: string }> {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`)
      if (res.status === 200) {
        return { valid: true, reason: 'Successfully connected to Google Gemini' }
      }
      const data = await res.json().catch(() => ({})) as any
      return { valid: false, reason: data.error?.message || `HTTP error ${res.status}` }
    } catch (e: any) {
      return { valid: false, reason: e.message }
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
