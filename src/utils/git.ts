import { execa } from 'execa'

export async function getRecentCommits(dir: string): Promise<string> {
  try {
    const { stdout: lastTag } = await execa('git', ['describe', '--tags', '--abbrev=0'], {
      cwd: dir,
    })
    const { stdout: commits } = await execa(
      'git',
      ['log', `${lastTag}..HEAD`, '--oneline', '--no-merges'],
      { cwd: dir },
    )
    return commits || '(No new commits since last release)'
  } catch {
    try {
      const { stdout: commits } = await execa(
        'git',
        ['log', '-n', '20', '--oneline', '--no-merges'],
        { cwd: dir },
      )
      return commits || '(No commits found)'
    } catch {
      return '(Could not read git history)'
    }
  }
}
