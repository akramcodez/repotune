import { cac } from 'cac'

const cli = cac('repokit')

cli
  .command('scan [dir]', 'Scan a repository for quality issues')
  .option('--json', 'Output results as JSON')
  .option('--fail-under <score>', 'Exit with code 1 if score is below this threshold')
  .action(async (dir = '.', options) => {
    const { runScan } = await import('./commands/scan.js')
    await runScan(dir, options)
  })

cli
  .command('config', 'Configure AI providers for repokit doctor')
  .option('--provider <name>', 'Set provider non-interactively')
  .option('--remove-key', 'Remove stored API key')
  .option('--reset', 'Clear all configuration')
  .option('--show', 'Show current configuration')
  .action(async (options) => {
    const { runConfig } = await import('./commands/config.js')
    await runConfig(options)
  })

cli
  .command('doctor [dir]', 'Fix repository issues using AI')
  .option('--fix', 'Apply safe mechanical fixes automatically without prompting')
  .action(async (dir = '.', options) => {
    const { runDoctor } = await import('./commands/doctor.js')
    await runDoctor(dir, options)
  })

cli
  .command('explain <topic>', 'Explain a repository health topic')
  .action(async (topic) => {
    const { runExplain } = await import('./commands/explain.js')
    await runExplain(topic)
  })

cli
  .command('ci', 'Generate GitHub Actions workflow files')
  .action(async () => {
    const { runCi } = await import('./commands/ci.js')
    await runCi()
  })

cli
  .command('badge [dir]', 'Generate a markdown badge for your README')
  .action(async (dir = '.') => {
    const { runBadge } = await import('./commands/badge.js')
    await runBadge(dir)
  })

cli.help()
cli.version('1.0.0')

cli.parse()
