/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { geminiAdapter } from '../../src/adapters/gemini.js'
import * as storeModule from '../../src/config/store.js'

global.fetch = vi.fn()

describe('gemini adapter', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(storeModule, 'getConfig').mockReturnValue({ apiKey: 'key-test', model: 'gemini-3.5-flash', provider: 'gemini' })
  })

  it('validates a working key', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ status: 200, ok: true } as any)
    const result = await geminiAdapter.validateKey('key-test')
    expect(result).toBe(true)
  })

  it('rejects a bad key', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ status: 401, ok: false } as any)
    const result = await geminiAdapter.validateKey('key-bad')
    expect(result).toBe(false)
  })

  it('generates content successfully and strips markdown', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: '```markdown\ntest content generated\n```' }] } }]
      })
    } as any)

    const result = await geminiAdapter.generate('prompt', 'context')
    expect(result).toBe('test content generated')
    
    // Verify fetch was called correctly
    const fetchCall = vi.mocked(fetch).mock.calls[0]!
    expect(fetchCall[0]).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=key-test')
  })

  it('throws error if generation fails', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => JSON.stringify({ error: { status: 'RESOURCE_EXHAUSTED', message: 'Quota exceeded' } })
    } as any)

    await expect(geminiAdapter.generate('prompt', 'context')).rejects.toThrow('Gemini API error: 429 RESOURCE_EXHAUSTED - Quota exceeded')
  })
})
