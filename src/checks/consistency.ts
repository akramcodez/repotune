import path from 'path'
import type { Check } from './types.js'
import { pass, fail } from './types.js'
import { fileExists, readFileSafe, globFiles } from '../utils/fs.js'

type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun'

async function detectPackageManager(dir: string): Promise<PackageManager | null> {
  if (await fileExists(path.join(dir, 'pnpm-lock.yaml'))) return 'pnpm'
  if (await fileExists(path.join(dir, 'bun.lockb'))) return 'bun'
  if (await fileExists(path.join(dir, 'yarn.lock'))) return 'yarn'
  if (await fileExists(path.join(dir, 'package-lock.json'))) return 'npm'
  return null
}



export const consistencyChecks: Check[] = [
  {
    id: 'pkg-manager-mismatch',
    label: 'Package manager consistency',
    category: 'consistency',
    weight: 3,
    async run(dir) {
      const readme = await readFileSafe(path.join(dir, 'README.md'))
      if (!readme) return pass(this)

      const actual = await detectPackageManager(dir)
      if (!actual) return pass(this)

      const codeBlocks = readme.match(/```[\s\S]*?```/g) ?? []
      const codeSpans = readme.match(/`[^`\n]+`/g) ?? []
      const codeText = [...codeBlocks, ...codeSpans].join('\n')

      const installMatches = codeText.match(/\b(npm|yarn|pnpm|bun)\s+(?:install|add|i|run|remove)\b/gi) ?? []
      for (const match of installMatches) {
        const parts = match.split(/\s+/)
        const mentioned = (parts[0] ?? '').toLowerCase() as PackageManager
        if (mentioned && mentioned !== actual) {
          return fail(this, `README says \`${match}\` but repo uses ${actual}`, undefined, 'README.md')
        }
      }
      return pass(this)
    },
  },

  {
    id: 'node-version-mismatch',
    label: 'Node.js version consistency',
    category: 'consistency',
    weight: 2,
    async run(dir) {
      const pkg = await readFileSafe(path.join(dir, 'package.json'))
      if (!pkg) return pass(this)

      let enginesNode: string | null = null
      try {
        const parsed = JSON.parse(pkg) as { engines?: { node?: string } }
        enginesNode = parsed?.engines?.node ?? null
      } catch {
        return pass(this)
      }
      if (!enginesNode) return pass(this)

      const enginesMatch = enginesNode.match(/(\d+)/)
      if (!enginesMatch?.[1]) return pass(this)
      const enginesVersion = parseInt(enginesMatch[1], 10)

      const workflows = await globFiles(['.github/workflows/*.{yml,yaml}'], dir)
      for (const wf of workflows) {
        const content = await readFileSafe(path.join(dir, wf))
        if (!content) continue
        const ciMatch = content.match(/node-version:\s*['"']?v?(\d+)/i)
        if (!ciMatch?.[1]) continue
        const ciVersion = parseInt(ciMatch[1], 10)
        if (ciVersion < enginesVersion) {
          return fail(this, `CI pins Node ${ciVersion} but package.json requires >=${enginesVersion}`, undefined, wf)
        }
      }
      return pass(this)
    },
  },

  {
    id: 'stale-ci-badge',
    label: 'CI badge URLs',
    category: 'consistency',
    weight: 3,
    async run(dir) {
      const readme = await readFileSafe(path.join(dir, 'README.md'))
      if (!readme) return pass(this)

      const badgeMatches = [
        ...readme.matchAll(/\/actions\/workflows\/([^/\s"')]+\.ya?ml)\/badge\.svg/gi),
      ]
      if (badgeMatches.length === 0) return pass(this)

      const workflows = await globFiles(['.github/workflows/*.{yml,yaml}'], dir)
      const workflowNames = new Set(workflows.map((w) => path.basename(w)))

      for (const match of badgeMatches) {
        const badgeFile = match[1]
        if (badgeFile != null && !workflowNames.has(badgeFile)) {
          return fail(this, `Badge points to \`${badgeFile}\` - workflow file doesn't exist`, undefined, 'README.md')
        }
      }
      return pass(this)
    },
  },

  {
    id: 'license-year-stale',
    label: 'License year',
    category: 'consistency',
    weight: 1,
    async run(dir) {
      const licensePath = (await fileExists(path.join(dir, 'LICENSE'))) ? 'LICENSE' : 'LICENSE.md'
      const license = await readFileSafe(path.join(dir, licensePath))
      if (!license) return pass(this)

      const yearMatch = license.match(/copyright\s+(?:©\s*)?(\d{4})/i)
      if (!yearMatch?.[1]) return pass(this)
      const licenseYear = parseInt(yearMatch[1], 10)
      const currentYear = new Date().getFullYear()

      if (currentYear - licenseYear > 1) {
        return fail(this, `LICENSE shows ${licenseYear} - it's ${currentYear}`, undefined, licensePath)
      }
      return pass(this)
    },
    async fix(dir) {
      const currentYear = new Date().getFullYear()
      const licensePath = (await fileExists(path.join(dir, 'LICENSE'))) ? 'LICENSE' : 'LICENSE.md'
      const fullPath = path.join(dir, licensePath)
      const license = await readFileSafe(fullPath)
      if (!license) return { applied: false, description: 'License not found' }
      
      const newLicense = license.replace(/(copyright\s+(?:©\s*)?)(\d{4})/i, `$1${currentYear}`)
      if (newLicense === license) return { applied: false, description: 'Could not automatically replace year' }
      
      const fs = await import('fs/promises')
      await fs.writeFile(fullPath, newLicense, 'utf8')
      
      return { applied: true, description: `updated year to ${currentYear} in ${licensePath}` }
    }
  },

  {
    id: 'missing-keywords',
    label: 'Package keywords',
    category: 'consistency',
    weight: 1,
    async run(dir) {
      const pkg = await readFileSafe(path.join(dir, 'package.json'))
      if (!pkg) return pass(this)

      try {
        const parsed = JSON.parse(pkg) as { keywords?: string[] }
        const kw = parsed?.keywords
        if (!kw || kw.length === 0) {
          return fail(this, 'package.json has no keywords', 'Add keywords to improve npm discoverability', 'package.json')
        }
      } catch {
        return pass(this)
      }
      return pass(this)
    },
  },

  {
    id: 'empty-description',
    label: 'Package description',
    category: 'consistency',
    weight: 1,
    async run(dir) {
      const pkg = await readFileSafe(path.join(dir, 'package.json'))
      if (!pkg) return pass(this)

      try {
        const parsed = JSON.parse(pkg) as { description?: string }
        if (!parsed?.description?.trim()) {
          return fail(this, 'package.json has no description', undefined, 'package.json')
        }
      } catch {
        return pass(this)
      }
      return pass(this)
    },
    async fix(dir) {
      const fullPath = path.join(dir, 'package.json')
      const pkg = await readFileSafe(fullPath)
      if (!pkg) return { applied: false, description: 'package.json not found' }
      
      try {
        const parsed = JSON.parse(pkg)
        parsed.description = ''
        const fs = await import('fs/promises')
        await fs.writeFile(fullPath, JSON.stringify(parsed, null, 2) + '\n', 'utf8')
        return { applied: true, description: 'added empty description field to package.json' }
      } catch {
        return { applied: false, description: 'failed to parse package.json' }
      }
    }
  },

  {
    id: 'changelog-outdated',
    label: 'CHANGELOG up-to-date',
    category: 'consistency',
    weight: 2,
    async run(dir) {
      const pkg = await readFileSafe(path.join(dir, 'package.json'))
      if (!pkg) return pass(this)

      let version = ''
      try {
        version = JSON.parse(pkg).version
      } catch {
        return pass(this)
      }
      if (!version) return pass(this)

      const changelogs = await globFiles(['CHANGELOG{,.md,.txt}'], dir)
      if (changelogs.length === 0) return pass(this) // existence checked by docs check
      const changelogPath = changelogs[0]!

      const changelog = await readFileSafe(path.join(dir, changelogPath))
      if (!changelog) return pass(this)

      if (!changelog.includes(`[${version}]`) && !changelog.includes(`## ${version}`)) {
        return fail(this, `CHANGELOG.md is missing release notes for v${version}`, undefined, changelogPath)
      }
      return pass(this)
    },
  },
]
