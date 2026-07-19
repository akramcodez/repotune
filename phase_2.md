# Phase 2 — Config & Single-Provider AI

> **Goal:** Add persistent config storage and wire up the first AI provider (OpenAI) end-to-end.  
> Deliver `repokit doctor` for **missing files only** — generating SECURITY.md, CONTRIBUTING.md, templates.  
> The approve/deny UX loop must feel polished before adding more providers.

---

## Deliverables

- [ ] `repokit config` — interactive provider setup with real key validation
- [ ] `conf`-based config store with typed schema
- [ ] OpenAI REST adapter (fetch only, no SDK)
- [ ] `repokit doctor` — missing files only (Phase 2 scope)
- [ ] Approve / Deny / Allow-All prompt flow via `@clack/prompts`
- [ ] Per-action data disclosure messaging
- [ ] New deps: `conf`, `diff`

---

## 1. New Dependencies

```bash
npm install conf diff
```

| Package | Why added now |
|---|---|
| `conf` | Persistent config storage for provider + API key |
| `diff` | Diff rendering in doctor prompts (used from Phase 3 onwards for existing-file edits, but install it now) |

---

## 2. Config Store

### Schema (`src/config/store.ts`)

```ts
import Conf from 'conf'

export interface RepokitConfig {
  provider: 'openai' | 'anthropic' | 'gemini' | 'openrouter' | 'ollama'
  apiKey: string
  model: string
}

export const store = new Conf<RepokitConfig>({
  projectName: 'repokit',
  // conf automatically uses:
  //   Linux:   ~/.config/repokit/config.json
  //   macOS:   ~/Library/Application Support/RepoKit/config.json
  //   Windows: %APPDATA%\RepoKit\config.json
})
```

After saving, set permissions to `0o600` (owner read/write only):

```ts
import { chmodSync } from 'fs'
chmodSync(store.path, 0o600)
```

### Config helpers

```ts
export function getConfig(): Partial<RepokitConfig> {
  return store.store
}

export function setConfig(patch: Partial<RepokitConfig>): void {
  Object.assign(store.store, patch)
  chmodSync(store.path, 0o600)
}

export function clearConfig(): void {
  store.clear()
}

export function hasConfig(): boolean {
  return store.has('provider') && store.has('apiKey')
}
```

---

## 3. `repokit config`

### Interactive flow

```bash
repokit config
```

#### Step 1 — Provider selection

```
Which AI provider would you like to use?

❯ OpenAI
  Anthropic
  Google Gemini
  OpenRouter
  Ollama (Local)
  Skip for now
```

#### Step 2 — API key entry

```
Enter your OpenAI API key

> sk-***********************************

Validating key...
✓ Key confirmed working (test request succeeded)
```

If validation fails:

```
✗ Key rejected by OpenAI (401 Unauthorized)

  Re-enter key      Skip validation      Cancel
```

"Skip validation" exists only for offline/airgapped setups — never the default path.

#### Step 3 — Storage confirmation

```
✓ Saved locally

Linux    ~/.config/repokit/config.json
macOS    ~/Library/Application Support/RepoKit/config.json
Windows  %APPDATA%\RepoKit\config.json

File permissions set to 600 (owner read/write only).
```

### Implementation (`src/commands/config.ts`)

```ts
import { select, password, confirm, spinner, outro, cancel } from '@clack/prompts'
import { setConfig, store } from '../config/store.js'
import { validateKey } from '../adapters/openai.js'

export async function runConfig() {
  const provider = await select({
    message: 'Which AI provider would you like to use?',
    options: [
      { value: 'openai',     label: 'OpenAI' },
      { value: 'anthropic',  label: 'Anthropic' },
      { value: 'gemini',     label: 'Google Gemini' },
      { value: 'openrouter', label: 'OpenRouter' },
      { value: 'ollama',     label: 'Ollama (Local)' },
    ],
  })

  if (!provider) return cancel('Setup cancelled.')

  const apiKey = await password({ message: `Enter your ${provider} API key` })
  if (!apiKey) return cancel('Setup cancelled.')

  const s = spinner()
  s.start('Validating key...')

  const valid = await validateKey(String(apiKey))
  if (!valid) {
    s.stop('✗ Key rejected — check your key and try again.')
    return
  }

  s.stop('✓ Key confirmed working')
  setConfig({ provider: String(provider) as any, apiKey: String(apiKey) })

  outro(`Saved to ${store.path}\nPermissions set to 600.`)
}
```

### Non-interactive flags (for scripting / CI)

```bash
repokit config --provider anthropic
repokit config --remove-key
repokit config --reset
repokit config --show       # print current config (key masked)
```

---

## 4. OpenAI Adapter

A ~50-line fetch adapter. No SDK. No transitive deps.

### Interface (`src/adapters/types.ts`)

```ts
export interface ProviderAdapter {
  name: string
  validateKey(key: string): Promise<boolean>
  generate(prompt: string, context: string): Promise<string>
}
```

### OpenAI implementation (`src/adapters/openai.ts`)

```ts
import type { ProviderAdapter } from './types.js'

const BASE = 'https://api.openai.com/v1'

export const openaiAdapter: ProviderAdapter = {
  name: 'openai',

  async validateKey(key: string): Promise<boolean> {
    const res = await fetch(`${BASE}/models`, {
      headers: { Authorization: `Bearer ${key}` },
    })
    return res.status === 200
  },

  async generate(prompt: string, context: string): Promise<string> {
    const { apiKey, model } = getConfig()
    const res = await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model ?? 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You generate open source repository health files. Output only the file contents, no explanation.' },
          { role: 'user', content: `${prompt}\n\nContext:\n${context}` },
        ],
        max_tokens: 2000,
      }),
    })

    if (!res.ok) {
      throw new Error(`OpenAI API error: ${res.status} ${await res.text()}`)
    }

    const data = await res.json()
    return data.choices[0].message.content.trim()
  },
}
```

---

## 5. `repokit doctor` — Missing Files Only

Phase 2 scope is **missing files only**. Existing-file detection and diffing comes in Phase 3.

### Entry point (`src/commands/doctor.ts`)

```ts
import { hasConfig, getConfig } from '../config/store.js'
import { runChecks } from '../checks/index.js'
import { runDoctorSession } from '../ui/doctor-session.js'
import { outro, log } from '@clack/prompts'

export async function runDoctor(dir: string) {
  if (!hasConfig()) {
    log.warn('repokit doctor requires an AI provider.\nRun: repokit config')
    return
  }

  const results = await runChecks(dir)
  const missing = results.filter(r => !r.passed)

  if (missing.length === 0) {
    outro('✔ Everything looks good — nothing to generate.')
    return
  }

  await runDoctorSession(dir, missing)
}
```

### Doctor session loop (`src/ui/doctor-session.ts`)

For each missing file:

1. Show what will be generated
2. Show what will be sent to the AI
3. Show a preview (first 30 lines of generated content)
4. Prompt: Allow / Deny / Allow All

```ts
import { select, spinner, log, outro } from '@clack/prompts'
import { getAdapter } from '../adapters/index.js'
import { writeFile } from 'fs/promises'
import path from 'path'

export async function runDoctorSession(dir: string, missing: CheckResult[]) {
  const adapter = getAdapter()
  let allowAll = false

  for (const check of missing) {
    if (!allowAll) {
      const action = await showApprovalPrompt(check, adapter.name)
      if (action === 'deny') continue
      if (action === 'allow-all') allowAll = true
    }

    const s = spinner()
    s.start(`Generating ${check.label}...`)

    const content = await adapter.generate(
      promptFor(check.id),
      buildContext(dir)
    )

    s.stop(`✓ Generated ${check.label}`)
    await writeFile(path.join(dir, outputPath(check.id)), content, 'utf8')
  }

  outro('✔ Done.')
}
```

### Approval prompt format

```
────────────────────────────────────────
SECURITY.md   [new]

Why?
  GitHub recommends adding a security policy so
  researchers know how to report vulnerabilities.

What gets sent to OpenAI:
  • Your repo's file/folder names
  • package.json (or equivalent manifest)
  • Nothing else — no source code is transmitted.

Preview
  # Security Policy
  ...

Actions
❯ Allow
  Deny
  Allow All (this run)
────────────────────────────────────────
```

### Files generated in Phase 2

| Check ID | File written |
|---|---|
| `security` | `SECURITY.md` |
| `contributing` | `CONTRIBUTING.md` |
| `code-of-conduct` | `CODE_OF_CONDUCT.md` |
| `issue-template` | `.github/ISSUE_TEMPLATE/bug_report.md` |
| `pr-template` | `.github/PULL_REQUEST_TEMPLATE.md` |
| `changelog` | `CHANGELOG.md` |

`README.md` and `LICENSE` are intentionally excluded from generation — these are too project-specific to auto-generate meaningfully.

---

## 6. Context Builder

What gets passed to the AI as context:

```ts
// src/utils/context.ts
import fg from 'fast-glob'
import { readFile } from 'fs/promises'
import path from 'path'

export async function buildContext(dir: string): Promise<string> {
  const parts: string[] = []

  // File tree (names only, no contents)
  const files = await fg(['**/*'], { cwd: dir, dot: true, ignore: ['node_modules', '.git'], onlyFiles: true })
  parts.push(`File tree:\n${files.join('\n')}`)

  // package.json if present
  try {
    const pkg = await readFile(path.join(dir, 'package.json'), 'utf8')
    parts.push(`package.json:\n${pkg}`)
  } catch {}

  return parts.join('\n\n')
}
```

---

## 7. Tests

```
tests/
├── config/
│   └── store.test.ts         # setConfig, getConfig, clearConfig
├── adapters/
│   └── openai.test.ts        # mock fetch, validateKey, generate
├── commands/
│   └── doctor.test.ts        # doctor with mocked adapter
└── utils/
    └── context.test.ts       # context builder output
```

### Adapter test pattern (no real API calls)

```ts
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { openaiAdapter } from '../../src/adapters/openai.js'

global.fetch = vi.fn()

describe('openai adapter', () => {
  it('validates a working key', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ status: 200, ok: true } as any)
    const result = await openaiAdapter.validateKey('sk-test')
    expect(result).toBe(true)
  })

  it('rejects a bad key', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({ status: 401, ok: false } as any)
    const result = await openaiAdapter.validateKey('sk-bad')
    expect(result).toBe(false)
  })
})
```

---

## 8. Definition of Done for Phase 2

- [ ] `repokit config` stores config with 0600 permissions
- [ ] Key validation makes a real test call and fails fast on bad key
- [ ] `repokit config --show` prints masked key + provider
- [ ] OpenAI adapter generates content via plain fetch (no SDK)
- [ ] `repokit doctor` generates at least SECURITY.md, CONTRIBUTING.md end-to-end
- [ ] Approve / Deny / Allow-All loop works correctly
- [ ] Data disclosure message shown before every approval prompt
- [ ] All adapter tests use mocked fetch — no real API calls in CI
- [ ] `test:all` passes clean

---

## What's out of scope for Phase 2

- Editing existing files (diffing) → Phase 3
- Additional providers beyond OpenAI → Phase 4
- Model selection → Phase 4
- `repokit explain`, `repokit ci`, `repokit badge` → Phase 5
