import path from 'path'
import { runChecks } from '../checks/index.js'
import { computeScore } from '../checks/score.js'
import { execa } from 'execa'

async function copyToClipboard(text: string): Promise<void> {
  const platform = process.platform
  try {
    if (platform === 'darwin') {
      await execa('pbcopy', [], { input: text })
    } else if (platform === 'win32') {
      await execa('clip', [], { input: text })
    } else {
      // linux / other
      try {
        await execa('xclip', ['-selection', 'clipboard'], { input: text })
      } catch {
        try {
          await execa('xsel', ['--clipboard', '--input'], { input: text })
        } catch {
          throw new Error('No clipboard utility found')
        }
      }
    }
  } catch (e) {
    throw e
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
