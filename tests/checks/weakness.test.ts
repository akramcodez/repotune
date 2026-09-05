import { describe, it, expect, vi, beforeEach } from 'vitest'
import { weaknessChecks } from '../../src/checks/weakness.js'
import * as fsUtils from '../../src/utils/fs.js'

vi.mock('../../src/utils/fs.js')

describe('weakness checks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ── contributing-weak ──────────────────────────────────────────────────────

  it('detects a weak CONTRIBUTING.md', async () => {
    vi.mocked(fsUtils.readFileSafe).mockResolvedValue('## Contributing\nJust send a PR.')
    const check = weaknessChecks.find((c) => c.id === 'contributing-weak')!
    const result = await check.run('/fake')
    expect(result.passed).toBe(false)
    expect(result.issue).toMatch(/too short|missing/)
  })

  it('passes a strong CONTRIBUTING.md', async () => {
    vi.mocked(fsUtils.readFileSafe).mockResolvedValue(
      '## Contributing\n\n' +
        'a'.repeat(200) +
        '\n\n## Setup / Install\nnpm i\n\n## Pull Request Process\nSend it.',
    )
    const check = weaknessChecks.find((c) => c.id === 'contributing-weak')!
    const result = await check.run('/fake')
    expect(result.passed).toBe(true)
  })

  // ── security-weak ──────────────────────────────────────────────────────────

  it('detects a weak SECURITY.md', async () => {
    vi.mocked(fsUtils.readFileSafe).mockResolvedValue('## Security\nDo not hack us.')
    const check = weaknessChecks.find((c) => c.id === 'security-weak')!
    const result = await check.run('/fake')
    expect(result.passed).toBe(false)
  })

  // ── readme-weak ────────────────────────────────────────────────────────────

  describe('readme-weak', () => {
    const getCheck = () => weaknessChecks.find((c) => c.id === 'readme-weak')!

    it('passes when README.md is missing (existence handled by docs check)', async () => {
      vi.mocked(fsUtils.readFileSafe).mockResolvedValue(null)
      const result = await getCheck().run('/fake')
      expect(result.passed).toBe(true)
    })

    it('fails a one-liner stub README', async () => {
      vi.mocked(fsUtils.readFileSafe).mockResolvedValue('# My Project\n')
      const result = await getCheck().run('/fake')
      expect(result.passed).toBe(false)
      expect(result.issue).toMatch(/README quality score \d+\/100/)
    })

    it('fails a README with [your-project-name] placeholder', async () => {
      const prose = 'This tool helps you manage tasks efficiently. '.repeat(6)
      const content = [
        '# [your-project-name]',
        prose,
        '## Installation',
        '```bash',
        'npm install my-project',
        '```',
        '## Usage',
        'Run it: `my-project start`',
        prose,
      ].join('\n')
      vi.mocked(fsUtils.readFileSafe).mockResolvedValue(content)
      const result = await getCheck().run('/fake')
      expect(result.passed).toBe(false)
      expect(result.issue).toMatch(/placeholder/)
    })

    it('fails a README with "coming soon" placeholder', async () => {
      const prose = 'This tool helps you manage tasks efficiently. '.repeat(6)
      const content = [
        '# My Project',
        prose,
        '## Installation',
        '```bash\nnpm install my-tool\n```',
        '## Usage',
        'Coming soon',
      ].join('\n')
      vi.mocked(fsUtils.readFileSafe).mockResolvedValue(content)
      const result = await getCheck().run('/fake')
      expect(result.passed).toBe(false)
      expect(result.issue).toMatch(/placeholder/)
    })

    it('fails a README with more than 2 TODOs', async () => {
      const prose = 'This is a real description. '.repeat(12)
      const content = `# My Project\n\n${prose}\n\n## Installation\nTODO\n\n## Usage\nTODO\n\nTODO: add examples`
      vi.mocked(fsUtils.readFileSafe).mockResolvedValue(content)
      const result = await getCheck().run('/fake')
      expect(result.passed).toBe(false)
      expect(result.issue).toMatch(/placeholder/)
    })

    it('fails a README with no code blocks', async () => {
      const prose = 'This tool manages your tasks in the terminal efficiently. '.repeat(6)
      const content = [
        '# My Project',
        prose,
        '## Installation',
        'Run the installer.',
        '## Usage',
        'Use it every day.',
        prose,
      ].join('\n')
      vi.mocked(fsUtils.readFileSafe).mockResolvedValue(content)
      const result = await getCheck().run('/fake')
      expect(result.passed).toBe(false)
      expect(result.issue).toMatch(/code block/)
    })

    it('fails a badge-only README', async () => {
      const badges = Array(12).fill('![CI](https://example.com/badge.svg)').join('\n')
      vi.mocked(fsUtils.readFileSafe).mockResolvedValue(`# My Project\n${badges}`)
      const result = await getCheck().run('/fake')
      expect(result.passed).toBe(false)
    })

    it('fails a heading-skeleton README (only headings, no body)', async () => {
      const content = [
        '# My Project',
        '## Installation',
        '## Usage',
        '## Configuration',
        '## API Reference',
        '## Contributing',
        '## License',
      ].join('\n')
      vi.mocked(fsUtils.readFileSafe).mockResolvedValue(content)
      const result = await getCheck().run('/fake')
      expect(result.passed).toBe(false)
    })

    it('reports sub-score percentage and failing signal labels in issue text', async () => {
      vi.mocked(fsUtils.readFileSafe).mockResolvedValue('# My Project\nShort.')
      const result = await getCheck().run('/fake')
      expect(result.passed).toBe(false)
      expect(result.issue).toMatch(/\d+\/100/)
      expect(result.issue).toMatch(/missing:/)
    })

    it('passes a high-quality README satisfying all signals', async () => {
      const prose = 'This tool helps you manage tasks efficiently in any Node.js project. '.repeat(
        6,
      )
      const content = [
        '# My Project',
        '',
        prose,
        '',
        '## Installation',
        '',
        '```bash',
        'npm install my-tool',
        '```',
        '',
        '## Usage',
        '',
        'Run the CLI with your config:',
        '',
        '```bash',
        'my-tool run --config ./config.json',
        '```',
        '',
        prose,
      ].join('\n')
      vi.mocked(fsUtils.readFileSafe).mockResolvedValue(content)
      const result = await getCheck().run('/fake')
      expect(result.passed).toBe(true)
    })

    it('passes a README that has "Getting Started" instead of "Installation"', async () => {
      const prose = 'This project does great things for your workflow. '.repeat(6)
      const content = [
        '# My Project',
        prose,
        '## Getting Started',
        '```bash\nnpm install\n```',
        '## Usage',
        'Use it like: `my-tool run`',
        prose,
      ].join('\n')
      vi.mocked(fsUtils.readFileSafe).mockResolvedValue(content)
      const result = await getCheck().run('/fake')
      expect(result.passed).toBe(true)
    })

    it('fails a README containing default framework boilerplate (e.g. Vite)', async () => {
      const content = [
        '# React + TypeScript + Vite',
        'This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.',
        'Currently, two official plugins are available:',
        '- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh',
        '- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh',
      ].join('\n')
      vi.mocked(fsUtils.readFileSafe).mockResolvedValue(content)
      const result = await getCheck().run('/fake')
      expect(result.passed).toBe(false)
      expect(result.issue).toMatch(/framework boilerplate/i)
    })
  })
})
