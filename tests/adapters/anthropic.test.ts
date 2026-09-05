/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { anthropicAdapter } from '../../src/adapters/anthropic.js'
import * as storeModule from '../../src/config/store.js'

global.fetch = vi.fn()

describe('anthropic adapter', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(storeModule, 'getConfig').mockReturnValue({
      apiKey: 'sk-ant-test',
      model: 'claude-haiku-4-5-20251001',
      provider: 'anthropic',
    })
  })

  it('validates a working key', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ status: 200, ok: true } as any)
    const result = await anthropicAdapter.validateKey('sk-ant-test')
    expect(result.valid).toBe(true)
  })

  it('rejects a bad key', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      status: 401,
      ok: false,
      json: async () => ({}),
    } as any)
    const result = await anthropicAdapter.validateKey('sk-ant-bad')
    expect(result.valid).toBe(false)
  })

  it('generates content via messages API', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ text: '# Security Policy\n\nReport to...' }],
      }),
    } as any)

    const result = await anthropicAdapter.generate('write a SECURITY.md', 'context')
    expect(result).toBe('# Security Policy\n\nReport to...')

    const fetchCall = vi.mocked(fetch).mock.calls[0]!
    expect(fetchCall[0]).toBe('https://api.anthropic.com/v1/messages')
    expect(fetchCall[1]?.headers).toEqual(
      expect.objectContaining({
        'x-api-key': 'sk-ant-test',
        'anthropic-version': '2023-06-01',
      }),
    )
  })

  it('throws error if generation fails', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Internal Server Error',
    } as any)

    await expect(anthropicAdapter.generate('prompt', 'context')).rejects.toThrow(
      'Anthropic error: 500 - Internal Server Error',
    )
  })
})
