import { describe, it, expect, beforeEach, vi } from 'vitest'
import { getConfig, setConfig, clearConfig, hasConfig } from '../../src/config/store.js'

// We don't want to actually change file permissions during unit tests on dummy files
vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs')>()
  return {
    ...actual,
    chmodSync: vi.fn(),
  }
})

// Mock the config storage so tests don't overwrite real user configurations!
vi.mock('conf', () => {
  return {
    default: class MockConf {
      store: Record<string, unknown> = {}
      path = '/mock/path/config.json'

      get(key: string) {
        return this.store[key]
      }
      set(key: string, value: unknown) {
        this.store[key] = value
      }
      has(key: string) {
        return key in this.store
      }
      clear() {
        this.store = {}
      }
    },
  }
})

describe('config store', () => {
  beforeEach(() => {
    clearConfig()
  })

  it('starts empty', () => {
    expect(hasConfig()).toBe(false)
  })

  it('saves config correctly', () => {
    setConfig({ provider: 'openai', apiKey: 'sk-123' })
    expect(hasConfig()).toBe(true)
    expect(getConfig()).toEqual(expect.objectContaining({ provider: 'openai', apiKey: 'sk-123' }))
  })

  it('clears config correctly', () => {
    setConfig({ provider: 'openai', apiKey: 'sk-123' })
    clearConfig()
    expect(hasConfig()).toBe(false)
    expect(getConfig()).toEqual({})
  })
})
