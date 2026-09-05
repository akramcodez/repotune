import fs from 'fs/promises'
import path from 'path'
import { fileExists } from './fs.js'

export interface HistoryChange {
  filePath: string
  originalContent: string | null // null means the file was created
}

export interface HistoryEntry {
  id: number
  command: 'init' | 'doctor'
  timestamp: string
  changes: HistoryChange[]
}

const HISTORY_DIR = '.repotune'
const HISTORY_FILE = 'history.json'

function getHistoryPath(dir: string): string {
  return path.join(dir, HISTORY_DIR, HISTORY_FILE)
}

export async function getHistory(dir: string): Promise<HistoryEntry[]> {
  const p = getHistoryPath(dir)
  if (!(await fileExists(p))) return []
  try {
    const raw = await fs.readFile(p, 'utf8')
    return JSON.parse(raw) as HistoryEntry[]
  } catch {
    return []
  }
}

export async function recordAction(
  dir: string,
  command: 'init' | 'doctor',
  changes: HistoryChange[],
): Promise<boolean> {
  if (changes.length === 0) return false

  const p = getHistoryPath(dir)
  const isFirstTime = !(await fileExists(p))

  await fs.mkdir(path.dirname(p), { recursive: true })

  const history = await getHistory(dir)
  const nextId = history.length > 0 ? Math.max(...history.map((e) => e.id)) + 1 : 1

  const entry: HistoryEntry = {
    id: nextId,
    command,
    timestamp: new Date().toISOString(),
    changes,
  }

  history.push(entry)
  await fs.writeFile(p, JSON.stringify(history, null, 2), 'utf8')

  if (isFirstTime) {
    // Add to .gitignore
    try {
      const gitignorePath = path.join(dir, '.gitignore')
      let content = ''
      if (await fileExists(gitignorePath)) {
        content = await fs.readFile(gitignorePath, 'utf8')
      }
      if (!content.includes('.repotune')) {
        const prefix = content.length > 0 && !content.endsWith('\n') ? '\n' : ''
        await fs.appendFile(gitignorePath, `${prefix}.repotune\n`, 'utf8')
      }
    } catch {
      // ignore
    }
  }

  return isFirstTime
}

export async function revertEntry(dir: string, id: number): Promise<boolean> {
  const history = await getHistory(dir)
  const entryIndex = history.findIndex((e) => e.id === id)
  if (entryIndex === -1) return false

  const entry = history[entryIndex]
  if (!entry) return false

  // Revert changes
  for (const change of entry.changes) {
    const fullPath = path.join(dir, change.filePath)
    if (change.originalContent === null) {
      // File was created by repotune, so revert = delete
      try {
        await fs.rm(fullPath, { force: true })
      } catch {}
    } else {
      // Restore original content
      try {
        await fs.mkdir(path.dirname(fullPath), { recursive: true })
        await fs.writeFile(fullPath, change.originalContent, 'utf8')
      } catch {}
    }
  }

  // Remove entry from history
  history.splice(entryIndex, 1)

  const p = getHistoryPath(dir)
  if (history.length === 0) {
    await fs.rm(p, { force: true })
    try {
      await fs.rmdir(path.dirname(p)) // Try to remove .repotune if empty
    } catch {}
  } else {
    await fs.writeFile(p, JSON.stringify(history, null, 2), 'utf8')
  }

  return true
}

export async function getHistoryFilePath(dir: string): Promise<string> {
  return getHistoryPath(dir)
}
