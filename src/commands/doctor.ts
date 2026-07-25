import { hasConfig } from '../config/store.js'
import { runChecks } from '../checks/index.js'
import { runDoctorSession } from '../ui/doctor-session.js'
import path from 'path'
import { startPulse } from '../ui/pulse.js'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { promptTelemetryOptIn, track } from '../telemetry/index.js'

export async function runDoctor(dir: string, opts: { fix?: boolean } = {}): Promise<void> {
  await promptTelemetryOptIn()

  if (!opts.fix && !hasConfig()) {
    console.error('\n\x1b[31mrepokit doctor requires an AI provider for generated content.\x1b[0m\n\nRun: \x1b[36mrepokit config\x1b[0m\n')
    process.exit(1)
  }

  console.log()
  
  const s = startPulse('🔍︎ Analyzing repository...')

  const resolvedDir = path.resolve(dir)
  const results = await runChecks(resolvedDir)
  
  s.stop('\x1b[32m<<<\x1b[0m Analyzed repository \x1b[32m>>>\x1b[0m')

  const failed = results.filter(r => !r.passed)

  if (failed.length === 0) {
    console.log('\n\x1b[32m✔ Everything looks good - nothing to generate.\x1b[0m\n')
    return
  }

  if (opts.fix) {
    const fixable = failed.filter(r => r.check?.fix != null)
    if (fixable.length === 0) {
      console.log('\n\x1b[33mNo safe mechanical fixes available.\x1b[0m\n')
      return
    }

    console.log('\nApplying safe fixes...\n')
    let fixCount = 0
    for (const item of fixable) {
      await track({
        event: 'doctor_generate',
        checkId: item.id,
        provider: 'mechanical'
      })
      const result = await item.check!.fix!(resolvedDir)
      if (result.applied) {
        console.log(`\x1b[32m✓ ${item.label.padEnd(25)}\x1b[0m — ${result.description}`)
        fixCount++
      }
    }
    
    // Re-score
    const { computeScore } = await import('../checks/score.js')
    const oldScore = computeScore(results)
    const newResults = await runChecks(resolvedDir)
    const newScore = computeScore(newResults)
    
    console.log(`\nRepository Score   ${oldScore} → ${newScore}`)
    console.log(`\nDone. ${fixCount} fixes applied.\n`)
    return
  }

  // Missing files (Phase 2)
  const allowedInPhase2 = ['security', 'contributing', 'code-of-conduct', 'issue-template', 'pr-template', 'changelog']
  const missing = failed.filter(m => m.category !== 'consistency' && !m.id.endsWith('-weak') && allowedInPhase2.includes(m.id))
  
  // Outdated files (Consistency failures that have an associated file)
  const outdated = failed.filter(m => m.category === 'consistency' && m.file != null)

  // Weak files (Weakness heuristic failures)
  const weak = failed.filter(m => m.id.endsWith('-weak'))

  const totalActionable = missing.length + outdated.length + weak.length

  if (totalActionable === 0) {
    console.log('\n\x1b[32m✔ Remaining issues are out of scope for auto-generation.\x1b[0m\n')
    return
  }

  console.log()
  if (missing.length > 0) console.log(`Missing files          ${missing.length}`)
  if (outdated.length > 0) console.log(`Outdated files         ${outdated.length}`)
  if (weak.length > 0) console.log(`Weak / low-quality     ${weak.length}`)
  console.log(`\nFound ${totalActionable} improvements.\n`)

  const { select } = await import('../ui/prompts.js')
  const reviewAction = await select({
    message: 'How would you like to proceed?',
    choices: [
      { value: 'review', name: 'Review each file interactively' },
      { value: 'allow-all', name: 'Allow all (generate everything)' },
      { value: 'cancel', name: 'Cancel Run' }
    ]
  })

  if (reviewAction === 'cancel') {
    console.log('\n\x1b[33mRun cancelled by user.\x1b[0m\n')
    return
  }

  await runDoctorSession(resolvedDir, missing, outdated, weak, reviewAction === 'allow-all')
}
