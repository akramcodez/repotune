import path from 'path'
import { WORKFLOWS } from '../data/workflows.js'
import { fileExists } from '../utils/fs.js'

import fs from 'fs/promises'

type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun'

async function detectPackageManager(dir: string): Promise<PackageManager> {
  if (await fileExists(path.join(dir, 'pnpm-lock.yaml'))) return 'pnpm'
  if (await fileExists(path.join(dir, 'bun.lockb'))) return 'bun'
  if (await fileExists(path.join(dir, 'yarn.lock'))) return 'yarn'
  // Default to npm
  return 'npm'
}

export async function runCi(dir: string = '.'): Promise<void> {
  const { checkbox } = await import('../ui/prompts.js')
  
  const selected = await checkbox({
    message: 'Select workflows to generate',
    choices: Object.entries(WORKFLOWS).map(([key, wf]) => ({
      value: key,
      name: wf.label,
      description: wf.rationale
    }))
  }) as string[]

  if (typeof selected === 'symbol' || selected.length === 0) {
    console.log('\n\x1b[33mNo workflows selected.\x1b[0m\n')
    return
  }

  const pm = await detectPackageManager(dir)

  console.log()
  for (const key of selected) {
    const wf = WORKFLOWS[key]
    if (!wf) continue
    const content = wf.generate(pm)
    const outPath = path.join(dir, wf.outputPath)
    const outDir = path.dirname(outPath)
    
    await fs.mkdir(outDir, { recursive: true })
    
    // Normalize newlines to LF for CI files (cross-platform hardening)
    const normalizedContent = content.replace(/\\r\n/g, '\n')
    
    await fs.writeFile(outPath, normalizedContent, 'utf8')
    console.log(`\x1b[32m✓\x1b[0m ${wf.outputPath}`)
  }
  console.log()
}
