import { describe, it, expect, vi, beforeEach } from 'vitest'
import { docChecks } from '../../src/checks/docs.js'

vi.mock('../../src/utils/fs.js', () => ({
  fileExists: vi.fn(),
  readFileSafe: vi.fn(),
  globExists: vi.fn(),
  globFiles: vi.fn(),
}))

import { globExists } from '../../src/utils/fs.js'
const mockGlob = vi.mocked(globExists)

describe('doc checks', () => {
  beforeEach(() => vi.clearAllMocks())

  const find = (id: string) => docChecks.find((c) => c.id === id)!

  describe('readme', () => {
    const check = () => find('readme')
    it('passes when README exists', async () => {
      mockGlob.mockResolvedValueOnce(true)
      expect((await check().run('/repo')).passed).toBe(true)
    })
    it('fails when no README exists', async () => {
      mockGlob.mockResolvedValueOnce(false)
      const result = await check().run('/repo')
      expect(result.passed).toBe(false)
      expect(result.hint).toBeDefined()
    })
  })

  describe('license', () => {
    const check = () => find('license')
    it('passes when LICENSE exists', async () => {
      mockGlob.mockResolvedValueOnce(true)
      expect((await check().run('/repo')).passed).toBe(true)
    })
    it('fails when no LICENSE exists', async () => {
      mockGlob.mockResolvedValueOnce(false)
      expect((await check().run('/repo')).passed).toBe(false)
    })
  })

  describe('security', () => {
    const check = () => find('security')
    it('passes when SECURITY.md exists', async () => {
      mockGlob.mockResolvedValueOnce(true)
      expect((await check().run('/repo')).passed).toBe(true)
    })
    it('fails when no SECURITY file exists', async () => {
      mockGlob.mockResolvedValueOnce(false)
      expect((await check().run('/repo')).passed).toBe(false)
    })
  })

  describe('contributing', () => {
    const check = () => find('contributing')
    it('passes when CONTRIBUTING.md exists', async () => {
      mockGlob.mockResolvedValueOnce(true)
      expect((await check().run('/repo')).passed).toBe(true)
    })
  })

  describe('changelog', () => {
    const check = () => find('changelog')
    it('passes when CHANGELOG.md exists', async () => {
      mockGlob.mockResolvedValueOnce(true)
      expect((await check().run('/repo')).passed).toBe(true)
    })
  })

  describe('code-of-conduct', () => {
    const check = () => find('code-of-conduct')
    it('passes when CODE_OF_CONDUCT.md exists', async () => {
      mockGlob.mockResolvedValueOnce(true)
      expect((await check().run('/repo')).passed).toBe(true)
    })
  })
})
