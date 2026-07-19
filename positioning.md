# RepoKit — Positioning

> **One sentence:** RepoKit is a repository quality toolkit — AI is one implementation detail, not the product.

---

## The right positioning

```
✅  Repository quality toolkit
❌  AI documentation generator
❌  AI boilerplate generator
❌  SECURITY.md generator
```

If you describe this as "AI that generates your docs", you'll get:

- Skepticism ("just ChatGPT wrapper")
- Users who try it once, generate a file, and never return
- No defensible moat

If you describe it as "repository health toolkit", you get:

- Users who run `scan` every week
- CI integration (`repokit scan --fail-under 80`)
- Teams who care about repo standards across many repos
- A tool that's useful even with AI turned completely off

---

## What the product *actually is*

RepoKit's core is a **smart repository analyzer** that catches things like:

- README still says `yarn install` but you switched to pnpm 6 months ago
- Your CI badge links to a workflow file you renamed
- `package.json` has no `keywords`
- LICENSE is copyrighted 2021 — it's 2026
- Node 18 pinned in CI but `engines` says `>=22`

**None of that requires AI.** It's cross-referencing your own files against each other. That's what makes it feel intelligent, not magic.

AI is the mechanism for *generating* the content once you've decided to add a missing file. It's useful — but it's not the story.

---

## Messaging hierarchy

| Audience | Message |
|---|---|
| First impression (README headline) | "Repository quality toolkit. Scan, fix, and maintain high-quality open source repos." |
| Twitter/HN demo | `npx repokit scan` → before/after score |
| Privacy-conscious devs | "scan runs 100% offline. AI is opt-in, per-action, with explicit data disclosure." |
| CI users | `repokit scan --fail-under 80` |
| Teams | "Consistent repo standards across every project in your org." |

---

## The demo that gets stars

```bash
npx repokit scan
```

```
🔍 Scanning repository...

Documentation    ✓ README  ✓ LICENSE  ✗ CONTRIBUTING  ✗ SECURITY
Automation       ✓ CI  ✗ Release workflow
Community        ✗ Issue templates  ✗ PR template

Consistency
  ✗ Package manager mismatch
      README says `yarn install` — repo uses pnpm
  ✗ Node version mismatch
      CI pins Node 18 — package.json requires >=22
  ✗ Stale CI badge
      Badge points to `build.yml` — file doesn't exist

━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Repository Score   58 / 100
━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Run `repokit doctor` to fix these.
```

The reaction you want is **"whoa, it found the badge thing"** — not "ok it found that I'm missing a SECURITY.md".

File existence checks are the baseline. Cross-file consistency analysis is the star-getter.

---

## What to say on the README

**Headline:**
> Repository quality toolkit for open source maintainers.

**Subheadline:**
> Scan any repo in seconds. Fix issues with or without AI. Runs offline. Privacy-first.

**DO NOT lead with:**
- ~~"AI-powered documentation generator"~~
- ~~"Let AI write your SECURITY.md"~~
- ~~"GPT for your repo"~~

---

## Competitive moat

The moat isn't the AI. The moat is:

1. **The scan** — useful offline, zero setup, surfaces things people don't know to look for
2. **The UX** — explicit data disclosure, scoped diffs, no silent overwrites
3. **The consistency checks** — cross-file analysis that feels intelligent without any AI
4. **The `--fix` flag** — mechanical fixes that are actually safe to automate
5. **(Later) org-wide dashboard** — this is where the real defensibility lives

Any competitor can hook up the OpenAI API. Nobody else has the UX and the smart analysis combined.

---

## Avoiding the trap

The trap is when the project becomes:

> "I added Anthropic support. I added Gemini support. I added OpenRouter support."

That's adapter work. It's not the product.

The product is:

> "I added 5 new smart consistency checks. Scan now detects when your README references a git tag strategy your project abandoned."

New AI providers = maintenance. New smart checks = product value.

**Invest time accordingly.**
