# Phase 1 — Core Scan (No AI, No Network)

> **Goal:** Ship something genuinely useful with zero setup. Validate the UX loop.  
> A user should be able to `npx repokit scan` in any repo and get immediate, meaningful output — no config, no API key, no account.

---

## Deliverables

- [ ] Project scaffold with full toolchain wired up
- [ ] `repokit scan` command — deterministic, offline-only
- [ ] Scoring algorithm (weighted checklist)
- [ ] Terminal output formatter
- [ ] Unit tests for all check logic

---

## 1. Project Scaffold

### Files to create

```
package.json          # scripts, deps, bin entrypoint
tsconfig.json         # strict mode, ESM, Node 18+
tsup.config.ts        # single-file bundle output
prettier.config.mjs   # formatting config
eslint.config.mjs     # typescript-eslint flat config
vitest.config.ts      # test runner config
src/index.ts          # CLI entrypoint
```

### `package.json` shape

```json
{
  "name": "repokit",
  "version": "0.1.0",
  "type": "module",
  "bin": { "repokit": "./dist/index.js" },
  "scripts": {
    "build":          "tsup",
    "dev":            "tsup --watch",
    "typecheck":      "tsc --noEmit",
    "lint":           "eslint src",
    "format":         "prettier --write src",
    "format:check":   "prettier --check src",
    "test":           "vitest run",
    "test:watch":     "vitest",
    "test:all":       "npm run typecheck && npm run lint && npm run test",
    "prepublishOnly": "npm run test:all && npm run build"
  },
  "dependencies": {
    "cac":            "^6.x",
    "@clack/prompts": "^0.x",
    "fast-glob":      "^3.x"
  },
  "devDependencies": {
    "typescript":             "^5.x",
    "tsup":                   "^8.x",
    "vitest":                 "^1.x",
    "eslint":                 "^9.x",
    "@typescript-eslint/eslint-plugin": "^7.x",
    "@typescript-eslint/parser":        "^7.x",
    "prettier":               "^3.x"
  }
}
```

### `src/index.ts` — CLI entrypoint

```ts
#!/usr/bin/env node
import { cac } from 'cac'
import { runScan } from './commands/scan.js'

const cli = cac('repokit')

cli
  .command('scan [dir]', 'Scan a repository for missing health files')
  .option('--json', 'Output results as JSON')
  .action(async (dir = '.', options) => {
    await runScan(dir, options)
  })

cli.help()
cli.version('0.1.0')
cli.parse()
```

---

## 2. Check System

### Architecture

All checks are **pure functions** — they take a directory path and return a structured result. No side effects, no network, no process.exit inside them.

```ts
// src/checks/types.ts
export interface CheckResult {
  id: string         // e.g. 'readme', 'security', 'pkg-manager-mismatch'
  label: string      // human-readable name
  category: CheckCategory
  passed: boolean
  weight: number     // 1–3, used for scoring
  issue?: string     // specific problem found, shown in output
  hint?: string      // what to do if it fails
}

export type CheckCategory = 'documentation' | 'automation' | 'community' | 'consistency'
```

### Checks to implement in Phase 1

#### Documentation checks (`src/checks/docs.ts`)

| Check ID | What it looks for | Weight |
|---|---|---|
| `readme` | `README.md` or `README` at repo root | 3 |
| `license` | `LICENSE`, `LICENSE.md`, `LICENSE.txt` | 3 |
| `contributing` | `CONTRIBUTING.md` | 2 |
| `security` | `SECURITY.md` or `.github/SECURITY.md` | 2 |
| `changelog` | `CHANGELOG.md` or `CHANGELOG` | 1 |
| `code-of-conduct` | `CODE_OF_CONDUCT.md` | 1 |

#### Automation checks (`src/checks/automation.ts`)

| Check ID | What it looks for | Weight |
|---|---|---|
| `ci` | Any `.yml`/`.yaml` in `.github/workflows/` | 3 |
| `release-workflow` | workflow file containing `release` or `publish` | 2 |
| `dependabot` | `.github/dependabot.yml` | 1 |

#### Community checks (`src/checks/community.ts`)

| Check ID | What it looks for | Weight |
|---|---|---|
| `issue-template` | `.github/ISSUE_TEMPLATE/` directory or `.github/issue_template.md` | 2 |
| `pr-template` | `.github/PULL_REQUEST_TEMPLATE.md` or `.github/pull_request_template.md` | 2 |
| `funding` | `.github/FUNDING.yml` | 1 |

### Check registry (`src/checks/index.ts`)

```ts
import { docChecks }        from './docs.js'
import { automationChecks } from './automation.js'
import { communityChecks }  from './community.js'
import { consistencyChecks } from './consistency.js'

export const ALL_CHECKS = [
  ...docChecks,
  ...automationChecks,
  ...communityChecks,
  ...consistencyChecks,   // ← smart analysis, Phase 1
]

export async function runChecks(dir: string): Promise<CheckResult[]> {
  return Promise.all(ALL_CHECKS.map(check => check.run(dir)))
}
```

---

## 3. Smart Analysis Checks (`src/checks/consistency.ts`)

> This is the feature that turns "it's just a checklist" into **"whoa"**.

All of these are **100% deterministic, offline, no AI needed**. They read files locally and cross-reference them against each other. This is what gets the demo to feel genuinely intelligent.

| Check ID | What it detects | How | Weight |
|---|---|---|---|
| `pkg-manager-mismatch` | README says `yarn install` but `pnpm-lock.yaml` or `bun.lockb` exists | Read README, detect install command, check lockfiles | 3 |
| `node-version-mismatch` | `.github/workflows/*.yml` pins Node 18 but `package.json#engines` says `>=22` | Parse CI yaml, parse `engines` field | 2 |
| `stale-ci-badge` | README badge references a `.yml` workflow file that no longer exists in `.github/workflows/` | Extract badge URLs from README, compare to actual workflow filenames | 3 |
| `license-year-stale` | `LICENSE` still shows year from 2+ years ago | Read LICENSE, extract year, compare to current year | 1 |
| `missing-keywords` | `package.json` has no `keywords` array (or it's empty) | Read package.json | 1 |
| `old-repo-name` | README or docs reference a repo name that doesn't match `package.json#name` or `repository.url` | String match on old name patterns | 2 |
| `broken-node-badge` | Node.js badge in README references a version range that contradicts `.nvmrc` | Parse `.nvmrc`, compare to badge URL | 1 |
| `empty-description` | `package.json` has no `description` field | Read package.json | 1 |

### Example output with smart checks

```
🔍 Scanning repository...

Documentation
  ✓ README
  ✓ LICENSE
  ✗ CONTRIBUTING
  ✗ SECURITY

Automation
  ✓ CI workflow
  ✗ Release workflow

Community
  ✗ Issue templates
  ✗ PR template

Consistency
  ✗ Package manager mismatch
      README says `yarn install` but repo uses pnpm
  ✗ Node version mismatch
      CI pins Node 18 but package.json requires >=22
  ✗ Stale CI badge
      README badge points to `build.yml` — file doesn't exist
  ✗ License year outdated
      LICENSE shows 2022 — it's 2026

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Repository Score   61 / 100
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This scan ran entirely offline - no files were sent anywhere.

Run `repokit doctor` to fix these issues.
```

### Implementation sketch

```ts
// src/checks/consistency.ts
import { readFile } from 'fs/promises'
import path from 'path'
import fg from 'fast-glob'

export const pkgManagerMismatchCheck = {
  id: 'pkg-manager-mismatch',
  label: 'Package manager consistency',
  category: 'consistency' as const,
  weight: 3,

  async run(dir: string): Promise<CheckResult> {
    const readme = await readFileSafe(path.join(dir, 'README.md'))
    if (!readme) return pass(this)

    const hasYarnRef  = /yarn (install|add|run)/i.test(readme)
    const hasNpmRef   = /npm install/i.test(readme)
    const hasPnpmLock = await fileExists(path.join(dir, 'pnpm-lock.yaml'))
    const hasBunLock  = await fileExists(path.join(dir, 'bun.lockb'))
    const hasYarnLock = await fileExists(path.join(dir, 'yarn.lock'))

    if (hasYarnRef && (hasPnpmLock || hasBunLock)) {
      const actual = hasPnpmLock ? 'pnpm' : 'bun'
      return fail(this, `README says \`yarn install\` but repo uses ${actual}`)
    }
    if (hasNpmRef && hasYarnLock) {
      return fail(this, 'README says `npm install` but repo uses yarn')
    }

    return pass(this)
  },
}
```

---

## 3. Scoring Algorithm

Simple weighted percentage — nothing fancy for Phase 1.

```ts
// src/checks/score.ts
export function computeScore(results: CheckResult[]): number {
  const total = results.reduce((sum, r) => sum + r.weight, 0)
  const earned = results.filter(r => r.passed).reduce((sum, r) => sum + r.weight, 0)
  return Math.round((earned / total) * 100)
}
```

| Score | Label |
|---|---|
| 90–100 | Excellent |
| 70–89 | Good |
| 50–69 | Needs work |
| 0–49 | Poor |

---

## 4. Terminal Output

### Grouped output format

See the example in **Section 3** above — the `Consistency` group is the key differentiator. Instead of just:

```
✗ SECURITY
```

Users see:

```
✗ Package manager mismatch
    README says `yarn install` but repo uses pnpm
✗ Node version mismatch
    CI pins Node 18 but package.json requires >=22
```

That's what turns this from a file-existence checker into something people screenshot.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Repository Score   73 / 100
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

This scan ran entirely offline - no files were sent anywhere.

Run `repokit doctor` to generate missing files.
```

### `--json` flag output

For piping / scripting:

```json
{
  "score": 73,
  "checks": [
    { "id": "readme", "passed": true, "category": "documentation" },
    { "id": "security", "passed": false, "category": "documentation" }
  ]
}
```

### Implementation (`src/commands/scan.ts`)

```ts
import { runChecks } from '../checks/index.js'
import { computeScore } from '../checks/score.js'
import { renderScanOutput } from '../ui/output.js'
import { intro, outro } from '@clack/prompts'

export async function runScan(dir: string, opts: { json?: boolean }) {
  if (!opts.json) intro('🔍 Scanning repository...')

  const results = await runChecks(dir)
  const score = computeScore(results)

  if (opts.json) {
    console.log(JSON.stringify({ score, checks: results }, null, 2))
    return
  }

  renderScanOutput(results, score)
  outro(`Run \`repokit doctor\` to generate missing files.`)
}
```

---

## 5. Tests

All tests are pure unit tests — no filesystem side effects. Tests use `vi.mock` for `fast-glob`.

```
tests/
├── checks/
│   ├── docs.test.ts        # each doc check individually
│   ├── automation.test.ts
│   └── community.test.ts
├── score.test.ts            # scoring math
└── output.test.ts           # output formatting (snapshot)
```

### Example test

```ts
// tests/checks/docs.test.ts
import { describe, it, expect, vi } from 'vitest'
import { readmeCheck } from '../../src/checks/docs.js'

vi.mock('fast-glob', () => ({
  default: {
    glob: vi.fn()
  }
}))

describe('readme check', () => {
  it('passes when README.md exists', async () => {
    fg.glob.mockResolvedValue(['README.md'])
    const result = await readmeCheck.run('/fake')
    expect(result.passed).toBe(true)
  })

  it('fails when no README exists', async () => {
    fg.glob.mockResolvedValue([])
    const result = await readmeCheck.run('/fake')
    expect(result.passed).toBe(false)
  })
})
```

### Run tests

```bash
npm run test           # single run
npm run test:watch     # watch mode
npm run test:all       # full gate: typecheck + lint + tests
```

---

## 6. Definition of Done for Phase 1

- [ ] `npx repokit scan` works in any directory
- [ ] All 13 checks implemented and tested
- [ ] `--json` flag works correctly
- [ ] Score displayed correctly
- [ ] `test:all` passes clean (no type errors, no lint warnings, no test failures)
- [ ] Formatted with Prettier (format:check passes in CI)
- [ ] Build produces a single `dist/index.js` with correct shebang
- [ ] Cold start time under 200ms (measure with `time npx repokit scan`)

---

## What's deliberately out of scope

- No AI, no network calls
- No `repokit config`
- No `repokit doctor`
- No file generation of any kind

These land in Phase 2.
