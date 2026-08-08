import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runCi } from '../../src/commands/ci.js'
import * as fsUtils from '../../src/utils/fs.js'
import fs from 'fs/promises'

// Mock prompts
vi.mock('../../src/ui/prompts.js', () => ({
  checkbox: vi.fn().mockResolvedValue(['ci', 'codeql']),
  confirm: vi.fn().mockResolvedValue(true)
}))

describe('ci command', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(fs, 'mkdir').mockResolvedValue(undefined)
    vi.spyOn(fs, 'writeFile').mockResolvedValue(undefined)
    vi.spyOn(fsUtils, 'fileExists').mockResolvedValue(false)
    vi.spyOn(fsUtils, 'readFileSafe').mockResolvedValue(null)
  })

  it('generates selected workflows', async () => {
    try {
      await runCi('/tmp/fake-dir')
    } catch (e) {
      console.error(e)
      throw e
    }
    expect(fs.mkdir).toHaveBeenCalled()
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('ci.yml'),
      expect.stringContaining('name: CI'),
      'utf8'
    )
    expect(fs.writeFile).toHaveBeenCalledWith(
      expect.stringContaining('codeql.yml'),
      expect.stringContaining('name: "CodeQL"'),
      'utf8'
    )
  })
})
