# Phase 3 — Existing-File Fixes & Diff UX

> **Goal:** Extend `repokit doctor` to detect **outdated or weak existing files**, not just missing ones.  
> Every change to an existing file must be shown as a scoped diff before the user approves it.  
> The AI must never silently overwrite content the user wrote by hand.

---

## Deliverables

- [ ] Detection logic for outdated / weak existing files
- [ ] Diff-based approval prompts using the `diff` package
- [ ] Scoped-section edit vs. full-rewrite choice per file
- [ ] Per-action data disclosure that includes file contents when needed
- [ ] Extended doctor session loop (3 categories: missing, outdated, weak)
- [ ] Tests for diff rendering and detection heuristics

---

## 1. Three-Category Model

```
Missing files          → Generate from scratch (Phase 2)
Outdated files         → Stale section detected, rewrite that section only
Weak files             → File exists but is low-quality, offer to expand
```

All three categories surface in a single `repokit doctor` run, grouped:

```
🔍 Analyzing repository...

Missing files          3
Outdated files         2
Weak / low-quality     1

Found 6 improvements.

Review each?

❯ Yes
  Fix everything
  Cancel
```

---

## 2. Detection Heuristics

### Outdated file detection (`src/checks/staleness.ts`)

An existing file is flagged as **outdated** if it contains references that contradict the current repo state. Heuristics for Phase 3:

| Signal | How to detect |
|---|---|
| Wrong package manager | README mentions `yarn install` but `package.json` has `packageManager: pnpm` |
| Wrong Node version | README mentions Node 14 but `.nvmrc` or `engines` says 18+ |
| Wrong install command | Docs say `npm install` but `pnpm-lock.yaml` or `yarn.lock` exists |
| Dead badge URLs | Shield.io badges that reference a branch or workflow name that no longer exists |
| Outdated CI badge | Badge references a workflow file that was renamed or deleted |

Implementation approach:
1. Read the file
2. Build a "facts" object from the repo (package manager, node version, workflow file names)
3. Scan the file for contradictions with those facts
4. Flag if any contradiction is found

```ts
// src/checks/staleness.ts
export interface StalenessResult {
  file: string
  issues: StalenessIssue[]
}

export interface StalenessIssue {
  description: string        // human-readable: "install steps reference yarn but repo uses pnpm"
  affectedLines?: number[]   // if we can narrow it down
}
```

### Weak file detection (`src/checks/weakness.ts`)

A file is flagged as **weak** based on simple heuristics:

| File | Weak if... |
|---|---|
| `CONTRIBUTING.md` | Under 200 chars, or missing major sections (Setup, PR process) |
| `SECURITY.md` | Under 150 chars, or no email/contact info |
| `CODE_OF_CONDUCT.md` | Under 100 chars (likely a stub) |
| `CHANGELOG.md` | No semver entries or no dates |

```ts
// src/checks/weakness.ts
export async function checkWeakness(file: string, content: string): Promise<boolean> {
  // per-file heuristics
}
```

---

## 3. Diff-Based Approval Prompts

### The diff package

```ts
import { createPatch } from 'diff'

const patch = createPatch(
  'README.md',
  originalContent,
  updatedContent,
  'original',
  'updated'
)
```

### Rendering colored diffs in terminal (`src/ui/diff.ts`)

```ts
import { parsePatch } from 'diff'

export function renderDiff(original: string, updated: string, filename: string): string {
  const lines: string[] = []

  // Use @clack/prompts colors or ANSI directly
  for (const line of diffLines(original, updated)) {
    if (line.added)   lines.push(`\x1b[32m+ ${line.value.trimEnd()}\x1b[0m`)
    else if (line.removed) lines.push(`\x1b[31m- ${line.value.trimEnd()}\x1b[0m`)
    else lines.push(`  ${line.value.trimEnd()}`)
  }

  return lines.join('\n')
}
```

### Scoped diff prompt

For an **outdated** file, the prompt shows only the affected section:

```
────────────────────────────────────────
README.md   [update]

Why?
  Your install instructions reference `yarn`, but the repo
  migrated to `pnpm` in the last 3 commits. This section is
  now incorrect for new contributors.

What gets sent to OpenAI:
  • The full current contents of README.md
  • package.json (to confirm the current package manager)

Preview (diff — only the affected section changes)
  ## Installation

- yarn install
- yarn dev
+ pnpm install
+ pnpm dev

Actions
❯ Allow             (apply this section only)
  Allow (rewrite whole file)
  Deny
  Allow All (this run)
────────────────────────────────────────
```

For a **weak** file, the prompt shows the full expansion diff:

```
────────────────────────────────────────
CONTRIBUTING.md   [expand]

Why?
  Your CONTRIBUTING.md is a one-line stub. Contributors
  can't tell how to set up the project or submit PRs.

What gets sent to OpenAI:
  • The full current contents of CONTRIBUTING.md
  • package.json

Preview (diff — additions only, nothing removed)
+ ## Setup
+ 
+ 1. Clone the repo
+ 2. Run `pnpm install`
+ ...

Actions
❯ Allow
  Deny
  Allow All (this run)
────────────────────────────────────────
```

---

## 4. Extended Doctor Session Loop

```ts
// src/ui/doctor-session.ts (updated)

export async function runDoctorSession(
  dir: string,
  missing: CheckResult[],
  outdated: StalenessResult[],
  weak: WeaknessResult[]
) {
  const adapter = getAdapter()
  let allowAll = false

  // Group 1: Missing files (Phase 2 logic, unchanged)
  for (const check of missing) { ... }

  // Group 2: Outdated files
  for (const item of outdated) {
    if (!allowAll) {
      const action = await showUpdatePrompt(item, adapter.name)
      if (action === 'deny') continue
      if (action === 'allow-all') allowAll = true
      if (action === 'rewrite') {
        // Full rewrite path
        await applyFullRewrite(dir, item, adapter)
        continue
      }
    }
    // Scoped patch path
    await applyScopedPatch(dir, item, adapter)
  }

  // Group 3: Weak files
  for (const item of weak) {
    if (!allowAll) {
      const action = await showExpandPrompt(item, adapter.name)
      if (action === 'deny') continue
      if (action === 'allow-all') allowAll = true
    }
    await applyExpansion(dir, item, adapter)
  }

  outro('✔ Done.')
}
```

---

## 5. AI Prompts for Existing-File Edits

### Scoped patch prompt

```ts
function buildScopedPatchPrompt(issue: StalenessIssue, currentContent: string): string {
  return `
You are editing an existing file. Fix ONLY the issue described below.
Do NOT rewrite sections unrelated to this issue.
Do NOT add or remove sections the user didn't ask to change.
Return ONLY the corrected section, surrounded by the exact surrounding context lines (3 lines before, 3 after).

Issue: ${issue.description}

Current file contents:
${currentContent}
`.trim()
}
```

### Full expansion prompt

```ts
function buildExpansionPrompt(filename: string, currentContent: string): string {
  return `
You are improving an existing but weak ${filename}.
Preserve all existing content. Append or expand sections that are missing or too brief.
Do NOT remove content the user wrote.
Return the FULL updated file contents.

Current file contents:
${currentContent}
`.trim()
}
```

---

## 6. Apply Strategies

### Scoped patch

1. Ask AI for the corrected section (with surrounding context)
2. Use string replacement to apply only that section
3. Show diff of full file before/after for confirmation

### Full rewrite

1. Ask AI to rewrite entire file
2. Show full diff before applying
3. Write to disk only after user confirms

---

## 7. Data Disclosure — Updated Rules

| Action | What's sent |
|---|---|
| Missing file generation | File tree + package.json only |
| Scoped section update | Full current file contents + package.json |
| Full file rewrite | Full current file contents + package.json |
| Weak file expansion | Full current file contents + package.json |

This is shown explicitly in every prompt — never hidden.

---

## 8. Tests

```
tests/
├── checks/
│   ├── staleness.test.ts     # outdated detection heuristics
│   └── weakness.test.ts      # weak file detection
├── ui/
│   └── diff.test.ts          # diff rendering, colored output
└── commands/
    └── doctor-phase3.test.ts # full session loop with all 3 categories
```

### Staleness detection test example

```ts
describe('staleness check', () => {
  it('detects yarn reference when repo uses pnpm', async () => {
    const content = '## Install\n\nyarn install\nyarn dev'
    const facts = { packageManager: 'pnpm' }
    const result = await checkStaleness(content, facts)
    expect(result.issues.length).toBeGreaterThan(0)
    expect(result.issues[0].description).toMatch(/yarn/)
  })
})
```

---

## 9. Definition of Done for Phase 3

- [ ] Outdated file detection works for at least: wrong package manager, wrong Node version
- [ ] Weak file detection works for: CONTRIBUTING.md stub, SECURITY.md stub
- [ ] Diff is rendered in terminal with color (green additions, red removals)
- [ ] "Allow (section only)" applies scoped patch without touching unrelated content
- [ ] "Allow (rewrite whole file)" replaces the entire file after confirmation
- [ ] Data disclosure messaging updated to show file contents when editing existing files
- [ ] All new detection logic is unit tested with mocked file system
- [ ] `test:all` passes clean

---

## What's out of scope for Phase 3

- Additional AI providers → Phase 4
- `repokit explain`, `repokit ci`, `repokit badge` → Phase 5
- Telemetry → Phase 6
