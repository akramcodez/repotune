import type { CheckResult } from './types.js'

export type ScoreLabel = 'Excellent' | 'Good' | 'Needs work' | 'Poor'

export function computeScore(results: CheckResult[]): number {
  const total = results.reduce((sum, r) => sum + r.weight, 0)
  if (total === 0) return 100
  const earned = results.filter((r) => r.passed).reduce((sum, r) => sum + r.weight, 0)
  return Math.round((earned / total) * 100)
}

export function scoreLabel(score: number): ScoreLabel {
  if (score >= 90) return 'Excellent'
  if (score >= 70) return 'Good'
  if (score >= 50) return 'Needs work'
  return 'Poor'
}
