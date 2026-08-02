import type { Check } from './types.js'
import { pass, fail } from './types.js'
import { globExists } from '../utils/fs.js'

export const docChecks: Check[] = [
  {
    id: 'readme',
    label: 'README',
    category: 'documentation',
    weight: 3,
    async run(dir) {
      const found = await globExists(['README{,.md,.txt,.rst}', 'readme{,.md,.txt}'], dir)
      return found ? pass(this) : fail(this, undefined, 'Add a README to describe your project')
    },
  },
  {
    id: 'license',
    label: 'LICENSE',
    category: 'documentation',
    weight: 3,
    async run(dir) {
      const found = await globExists(['LICEN{S,C}E{,.md,.txt}'], dir)
      return found ? pass(this) : fail(this, undefined, 'Add a LICENSE file')
    },
  },
  {
    id: 'contributing',
    label: 'CONTRIBUTING',
    category: 'documentation',
    weight: 2,
    async run(dir) {
      const found = await globExists(['CONTRIBUTING{,.md,.txt}'], dir)
      return found ? pass(this) : fail(this, undefined, 'Run: repotune doctor')
    },
  },
  {
    id: 'security',
    label: 'SECURITY',
    category: 'documentation',
    weight: 2,
    async run(dir) {
      const found = await globExists(['SECURITY{,.md}', '.github/SECURITY{,.md}'], dir)
      return found ? pass(this) : fail(this, undefined, 'Run: repotune doctor')
    },
  },
  {
    id: 'changelog',
    label: 'CHANGELOG',
    category: 'documentation',
    weight: 1,
    async run(dir) {
      const found = await globExists(['CHANGELOG{,.md,.txt}'], dir)
      return found ? pass(this) : fail(this, undefined, 'Add a CHANGELOG to track releases')
    },
  },
  {
    id: 'code-of-conduct',
    label: 'Code of Conduct',
    category: 'documentation',
    weight: 1,
    async run(dir) {
      const found = await globExists(
        ['CODE_OF_CONDUCT{,.md}', '.github/CODE_OF_CONDUCT{,.md}'],
        dir,
      )
      return found ? pass(this) : fail(this, undefined, 'Run: repotune doctor')
    },
  },
]
