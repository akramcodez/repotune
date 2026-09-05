import { describe, it, expect } from 'vitest'
import { renderDiff } from '../../src/ui/diff.js'

describe('renderDiff', () => {
  it('renders additions and deletions with ANSI colors', () => {
    const original = 'Line 1\nLine 2\nLine 3'
    const updated = 'Line 1\nLine 2 modified\nLine 3\nLine 4 added'

    const output = renderDiff(original, updated)

    expect(output).toContain('\x1b[31m- Line 2\x1b[0m')
    expect(output).toContain('\x1b[32m+ Line 2 modified\x1b[0m')
    expect(output).toContain('\x1b[32m+ Line 4 added\x1b[0m')
    expect(output).toContain('  Line 1')
  })
})
