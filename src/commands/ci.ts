import path from 'path'
import { WORKFLOWS } from '../data/workflows.js'
import { fileExists, readFileSafe } from '../utils/fs.js'

import fs from 'fs/promises'

type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun'

async function detectPackageManager(dir: string): Promise<PackageManager> {
  if (await fileExists(path.join(dir, 'pnpm-lock.yaml'))) return 'pnpm'
  if (await fileExists(path.join(dir, 'bun.lockb'))) return 'bun'
  if (await fileExists(path.join(dir, 'yarn.lock'))) return 'yarn'
  // Default to npm
  return 'npm'
}

async function detectNodeVersion(dir: string): Promise<number> {
  const pkg = await readFileSafe(path.join(dir, 'package.json'))
  if (pkg) {
    try {
      const parsed = JSON.parse(pkg) as { engines?: { node?: string } }
      const enginesNode = parsed?.engines?.node
      if (enginesNode) {
        const match = enginesNode.match(/(\d+)/)
        if (match?.[1]) return parseInt(match[1], 10)
      }
    } catch {
      // ignore
    }
  }
  return 20
}

export async function runCi(dir: string = '.'): Promise<void> {
  const resolvedDir = path.resolve(dir)
  const { checkbox, confirm } = await import('../ui/prompts.js')

  const selected = (await checkbox({
    message: 'Select workflows to generate',
    choices: Object.entries(WORKFLOWS).map(([key, wf]) => ({
      value: key,
      name: wf.label,
      description: wf.rationale,
    })),
  })) as string[]

  if (typeof selected === 'symbol' || selected.length === 0) {
    console.log('\n\x1b[33mNo workflows selected.\x1b[0m\n')
    return
  }

  const pm = await detectPackageManager(resolvedDir)
  const nodeVersion = await detectNodeVersion(resolvedDir)

  console.log()
  for (const key of selected) {
    const wf = WORKFLOWS[key]
    if (!wf) continue
    const content = wf.generate(pm, nodeVersion)
    const outPath = path.join(resolvedDir, wf.outputPath)
    const outDir = path.dirname(outPath)

    // Prompt before overwriting existing files
    if (await fileExists(outPath)) {
      const overwrite = await confirm({
        message: `${wf.outputPath} already exists. Overwrite?`,
        default: false,
      })
      if (!overwrite) {
        console.log(`\x1b[33m⊘\x1b[0m ${wf.outputPath} (skipped)`)
        continue
      }
    }

    await fs.mkdir(outDir, { recursive: true })

    // Normalize newlines to LF for CI files (cross-platform hardening)
    const normalizedContent = content.replace(/\r\n/g, '\n')

    await fs.writeFile(outPath, normalizedContent, 'utf8')
    console.log(`\x1b[32m✓\x1b[0m ${wf.outputPath}`)
  }
  console.log()
}
