import path from 'path'
import type { Check } from './types.js'
import { pass, fail } from './types.js'
import { readFileSafe } from '../utils/fs.js'

export const weaknessChecks: Check[] = [
  {
    id: 'contributing-weak',
    label: 'CONTRIBUTING.md depth',
    category: 'documentation',
    weight: 2,
    async run(dir) {
      const content = await readFileSafe(path.join(dir, 'CONTRIBUTING.md'))
      if (content === null) return pass(this) // Missing files handled by missing checks
      
      if (content.length < 200) {
        return fail(this, 'CONTRIBUTING.md is too short (stub)', undefined, 'CONTRIBUTING.md')
      }
      if (!/setup|install|getting started/i.test(content)) {
        return fail(this, 'CONTRIBUTING.md is missing a setup/installation section', undefined, 'CONTRIBUTING.md')
      }
      if (!/pull request|pr|submit/i.test(content)) {
        return fail(this, 'CONTRIBUTING.md is missing PR instructions', undefined, 'CONTRIBUTING.md')
      }
      return pass(this)
    }
  },

  {
    id: 'security-weak',
    label: 'SECURITY.md depth',
    category: 'documentation',
    weight: 3,
    async run(dir) {
      const content = await readFileSafe(path.join(dir, 'SECURITY.md'))
      if (content === null) return pass(this)
      
      if (content.length < 150) {
        return fail(this, 'SECURITY.md is too short (stub)', undefined, 'SECURITY.md')
      }
      if (!/@|\w+:\/\//.test(content) && !/email|contact/i.test(content)) {
        return fail(this, 'SECURITY.md appears to be missing contact/reporting instructions', undefined, 'SECURITY.md')
      }
      return pass(this)
    }
  },

  {
    id: 'code-of-conduct-weak',
    label: 'CODE_OF_CONDUCT.md depth',
    category: 'community',
    weight: 2,
    async run(dir) {
      const content = await readFileSafe(path.join(dir, 'CODE_OF_CONDUCT.md'))
      if (content === null) return pass(this)
      
      if (content.length < 100) {
        return fail(this, 'CODE_OF_CONDUCT.md is too short (stub)', undefined, 'CODE_OF_CONDUCT.md')
      }
      return pass(this)
    }
  },

  {
    id: 'changelog-weak',
    label: 'CHANGELOG.md depth',
    category: 'documentation',
    weight: 1,
    async run(dir) {
      const content = await readFileSafe(path.join(dir, 'CHANGELOG.md'))
      if (content === null) return pass(this)
      
      if (content.length < 50) {
        return fail(this, 'CHANGELOG.md is too short', undefined, 'CHANGELOG.md')
      }
      // Simple heuristic for dates or semver:
      // Looking for ## [1.0.0] or ## 2024-01-01
      if (!/\[?\d+\.\d+\.\d+\]?/.test(content) && !/\d{4}-\d{2}-\d{2}/.test(content)) {
        return fail(this, 'CHANGELOG.md is missing semver versions or dates', undefined, 'CHANGELOG.md')
      }
      return pass(this)
    }
  },

  {
    id: 'readme-weak',
    label: 'README quality',
    category: 'documentation',
    weight: 4,
    async run(dir) {
      const content = await readFileSafe(path.join(dir, 'README.md'))
      if (content === null) return pass(this) // existence checked by docs check

      // ── Signal definitions ────────────────────────────────────────────────
      // Two-tier evaluation:
      //   Tier 1 — Hard-fail gates: any one of these failing causes an immediate
      //            failure regardless of the weighted sub-score.
      //   Tier 2 — Weighted sub-score: remaining signals scored 0-100;
      //            must reach PASS_THRESHOLD to pass.
      // All failing signals (both tiers) are reported in the issue message.

      interface Signal {
        weight: number
        label: string
        passes: boolean
        hardFail: boolean   // true → single failure is disqualifying
      }

      const lines = content.split('\n')
      const nonEmptyLines = lines.filter((l) => l.trim().length > 0)
      const headingLines = nonEmptyLines.filter((l) => /^#{1,4}\s/.test(l))
      const badgeLines   = nonEmptyLines.filter((l) => /^!\[/.test(l.trim()) || /^\[!\[/.test(l.trim()))

      // Signal 1 — Minimum length (>= 300 chars, stripping headings & code fences)
      const textLength = content.replace(/^#{1,4}[^\n]*/gm, '').replace(/```[\s\S]*?```/g, '').trim().length
      const hasMinLength = textLength >= 300

      // Signal 2 — Installation / Getting Started section heading
      const hasInstall = /^#{1,4}\s.*(install|getting.?started|setup|quick.?start)/im.test(content)

      // Signal 3 — Usage / Example section heading
      const hasUsage = /^#{1,4}\s.*(usage|example|how.?to|demo|tutorial)/im.test(content)

      // Signal 4 [HARD] — At least one fenced code block or indented block
      const hasCodeBlock = /```[\s\S]*?```/.test(content) || /^    \S/m.test(content)

      // Signal 5 [HARD] — No unfilled template placeholders or excessive TODOs
      const PLACEHOLDER_PATTERNS = [
        // Bracket placeholders: [your-project-name], [your-repo-name], [your-username], etc.
        /\[your[- _][\w-]+\]/i,
        // Moustache / handlebars: {{project_name}}, {{ name }}, {repo}
        /\{\{?\s*[\w_-]+\s*\}?\}/i,
        // Angle bracket placeholders: <your-name>, <your-email>, <project>
        /<your[- _]?[\w-]+>/i,
        // Generic "insert X here" instruction
        /insert .{0,40} here/i,
        // Common stub phrases
        /coming soon/i,
        /lorem ipsum/i,
      ]
      const todoCount = (content.match(/\bTODO\b/g) ?? []).length
      const hasNoPlaceholders =
        !PLACEHOLDER_PATTERNS.some((p) => p.test(content)) && todoCount <= 2

      // Signal 6 [HARD] — Not badge-only (badges < 50% of non-empty lines)
      const badgeRatio = nonEmptyLines.length === 0 ? 0 : badgeLines.length / nonEmptyLines.length
      const isNotBadgeOnly = badgeRatio < 0.5

      // Signal 7 [HARD] — Not a heading skeleton (headings < 40% of non-empty lines when > 3 headings)
      const isNotHeadingSkeleton =
        headingLines.length <= 3 ||
        headingLines.length / nonEmptyLines.length < 0.4

      const signals: Signal[] = [
        { weight: 20, label: 'README has meaningful content (≥300 chars)',          passes: hasMinLength,        hardFail: false },
        { weight: 20, label: 'has an Installation or Getting Started section',       passes: hasInstall,          hardFail: false },
        { weight: 15, label: 'has a Usage or Example section',                       passes: hasUsage,            hardFail: false },
        { weight: 15, label: 'has at least one code block',                          passes: hasCodeBlock,        hardFail: true  },
        { weight: 20, label: 'no unfilled template placeholders or excessive TODOs', passes: hasNoPlaceholders,   hardFail: true  },
        { weight:  5, label: 'not badge-only (real content beyond badges)',          passes: isNotBadgeOnly,      hardFail: true  },
        { weight:  5, label: 'not a heading skeleton (has prose under headings)',    passes: isNotHeadingSkeleton, hardFail: true },
      ]

      const PASS_THRESHOLD = 0.6 // 60% of weighted points needed to pass

      const totalWeight  = signals.reduce((s, sig) => s + sig.weight, 0)
      const earnedWeight = signals.filter((sig) => sig.passes).reduce((s, sig) => s + sig.weight, 0)
      const subScore     = earnedWeight / totalWeight

      const failingSignals  = signals.filter((sig) => !sig.passes)
      const hardFailed      = failingSignals.some((sig) => sig.hardFail)

      if (!hardFailed && subScore >= PASS_THRESHOLD) return pass(this)

      // Surface all failing signals in the issue message
      const issue = `README quality score ${Math.round(subScore * 100)}/100 — missing: ${failingSignals.map((s) => s.label).join('; ')}`

      return fail(this, issue, 'Improve README with repotune doctor', 'README.md')
    },
  },
]
