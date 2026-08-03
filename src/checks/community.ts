import type { Check } from './types.js'
import { pass, fail } from './types.js'
import { globExists } from '../utils/fs.js'
import { execa } from 'execa'

export const communityChecks: Check[] = [
  {
    id: 'issue-template',
    label: 'Issue templates',
    category: 'community',
    weight: 2,
    async run(dir) {
      const found = await globExists(
        ['.github/ISSUE_TEMPLATE{,.md}', '.github/ISSUE_TEMPLATE/*.{md,yml,yaml}'],
        dir,
      )
      return found ? pass(this) : fail(this, undefined, 'Run: repotune doctor')
    },
  },
  {
    id: 'pr-template',
    label: 'PR template',
    category: 'community',
    weight: 2,
    async run(dir) {
      const found = await globExists(
        ['.github/PULL_REQUEST_TEMPLATE{,.md}', '.github/pull_request_template{,.md}'],
        dir,
      )
      return found ? pass(this) : fail(this, undefined, 'Run: repotune doctor')
    },
  },
  {
    id: 'funding',
    label: 'Funding',
    category: 'community',
    weight: 1,
    async run(dir) {
      const found = await globExists(['.github/FUNDING.{yml,yaml}'], dir)
      return found ? pass(this) : fail(this, undefined, 'Add .github/FUNDING.yml')
    },
  },
  {
    id: 'codeowners',
    label: 'CODEOWNERS',
    category: 'community',
    weight: 2,
    async run(dir) {
      const found = await globExists(
        ['CODEOWNERS', '.github/CODEOWNERS', 'docs/CODEOWNERS'],
        dir,
      )
      return found ? pass(this) : fail(this, undefined, 'Add a CODEOWNERS file to require reviews')
    },
  },
  {
    id: 'maintenance',
    label: 'Active Maintenance',
    category: 'community',
    weight: 2,
    async run(dir) {
      try {
        const { stdout } = await execa('git', ['log', '-1', '--format=%ct'], { cwd: dir })
        const timestamp = parseInt(stdout.trim(), 10)
        const now = Math.floor(Date.now() / 1000)
        
        // 1 year = 31536000 seconds
        if (now - timestamp > 31536000) {
          return fail(this, 'Last commit was over a year ago', 'Project may be considered unmaintained (OSSF)')
        }
      } catch {
        // Not a git repo or no commits
      }
      return pass(this)
    }
  }
]
