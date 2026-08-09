# RepoTune

[![npm version](https://img.shields.io/npm/v/repotune.svg)](https://www.npmjs.com/package/repotune)

Repository quality toolkit for open source maintainers.
Scan any repo in seconds. Fix issues with or without AI. Runs offline. *Offline first. AI when you need it.*

RepoTune is a developer-first tool that helps you maintain a pristine repository. It can instantly bootstrap standard open-source community files (Offline), and optionally uses AI to fill in the missing pieces, update outdated configurations, and fix weak areas specific to your project.

## Features

- **Offline Initialization:** Instantly bootstrap standard open-source templates (README, SECURITY, CONTRIBUTING, etc.) locally in milliseconds.
- **Bring Your Own Agent:** Seamlessly delegate tasks to external AI CLIs like `claude`, `cursor-agent`, `aider`, or `goose` without configuring API keys.
- **Intelligent Auditing:** Detect missing community files, outdated configurations, and weak documentation.
- **Multi-Provider Support:** Built-in support for OpenAI, Anthropic, Gemini, OpenRouter, Groq, and local models via Ollama.
- **Privacy First:** Explicitly shows you the prompt and context before sending anything.

## Installation

Install globally to use it anywhere:

```bash
npm install -g repotune
```

Or, to try it with zero commitment:

```bash
npx repotune@latest scan
```

## The Workflows

RepoTune is designed to accommodate any workflow—whether you prefer AI, want to keep it 100% offline, or already use an AI coding agent.

### 1. Bootstrapping (Offline)
If you have a fresh project, instantly bootstrap community standard files using built-in templates. This runs entirely locally and requires no API keys.

```bash
repotune init
```
This generates `README.md`, `SECURITY.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md`, Issue/PR templates, and Licenses.

### 2. Scanning (Offline & Instant)
Run this command in any repository to immediately see what is missing or broken. This step is 100% offline and makes zero changes to your files.

```bash
repotune scan
```

### 3. Fixing Issues

When you run `repotune doctor`, it will walk you through every issue found in the scan and offer to fix it. There are three modes you can use:

#### Mode A: Offline Templates
If you don't configure any AI, RepoTune operates safely offline. It uses your repository context (`package.json` names, etc.) to copy and populate standard templates.
```bash
repotune doctor
```

#### Mode B: Bring Your Own Agent (BYOA)
If you already use an AI CLI like Claude Code, Cursor, Codex, Gemini, or OpenCode, you don't need to give RepoTune an API key. Just pass the `--agent` flag! RepoTune analyzes your repo, constructs the perfect prompt, and delegates the task to your existing agent.
```bash
repotune doctor --agent claude
repotune doctor --agent cursor
repotune doctor --agent codex
repotune doctor --agent gemini
repotune doctor --agent opencode
```

**Custom Agents**
You can also use completely custom external agents by passing their command string. RepoTune will intelligently execute it as a background process and inject the prompt as the final argument. Ensure your custom agent is configured to run non-interactively so it doesn't hang!
```bash
repotune doctor --agent "my-custom-cli --non-interactive run"
repotune doctor --agent "/path/to/my-agent-script.sh"
```

To avoid typing your custom agent command every time, you can permanently save it to your config:
```bash
repotune config --custom-agent "my-custom-cli --non-interactive run"
repotune doctor # Automatically uses your custom agent!
```

#### Mode C: Internal AI
If you configure an API key (`repotune config`), RepoTune will use that provider (OpenAI, Anthropic, Gemini, Groq, Ollama) directly to generate tailored fixes.
```bash
repotune doctor
```

## What RepoTune Checks

RepoTune's core value comes from its static analysis checks. File existence checks are just the baseline; cross-file consistency analysis is where it excels.

- **Documentation:** Verifies the existence and depth of README, LICENSE, CONTRIBUTING, SECURITY, CHANGELOG, and Code of Conduct files.
- **Automation:** Checks for GitHub Actions CI workflows, Release workflows, and dependency updaters like Dependabot or Renovate.
- **Community:** Ensures you have Issue templates, Pull Request templates, and Funding configurations.
- **Consistency:** 
  - Package Manager: Detects if your README says "yarn install" but you switched to "pnpm".
  - Node Version: Detects if your CI pins Node 18 but your package.json requires Node >= 22.
  - Stale Badges: Detects if your README CI badge points to a workflow file that no longer exists.
  - Metadata: Checks for missing package description, keywords, and outdated License years.
- **Weakness:** Analyzes existing files (like CONTRIBUTING.md) to see if they are just one-line stubs that need expansion.

## Commands

### repotune scan [dir]
Scans your repository for quality issues offline. Outputs a final Repository Quality Score out of 100.
Options:
- `--json`: Output results as JSON for scripting.
- `--fail-under <score>`: Exit with a non-zero code if the score is below a threshold (perfect for CI pipelines).

### repotune doctor [dir]
The interactive auto-fixer. It will review missing, outdated, and weak files, and ask for your approval to generate or update them.
Options:
- `--fix`: Automatically apply safe, mechanical fixes (like updating the license year) without prompting.
- `--agent <name>`: Delegate AI tasks to an external CLI (`claude`, `cursor`, `codex`, `gemini`, `opencode`).

### repotune revert [dir]
An interactive command to safely rollback any changes made by `repotune init` or `repotune doctor`. It tracks all file modifications, allowing you to restore files to their exact prior state or cleanly delete auto-created files.

### repotune init [dir]
Bootstrap a repository with standard open-source templates instantly and completely offline.

### repotune config
Configures your AI provider and API keys interactively. Keys are validated instantly during setup.
Options:
- `--provider <name>`: Set provider non-interactively.
- `--remove-key`: Remove stored API key.
- `--reset`: Clear all configuration.
- `--show`: Show current configuration.

### repotune explain <topic>
Explains what a repository health file is, why it matters, and shows an example.

### repotune ci
Generates GitHub Actions workflow files interactively, providing inline explanations for each choice.

### repotune badge [dir]
Generates a markdown badge showing your current repository score that you can paste directly into your README.

### repotune telemetry
Manages anonymous usage data sharing. 

## Privacy & Security

RepoTune is built with strict privacy guarantees:

- Local First: `scan`, `init`, `ci`, `badge`, and `explain` run 100% locally. No network calls, no API key needed.
- Explicit Data Disclosure: `doctor` explicitly shows what is being sent to your selected provider or external agent before you confirm.
- Secure Storage: Your API key is stored at 0600 permissions locally and never transmitted anywhere except the AI provider's official API endpoint.

## Contributing

Contributions are welcome. Please run `npm run test:all` before submitting any pull requests.

## License

MIT License. See [LICENSE](https://github.com/akramcodez/repotune/blob/main/LICENSE) for details.
