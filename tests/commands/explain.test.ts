/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach, type MockInstance } from 'vitest'
import { runExplain } from '../../src/commands/explain.js'

describe('explain command', () => {
  let consoleLogMock: MockInstance
  let consoleErrorMock: MockInstance
  let processExitMock: MockInstance

  beforeEach(() => {
    consoleLogMock = vi.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorMock = vi.spyOn(console, 'error').mockImplementation(() => {})
    processExitMock = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any)
  })

  it('prints explanation for valid topic', async () => {
    await runExplain('security')
    expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('Security Policy'))
    expect(consoleLogMock).toHaveBeenCalledWith(expect.stringContaining('A SECURITY.md file'))
    expect(processExitMock).not.toHaveBeenCalled()
  })

  it('exits and prints error for unknown topic', async () => {
    await runExplain('unknown-topic')
    expect(consoleErrorMock).toHaveBeenCalledWith(
      expect.stringContaining("Unknown topic: 'unknown-topic'"),
    )
    expect(processExitMock).toHaveBeenCalledWith(1)
  })

  it('exits and prints error when no topic provided', async () => {
    await runExplain('')
    expect(consoleErrorMock).toHaveBeenCalledWith(expect.stringContaining('Please provide a topic'))
    expect(processExitMock).toHaveBeenCalledWith(1)
  })
})
