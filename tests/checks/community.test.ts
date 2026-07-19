import { describe, it, expect, vi, beforeEach } from 'vitest'
import { communityChecks } from '../../src/checks/community.js'

vi.mock('../../src/utils/fs.js', () => ({
  fileExists: vi.fn(),
  readFileSafe: vi.fn(),
  globExists: vi.fn(),
  globFiles: vi.fn(),
}))

import { globExists } from '../../src/utils/fs.js'
const mockGlob = vi.mocked(globExists)

describe('community checks', () => {
  beforeEach(() => vi.clearAllMocks())

  const find = (id: string) => communityChecks.find((c) => c.id === id)!

  describe('issue-template', () => {
    const check = () => find('issue-template')
    it('passes when issue template directory exists', async () => {
      mockGlob.mockResolvedValueOnce(true)
      expect((await check().run('/repo')).passed).toBe(true)
    })
    it('fails when no issue template exists', async () => {
      mockGlob.mockResolvedValueOnce(false)
      expect((await check().run('/repo')).passed).toBe(false)
    })
  })

  describe('pr-template', () => {
    const check = () => find('pr-template')
    it('passes when PR template exists', async () => {
      mockGlob.mockResolvedValueOnce(true)
      expect((await check().run('/repo')).passed).toBe(true)
    })
    it('fails when no PR template exists', async () => {
      mockGlob.mockResolvedValueOnce(false)
      expect((await check().run('/repo')).passed).toBe(false)
    })
  })

  describe('funding', () => {
    const check = () => find('funding')
    it('passes when FUNDING.yml exists', async () => {
      mockGlob.mockResolvedValueOnce(true)
      expect((await check().run('/repo')).passed).toBe(true)
    })
    it('fails when FUNDING.yml is missing', async () => {
      mockGlob.mockResolvedValueOnce(false)
      expect((await check().run('/repo')).passed).toBe(false)
    })
  })
})
