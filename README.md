# RepoKit

> Health-check and improve your open source repositories — fast, offline-first, AI-optional.

RepoKit is a blazing fast CLI that helps you analyze, improve, and maintain high-quality open source repositories. It checks for missing documentation, stale CI workflows, and weak configurations, and optionally uses AI to generate missing files or update stale content.

## Install

Install globally to use it anywhere:

```bash
npm install -g repokit
```

Or, to try it with zero commitment:

```bash
npx repokit@latest scan
```

## Quick Start

You can explore right now without any setup. Run a scan on any repository:

```bash
repokit scan
```

To enable auto-fixes, configure an AI provider:

```bash
repokit config
```

Then, run the doctor to fix issues interactively:

```bash
repokit doctor
```

## Commands

### `repokit scan`
Scans your repository for quality issues offline. It checks documentation, automation, and community standards, and provides a final Repository Quality Score out of 100.

### `repokit doctor`
The interactive auto-fixer. It will review both missing and existing files, and ask for your approval to generate or update them using AI. 
Use `--fix` to automatically apply safe, mechanical fixes (like updating the license year) without prompting.

### `repokit config`
Configures your AI provider and API keys.

### `repokit explain <topic>`
Explains what a repository health file is, why it matters, and shows an example.
Available topics: `security`, `contributing`, `license`, `changelog`, `ci`, `code-of-conduct`, `funding`, `pr-template`, `issue-template`

### `repokit ci`
Generates GitHub Actions workflow files with inline explanations of each option. 

### `repokit badge`
Generates a markdown badge showing your current repository score that you can paste into your README.

## Privacy

- `scan`, `ci`, `badge`, and `explain` run **100% locally**. No network calls, no API key needed.
- `doctor` sends data to your selected provider **only when you approve a specific action**.
- Each approval prompt shows exactly what's being sent (file names, manifest, or file contents) before you confirm.
- Your API key is stored at `0600` permissions in your local config directory and is never transmitted anywhere except the provider's official API endpoint.
- RepoKit's own servers (if any) never see your key or your repo contents.

## Providers

RepoKit supports a wide range of AI providers out of the box:
- **Anthropic** (Claude 5 series)
- **OpenAI** (GPT-5.6 series)
- **Google Gemini** (Gemini 3.5 series)
- **Groq** (Fast Llama & Open Source models)
- **OpenRouter** (Any model)
- **Ollama** (Local models)

## Contributing

Contributions are welcome! Please run `npm run test:all` before submitting any PRs to ensure tests, linting, and formatting pass.

## License

MIT License. See [LICENSE](LICENSE) for details.
