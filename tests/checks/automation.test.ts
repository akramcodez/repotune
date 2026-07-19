import { describe, it, expect, vi, beforeEach } from 'vitest'
import { automationChecks } from '../../src/checks/automation.js'

vi.mock('../../src/utils/fs.js', () => ({
  fileExists: vi.fn(),
  readFileSafe: vi.fn(),
  globExists: vi.fn(),
  globFiles: vi.fn(),
}))

import { globExists, globFiles, readFileSafe } from '../../src/utils/fs.js'
const mockGlobExists = vi.mocked(globExists)
const mockGlobFiles = vi.mocked(globFiles)
const mockReadFile = vi.mocked(readFileSafe)

describe('automation checks', () => {
  beforeEach(() => vi.clearAllMocks())

  const find = (id: string) => automationChecks.find((c) => c.id === id)!

  describe('ci', () => {
    const check = () => find('ci')
    it('passes when a workflow file exists', async () => {
      mockGlobExists.mockResolvedValueOnce(true)
      expect((await check().run('/repo')).passed).toBe(true)
    })
    it('fails when no workflow files exist', async () => {
      mockGlobExists.mockResolvedValueOnce(false)
      expect((await check().run('/repo')).passed).toBe(false)
    })
  })

  describe('release-workflow', () => {
    const check = () => find('release-workflow')
    it('passes when a workflow contains "release"', async () => {
      mockGlobFiles.mockResolvedValueOnce(['.github/workflows/release.yml'])
      mockReadFile.mockResolvedValueOnce('name: Release\non: push\njobs: publish...')
      expect((await check().run('/repo')).passed).toBe(true)
    })
    it('passes when a workflow contains "publish"', async () => {
      mockGlobFiles.mockResolvedValueOnce(['.github/workflows/ci.yml'])
      mockReadFile.mockResolvedValueOnce('name: CI\nsteps: npm publish')
      expect((await check().run('/repo')).passed).toBe(true)
    })
    it('fails when no workflow contains release or publish', async () => {
      mockGlobFiles.mockResolvedValueOnce(['.github/workflows/ci.yml'])
      mockReadFile.mockResolvedValueOnce('name: CI\nsteps: npm test')
      expect((await check().run('/repo')).passed).toBe(false)
    })
    it('fails when no workflows exist', async () => {
      mockGlobFiles.mockResolvedValueOnce([])
      expect((await check().run('/repo')).passed).toBe(false)
    })
  })

  describe('dependabot', () => {
    const check = () => find('dependabot')
    it('passes when dependabot.yml exists', async () => {
      mockGlobExists.mockResolvedValueOnce(true)
      expect((await check().run('/repo')).passed).toBe(true)
    })
    it('fails when dependabot.yml is missing', async () => {
      mockGlobExists.mockResolvedValueOnce(false)
      expect((await check().run('/repo')).passed).toBe(false)
    })
  })
})
