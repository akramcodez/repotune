import fg from 'fast-glob'
import { readFile } from 'fs/promises'
import path from 'path'

export async function buildContext(dir: string): Promise<string> {
  const parts: string[] = []

  // File tree (names only, no contents)
  const files = await fg(['**/*'], { 
    cwd: dir, 
    dot: true, 
    ignore: ['node_modules/**', '.git/**'], 
    onlyFiles: true 
  })
  parts.push(`File tree:\n${files.join('\n')}`)

  // package.json if present
  try {
    const pkg = await readFile(path.join(dir, 'package.json'), 'utf8')
    parts.push(`package.json:\n${pkg}`)
  } catch {
    // ignore
  }

  return parts.join('\n\n')
}
