# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.6] - 2026-08-09
### Added
- **README Quality Check (`readme-weak`):** RepoTune now audits the *content* of your `README.md`, not just its existence. The check uses a two-tier evaluation system — hard-fail gates for critical issues, plus a weighted sub-score — and runs entirely offline with zero AI or network calls.
  - **Hard-fail gates** (any one triggers an immediate failure):
    - Unfilled template placeholders detected: `[your-project-name]`, `{{name}}`, `<your-email>`, `coming soon`, `lorem ipsum`, or more than 2 `TODO` markers.
    - No fenced or indented code block present.
    - Badge-only README (≥50% of non-empty lines are badge markdown).
    - Heading skeleton (≥40% of non-empty lines are headings with no prose underneath).
  - **Weighted sub-score signals** (must reach 60% to pass):
    - Meaningful body content ≥ 300 characters (weight 20).
    - Installation or Getting Started section heading (weight 20).
    - Usage or Example section heading (weight 15).
    - At least one code block (weight 15).
    - No placeholders / excessive TODOs (weight 20).
    - Not badge-only (weight 5).
    - Not heading skeleton (weight 5).
  - The issue message always reports the exact sub-score and every failing signal, e.g.: `README quality score 35/100 — missing: has at least one code block; has a Usage or Example section`.

## [1.0.5] - 2026-08-08
### Changed
- **Fixed GitHub Actions security check:** The `Pinned GitHub Actions` check now correctly accepts standard version tags (`@v4`, `@v3.2.1`) and only flags truly unsafe branch-name refs like `@main` or `@master`.
- **Fixed NPM dependency pinning check:** The `Pinned NPM Dependencies` check no longer false-positives on standard `^`/`~` semver ranges. It now only flags genuinely unsafe patterns (`*`, `latest`, `>=`).

### Fixed
- Fixed broken CRLF normalization regex in the CI workflow generator (was matching literal `\\r\\n` string instead of actual carriage-return newlines).
- Fixed `repotune ci` overwriting existing workflow files without warning (now prompts before overwriting).
- Fixed `repotune ci` not resolving relative paths correctly.
- Fixed CI workflow template hardcoding `node-version: 20` — now reads from `engines.node` in `package.json`.
- Fixed pnpm setup action version from outdated `v3` (hardcoded version 8) to `v4` (auto-detects pnpm version).

## [1.0.4] - 2026-08-03
### Added
- **Enterprise Security Auditing:** Added comprehensive checks for Dependency Pinning, Secret Leaking (SAST), CODEOWNERS, and Maintenance Activity to `repotune scan`.
- **Vulnerability Scanning:** Added a new `--audit` flag to the `scan` command to optionally check for known CVEs via SCA.
- **Custom AI Agents:** `repotune doctor` now allows for arbitrary local agent delegations (e.g. `repotune doctor --agent /home/akram/nanocoder`).
- **Persistent Agents:** You can now permanently save your custom agent using `repotune config --custom-agent "<cmd>"`.
- **Graceful Agent Handoff:** Added resilient error handling for custom agent subprocesses. If your custom CLI agent crashes (e.g., attempting to open a TUI in the background), RepoTune smoothly catches the failure, strips away the giant prompt payload, and surfaces a clean error so you can debug the agent's flags.
- **Native Agents Refined:** Added strict, native, non-interactive integration for `claude` (Claude Code), `cursor` (Cursor Agent), `codex`, `gemini`, and `opencode`. Removed support for `aider` and `goose` from native adapters (they can still be used via custom agents).
- **Comprehensive Help:** Added extensive cheat-sheet examples and tips to the CLI `--help` output.

## [1.0.3] - 2026-08-02
### Added
- Added an automated AI changelog updater that parses recent git commit history to write perfectly formatted Release Notes.
- Implemented Local Semantic Caching to eliminate AI API costs on repeated `repotune doctor` runs.
- Re-architected all AI provider adapters to utilize native prompt caching, saving up to 90% input tokens.

### Changed
- Improved AI context generation to minify `package.json` strings by removing unnecessary whitespace and non-essential fields, saving hundreds of tokens.

## [1.0.2] - 2026-08-02
### Fixed
- Fixed a false positive in the package manager consistency check that incorrectly flagged English sentences in README files.
- Fixed a bug where `repotune -v` always reported version `1.0.0` by dynamically linking the CLI to the `package.json` version.


## [1.0.1] - 2026-08-02
### Added
- Added Groq model adapter support (`llama-3.3-70b-versatile`)
- Implemented strict rule enforcing AI generators to avoid emojis and placeholders
- Enhanced `CONTRIBUTING.md` generation to automatically scrape manifest (`package.json`) scripts
- Integrated feature and bug templates into a single cohesive `.github/ISSUE_TEMPLATE.md` file

### Changed
- Improved Privacy: `repotune` now filters out sensitive information from `package.json` before passing context to AI
- Lowered Token Usage: `repotune` now strictly caps file tree depth at `3`
- Prevented AI generators from pre-signing `PULL_REQUEST_TEMPLATE.md` with hardcoded author signatures

## [1.0.0] - 2026-08-01
### Added
- Initial implementation of the repository quality toolkit
- Added support for scanning open source repositories for missing essential community files
- Implemented core CLI framework and generic multi-adapter AI logic
- Included commands for repository analysis (`doctor`), badging, and explaining files