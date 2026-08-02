import type { CheckResult, CheckCategory } from '../checks/types.js'
import type { ScoreLabel } from '../checks/score.js'

const CATEGORY_LABELS: Record<CheckCategory, string> = {
  documentation: 'Documentation',
  automation: 'Automation',
  community: 'Community',
  consistency: 'Consistency',
}

const CATEGORY_ORDER: CheckCategory[] = ['documentation', 'automation', 'community', 'consistency']

// Minimal ANSI helpers - no chalk dep
const bold = (s: string) => `\x1b[1m${s}\x1b[0m`
const dim = (s: string) => `\x1b[2m${s}\x1b[0m`
const green = (s: string) => `\x1b[32m${s}\x1b[0m`
const red = (s: string) => `\x1b[31m${s}\x1b[0m`
const yellow = (s: string) => `\x1b[33m${s}\x1b[0m`
const gray = (s: string) => `\x1b[90m${s}\x1b[0m`

export function renderScanOutput(results: CheckResult[], score: number, label: ScoreLabel): void {
  const byCategory = new Map<CheckCategory, CheckResult[]>()
  for (const cat of CATEGORY_ORDER) {
    const group = results.filter((r) => r.category === cat)
    if (group.length > 0) byCategory.set(cat, group)
  }

  const lines: string[] = ['']

  for (const [cat, checks] of byCategory) {
    lines.push(bold(CATEGORY_LABELS[cat]))
    for (const check of checks) {
      if (check.passed) {
        lines.push(`  ${green('✓')} ${check.label}`)
      } else {
        lines.push(`  ${red('✗')} ${check.label}`)
        if (check.issue) {
          lines.push(gray(`      ${check.issue}`))
        }
      }
    }
    lines.push('')
  }

  const bar = '━'.repeat(34)
  const scoreColor = score >= 90 ? green : score >= 70 ? yellow : red

  lines.push(dim(bar))
  lines.push(`${bold('Repository Score')}   ${bold(scoreColor(`${score} / 100`))}  ${dim(label)}`)
  lines.push(dim(bar))
  lines.push('')
  lines.push(dim('This scan ran entirely offline - no files were sent anywhere.'))

  const failed = results.filter((r) => !r.passed)
  if (failed.length > 0) {
    lines.push('')
    lines.push(dim(`Run \`repotune doctor\` to fix ${failed.length} issue${failed.length === 1 ? '' : 's'}.`))
  }

  lines.push('')
  process.stdout.write(lines.join('\n'))
}

export function renderJsonOutput(results: CheckResult[], score: number): void {
  console.log(
    JSON.stringify(
      {
        score,
        checks: results.map((r) => ({
          id: r.id,
          label: r.label,
          category: r.category,
          passed: r.passed,
          weight: r.weight,
          ...(r.issue ? { issue: r.issue } : {}),
        })),
      },
      null,
      2,
    ),
  )
}
