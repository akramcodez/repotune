import path from 'path'
import { getHistory, revertEntry, getHistoryFilePath } from '../utils/history.js'
import { select } from '../ui/prompts.js'

export async function runRevert(dir: string): Promise<void> {
  const resolvedDir = path.resolve(dir)
  const history = await getHistory(resolvedDir)

  if (history.length === 0) {
    console.log('\n\x1b[33mNo recent RepoTune changes found to revert.\x1b[0m\n')
    return
  }

  const historyFile = await getHistoryFilePath(resolvedDir)
  console.log(`\n\x1b[36mFound ${history.length} recent action(s).\x1b[0m`)
  console.log(`History log: \x1b[4mfile://${historyFile}\x1b[0m\n`)

  const choices = []

  // Add individual entries
  for (const entry of history.slice().reverse()) {
    const desc = `[${entry.id}] ${entry.command} modified ${entry.changes.length} file(s)`
    choices.push({ value: entry.id.toString(), name: desc })
  }

  choices.push({ value: 'all', name: '\x1b[31mRevert ALL actions\x1b[0m' })
  choices.push({ value: 'cancel', name: 'Cancel' })

  const action = await select({
    message: 'What would you like to revert?',
    choices,
  })

  if (action === 'cancel') {
    console.log('\n\x1b[33mRevert cancelled.\x1b[0m\n')
    return
  }

  if (action === 'all') {
    console.log('\nReverting all changes...')
    // Revert from newest to oldest
    const idsToRevert = history
      .slice()
      .reverse()
      .map((e) => e.id)
    let reverted = 0
    for (const id of idsToRevert) {
      if (await revertEntry(resolvedDir, id)) reverted++
    }
    console.log(`\x1b[32m✓ Reverted ${reverted} action(s) successfully.\x1b[0m\n`)
    return
  }

  const id = parseInt(action as string, 10)
  const success = await revertEntry(resolvedDir, id)
  if (success) {
    console.log(`\n\x1b[32m✓ Successfully reverted action ID ${id}.\x1b[0m\n`)
  } else {
    console.log(`\n\x1b[31m✗ Failed to revert action ID ${id}.\x1b[0m\n`)
  }
}
