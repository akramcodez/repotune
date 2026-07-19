import { spinner } from '@clack/prompts'
import { setTimeout } from 'timers/promises'

async function run() {
  const s = spinner()
  s.start('🔍︎ Scanning repository...')
  await setTimeout(2000)
  s.stop('🔍︎ Scan complete')
}

run()
