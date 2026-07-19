import { hasConfig } from '../config/store.js'
import { runChecks } from '../checks/index.js'
import { runDoctorSession } from '../ui/doctor-session.js'
import path from 'path'
import { startPulse } from '../ui/pulse.js'

export async function runDoctor(dir: string): Promise<void> {
  if (!hasConfig()) {
    console.error('\n\x1b[31mrepokit doctor requires an AI provider for generated content.\x1b[0m\n\nRun: \x1b[36mrepokit config\x1b[0m\n')
    process.exit(1)
  }

  console.log()
  
  const s = startPulse('🔍︎ Analyzing repository...')

  const resolvedDir = path.resolve(dir)
  const results = await runChecks(resolvedDir)
  
  s.stop('\x1b[32m<<<\x1b[0m Analyzed repository \x1b[32m>>>\x1b[0m')

  const missing = results.filter(r => !r.passed)

  if (missing.length === 0) {
    console.log('\n\x1b[32m✔ Everything looks good - nothing to generate.\x1b[0m\n')
    return
  }

  // Phase 2 scope strictly limits generation to these missing files
  const allowedInPhase2 = ['security', 'contributing', 'code-of-conduct', 'issue-template', 'pr-template', 'changelog']
  const actionable = missing.filter(m => allowedInPhase2.includes(m.id))
  
  if (actionable.length === 0) {
    console.log('\n\x1b[32m✔ Remaining missing files are out of scope for auto-generation.\x1b[0m\n')
    return
  }

  console.log(`\nMissing files          ${actionable.length}\n\nFound ${actionable.length} improvements.\n`)

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

  await runDoctorSession(resolvedDir, actionable, reviewAction === 'allow-all')
}
