import path from 'path'
import type { Check } from './types.js'
import { pass, fail } from './types.js'
import { globExists, globFiles, readFileSafe } from '../utils/fs.js'

export const automationChecks: Check[] = [
  {
    id: 'ci',
    label: 'CI workflow',
    category: 'automation',
    weight: 3,
    async run(dir) {
      const found = await globExists(['.github/workflows/*.{yml,yaml}'], dir)
      return found ? pass(this) : fail(this, undefined, 'Run: repokit ci')
    },
  },
  {
    id: 'release-workflow',
    label: 'Release workflow',
    category: 'automation',
    weight: 2,
    async run(dir) {
      const workflows = await globFiles(['.github/workflows/*.{yml,yaml}'], dir)
      for (const wf of workflows) {
        const content = await readFileSafe(path.join(dir, wf))
        if (content && /release|publish/i.test(content)) return pass(this)
      }
      return fail(this, undefined, 'Run: repokit ci')
    },
  },
  {
    id: 'dependabot',
    label: 'Dependabot',
    category: 'automation',
    weight: 1,
    async run(dir) {
      const found = await globExists(['.github/dependabot.{yml,yaml}'], dir)
      return found ? pass(this) : fail(this, undefined, 'Add .github/dependabot.yml')
    },
  },
]
