import { access, readFile } from 'fs/promises'
import fg from 'fast-glob'

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}

export async function readFileSafe(filePath: string): Promise<string | null> {
  try {
    return await readFile(filePath, 'utf8')
  } catch {
    return null
  }
}

export async function globExists(patterns: string[], cwd: string): Promise<boolean> {
  const results = await fg(patterns, { cwd, dot: true, onlyFiles: true })
  return results.length > 0
}

export async function globFiles(patterns: string[], cwd: string): Promise<string[]> {
  return fg(patterns, { cwd, dot: true, onlyFiles: true })
}
