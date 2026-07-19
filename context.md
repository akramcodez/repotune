# RepoKit — CLI UX Spec (Revised)

Philosophy: install once, configure once, never think about setup again — like Git or Claude Code.

---

# First-Time User Experience

## 1. Install

```bash
npm install -g repokit
```

or, to try it with zero commitment:

```bash
npx repokit@latest
```

```text
🚀 Welcome to RepoKit

RepoKit helps you analyze, improve, and maintain
high-quality open source repositories.

You can explore right now without any setup — run:

  repokit scan

Or configure an AI provider for auto-fixes:

  repokit config
```

**Fix applied:** setup is no longer forced during install. Users get a working `scan` command immediately (deterministic, no API key). AI configuration is offered, not required.

---

## 2. Configuring an AI Provider (when the user opts in)

```bash
repokit config
```

```text
Which AI provider would you like to use?

❯ OpenAI
  Anthropic
  Google Gemini
  OpenRouter
  Ollama (Local)
  Skip for now
```

### Enter API Key

```text
Enter your OpenAI API key

> sk-***********************************

Validating key...
✓ Key confirmed working (test request succeeded)
```

**Fix applied:** validation is no longer "optional" — it's a real test call against the provider, made synchronously during setup. A bad key fails here, in 1–2 seconds, not five steps later mid-`doctor` run. If the test call fails:

```text
✗ Key rejected by OpenAI (401 Unauthorized)

  Re-enter key      Skip validation      Cancel
```

"Skip validation" exists for offline/airgapped setups, but is never the default path.

### Store the Key

```text
Where should RepoKit store your key?

❯ Secure local config (~/.repokit)
  Environment variable
  Don't save it
```

```text
✓ Saved locally

Linux    ~/.config/repokit/config.json
macOS    ~/Library/Application Support/RepoKit/config.json
Windows  %APPDATA%\RepoKit\config.json

File permissions set to 600 (owner read/write only).
```

**Fix applied:** explicit mention of file permissions — a concrete, checkable privacy claim rather than a vague assurance.

---

## 3. Everyday Workflow — Scanning (no key required)

```bash
cd awesome-project
repokit scan
```

```text
🔍 Scanning repository...

Documentation
✓ README
✗ CONTRIBUTING
✗ SECURITY

Automation
✗ Release Workflow

Community
✗ Funding

Repository Score
73/100

This scan ran entirely offline - no files were sent anywhere.

Run: repokit doctor
```

**Fix applied:** the doc now states plainly that `scan` never contacts an AI provider, closing the ambiguity in the original privacy section.

---

## 4. Fixes — `doctor`

```bash
repokit doctor
```

If no provider is configured:

```text
⚠ repokit doctor requires an AI provider for generated content.

Run: repokit config
```

If configured:

```text
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

**Scope expanded:** `doctor` now handles three categories, not just missing files:

| Category | Example | Action |
|---|---|---|
| **Missing** | No SECURITY.md exists | Generate from scratch |
| **Outdated** | README installs steps reference a package manager the repo no longer uses | Rewrite the stale section, leave the rest untouched |
| **Weak** | CONTRIBUTING.md exists but is a one-line stub | Expand with proper sections (setup, PR process, code style) |

```text
ℹ doctor reviews both missing and existing files.
  Existing files are only ever edited with your explicit
  approval, shown as a diff — never silently overwritten.
```

### Approval — with explicit data disclosure and diff-aware review

For a **missing** file:

```text
────────────────────────────
SECURITY.md   [new]

Why?
GitHub recommends adding a security policy so
researchers know how to report vulnerabilities.

What gets sent to OpenAI:
  • Your repo's file/folder names
  • package.json (or equivalent manifest)
  • Nothing else — no source code is transmitted for this file.

Preview
+ # Security Policy
+
+ Thanks for helping...

Actions
❯ Allow
  Deny
  Allow All (this run)
```

For an **outdated** or **weak existing** file:

```text
────────────────────────────
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
```

**Fix applied:** existing-file edits are always shown as a **scoped diff**, not a full-file replacement by default — the tool changes only the part it flagged as stale, and asks separately if the user wants a full rewrite instead. This avoids the AI clobbering unrelated content (custom badges, project-specific notes, etc.) a user added by hand. Each prompt also states exactly what's transmitted for that specific action — this now includes full file contents when editing an existing file, since the model needs the current text to produce an accurate diff.

Continue until finished.

---

## 5. Completion

```text
✔ Done.

Generated
✓ SECURITY.md
✓ ISSUE_TEMPLATE
✓ PULL_REQUEST_TEMPLATE

Updated
✓ README.md (install instructions)
✓ CONTRIBUTING.md (expanded from stub)

Skipped
• FUNDING.yml

Repository Score
73 → 91

Run: repokit scan
```

---

## 6. `explain`

```bash
repokit explain security
```

```text
Security Policy

Purpose
A SECURITY.md file tells researchers how to
responsibly disclose vulnerabilities.

Benefits
✓ GitHub Security tab support
✓ Better trust
✓ Easier reporting

Example
<preview>

Generate one?
Run: repokit doctor security
```

---

## 7. CI Setup — with inline rationale

```bash
repokit ci
```

```text
Select workflows

◉ GitHub CI        — runs your test suite on every push/PR
◉ Release          — auto-publishes a GitHub release on tag push
○ CodeQL           — GitHub's free static security scanning
○ Dependabot       — automated dependency update PRs
◉ Renovate         — alternative to Dependabot, more configurable
```

**Fix applied:** each workflow option now has a one-line "why" inline, matching the pattern already used for SECURITY.md — so users aren't ticking boxes blind.

```text
✓ .github/workflows/ci.yml
✓ .github/workflows/release.yml
```

---

## 8. Badge

```bash
repokit badge
```

```text
Repository Quality
91/100

Markdown copied to clipboard.

README preview
⭐ Repository Quality: 91/100
```

---

## 9. Configuration — consolidated surface

**Fix applied:** the original design had five separate `config` subcommands (`config`, `config set`, `config reset`, `config remove-key`, `config provider`), which would sprawl further as providers/settings grow. Consolidated into one interactive command plus one scriptable flag form:

```bash
repokit config
```

```text
Provider     OpenAI
API Key      sk-*********************
Stored at    ~/.config/repokit
Model        gpt-5.5

❯ Change provider
  Change model
  Update API key
  Remove key
  Reset all settings
  Exit
```

For scripting / CI use, the same actions are available non-interactively:

```bash
repokit config --provider anthropic
repokit config --remove-key
repokit config --reset
```

One entry point, one mental model — no need to remember four different subcommand names.

---

## 10. Changing Providers

```text
Current: OpenAI

Choose provider
  Anthropic
  Google
  OpenRouter
  Ollama
  OpenAI
```

```text
✓ Switched to Anthropic.

Note: files already generated under OpenAI won't be
regenerated automatically. Run `repokit doctor` again
if you'd like them rewritten in Anthropic's style.
```

**Fix applied:** addresses the "provider lock-in ambiguity" — the tool now tells the user explicitly that switching providers doesn't retroactively touch existing generated files, and gives them the one command to regenerate if they want.

No reinstall required either way.

---

## 11. Privacy — concrete, not just reassuring

```text
🔒 Privacy

• scan, and score run 100% locally. No network calls, no API key needed.
• doctor and explain send data to your selected provider only when you approve a specific action.
• Each approval prompt shows exactly what's being sent (file names, manifest, or file contents) before you confirm.
• Your API key is stored at 0600 permissions in your local config directory and is never transmitted anywhere except the provider's official API endpoint.
• RepoKit's own servers (if any) never see your key or your repo contents.
```

**Fix applied:** replaced generic bullet points with specific, falsifiable claims — which command touches the network, what permission mode the key file has, and where data is (and isn't) sent.