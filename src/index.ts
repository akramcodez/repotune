import { cac } from 'cac'
import { runScan } from './commands/scan.js'

const cli = cac('repokit')

cli
  .command('scan [dir]', 'Scan a repository for quality issues')
  .option('--json', 'Output results as JSON')
  .option('--fail-under <score>', 'Exit 1 if score is below this value (useful for CI)')
  .action(async (dir: string = '.', options: { json?: boolean; failUnder?: string | number }) => {
    await runScan(dir, {
      json: options.json,
      failUnder:
        options.failUnder !== undefined ? parseInt(String(options.failUnder), 10) : undefined,
    })
  })

cli.help()
cli.version('0.1.0')
cli.parse()
