export interface Explanation {
  title: string
  purpose: string
  benefits: string[]
  githubNative: boolean
  example: string
  generateCommand: string
}

export const EXPLANATIONS: Record<string, Explanation> = {
  security: {
    title: 'Security Policy',
    purpose: 'A SECURITY.md file tells security researchers how to responsibly disclose vulnerabilities in your project.',
    benefits: [
      'GitHub Security tab support',
      'Reduces bad-faith public disclosure',
      'Builds trust with enterprise users'
    ],
    githubNative: true,
    example: '# Security Policy\n\n## Reporting a Vulnerability\nPlease email security@yourproject.com ...',
    generateCommand: 'repokit doctor',
  },
  contributing: {
    title: 'Contributing Guidelines',
    purpose: 'A CONTRIBUTING.md file explains how developers can set up the project locally, run tests, and submit PRs.',
    benefits: [
      'Streamlines onboarding for new contributors',
      'Enforces code style and PR processes',
      'Reduces maintainer burden'
    ],
    githubNative: true,
    example: '# Contributing\n\n1. Fork the repo\n2. Run `npm install`\n3. Submit a PR ...',
    generateCommand: 'repokit doctor',
  },
  ci: {
    title: 'Continuous Integration (CI)',
    purpose: 'CI workflows automatically run tests, linters, and builds on every push and pull request.',
    benefits: [
      'Catches bugs before they are merged',
      'Ensures code compiles on all platforms',
      'Provides a green checkmark on PRs'
    ],
    githubNative: true,
    example: 'name: CI\non: [push, pull_request]\njobs:\n  test:\n    runs-on: ubuntu-latest...',
    generateCommand: 'repokit ci',
  },
  license: {
    title: 'Open Source License',
    purpose: 'A LICENSE file explicitly grants permissions for others to use, modify, and distribute your code.',
    benefits: [
      'Provides legal clarity',
      'Allows enterprises to adopt your project',
      'Required for true open-source status'
    ],
    githubNative: true,
    example: 'MIT License\n\nCopyright (c) 2026 ...',
    generateCommand: 'N/A (Add manually)',
  },
  changelog: {
    title: 'Changelog',
    purpose: 'A CHANGELOG.md file maintains a curated, chronological list of notable changes for each project release.',
    benefits: [
      'Helps users understand what changed',
      'Highlights breaking changes',
      'Acts as release notes'
    ],
    githubNative: false,
    example: '# Changelog\n\n## [1.0.0] - 2026-07-20\n### Added\n- repokit ci command',
    generateCommand: 'repokit doctor',
  },
  'code-of-conduct': {
    title: 'Code of Conduct',
    purpose: 'Sets expectations for community behavior and provides reporting mechanisms for harassment.',
    benefits: [
      'Creates a welcoming environment',
      'Provides a framework for dispute resolution',
      'Fulfills requirements for some foundations'
    ],
    githubNative: true,
    example: '# Contributor Covenant Code of Conduct\n\n## Our Pledge...',
    generateCommand: 'repokit doctor',
  },
  funding: {
    title: 'Funding Configuration',
    purpose: 'A FUNDING.yml file adds a "Sponsor" button to your GitHub repository.',
    benefits: [
      'Allows the community to financially support you',
      'Integrates directly into GitHub UI',
      'Supports multiple platforms (Patreon, OpenCollective, etc.)'
    ],
    githubNative: true,
    example: 'github: yourusername\npatreon: yourusername',
    generateCommand: 'repokit doctor',
  },
  'pr-template': {
    title: 'Pull Request Template',
    purpose: 'A markdown template that populates the description field when users create a new Pull Request.',
    benefits: [
      'Standardizes PR descriptions',
      'Reminds contributors to run tests and link issues',
      'Saves maintainer time'
    ],
    githubNative: true,
    example: '## Description\n\nFixes #\n\n## Checklist\n- [ ] Tests pass...',
    generateCommand: 'repokit doctor',
  },
  'issue-template': {
    title: 'Issue Templates',
    purpose: 'Templates that guide users to provide the right information when reporting bugs or requesting features.',
    benefits: [
      'Reduces back-and-forth for missing info',
      'Separates bugs from feature requests',
      'Improves issue triage speed'
    ],
    githubNative: true,
    example: 'name: Bug Report\ndescription: File a bug report\nbody:\n  - type: textarea...',
    generateCommand: 'repokit doctor',
  }
}
