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

function detectMentionedManager(line: string): PackageManager | null {
  if (/\bpnpm\b/i.test(line)) return 'pnpm'
  if (/\bbun\b/i.test(line)) return 'bun'
  if (/\byarn\b/i.test(line)) return 'yarn'
  if (/\bnpm\b/i.test(line)) return 'npm'
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

      const installLines = readme.match(/^.*(install|add|run).*/gm) ?? []
      for (const line of installLines) {
        const mentioned = detectMentionedManager(line)
        if (mentioned && mentioned !== actual) {
          return fail(this, `README says \`${mentioned} install\` but repo uses ${actual}`)
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
          return fail(this, `CI pins Node ${ciVersion} but package.json requires >=${enginesVersion}`)
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
          return fail(this, `Badge points to \`${badgeFile}\` - workflow file doesn't exist`)
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
      const license =
        (await readFileSafe(path.join(dir, 'LICENSE'))) ??
        (await readFileSafe(path.join(dir, 'LICENSE.md')))
      if (!license) return pass(this)

      const yearMatch = license.match(/copyright\s+(?:©\s*)?(\d{4})/i)
      if (!yearMatch?.[1]) return pass(this)
      const licenseYear = parseInt(yearMatch[1], 10)
      const currentYear = new Date().getFullYear()

      if (currentYear - licenseYear > 1) {
        return fail(this, `LICENSE shows ${licenseYear} - it's ${currentYear}`)
      }
      return pass(this)
    },
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
          return fail(this, 'package.json has no keywords', 'Add keywords to improve npm discoverability')
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
          return fail(this, 'package.json has no description')
        }
      } catch {
        return pass(this)
      }
      return pass(this)
    },
  },
]
