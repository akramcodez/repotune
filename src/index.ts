import { cac } from 'cac'
import { runScan } from './commands/scan.js'
import { runConfig } from './commands/config.js'
import { runInit } from './commands/init.js'
import { runDoctor } from './commands/doctor.js'
import { runRevert } from './commands/revert.js'
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
import pkg from '../package.json' with { type: 'json' }

const cli = cac('repotune')

cli
  .command('scan [dir]', 'Scan a repository for quality issues')
  .option('--json', 'Output results as JSON')
  .option('--fail-under <score>', 'Exit with code 1 if score is below this threshold')
  .option('--audit', 'Run a full network-based vulnerability scan (SCA)')
  .example('repotune scan')
  .example('repotune scan --audit')
  .example('repotune scan --fail-under 80')
  .action(async (dir = '.', options) => {
    await runScan(dir, options)
  })

cli
  .command('config', 'Configure AI providers for repotune doctor')
  .option('--provider <name>', 'Set provider non-interactively')
  .option('--remove-key', 'Remove stored API key')
  .option('--reset', 'Clear all configuration')
  .option('--show', 'Show current configuration')
  .option('--custom-agent <cmd>', 'Permanently save a custom external agent')
  .example('repotune config')
  .example('repotune config --custom-agent "my-custom-cli --non-interactive"')
  .example('repotune config --reset')
  .action(async (options) => {
    await runConfig(options)
  })

cli
  .command('init [dir]', 'Bootstrap repository with standard open source templates')
  .action(async (dir = '.') => {
    await runInit(dir)
  })

cli
  .command('doctor [dir]', 'Fix repository issues using AI or offline templates')
  .option('--fix', 'Apply safe mechanical fixes automatically without prompting')
  .option(
    '--agent <name>',
    'Use an external CLI agent (e.g., claude, codex) instead of repotune config',
  )
  .example('repotune doctor           (Uses configured AI or offline mode)')
  .example('repotune doctor --agent claude')
  .example('repotune doctor --agent "my-custom-cli --non-interactive"')
  .example('repotune doctor --fix')
  .action(async (dir = '.', options) => {
    await runDoctor(dir, options)
  })

cli
  .command('revert [dir]', 'Revert changes made by repotune init or doctor')
  .action(async (dir = '.') => {
    await runRevert(dir)
  })

cli.command('explain <topic>', 'Explain a repository health topic').action(async (topic) => {
  await runExplain(topic)
})

cli.command('ci', 'Generate GitHub Actions workflow files').action(async () => {
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
cli.version(pkg.version)

cli.parse()
