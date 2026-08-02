# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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