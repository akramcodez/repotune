import path from 'path'
import { writeFile, mkdir } from 'fs/promises'
import { fileExists } from '../utils/fs.js'
import { select, confirm } from '../ui/prompts.js'
import { getTemplateContent } from '../templates/index.js'
import { startPulse } from '../ui/pulse.js'
import { recordAction, type HistoryChange } from '../utils/history.js'

export async function runInit(dir: string): Promise<void> {
  const resolvedDir = path.resolve(dir)
  console.log('\n\x1b[36mWelcome to RepoTune Init!\x1b[0m')
  console.log('This will bootstrap standard open-source community files for your repository.\n')

  const wantLicense = await confirm({ message: 'Generate a LICENSE file?', default: true })
  let licenseChoice = 'none'
  if (wantLicense) {
    licenseChoice = await select({
      message: 'Choose a license:',
      choices: [
        { value: 'license-mit', name: 'MIT License' },
        { value: 'license-apache', name: 'Apache 2.0 License' }
      ]
    }) as string
  }

  const filesToGenerate = [
    { id: 'readme', path: 'README.md' },
    { id: 'security', path: 'SECURITY.md' },
    { id: 'contributing', path: 'CONTRIBUTING.md' },
    { id: 'code-of-conduct', path: 'CODE_OF_CONDUCT.md' },
    { id: 'changelog', path: 'CHANGELOG.md' },
    { id: 'issue-template', path: '.github/ISSUE_TEMPLATE.md' },
    { id: 'pr-template', path: '.github/PULL_REQUEST_TEMPLATE.md' }
  ]

  if (licenseChoice !== 'none' && licenseChoice !== 'cancel') {
    filesToGenerate.push({ id: licenseChoice, path: 'LICENSE' })
  }

  const wantAll = await confirm({ message: 'Generate standard community files (README, SECURITY, CONTRIBUTING, etc.)?', default: true })
  
  if (!wantAll && licenseChoice === 'none') {
    console.log('\n\x1b[33mNothing to generate.\x1b[0m\n')
    return
  }

  const files = wantAll ? filesToGenerate : filesToGenerate.filter(f => f.id.startsWith('license'))

  console.log()
  const s = startPulse('Bootstrapping repository...')

  let generated = 0
  let skipped = 0
  const historyChanges: HistoryChange[] = []

  for (const file of files) {
    try {
      const fullPath = path.join(resolvedDir, file.path)
      // Skip files that already exist — never overwrite user content
      if (await fileExists(fullPath)) {
        skipped++
        continue
      }
      const content = await getTemplateContent(file.id, resolvedDir)
      if (content) {
        await mkdir(path.dirname(fullPath), { recursive: true })
        await writeFile(fullPath, content, 'utf8')
        historyChanges.push({ filePath: file.path, originalContent: null })
        generated++
      }
    } catch {
      // ignore
    }
  }

  let isFirstTime = false
  if (historyChanges.length > 0) {
    isFirstTime = await recordAction(resolvedDir, 'init', historyChanges)
  }

  s.stop(`\x1b[32m✓ Bootstrapped ${generated} files.\x1b[0m\n`)

  if (isFirstTime) {
    console.log(`\x1b[36mℹ Created .repotune folder to track history (so you can run 'repotune revert').\x1b[0m\n`)
  }

  if (skipped > 0) {
    console.log(`\x1b[33m⚠ Skipped ${skipped} file${skipped === 1 ? '' : 's'} that already exist — run \x1b[36mrepotune doctor\x1b[33m to improve them with AI.\x1b[0m\n`)
  } else {
    console.log('You can now run \x1b[36mrepotune doctor\x1b[0m to customize them with AI if desired.\n')
  }
}
