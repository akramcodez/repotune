import path from 'path'
import type { Check } from './types.js'
import { pass, fail } from './types.js'
import { globExists, globFiles, readFileSafe } from '../utils/fs.js'
import { execa } from 'execa'

export const securityChecks: Check[] = [
  {
    id: 'secrets',
    label: 'No leaked secrets',
    category: 'security',
    weight: 5,
    async run(dir) {
      try {
        const { stdout } = await execa('git', ['ls-files'], { cwd: dir })
        const files = stdout.split('\n').filter(Boolean)
        
        const secretRegex = /(AKIA[0-9A-Z]{16}|sk_live_[0-9a-zA-Z]{24}|ghp_[a-zA-Z0-9]{36})/
        
        for (const file of files) {
          if (file.includes('lock') || file.endsWith('.png') || file.endsWith('.jpg')) continue
          
          const content = await readFileSafe(path.join(dir, file))
          if (content && secretRegex.test(content)) {
            return fail(this, `Possible secret leaked in ${file}`, 'Remove the secret and rotate it immediately', file)
          }
        }
      } catch {
        // Not a git repo, fallback gracefully
      }
      return pass(this)
    }
  },
  {
    id: 'deps-pinned-actions',
    label: 'Pinned GitHub Actions (OSSF)',
    category: 'security',
    weight: 2,
    async run(dir) {
      const workflows = await globFiles(['.github/workflows/*.{yml,yaml}'], dir)
      for (const wf of workflows) {
        const content = await readFileSafe(path.join(dir, wf))
        if (!content) continue
        
        const usesMatch = content.match(/uses:\s*[^@]+@([^\s]+)/g)
        if (usesMatch) {
          for (const use of usesMatch) {
            const version = use.split('@')[1]
            if (version && version.length < 40 && !version.includes('.')) {
              return fail(this, `Action uses floating tag ${version}`, 'OSSF recommends pinning by full SHA hash for security', wf)
            }
          }
        }
      }
      return pass(this)
    }
  },
  {
    id: 'deps-pinned-npm',
    label: 'Pinned NPM Dependencies',
    category: 'security',
    weight: 1,
    async run(dir) {
      const pkg = await readFileSafe(path.join(dir, 'package.json'))
      if (!pkg) return pass(this)
      
      try {
        const parsed = JSON.parse(pkg)
        const deps = { ...parsed.dependencies, ...parsed.devDependencies }
        
        for (const [name, version] of Object.entries(deps)) {
          if (typeof version === 'string' && (version.startsWith('^') || version.startsWith('~') || version === '*')) {
            return fail(this, `Dependency ${name} uses floating version ${version}`, 'Pin to an exact version', 'package.json')
          }
        }
      } catch {
        // Ignore JSON parse errors
      }
      
      return pass(this)
    }
  },
  {
    id: 'npm-audit',
    label: 'Vulnerability Audit (CVEs)',
    category: 'security',
    weight: 4,
    async run(dir, opts) {
      if (!opts?.audit) return pass(this)
      
      const hasPkg = await globExists(['package.json'], dir)
      const hasLock = await globExists(['package-lock.json', 'npm-shrinkwrap.json'], dir)
      
      if (!hasPkg || !hasLock) return pass(this)
      
      try {
        await execa('npm', ['audit', '--audit-level=high'], { cwd: dir })
        return pass(this)
      } catch (e: unknown) {
        const err = e as { exitCode?: number }
        if (err.exitCode !== 0) {
          return fail(this, 'npm audit found high/critical vulnerabilities', 'Run npm audit fix', 'package.json')
        }
      }
      
      return pass(this)
    }
  }
]
