import type { Check } from './types.js'
import { pass, fail } from './types.js'
import { globExists } from '../utils/fs.js'

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
      return found ? pass(this) : fail(this, undefined, 'Run: repokit doctor')
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
      return found ? pass(this) : fail(this, undefined, 'Run: repokit doctor')
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
]
