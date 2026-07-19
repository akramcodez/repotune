# Phase 5 — Remaining Commands & Polish

> **Goal:** Complete the full command surface (`explain`, `ci`, `badge`), harden cross-platform behavior, and prepare for public release.

---

## Deliverables

- [ ] `repokit explain <topic>` — educational command
- [ ] `repokit ci` — workflow generation with inline rationale
- [ ] `repokit badge` — score badge generation
- [ ] `repokit doctor --fix` — no-prompt automation mode for safe fixes
- [ ] Cross-platform testing (Windows path handling, permissions)
- [ ] Performance audit — cold start < 200ms
- [ ] Release prep: README, npm publish hardening, changelog

---

## 1. `repokit doctor --fix`

### Purpose

People love automation. Requiring approval on every single action is the right default — but power users running this in CI or across many repos want a no-prompt mode for safe, mechanical fixes.

### Usage

```bash
repokit doctor --fix
```

### Output

```
Applying safe fixes...

✓ SECURITY.md             — generated
✓ CONTRIBUTING.md          — generated
✓ Issue Template            — generated
✓ PR Template               — generated
✓ License year              — updated 2022 → 2026
✓ CI badge URL              — updated to match current workflow
✓ Package manager           — updated yarn → pnpm in README
✓ Node version in CI        — updated 18 → 22

Repository Score   61 → 94

Done. 8 fixes applied.
```

### Safe vs unsafe fixes

Not all fixes qualify for `--fix`. The rule:

| Fix type | `--fix` eligible? | Why |
|---|---|---|
| Generate missing file (AI) | ❌ No | Requires provider config + approval |
| Update license year | ✅ Yes | Mechanical, single-line change |
| Fix package manager in README | ✅ Yes | Deterministic string replacement |
| Fix Node version in CI yaml | ✅ Yes | Deterministic value swap |
| Update stale CI badge URL | ✅ Yes | URL string replacement |
| Add `description` to package.json | ✅ Yes | Adds empty string user fills in |
| Rewrite CONTRIBUTING.md (AI) | ❌ No | Content judgment required |
| Fix broken README examples | ❌ No | Requires understanding of the code |

**Rule of thumb:** `--fix` only runs checks where the fix is a deterministic string replacement with no ambiguity. AI-generated content always requires explicit approval.

### Implementation

Each check that is `--fix` eligible exposes a `fix` method alongside `run`:

```ts
export interface Check {
  id: string
  run(dir: string): Promise<CheckResult>
  fix?(dir: string): Promise<FixResult>   // optional — only for safe mechanical fixes
}

export interface FixResult {
  applied: boolean
  description: string   // e.g. 'Updated yarn → pnpm in README.md'
}
```

The `--fix` flag collects all checks where `fix` is defined, runs them in sequence, prints a summary.

```ts
// src/commands/doctor.ts
if (opts.fix) {
  const fixable = results.filter(r => !r.passed && r.check.fix)
  for (const item of fixable) {
    const result = await item.check.fix!(dir)
    if (result.applied) log.success(result.description)
  }
  return
}
```

---

## 2. `repokit explain <topic>`

### Purpose

Explains what a repo health file is, why it matters, and offers to generate it. Educational, not action-oriented.

### Usage

```bash
repokit explain security
repokit explain contributing
repokit explain ci
repokit explain license
```

### Output format

```
Security Policy

Purpose
  A SECURITY.md file tells security researchers how to
  responsibly disclose vulnerabilities in your project.

Benefits
  ✓ GitHub Security tab support
  ✓ Reduces bad-faith public disclosure
  ✓ Builds trust with enterprise users

GitHub native support?
  Yes — GitHub reads SECURITY.md and displays it on the
  Security tab automatically.

Example
  # Security Policy

  ## Reporting a Vulnerability
  Please email security@yourproject.com ...

Generate one?
  Run: repokit doctor
```

### Implementation (`src/commands/explain.ts`)

The explanations are **local — no AI required**. They're static content bundled with the CLI (a plain JSON/TS object). This keeps the command fast and offline.

```ts
// src/data/explanations.ts
export const EXPLANATIONS: Record<string, Explanation> = {
  security: {
    title: 'Security Policy',
    purpose: '...',
    benefits: ['GitHub Security tab support', '...'],
    githubNative: true,
    example: '# Security Policy\n...',
    generateCommand: 'repokit doctor',
  },
  contributing: { ... },
  ci: { ... },
  license: { ... },
  changelog: { ... },
  'code-of-conduct': { ... },
}
```

Available topics: `security`, `contributing`, `license`, `changelog`, `ci`, `code-of-conduct`, `funding`, `pr-template`, `issue-template`

If an unknown topic is passed:

```
Unknown topic: 'foo'

Available topics:
  security, contributing, license, changelog, ci,
  code-of-conduct, funding, pr-template, issue-template
```

---

## 2. `repokit ci`

### Purpose

Generate GitHub Actions workflow files with inline explanations of each option. Users shouldn't be ticking boxes blind.

### Usage

```bash
repokit ci
```

### Workflow selection prompt

```
Select workflows to generate

◉ GitHub CI         — runs your test suite on every push/PR
◉ Release           — auto-publishes a GitHub release on tag push
○ CodeQL            — GitHub's free static security scanning
○ Dependabot        — automated dependency update PRs
◉ Renovate          — alternative to Dependabot, more configurable
○ Stale bot         — auto-closes stale issues after 30 days
```

Multi-select via `@clack/prompts` multiselect.

### Generated files

| Workflow | Output path |
|---|---|
| GitHub CI | `.github/workflows/ci.yml` |
| Release | `.github/workflows/release.yml` |
| CodeQL | `.github/workflows/codeql.yml` |
| Dependabot | `.github/dependabot.yml` |
| Renovate | `renovate.json` |
| Stale bot | `.github/workflows/stale.yml` |

### Workflow templates

Templates are **local, static** — bundled in the CLI. No AI needed for basic CI generation.

```ts
// src/data/workflows.ts
export const WORKFLOWS: Record<string, WorkflowTemplate> = {
  ci: {
    label: 'GitHub CI',
    rationale: 'Runs your test suite on every push/PR',
    outputPath: '.github/workflows/ci.yml',
    template: `
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run test:all
`.trim(),
  },
  // ...
}
```

If the repo uses `pnpm` or `yarn`, the template auto-adjusts the cache key and install command (detected via lockfile presence).

### Output

```
✓ .github/workflows/ci.yml
✓ .github/workflows/release.yml
✓ renovate.json
```

---

## 3. `repokit badge`

### Purpose

Generate a markdown badge showing the current repository score that users can paste into their README.

### Usage

```bash
repokit badge
```

### Output

```
Repository Quality
91 / 100

Badge markdown:
[![RepoKit Score](https://img.shields.io/badge/RepoKit-91%2F100-brightgreen)](https://github.com/your-org/repokit)

Copied to clipboard.

Paste into your README:
  [![RepoKit Score](https://img.shields.io...)]
```

### Implementation

```ts
// src/commands/badge.ts
import { runChecks } from '../checks/index.js'
import { computeScore } from '../checks/score.js'

export async function runBadge(dir: string) {
  const results = await runChecks(dir)
  const score = computeScore(results)

  const color = score >= 90 ? 'brightgreen'
              : score >= 70 ? 'yellow'
              : 'red'

  const url = `https://img.shields.io/badge/RepoKit-${score}%2F100-${color}`
  const badge = `[![RepoKit Score](${url})](https://github.com/your-org/repokit)`

  console.log(badge)

  // Attempt clipboard copy (graceful fallback if not available)
  try {
    await copyToClipboard(badge)
    console.log('\nCopied to clipboard.')
  } catch {
    console.log('\nCopy the badge above manually.')
  }
}
```

Clipboard support via `execa` + platform-appropriate commands (`pbcopy`, `xclip`, `clip.exe`).

---

## 4. Cross-Platform Hardening

### Windows-specific issues to address

| Issue | Fix |
|---|---|
| Path separators | Use `path.join()` and `path.posix` throughout, never string concat |
| `chmod 0o600` | Windows has no chmod — wrap in `process.platform !== 'win32'` guard |
| Shebang line | `#!/usr/bin/env node` works on Unix; Windows uses `.cmd` wrapper from npm |
| Clipboard | Use `clip.exe` on Windows |
| ANSI colors | Test in Windows Terminal and CMD; `@clack/prompts` handles this reasonably well |
| Line endings | Normalize to LF on write, never let CRLF sneak into generated files |

### File permission guard

```ts
function setSecurePermissions(filepath: string): void {
  if (process.platform !== 'win32') {
    chmodSync(filepath, 0o600)
  }
  // On Windows: config directory is already user-scoped via %APPDATA%
  // so ACL restriction isn't needed at the file level
}
```

### Testing on Windows

- Add a GitHub Actions job: `runs-on: windows-latest`
- Test all commands against a fixture repo
- Test path handling specifically (slashes, drive letters)

---

## 5. Performance Audit

Target: cold start under **200ms** for `repokit scan`.

### How to measure

```bash
time npx repokit scan    # cold (downloading)
time node dist/index.js scan  # warm (local build)
```

### Common slowdowns to watch for

| Issue | Fix |
|---|---|
| Large bundle size | Check `tsup` output, ensure no accidental dep inclusion |
| `node_modules` resolution at runtime | Should be zero — everything is bundled |
| Eager initialization | Lazy-load heavy modules only when their command runs |
| `await` at top level unnecessarily | Move to command-level init |

### Lazy loading pattern

```ts
// src/index.ts — only import scan eagerly; defer others
cli.command('doctor').action(async (...args) => {
  const { runDoctor } = await import('./commands/doctor.js')
  await runDoctor(...args)
})
```

This matters most for `doctor` since it imports adapter logic that isn't needed for `scan`.

---

## 6. Release Preparation

### README structure

```
# RepoKit

> Health-check and improve your open source repositories — fast, offline-first, AI-optional.

## Install
## Quick Start
## Commands
  - scan
  - doctor
  - config
  - explain
  - ci
  - badge
## Privacy
## Providers
## Contributing
## License
```

### `package.json` publish fields

```json
{
  "files": ["dist", "README.md", "LICENSE"],
  "engines": { "node": ">=18" },
  "keywords": ["cli", "open-source", "repository", "health", "ai"],
  "repository": { "type": "git", "url": "https://github.com/your-org/repokit" }
}
```

### npm publish checklist

- [ ] `npm run test:all` passes
- [ ] `npm run build` produces clean `dist/index.js`
- [ ] `node dist/index.js --version` prints correct version
- [ ] `node dist/index.js --help` shows all commands
- [ ] `npx repokit@latest scan` works from a cold install
- [ ] Bundle size < 500KB
- [ ] No private keys, tokens, or test fixtures in published files

### Versioning

Follow semver strictly:
- Phase 1 → `0.1.0`
- Phase 2 → `0.2.0`
- Phase 3 → `0.3.0`
- Phase 4 → `0.4.0`
- Phase 5 → `1.0.0` (first stable release)

---

## 7. Tests

```
tests/
├── commands/
│   ├── explain.test.ts     # topic lookup, unknown topic handling
│   ├── ci.test.ts          # template output, package manager detection
│   └── badge.test.ts       # score → badge URL generation
├── cross-platform/
│   └── paths.test.ts       # path separator handling
└── performance/
    └── startup.test.ts     # startup time assertion (optional)
```

---

## 8. Definition of Done for Phase 5

- [ ] `repokit explain <topic>` works for all 9 topics, offline
- [ ] `repokit ci` generates correct workflow YAML for CI + Release at minimum
- [ ] CI template adjusts install command based on detected package manager
- [ ] `repokit badge` outputs correct shields.io URL and copies to clipboard
- [ ] All commands tested on Ubuntu, macOS, and Windows (via CI matrix)
- [ ] Cold start under 200ms (measured on CI runner)
- [ ] README is publish-ready
- [ ] `1.0.0` tagged and published to npm

---

## What's out of scope for Phase 5

- Telemetry → Phase 6
- Hosted dashboard → Phase 6
