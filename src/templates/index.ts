import { fileURLToPath } from 'url'
import path from 'path'
import { readFile } from 'fs/promises'
import { readFileSafe } from '../utils/fs.js'

export async function getTemplateContent(checkId: string, dir: string): Promise<string | null> {
  const map: Record<string, string> = {
    security: 'SECURITY.md',
    contributing: 'CONTRIBUTING.md',
    'code-of-conduct': 'CODE_OF_CONDUCT.md',
    'issue-template': 'ISSUE_TEMPLATE.md',
    'pr-template': 'PR_TEMPLATE.md',
    changelog: 'CHANGELOG.md',
    readme: 'README.md',
    'license-mit': 'licenses/MIT.txt',
    'license-apache': 'licenses/APACHE.txt',
  }

  const templateFile = map[checkId]
  if (!templateFile) return null

  // Determine path to templates dir depending on whether we are running from dist/ or src/
  const __dirname = path.dirname(fileURLToPath(import.meta.url))

  // Try finding templates directory relative to __dirname
  // In src/templates/index.ts, it's ../../templates
  // In dist/..., it's ../templates (depending on bundling)
  let templatesDir = path.join(__dirname, '../../templates')

  try {
    await readFile(path.join(templatesDir, 'README.md'), 'utf8')
  } catch {
    // If not found, try one level up (for dist)
    templatesDir = path.join(__dirname, '../templates')
  }

  let content = ''
  try {
    content = await readFile(path.join(templatesDir, templateFile), 'utf8')
  } catch {
    return null
  }

  // Extract meta from package.json
  const pkgContent = await readFileSafe(path.join(dir, 'package.json'))
  let pkgName = 'Your Project'
  let pkgDesc = 'A wonderful open source project.'
  let pkgVersion = '1.0.0'
  let pkgAuthor = 'The Contributors'
  let pkgEmail = 'maintainers@example.com'
  let installCmd = 'npm install'
  let devCmd = 'npm run dev'
  let testCmd = 'npm test'
  let licenseName = 'MIT'

  if (pkgContent) {
    try {
      const pkg = JSON.parse(pkgContent)
      if (pkg.name) pkgName = pkg.name
      if (pkg.description) pkgDesc = pkg.description
      if (pkg.version) pkgVersion = pkg.version
      if (pkg.license) licenseName = pkg.license

      if (typeof pkg.author === 'string') {
        const emailMatch = pkg.author.match(/<(.+)>/)
        if (emailMatch) {
          pkgEmail = emailMatch[1]
          pkgAuthor = pkg.author.replace(/<.+>/, '').trim()
        } else {
          pkgAuthor = pkg.author
        }
      } else if (pkg.author && typeof pkg.author === 'object') {
        if (pkg.author.name) pkgAuthor = pkg.author.name
        if (pkg.author.email) pkgEmail = pkg.author.email
      }

      // Guess package manager
      const isYarn = !!(await readFileSafe(path.join(dir, 'yarn.lock')))
      const isPnpm = !!(await readFileSafe(path.join(dir, 'pnpm-lock.yaml')))
      const isBun = !!(await readFileSafe(path.join(dir, 'bun.lockb')))

      const pm = isPnpm ? 'pnpm' : isYarn ? 'yarn' : isBun ? 'bun' : 'npm'
      installCmd = `${pm} install`
      devCmd = `${pm} run dev`
      testCmd = `${pm} test`
    } catch {
      // Ignore invalid package.json
    }
  }

  return content
    .replace(/\{\{project\}\}/g, pkgName)
    .replace(/\{\{description\}\}/g, pkgDesc)
    .replace(/\{\{version\}\}/g, pkgVersion)
    .replace(/\{\{author\}\}/g, pkgAuthor)
    .replace(/\{\{email\}\}/g, pkgEmail)
    .replace(/\{\{year\}\}/g, new Date().getFullYear().toString())
    .replace(/\{\{install_command\}\}/g, installCmd)
    .replace(/\{\{dev_command\}\}/g, devCmd)
    .replace(/\{\{test_command\}\}/g, testCmd)
    .replace(/\{\{license\}\}/g, licenseName)
}
