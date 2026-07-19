import path from 'path'
import type { Check } from './types.js'
import { pass, fail } from './types.js'
import { readFileSafe } from '../utils/fs.js'

export const weaknessChecks: Check[] = [
  {
    id: 'contributing-weak',
    label: 'CONTRIBUTING.md depth',
    category: 'documentation',
    weight: 2,
    async run(dir) {
      const content = await readFileSafe(path.join(dir, 'CONTRIBUTING.md'))
      if (content === null) return pass(this) // Missing files handled by missing checks
      
      if (content.length < 200) {
        return fail(this, 'CONTRIBUTING.md is too short (stub)', undefined, 'CONTRIBUTING.md')
      }
      if (!/setup|install|getting started/i.test(content)) {
        return fail(this, 'CONTRIBUTING.md is missing a setup/installation section', undefined, 'CONTRIBUTING.md')
      }
      if (!/pull request|pr|submit/i.test(content)) {
        return fail(this, 'CONTRIBUTING.md is missing PR instructions', undefined, 'CONTRIBUTING.md')
      }
      return pass(this)
    }
  },

  {
    id: 'security-weak',
    label: 'SECURITY.md depth',
    category: 'documentation',
    weight: 3,
    async run(dir) {
      const content = await readFileSafe(path.join(dir, 'SECURITY.md'))
      if (content === null) return pass(this)
      
      if (content.length < 150) {
        return fail(this, 'SECURITY.md is too short (stub)', undefined, 'SECURITY.md')
      }
      if (!/@|\w+:\/\//.test(content) && !/email|contact/i.test(content)) {
        return fail(this, 'SECURITY.md appears to be missing contact/reporting instructions', undefined, 'SECURITY.md')
      }
      return pass(this)
    }
  },

  {
    id: 'code-of-conduct-weak',
    label: 'CODE_OF_CONDUCT.md depth',
    category: 'community',
    weight: 2,
    async run(dir) {
      const content = await readFileSafe(path.join(dir, 'CODE_OF_CONDUCT.md'))
      if (content === null) return pass(this)
      
      if (content.length < 100) {
        return fail(this, 'CODE_OF_CONDUCT.md is too short (stub)', undefined, 'CODE_OF_CONDUCT.md')
      }
      return pass(this)
    }
  },

  {
    id: 'changelog-weak',
    label: 'CHANGELOG.md depth',
    category: 'documentation',
    weight: 1,
    async run(dir) {
      const content = await readFileSafe(path.join(dir, 'CHANGELOG.md'))
      if (content === null) return pass(this)
      
      if (content.length < 50) {
        return fail(this, 'CHANGELOG.md is too short', undefined, 'CHANGELOG.md')
      }
      // Simple heuristic for dates or semver:
      // Looking for ## [1.0.0] or ## 2024-01-01
      if (!/\[?\d+\.\d+\.\d+\]?/.test(content) && !/\d{4}-\d{2}-\d{2}/.test(content)) {
        return fail(this, 'CHANGELOG.md is missing semver versions or dates', undefined, 'CHANGELOG.md')
      }
      return pass(this)
    }
  }
]
