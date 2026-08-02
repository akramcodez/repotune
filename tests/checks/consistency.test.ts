import { describe, it, expect, vi, beforeEach } from 'vitest'
import { consistencyChecks } from '../../src/checks/consistency.js'

vi.mock('../../src/utils/fs.js', () => ({
  fileExists: vi.fn(),
  readFileSafe: vi.fn(),
  globExists: vi.fn(),
  globFiles: vi.fn(),
}))

import { fileExists, readFileSafe, globFiles } from '../../src/utils/fs.js'
const mockFileExists = vi.mocked(fileExists)
const mockReadFile = vi.mocked(readFileSafe)
const mockGlobFiles = vi.mocked(globFiles)

describe('consistency checks', () => {
  beforeEach(() => vi.clearAllMocks())

  const find = (id: string) => consistencyChecks.find((c) => c.id === id)!

  describe('pkg-manager-mismatch', () => {
    const check = () => find('pkg-manager-mismatch')

    it('passes when readme mentions the same manager as lockfile', async () => {
      mockReadFile.mockResolvedValueOnce('## Install\n\n```\npnpm install\n```\n')
      mockFileExists
        .mockResolvedValueOnce(true)  // pnpm-lock.yaml
      expect((await check().run('/repo')).passed).toBe(true)
    })

    it('detects yarn in README when repo uses pnpm', async () => {
      mockReadFile.mockResolvedValueOnce('## Install\n\n```\nyarn install\n```\n')
      mockFileExists
        .mockResolvedValueOnce(true)  // pnpm-lock.yaml
      const result = await check().run('/repo')
      expect(result.passed).toBe(false)
      expect(result.issue).toMatch(/yarn.*pnpm/)
    })

    it('detects npm in README when repo uses yarn', async () => {
      mockReadFile.mockResolvedValueOnce('## Install\n\n```\nnpm install\n```\n')
      mockFileExists
        .mockResolvedValueOnce(false) // pnpm-lock.yaml
        .mockResolvedValueOnce(false) // bun.lockb
        .mockResolvedValueOnce(true)  // yarn.lock
      const result = await check().run('/repo')
      expect(result.passed).toBe(false)
      expect(result.issue).toMatch(/npm.*yarn/)
    })

    it('passes when no README exists', async () => {
      mockReadFile.mockResolvedValueOnce(null)
      expect((await check().run('/repo')).passed).toBe(true)
    })

    it('passes when no lockfile detected', async () => {
      mockReadFile.mockResolvedValueOnce('```yarn install```')
      mockFileExists
        .mockResolvedValueOnce(false) // pnpm
        .mockResolvedValueOnce(false) // bun
        .mockResolvedValueOnce(false) // yarn
        .mockResolvedValueOnce(false) // npm
      expect((await check().run('/repo')).passed).toBe(true)
    })
  })

  describe('node-version-mismatch', () => {
    const check = () => find('node-version-mismatch')

    it('passes when CI node matches engines', async () => {
      mockReadFile
        .mockResolvedValueOnce('{"engines":{"node":">=22"}}') // package.json
        .mockResolvedValueOnce('node-version: 22')             // workflow
      mockGlobFiles.mockResolvedValueOnce(['.github/workflows/ci.yml'])
      expect((await check().run('/repo')).passed).toBe(true)
    })

    it('detects CI node lower than engines requirement', async () => {
      mockReadFile
        .mockResolvedValueOnce('{"engines":{"node":">=22"}}')
        .mockResolvedValueOnce('node-version: 18')
      mockGlobFiles.mockResolvedValueOnce(['.github/workflows/ci.yml'])
      const result = await check().run('/repo')
      expect(result.passed).toBe(false)
      expect(result.issue).toMatch(/Node 18.*22/)
    })

    it('passes when no package.json exists', async () => {
      mockReadFile.mockResolvedValueOnce(null)
      expect((await check().run('/repo')).passed).toBe(true)
    })

    it('passes when no engines field', async () => {
      mockReadFile.mockResolvedValueOnce('{"name":"test"}')
      expect((await check().run('/repo')).passed).toBe(true)
    })
  })

  describe('stale-ci-badge', () => {
    const check = () => find('stale-ci-badge')

    it('passes when badge references existing workflow', async () => {
      mockReadFile.mockResolvedValueOnce(
        '[![CI](https://github.com/org/repo/actions/workflows/ci.yml/badge.svg)]',
      )
      mockGlobFiles.mockResolvedValueOnce(['.github/workflows/ci.yml'])
      expect((await check().run('/repo')).passed).toBe(true)
    })

    it('detects badge pointing to missing workflow', async () => {
      mockReadFile.mockResolvedValueOnce(
        '[![Build](https://github.com/org/repo/actions/workflows/build.yml/badge.svg)]',
      )
      mockGlobFiles.mockResolvedValueOnce(['.github/workflows/ci.yml'])
      const result = await check().run('/repo')
      expect(result.passed).toBe(false)
      expect(result.issue).toMatch(/build\.yml/)
    })

    it('passes when README has no badge URLs', async () => {
      mockReadFile.mockResolvedValueOnce('# My Project\n\nHello world')
      mockGlobFiles.mockResolvedValueOnce([])
      expect((await check().run('/repo')).passed).toBe(true)
    })

    it('passes when no README exists', async () => {
      mockReadFile.mockResolvedValueOnce(null)
      expect((await check().run('/repo')).passed).toBe(true)
    })
  })

  describe('license-year-stale', () => {
    const check = () => find('license-year-stale')
    const currentYear = new Date().getFullYear()

    it('passes when license year is current', async () => {
      mockReadFile.mockResolvedValueOnce(`MIT License\nCopyright ${currentYear} Author`)
      expect((await check().run('/repo')).passed).toBe(true)
    })

    it('detects a stale license year', async () => {
      mockReadFile.mockResolvedValueOnce('MIT License\nCopyright 2020 Author')
      const result = await check().run('/repo')
      expect(result.passed).toBe(false)
      expect(result.issue).toMatch(/2020/)
    })

    it('passes when LICENSE has no copyright year', async () => {
      mockReadFile.mockResolvedValueOnce('Do whatever you want.')
      expect((await check().run('/repo')).passed).toBe(true)
    })

    it('passes when no LICENSE exists', async () => {
      mockFileExists.mockResolvedValueOnce(false)
      mockReadFile.mockResolvedValueOnce(null)
      expect((await check().run('/repo')).passed).toBe(true)
    })
  })

  describe('missing-keywords', () => {
    const check = () => find('missing-keywords')

    it('passes when keywords are present', async () => {
      mockReadFile.mockResolvedValueOnce('{"keywords":["cli","tool"]}')
      expect((await check().run('/repo')).passed).toBe(true)
    })

    it('fails when keywords array is empty', async () => {
      mockReadFile.mockResolvedValueOnce('{"keywords":[]}')
      expect((await check().run('/repo')).passed).toBe(false)
    })

    it('fails when no keywords field', async () => {
      mockReadFile.mockResolvedValueOnce('{"name":"test"}')
      expect((await check().run('/repo')).passed).toBe(false)
    })

    it('passes when no package.json exists', async () => {
      mockReadFile.mockResolvedValueOnce(null)
      expect((await check().run('/repo')).passed).toBe(true)
    })
  })

  describe('empty-description', () => {
    const check = () => find('empty-description')

    it('passes when description is set', async () => {
      mockReadFile.mockResolvedValueOnce('{"description":"A great tool"}')
      expect((await check().run('/repo')).passed).toBe(true)
    })

    it('fails when description is empty string', async () => {
      mockReadFile.mockResolvedValueOnce('{"description":""}')
      expect((await check().run('/repo')).passed).toBe(false)
    })

    it('fails when description is missing', async () => {
      mockReadFile.mockResolvedValueOnce('{"name":"test"}')
      expect((await check().run('/repo')).passed).toBe(false)
    })
  })
})
