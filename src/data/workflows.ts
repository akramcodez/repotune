export interface WorkflowTemplate {
  label: string
  rationale: string
  outputPath: string
  generate: (pm: 'npm' | 'yarn' | 'pnpm' | 'bun', nodeVersion?: number) => string
}

export const WORKFLOWS: Record<string, WorkflowTemplate> = {
  ci: {
    label: 'GitHub CI',
    rationale: 'Runs your test suite on every push/PR',
    outputPath: '.github/workflows/ci.yml',
    generate: (pm, nodeVersion = 20) => {
      const installCmd = pm === 'npm' ? 'npm ci' : `${pm} install`
      return `name: CI

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
${pm === 'pnpm' ? `      - uses: pnpm/action-setup@v4
` : ''}      - uses: actions/setup-node@v4
        with:
          node-version: ${nodeVersion}
          cache: '${pm === 'bun' ? '' : pm}'
      - run: ${installCmd}
      - run: ${pm === 'npm' ? 'npm run' : pm} test
`
    }
  },
  release: {
    label: 'Release',
    rationale: 'Auto-publishes a GitHub release on tag push',
    outputPath: '.github/workflows/release.yml',
    generate: () => `name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Create Release
        uses: softprops/action-gh-release@v2
        with:
          generate_release_notes: true
`
  },
  codeql: {
    label: 'CodeQL',
    rationale: "GitHub's free static security scanning",
    outputPath: '.github/workflows/codeql.yml',
    generate: () => `name: "CodeQL"

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]
  schedule:
    - cron: '0 0 * * 0'

jobs:
  analyze:
    name: Analyze
    runs-on: ubuntu-latest
    permissions:
      actions: read
      contents: read
      security-events: write

    steps:
    - name: Checkout repository
      uses: actions/checkout@v4

    - name: Initialize CodeQL
      uses: github/codeql-action/init@v3
      with:
        languages: 'javascript'

    - name: Perform CodeQL Analysis
      uses: github/codeql-action/analyze@v3
`
  },
  dependabot: {
    label: 'Dependabot',
    rationale: 'Automated dependency update PRs',
    outputPath: '.github/dependabot.yml',
    generate: () => `version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
`
  },
  renovate: {
    label: 'Renovate',
    rationale: 'Alternative to Dependabot, more configurable',
    outputPath: 'renovate.json',
    generate: () => `{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": [
    "config:recommended"
  ]
}
`
  },
  stale: {
    label: 'Stale bot',
    rationale: 'Auto-closes stale issues after 30 days',
    outputPath: '.github/workflows/stale.yml',
    generate: () => `name: Close Stale Issues

on:
  schedule:
    - cron: '30 1 * * *'

jobs:
  stale:
    runs-on: ubuntu-latest
    permissions:
      issues: write
      pull-requests: write
    steps:
      - uses: actions/stale@v9
        with:
          stale-issue-message: 'This issue is stale because it has been open 30 days with no activity.'
          close-issue-message: 'This issue was closed because it has been stalled for 14 days with no activity.'
          days-before-stale: 30
          days-before-close: 14
`
  }
}
