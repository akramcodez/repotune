import { describe, it, expect, vi, beforeEach, type MockInstance } from 'vitest'
import { runBadge } from '../../src/commands/badge.js'
import * as score from '../../src/checks/score.js'

vi.mock('../../src/checks/index.js', () => ({
  runChecks: vi.fn().mockResolvedValue([])
}))

vi.mock('../../src/checks/score.js', () => ({
  computeScore: vi.fn().mockReturnValue(95)
}))

vi.mock('child_process', () => ({
  execSync: vi.fn()
}))

describe('badge command', () => {
  let consoleLogMock: MockInstance

  beforeEach(() => {
    consoleLogMock = vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  it('prints badge markdown and copies to clipboard', async () => {
    await runBadge('.')
    expect(score.computeScore).toHaveBeenCalled()
    
    // Check printed output
    expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('95 / 100'))
    expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('brightgreen'))
    
    // Check clipboard execution
    const { execSync } = await import('child_process')
    expect(execSync).toHaveBeenCalled()
  })
})
