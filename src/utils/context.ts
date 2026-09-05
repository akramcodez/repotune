import fg from 'fast-glob'
import { readFile } from 'fs/promises'
import path from 'path'

import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

export async function buildContext(dir: string): Promise<string> {
  const parts: string[] = []

  // System context
  parts.push(`Current Date: ${new Date().toISOString().split('T')[0]}`)
  try {
    const { stdout: name } = await execAsync('git config user.name', { cwd: dir })
    const { stdout: email } = await execAsync('git config user.email', { cwd: dir })
    if (name.trim() || email.trim()) {
      parts.push(`Repository Author: ${name.trim()} <${email.trim()}>`)
    }
    const { stdout: remoteUrl } = await execAsync('git remote get-url origin', { cwd: dir })
    if (remoteUrl.trim()) {
      parts.push(`Repository URL: ${remoteUrl.trim()}`)
    }
  } catch {
    // ignore if git isn't available or configured
  }

  // File tree (summarized to save tokens)
  const files = await fg(['**/*'], {
    cwd: dir,
    dot: true,
    ignore: ['node_modules/**', '.git/**'],
    onlyFiles: true,
    deep: 3, // Limit depth to protect privacy and save API credits
  })
  parts.push(`Directory Structure (max depth 3):\n${files.join('\n')}`)

  // package.json if present
  try {
    const pkgStr = await readFile(path.join(dir, 'package.json'), 'utf8')
    const pkg = JSON.parse(pkgStr)
    const safePkg = {
      name: pkg.name,
      description: pkg.description,
      scripts: pkg.scripts,
      dependencies: Object.keys(pkg.dependencies || {}),
    }
    parts.push(`Project Manifest Summary:\n${JSON.stringify(safePkg)}`)
  } catch {
    // ignore
  }
  // Current Date (to prevent AI from hallucinating old dates in changelogs/licenses)
  const today = new Date().toISOString().split('T')[0]
  parts.push(`Current Date:\n${today}`)

  return parts.join('\n\n')
}
