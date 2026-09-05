/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { groqAdapter } from '../../src/adapters/groq.js'
import * as storeModule from '../../src/config/store.js'

global.fetch = vi.fn()

describe('groq adapter', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(storeModule, 'getConfig').mockReturnValue({
      apiKey: 'gsk-test',
      model: 'llama-3.3-70b-versatile',
      provider: 'groq',
    })
  })

  it('validates a working key', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ status: 200, ok: true } as any)
    const result = await groqAdapter.validateKey('gsk-test')
    expect(result.valid).toBe(true)
  })

  it('rejects a bad key', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      status: 401,
      ok: false,
      json: async () => ({}),
    } as any)
    const result = await groqAdapter.validateKey('gsk-bad')
    expect(result.valid).toBe(false)
  })

  it('generates content and strips markdown', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '```\n# Speed!\n```' } }],
      }),
    } as any)

    const result = await groqAdapter.generate('prompt', 'context')
    expect(result).toBe('# Speed!')

    const fetchCall = vi.mocked(fetch).mock.calls[0]!
    expect(fetchCall[0]).toBe('https://api.groq.com/openai/v1/chat/completions')
    expect(fetchCall[1]?.headers).toEqual(
      expect.objectContaining({
        Authorization: 'Bearer gsk-test',
      }),
    )
  })

  it('throws error if generation fails', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 429,
      text: async () => 'Rate limit exceeded',
    } as any)

    await expect(groqAdapter.generate('prompt', 'context')).rejects.toThrow(
      'Groq error: 429 - Rate limit exceeded',
    )
  })
})
