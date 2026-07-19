import { getAdapter } from '../adapters/index.js'
import { buildContext } from '../utils/context.js'
import { startPulse } from '../ui/pulse.js'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { select } from './prompts.js'
import type { CheckResult } from '../checks/types.js'

function getMissingFilePrompt(checkId: string): string {
  // Simple mapping for Phase 2 missing files
  const map: Record<string, string> = {
    'security': 'Generate a standard open source SECURITY.md file detailing how to report vulnerabilities.',
    'contributing': 'Generate a CONTRIBUTING.md file detailing how to set up the project and submit PRs.',
    'code-of-conduct': 'Generate a standard Code of Conduct based on the Contributor Covenant.',
    'issue-template': 'Generate a standard GitHub bug report issue template in markdown.',
    'pr-template': 'Generate a standard GitHub Pull Request template.',
    'changelog': 'Generate a skeleton CHANGELOG.md file based on Keep a Changelog.'
  }
  return map[checkId] || `Generate a missing ${checkId} file for this repository.`
}

function getMissingFilePath(checkId: string): string {
  const map: Record<string, string> = {
    'security': 'SECURITY.md',
    'contributing': 'CONTRIBUTING.md',
    'code-of-conduct': 'CODE_OF_CONDUCT.md',
    'issue-template': '.github/ISSUE_TEMPLATE/bug_report.md',
    'pr-template': '.github/PULL_REQUEST_TEMPLATE.md',
    'changelog': 'CHANGELOG.md'
  }
  return map[checkId] || `${checkId}.md`
}

function printFileContext(check: CheckResult, providerName: string, filePath: string) {
  process.stdout.write(`\n────────────────────────────────────────\n`)
  process.stdout.write(`\x1b[1m${filePath}\x1b[0m   \x1b[32m[new]\x1b[0m\n\n`)
  process.stdout.write(`\x1b[1mWhy?\x1b[0m\n  This repository is missing a ${check.label}.\n\n`)
  process.stdout.write(`\x1b[1mWhat gets sent to ${providerName}:\x1b[0m\n`)
  process.stdout.write(`  • Your repo's file/folder names\n`)
  process.stdout.write(`  • package.json (or equivalent manifest)\n`)
  process.stdout.write(`  • Nothing else - no source code is transmitted.\n\n`)
}

export async function runDoctorSession(dir: string, missing: CheckResult[], preApprovedAll: boolean = false) {
  const adapter = getAdapter()
  let allowAll = preApprovedAll

  for (const check of missing) {
    // We intentionally exclude README and LICENSE as per spec
    if (check.id === 'readme' || check.id === 'license') {
      continue
    }

    const filePath = getMissingFilePath(check.id)
    
    // Always print the context, even if allowAll is true
    printFileContext(check, adapter.name, filePath)

    if (!allowAll) {
      const action = await select({
        message: 'Actions',
        choices: [
          { value: 'allow', name: 'Allow' },
          { value: 'deny', name: 'Deny' },
          { value: 'allow-all', name: 'Allow All (this run)' },
          { value: 'cancel', name: 'Cancel Run (Exit)' },
        ]
      })

      process.stdout.write(`────────────────────────────────────────\n`)
      
      if (action === 'cancel') {
        console.log('\n\x1b[33mRun cancelled by user.\x1b[0m\n')
        process.exit(0)
      }
      if (action === 'deny') continue
      if (action === 'allow-all') allowAll = true
    } else {
      process.stdout.write(`────────────────────────────────────────\n`)
    }

    const s = startPulse(`Generating ${check.label}...`)

    try {
      const prompt = getMissingFilePrompt(check.id)
      const context = await buildContext(dir)
      const content = await adapter.generate(prompt, context)
      
      const fullPath = path.join(dir, filePath)
      // Make sure directories exist (e.g. for .github/ISSUE_TEMPLATE)
      await mkdir(path.dirname(fullPath), { recursive: true })
      await writeFile(fullPath, content, 'utf8')
      s.stop(`\x1b[32m✓ Generated ${check.label}\x1b[0m`)
    } catch (e: unknown) {
      s.stop(`\x1b[31m✗ Failed to generate ${check.label}: ${(e as Error).message}\x1b[0m`)
    }
  }

  console.log('\n\x1b[32m✔ Done.\x1b[0m\n')
}
