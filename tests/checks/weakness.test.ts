import { describe, it, expect, vi, beforeEach } from 'vitest'
import { weaknessChecks } from '../../src/checks/weakness.js'
import * as fsUtils from '../../src/utils/fs.js'

vi.mock('../../src/utils/fs.js')

describe('weakness checks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('detects a weak CONTRIBUTING.md', async () => {
    vi.mocked(fsUtils.readFileSafe).mockResolvedValue('## Contributing\nJust send a PR.')
    const check = weaknessChecks.find(c => c.id === 'contributing-weak')!
    const result = await check.run('/fake')
    expect(result.passed).toBe(false)
    expect(result.issue).toMatch(/too short|missing/)
  })

  it('passes a strong CONTRIBUTING.md', async () => {
    vi.mocked(fsUtils.readFileSafe).mockResolvedValue(
      '## Contributing\n\n' + 'a'.repeat(200) + '\n\n## Setup / Install\nnpm i\n\n## Pull Request Process\nSend it.'
    )
    const check = weaknessChecks.find(c => c.id === 'contributing-weak')!
    const result = await check.run('/fake')
    expect(result.passed).toBe(true)
  })

  it('detects a weak SECURITY.md', async () => {
    vi.mocked(fsUtils.readFileSafe).mockResolvedValue('## Security\nDo not hack us.')
    const check = weaknessChecks.find(c => c.id === 'security-weak')!
    const result = await check.run('/fake')
    expect(result.passed).toBe(false)
  })
})
