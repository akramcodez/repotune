import { describe, it, expect } from 'vitest'
import { computeScore, scoreLabel } from '../src/checks/score.js'
import type { CheckResult } from '../src/checks/types.js'

function makeResult(passed: boolean, weight: number): CheckResult {
  return { id: 'test', label: 'Test', category: 'documentation', passed, weight }
}

describe('computeScore', () => {
  it('returns 100 when all checks pass', () => {
    const results = [makeResult(true, 3), makeResult(true, 2), makeResult(true, 1)]
    expect(computeScore(results)).toBe(100)
  })

  it('returns 0 when all checks fail', () => {
    const results = [makeResult(false, 3), makeResult(false, 2)]
    expect(computeScore(results)).toBe(0)
  })

  it('weights heavier checks more', () => {
    // weight 3 passes, weight 1 fails → 3/(3+1) = 75%
    const results = [makeResult(true, 3), makeResult(false, 1)]
    expect(computeScore(results)).toBe(75)
  })

  it('returns 100 when results array is empty', () => {
    expect(computeScore([])).toBe(100)
  })

  it('rounds to nearest integer', () => {
    // 2 passes (weight 1 each) out of 3 total weight → 66.67% → 67
    const results = [makeResult(true, 1), makeResult(true, 1), makeResult(false, 1)]
    expect(computeScore(results)).toBe(67)
  })
})

describe('scoreLabel', () => {
  it('returns Excellent for 90+', () => expect(scoreLabel(90)).toBe('Excellent'))
  it('returns Excellent for 100', () => expect(scoreLabel(100)).toBe('Excellent'))
  it('returns Good for 70–89', () => {
    expect(scoreLabel(70)).toBe('Good')
    expect(scoreLabel(89)).toBe('Good')
  })
  it('returns Needs work for 50–69', () => {
    expect(scoreLabel(50)).toBe('Needs work')
    expect(scoreLabel(69)).toBe('Needs work')
  })
  it('returns Poor for below 50', () => {
    expect(scoreLabel(49)).toBe('Poor')
    expect(scoreLabel(0)).toBe('Poor')
  })
})
