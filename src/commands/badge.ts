import path from 'path'
import { runChecks } from '../checks/index.js'
import { computeScore } from '../checks/score.js'

async function copyToClipboard(text: string): Promise<void> {
  const { execSync } = await import('child_process')
  const platform = process.platform

  let cmd: string
  if (platform === 'darwin') {
    cmd = 'pbcopy'
  } else if (platform === 'win32') {
    cmd = 'clip'
  } else {
    cmd = 'xclip -selection clipboard'
  }

  try {
    execSync(cmd, { input: text, timeout: 2000, stdio: ['pipe', 'ignore', 'ignore'] })
  } catch {
    throw new Error('Clipboard not available')
  }
}

export async function runBadge(dir: string = '.'): Promise<void> {
  const resolvedDir = path.resolve(dir)
  const results = await runChecks(resolvedDir)
  const score = computeScore(results)

  const color = score >= 90 ? 'brightgreen' : score >= 70 ? 'yellow' : 'red'

  const url = `https://img.shields.io/badge/RepoKit-${score}%2F100-${color}`
  const badge = `![RepoKit](${url})`

  console.log()
  console.log('Repository Quality')
  console.log(`\x1b[1m${score} / 100\x1b[0m`)
  console.log()
  console.log('Badge markdown:')
  console.log(`\x1b[36m${badge}\x1b[0m`)
  console.log()

  try {
    await copyToClipboard(badge)
    console.log('Copied to clipboard.')
  } catch {
    console.log('Copy the badge above manually.')
  }
  console.log()
}
