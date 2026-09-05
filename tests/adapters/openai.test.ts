/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { openaiAdapter } from '../../src/adapters/openai.js'
import * as storeModule from '../../src/config/store.js'

global.fetch = vi.fn()

describe('openai adapter', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(storeModule, 'getConfig').mockReturnValue({ apiKey: 'sk-test', model: 'gpt-4o-mini' })
  })

  it('validates a working key', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ status: 200, ok: true } as any)
    const result = await openaiAdapter.validateKey('sk-test')
    expect(result.valid).toBe(true)
  })

  it('rejects a bad key', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      status: 401,
      ok: false,
      json: async () => ({}),
    } as any)
    const result = await openaiAdapter.validateKey('sk-bad')
    expect(result.valid).toBe(false)
  })

  it('generates content successfully', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: 'test content generated' } }],
      }),
    } as any)

    const result = await openaiAdapter.generate('prompt', 'context')
    expect(result).toBe('test content generated')

    // Verify fetch was called with correct headers
    const fetchCall = vi.mocked(fetch).mock.calls[0]!
    expect(fetchCall[0]).toBe('https://api.openai.com/v1/chat/completions')
    expect(fetchCall[1]?.headers).toEqual(
      expect.objectContaining({
        Authorization: 'Bearer sk-test',
      }),
    )
  })

  it('throws error if generation fails', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    } as any)

    await expect(openaiAdapter.generate('prompt', 'context')).rejects.toThrow(
      'OpenAI API error: 500 - Internal Server Error',
    )
  })
})
