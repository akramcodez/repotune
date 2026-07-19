import path from 'path'
import { runChecks, computeScore, scoreLabel } from '../checks/index.js'
import { renderScanOutput, renderJsonOutput } from '../ui/output.js'

export interface ScanOptions {
  json?: boolean
  failUnder?: number
}

function startPulse(text: string) {
  let timer: NodeJS.Timeout
  // 90 = gray, 39 = default (white)
  const colors = [90, 39]
  let i = 0

  process.stdout.write('\x1B[?25l') // hide cursor
  timer = setInterval(() => {
    process.stdout.write(`\r\x1b[${colors[i]}m${text}\x1b[0m`)
    i = (i + 1) % colors.length
  }, 200)

  return {
    stop(finalText: string) {
      clearInterval(timer)
      process.stdout.write('\x1B[?25h') // show cursor
      // clear line and print final text
      process.stdout.write(`\r\x1b[K${finalText}\n\n`)
    },
  }
}

export async function runScan(dir: string, opts: ScanOptions = {}): Promise<void> {
  const resolvedDir = path.resolve(dir)

  if (opts.json) {
    const results = await runChecks(resolvedDir)
    renderJsonOutput(results, computeScore(results))
    if (opts.failUnder !== undefined && computeScore(results) < opts.failUnder) process.exit(1)
    return
  }

  const s = startPulse('🔍︎ Scanning repository...')

  // Artificial delay so you can see the color pulse
  // await new Promise(resolve => setTimeout(resolve, 3000))

  const results = await runChecks(resolvedDir)
  const score = computeScore(results)
  s.stop('\x1b[32m<<<\x1b[0m Scan completed \x1b[32m>>>\x1b[0m')

  renderScanOutput(results, score, scoreLabel(score))

  if (opts.failUnder !== undefined && score < opts.failUnder) {
    process.exit(1)
  }
}
