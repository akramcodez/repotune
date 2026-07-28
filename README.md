# RepoKit

Repository quality toolkit for open source maintainers.
Scan any repo in seconds. Fix issues with or without AI. Runs offline. Privacy-first.

RepoKit is a blazing fast CLI that helps you analyze, improve, and maintain high-quality open source repositories. Its core feature is a smart repository analyzer that cross-references your own files against each other to find inconsistencies and missing standards. It optionally uses AI to generate missing files or intelligently patch outdated content.

## Installation

Install globally to use it anywhere:

```bash
npm install -g repokit
```

Or, to try it with zero commitment:

```bash
npx repokit@latest scan
```

## The Workflow

RepoKit is designed around a simple three-step workflow.

### 1. Scan (Offline & Instant)
Run this command in any repository to immediately see what is missing or broken. This step is 100% offline, requires no API key, and makes zero changes to your files.

```bash
repokit scan
```

### 2. Configure (One-Time Setup)
If you want to use AI to automatically fix the issues found in the scan, configure your preferred AI provider (OpenAI, Anthropic, Gemini, etc.).

```bash
repokit config
```

### 3. Doctor (Interactive Fixes)
Now that your provider is configured, run the doctor. It will walk you through every issue found in the scan and show you a preview of how it plans to fix it (e.g., generating a missing SECURITY.md or patching a stale package manager reference in your README). 

```bash
repokit doctor
```

It will never write to a file without your explicit approval.

## What RepoKit Checks

RepoKit's core value comes from its static analysis checks. File existence checks are just the baseline; cross-file consistency analysis is where it excels.

- Documentation: Verifies the existence and depth of README, LICENSE, CONTRIBUTING, SECURITY, CHANGELOG, and Code of Conduct files.
- Automation: Checks for GitHub Actions CI workflows, Release workflows, and dependency updaters like Dependabot or Renovate.
- Community: Ensures you have Issue templates, Pull Request templates, and Funding configurations.
- Consistency: 
  - Package Manager: Detects if your README says "yarn install" but you switched to "pnpm".
  - Node Version: Detects if your CI pins Node 18 but your package.json requires Node >= 22.
  - Stale Badges: Detects if your README CI badge points to a workflow file that no longer exists.
  - Metadata: Checks for missing package description, keywords, and outdated License years.
- Weakness: Analyzes existing files (like CONTRIBUTING.md) to see if they are just one-line stubs that need expansion.

## Commands

### repokit scan [dir]
Scans your repository for quality issues offline. It groups results by category and provides a final Repository Quality Score out of 100.
Options:
- `--json`: Output results as JSON for scripting.
- `--fail-under <score>`: Exit with a non-zero code if the score is below a threshold (perfect for CI pipelines).

### repokit doctor [dir]
The interactive auto-fixer. It will review missing files, outdated files, and weak files, and ask for your approval to generate or update them using AI.
Existing files are only ever edited with your explicit approval and are shown as a unified diff - never silently overwritten.
Options:
- `--fix`: Automatically apply safe, mechanical fixes (like updating the license year) without prompting.

### repokit config
Configures your AI provider and API keys interactively. Keys are validated instantly during setup.
Options:
- `--provider <name>`: Set provider non-interactively.
- `--remove-key`: Remove stored API key.
- `--reset`: Clear all configuration.
- `--show`: Show current configuration.

### repokit explain <topic>
Explains what a repository health file is, why it matters, and shows an example.
Available topics: security, contributing, license, changelog, ci, code-of-conduct, funding, pr-template, issue-template.

### repokit ci
Generates GitHub Actions workflow files interactively, providing inline explanations for each choice (e.g., GitHub CI, Release, CodeQL, Dependabot).

### repokit badge [dir]
Generates a markdown badge showing your current repository score that you can paste directly into your README.

### repokit telemetry
Manages anonymous usage data sharing. 
Options:
- `--show`: Show the exact JSON payload that would be sent.
- `--enable`: Opt into anonymous telemetry.
- `--disable`: Opt out of telemetry.
- `--status`: Show your current opt-in status.

## Privacy & Security

RepoKit is built with strict privacy guarantees:

- Local First: `scan`, `ci`, `badge`, and `explain` run 100% locally. No network calls, no API key needed.
- Explicit Data Disclosure: `doctor` sends data to your selected provider only when you approve a specific action. Each approval prompt clearly states exactly what is being sent (file names, manifest, or file contents) before you confirm.
- Secure Storage: Your API key is stored at 0600 permissions in your local config directory and is never transmitted anywhere except the AI provider's official API endpoint.
- Opt-In Telemetry: RepoKit collects anonymous usage data (like which commands are run) only if you explicitly opt in. No file contents, IP addresses, or personal information are ever tracked.

## Supported AI Providers

RepoKit supports a wide range of AI providers out of the box:
- Anthropic (Claude 5 series)
- OpenAI (GPT-5.6 series)
- Google Gemini (Gemini 3.5 series)
- Groq (Fast Llama and Open Source models)
- OpenRouter (Any model)
- Ollama (Local offline models)

## Contributing

Contributions are welcome. Please run `npm run test:all` before submitting any pull requests to ensure tests, linting, and TypeScript compilation pass perfectly.

## License

MIT License. See [LICENSE](https://github.com/akramcodez/repokit/blob/main/LICENSE) for details.
