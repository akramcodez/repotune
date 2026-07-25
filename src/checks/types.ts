export type CheckCategory = 'documentation' | 'automation' | 'community' | 'consistency'

export interface CheckResult {
  id: string
  label: string
  category: CheckCategory
  passed: boolean
  weight: number
  issue?: string
  hint?: string
  file?: string
  check?: Check
}

export interface Check {
  id: string
  label: string
  category: CheckCategory
  weight: number
  run(dir: string): Promise<CheckResult>
  fix?(dir: string): Promise<{ applied: boolean; description: string }>
}

export function pass(check: Check): CheckResult {
  return { id: check.id, label: check.label, category: check.category, weight: check.weight, passed: true, check }
}

export function fail(
  check: Check,
  issue?: string,
  hint?: string,
  file?: string,
): CheckResult {
  return { id: check.id, label: check.label, category: check.category, weight: check.weight, passed: false, issue, hint, file, check }
}
