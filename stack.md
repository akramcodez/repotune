# RepoKit — Tech Stack

> **Design constraint:** fast `npm install` (few, small deps) + fast execution (no heavy runtime overhead).  
> This CLI gets run constantly — it should feel closer to a compiled Go binary than a bloated npm tool.

---

## Language & Build

| Layer | Choice | Rationale |
|---|---|---|
| Language | **TypeScript** | Type safety during dev, plain JS at runtime — no ts-node overhead |
| Bundler | **tsup** (esbuild under the hood) | Single-file output, dead-code elimination, zero config |
| Target | **Node 18+** ESM | Modern, no legacy CommonJS shims needed |
| Output | `dist/index.js` — one bundled file | No `node_modules` resolution at runtime → fast cold start |

---

## Runtime Dependencies

| Layer | Choice | Why |
|---|---|---|
| CLI framework | **cac** | A few KB; Commander.js is fine too — both are tiny. Oclif is too heavy for this use case |
| Interactive prompts | **@clack/prompts** | Modern, fast, beautiful — noticeably snappier and better-looking than Inquirer |
| Config storage | **conf** | Battle-tested, handles cross-platform paths (`~/.config/`, `%APPDATA%`, etc.) automatically |
| File scanning | **fast-glob** | Significantly faster than `glob`, minimal deps |
| Diffing | **diff** | Small, standard, does exactly what we need for diff rendering |
| AI provider calls | **Plain `fetch`** + thin adapters | Skip heavy SDKs (openai, @google/generative-ai, etc.) — each REST API is simple enough that ~50 lines per adapter keeps install size near zero and avoids version-lock across 5 SDKs |
| Git ops | **simple-git** or **execa** | Only where plain `fs` isn't enough |
| Shell execution | **execa** | Cross-platform shell, handles quoting/escaping correctly |

### Why no heavy SDKs?

Each provider's API is a thin HTTP wrapper. We call one or two endpoints per provider. Pulling in the official SDK means:

- **~15–50 MB** of transitive deps per provider
- Slow `npm install` on every `npx repokit` cold run
- Version conflicts across 5 SDK packages

A `~50-line fetch adapter` per provider has zero transitive deps and is trivially auditable.

---

## Dev Tooling

| Tool | Purpose |
|---|---|
| **TypeScript** | Type checking (`tsc --noEmit`) |
| **tsup** | Build / bundle |
| **Prettier** | Code formatting — one config, zero arguments |
| **ESLint** | Linting with `@typescript-eslint` |
| **Vitest** | Unit + integration tests (much faster than Jest for a small CLI suite) |

### Prettier config (`prettier.config.mjs`)

```js
export default {
  semi: false,
  singleQuote: true,
  printWidth: 100,
  trailingComma: 'all',
}
```

> Prettier is non-negotiable formatting — no lint rule debates, no style PRs. Run it and move on.

---

## Scripts (`package.json`)

```json
{
  "scripts": {
    "build":       "tsup src/index.ts --format esm --dts",
    "dev":         "tsup src/index.ts --watch",
    "typecheck":   "tsc --noEmit",
    "lint":        "eslint src --ext .ts",
    "format":      "prettier --write src",
    "format:check":"prettier --check src",
    "test":        "vitest run",
    "test:watch":  "vitest",
    "test:ui":     "vitest --ui",
    "test:all":    "npm run typecheck && npm run lint && npm run test",
    "prepublishOnly": "npm run test:all && npm run build"
  }
}
```

### Key scripts explained

| Script | What it does |
|---|---|
| `npm run build` | Compile + bundle to `dist/index.js` |
| `npm run dev` | Watch mode — rebuilds on save |
| `npm run typecheck` | Pure type check, no emit |
| `npm run lint` | ESLint over `src/` |
| `npm run format` | Prettier formats everything in `src/` |
| `npm run format:check` | CI check — fails if files are not formatted |
| `npm run test` | Single vitest run (CI mode) |
| `npm run test:watch` | Interactive watch mode for local dev |
| `npm run test:ui` | Vitest browser UI (optional, nice for exploring tests) |
| `npm run test:all` | **Full gate:** typecheck → lint → tests |
| `npm run prepublishOnly` | Runs `test:all` + build before every `npm publish` |

---

## Project Structure

```
repokit/
├── src/
│   ├── index.ts              # CLI entrypoint (cac setup, command registration)
│   ├── commands/
│   │   ├── scan.ts           # repokit scan
│   │   ├── doctor.ts         # repokit doctor
│   │   ├── config.ts         # repokit config
│   │   ├── explain.ts        # repokit explain <topic>
│   │   ├── ci.ts             # repokit ci
│   │   └── badge.ts          # repokit badge
│   ├── checks/
│   │   ├── index.ts          # Check registry + scoring
│   │   ├── docs.ts           # README, CONTRIBUTING, SECURITY, LICENSE
│   │   ├── automation.ts     # CI presence, release workflow
│   │   └── community.ts      # FUNDING, issue templates, PR template
│   ├── adapters/
│   │   ├── types.ts          # ProviderAdapter interface
│   │   ├── openai.ts         # OpenAI REST adapter (~50 lines)
│   │   ├── anthropic.ts      # Anthropic REST adapter
│   │   ├── gemini.ts         # Gemini REST adapter
│   │   ├── openrouter.ts     # OpenRouter adapter
│   │   ├── ollama.ts         # Ollama (local) adapter
│   │   └── groq.ts           # Groq adapter (OpenAI-compatible, ultra-fast)
│   ├── config/
│   │   └── store.ts          # conf wrapper, typed config schema
│   ├── ui/
│   │   ├── output.ts         # Scan result formatting, score display
│   │   └── diff.ts           # Diff rendering for doctor prompts
│   └── utils/
│       ├── git.ts            # Git helpers (simple-git or execa)
│       └── fs.ts             # fast-glob wrappers, file existence checks
├── tests/
│   ├── scan.test.ts
│   ├── checks.test.ts
│   ├── adapters/
│   │   └── openai.test.ts
│   └── utils/
│       └── fs.test.ts
├── dist/                     # Build output (gitignored)
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── prettier.config.mjs
├── eslint.config.mjs
├── vitest.config.ts
└── stack.md                  # you are here
```

---

## Dependency Budget

Goal: **< 10 production runtime deps**, total install size under **5 MB**.

| Package | Size estimate |
|---|---|
| cac | ~20 KB |
| @clack/prompts | ~40 KB |
| conf | ~80 KB |
| fast-glob | ~200 KB (includes micromatch) |
| diff | ~40 KB |
| execa | ~60 KB |
| **Total** | **~440 KB** |

Everything else (tsup, TypeScript, Vitest, ESLint, Prettier) is `devDependencies` — not shipped.

---

## Testing Philosophy

- **Unit tests** for all check logic (pure functions, no side effects)
- **Integration tests** for CLI commands using a temp directory fixture
- **Mock fetch** for adapter tests — no real API calls in CI
- **Vitest** over Jest: faster startup, native ESM, no Babel config needed

```ts
// Example test pattern
import { describe, it, expect } from 'vitest'

describe('scan checks', () => {
  it('detects missing SECURITY.md', async () => {
    const result = await runChecks('/tmp/fake-repo')
    expect(result.missing).toContain('SECURITY.md')
  })
})
```

---

## Notes

- No `ts-node` at runtime. Ever. `tsup` compiles everything at build time.
- No `dotenv` — API keys are stored via `conf`, not `.env` files (which get committed).
- No `chalk` — `@clack/prompts` handles all terminal color/styling needs.
- Windows compatibility is a first-class concern from day one — `execa` and `conf` handle cross-platform paths correctly.
