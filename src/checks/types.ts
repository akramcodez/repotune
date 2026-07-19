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
}

export interface Check {
  id: string
  label: string
  category: CheckCategory
  weight: number
  run(dir: string): Promise<CheckResult>
}

export function pass(check: Pick<Check, 'id' | 'label' | 'category' | 'weight'>): CheckResult {
  return { ...check, passed: true }
}

export function fail(
  check: Pick<Check, 'id' | 'label' | 'category' | 'weight'>,
  issue?: string,
  hint?: string,
  file?: string,
): CheckResult {
  return { ...check, passed: false, issue, hint, file }
}
