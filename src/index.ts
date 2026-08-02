import { cac } from 'cac'
import { runScan } from './commands/scan.js'
import { runConfig } from './commands/config.js'
import { runDoctor } from './commands/doctor.js'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { runExplain } from './commands/explain.js'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { runCi } from './commands/ci.js'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { runBadge } from './commands/badge.js'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { runTelemetry } from './commands/telemetry.js'

const cli = cac('repotune')

cli
  .command('scan [dir]', 'Scan a repository for quality issues')
  .option('--json', 'Output results as JSON')
  .option('--fail-under <score>', 'Exit with code 1 if score is below this threshold')
  .action(async (dir = '.', options) => {
    await runScan(dir, options)
  })

cli
  .command('config', 'Configure AI providers for repotune doctor')
  .option('--provider <name>', 'Set provider non-interactively')
  .option('--remove-key', 'Remove stored API key')
  .option('--reset', 'Clear all configuration')
  .option('--show', 'Show current configuration')
  .action(async (options) => {
    await runConfig(options)
  })

cli
  .command('doctor [dir]', 'Fix repository issues using AI')
  .option('--fix', 'Apply safe mechanical fixes automatically without prompting')
  .action(async (dir = '.', options) => {
    await runDoctor(dir, options)
  })

cli
  .command('explain <topic>', 'Explain a repository health topic')
  .action(async (topic) => {
    await runExplain(topic)
  })

cli
  .command('ci', 'Generate GitHub Actions workflow files')
  .action(async () => {
    await runCi()
  })

cli
  .command('badge [dir]', 'Generate a markdown badge for your README')
  .action(async (dir = '.') => {
    await runBadge(dir)
  })

cli
  .command('telemetry', 'Manage anonymous usage telemetry')
  .option('--show', 'Show what data would be sent')
  .option('--enable', 'Enable telemetry')
  .option('--disable', 'Disable telemetry')
  .option('--status', 'Show current telemetry status')
  .action(async (options) => {
    await runTelemetry(options)
  })

cli.help()
cli.version('1.0.0')

cli.parse()
