/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { openrouterAdapter } from '../../src/adapters/openrouter.js'
import * as storeModule from '../../src/config/store.js'

global.fetch = vi.fn()

describe('openrouter adapter', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(storeModule, 'getConfig').mockReturnValue({
      apiKey: 'sk-or-test',
      model: 'anthropic/claude-haiku-4-5',
      provider: 'openrouter',
    })
  })

  it('validates a working key', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ status: 200, ok: true } as any)
    const result = await openrouterAdapter.validateKey('sk-or-test')
    expect(result.valid).toBe(true)
  })

  it('rejects a bad key', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      status: 401,
      ok: false,
      json: async () => ({}),
    } as any)
    const result = await openrouterAdapter.validateKey('sk-or-bad')
    expect(result.valid).toBe(false)
  })

  it('generates content and strips markdown', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '```md\n# Test\n```' } }],
      }),
    } as any)

    const result = await openrouterAdapter.generate('prompt', 'context')
    expect(result).toBe('# Test')

    const fetchCall = vi.mocked(fetch).mock.calls[0]!
    expect(fetchCall[0]).toBe('https://openrouter.ai/api/v1/chat/completions')
    expect(fetchCall[1]?.headers).toEqual(
      expect.objectContaining({
        Authorization: 'Bearer sk-or-test',
        'HTTP-Referer': 'https://github.com/akramcodez/repotune',
      }),
    )
  })

  it('throws error if generation fails', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 402,
      text: async () => 'Payment Required',
    } as any)

    await expect(openrouterAdapter.generate('prompt', 'context')).rejects.toThrow(
      'OpenRouter error: 402 - Payment Required',
    )
  })
})
