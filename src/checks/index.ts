import { docChecks } from './docs.js'
import { automationChecks } from './automation.js'
import { communityChecks } from './community.js'
import { consistencyChecks } from './consistency.js'
import type { CheckResult } from './types.js'

export const ALL_CHECKS = [
  ...docChecks,
  ...automationChecks,
  ...communityChecks,
  ...consistencyChecks,
]

export async function runChecks(dir: string): Promise<CheckResult[]> {
  return Promise.all(ALL_CHECKS.map((check) => check.run(dir)))
}

export { computeScore, scoreLabel } from './score.js'
export type { CheckResult, CheckCategory } from './types.js'
