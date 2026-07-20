/* eslint-disable @typescript-eslint/no-explicit-any */
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { ollamaAdapter } from '../../src/adapters/ollama.js'
import * as storeModule from '../../src/config/store.js'

global.fetch = vi.fn()

describe('ollama adapter', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.spyOn(storeModule, 'getConfig').mockReturnValue({ model: 'llama3.2', provider: 'ollama' })
  })

  it('validates a working server', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ status: 200, ok: true } as any)
    const result = await ollamaAdapter.validateKey('') // Ollama ignores the key
    expect(result.valid).toBe(true)
  })

  it('rejects an unreachable server', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('fetch failed'))
    const result = await ollamaAdapter.validateKey('')
    expect(result.valid).toBe(false)
  })

  it('fetches models', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ models: [{ name: 'llama3.2' }, { name: 'codellama' }] })
    } as any)

    const result = await ollamaAdapter.fetchModels!()
    expect(result).toEqual(['llama3.2', 'codellama'])
  })

  it('returns empty models if fetch fails', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new TypeError('fetch failed'))
    const result = await ollamaAdapter.fetchModels!()
    expect(result).toEqual([])
  })

  it('generates content and strips markdown', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ response: '```markdown\n# Local\n```' })
    } as any)

    const result = await ollamaAdapter.generate('prompt', 'context')
    expect(result).toBe('# Local')
    
    const fetchCall = vi.mocked(fetch).mock.calls[0]!
    expect(fetchCall[0]).toBe('http://localhost:11434/api/generate')
  })

  it('throws error if generation fails', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: async () => 'Model not found'
    } as any)

    await expect(ollamaAdapter.generate('prompt', 'context')).rejects.toThrow('Ollama error: 500 - Model not found')
  })
})
