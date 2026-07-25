import path from 'path'
import { runChecks, computeScore, scoreLabel } from '../checks/index.js'
import { renderScanOutput, renderJsonOutput } from '../ui/output.js'
import { startPulse } from '../ui/pulse.js'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { promptTelemetryOptIn, track } from '../telemetry/index.js'
import { getConfig, hasConfig } from '../config/store.js'

export interface ScanOptions {
  json?: boolean
  failUnder?: number
}

export async function runScan(dir: string, opts: ScanOptions = {}): Promise<void> {
  await promptTelemetryOptIn()

  const resolvedDir = path.resolve(dir)

  if (opts.json) {
    const results = await runChecks(resolvedDir)
    renderJsonOutput(results, computeScore(results))
    if (opts.failUnder !== undefined && computeScore(results) < opts.failUnder) process.exit(1)
    return
  }

  console.log()

  const s = startPulse('🔍︎ Scanning repository...')

  const results = await runChecks(resolvedDir)
  const score = computeScore(results)
  s.stop('\x1b[32m<<<\x1b[0m Scan completed \x1b[32m>>>\x1b[0m')

  renderScanOutput(results, score, scoreLabel(score))

  if (hasConfig()) {
    await track({
      event: 'scan',
      score: Math.round(score / 5) * 5,
      provider: getConfig().provider
    })
  }

  if (opts.failUnder !== undefined && score < opts.failUnder) {
    process.exit(1)
  }
}
