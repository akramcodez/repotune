import { docChecks } from './docs.js'
import { automationChecks } from './automation.js'
import { communityChecks } from './community.js'
import { consistencyChecks } from './consistency.js'
import { weaknessChecks } from './weakness.js'
import { securityChecks } from './security.js'
import type { CheckResult } from './types.js'

export const ALL_CHECKS = [
  ...docChecks,
  ...automationChecks,
  ...communityChecks,
  ...consistencyChecks,
  ...weaknessChecks,
  ...securityChecks,
]

export async function runChecks(dir: string, opts?: { audit?: boolean }): Promise<CheckResult[]> {
  return Promise.all(ALL_CHECKS.map((check) => check.run(dir, opts)))
}

export { computeScore, scoreLabel } from './score.js'
export type { CheckResult, CheckCategory } from './types.js'
