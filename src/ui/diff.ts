import { diffLines } from 'diff'

export function renderDiff(original: string, updated: string): string {
  const lines: string[] = []

  for (const part of diffLines(original, updated)) {
    // If the diff part has no changes, just show it
    const partLines = part.value.replace(/\n$/, '').split('\n')

    for (const line of partLines) {
      if (part.added) {
        lines.push(`\x1b[32m+ ${line}\x1b[0m`)
      } else if (part.removed) {
        lines.push(`\x1b[31m- ${line}\x1b[0m`)
      } else {
        lines.push(`  ${line}`)
      }
    }
  }

  return lines.join('\n')
}
