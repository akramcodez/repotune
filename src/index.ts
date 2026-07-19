import { cac } from 'cac'
import { runScan } from './commands/scan.js'
import { runConfig } from './commands/config.js'
import { runDoctor } from './commands/doctor.js'

const cli = cac('repokit')

cli
  .command('scan [dir]', 'Scan a repository for quality issues')
  .option('--json', 'Output results as JSON')
  .option('--fail-under <score>', 'Exit with code 1 if score is below this threshold')
  .action(async (dir = '.', options) => {
    await runScan(dir, options)
  })

cli
  .command('config', 'Configure AI providers for repokit doctor')
  .option('--provider <name>', 'Set provider non-interactively')
  .option('--remove-key', 'Remove stored API key')
  .option('--reset', 'Clear all configuration')
  .option('--show', 'Show current configuration')
  .action(async (options) => {
    await runConfig(options)
  })

cli
  .command('doctor [dir]', 'Fix repository issues using AI')
  .action(async (dir = '.') => {
    await runDoctor(dir)
  })

cli.help()
cli.version('0.1.0')

cli.parse()
