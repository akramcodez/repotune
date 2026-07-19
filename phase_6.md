# Phase 6 — Optional Stretch (Only If There's Traction)

> **Goal:** Unlock the moat — features that only make sense once there are real users.  
> Don't build this speculatively. Ship Phases 1–5, see what people actually use, then come back here.

---

## Gate: When to start Phase 6

Start Phase 6 **only if** at least one of these is true:

- [ ] 500+ weekly downloads on npm
- [ ] 10+ GitHub issues from real users with feature requests
- [ ] Organic mentions or references in repos/blogs
- [ ] Someone asks "can I see stats across all my org's repos?"

If none of these are true, continue iterating on Phase 1–5 polish instead.

---

## Deliverable A — Opt-In Anonymous Usage Telemetry

### Purpose

Understand which checks matter most to real users. Right now there are 13 checks and arbitrary weights — telemetry turns that into data.

**Non-negotiable constraint:** 100% opt-in, clearly explained, easy to disable.

### What gets collected (if opted in)

```ts
interface TelemetryEvent {
  event: 'scan' | 'doctor_generate' | 'doctor_deny' | 'doctor_allow_all'
  checkId?: string             // e.g. 'security', 'contributing'
  provider?: string            // 'openai' | 'anthropic' | etc.
  score?: number               // final scan score (rounded to nearest 5)
  timestamp: string            // ISO date only, no time
  sessionId: string            // random per-run UUID, not tied to any identity
}
```

### What is never collected

- File contents
- API keys
- Repo names or URLs
- User identity
- IP addresses (use a proxy/aggregation service)

### Opt-in prompt — shown once, on first run

```
Help improve RepoKit?

Share anonymous usage data — which checks fire, which fixes
are accepted, nothing else. No file contents, no personal info.

You can review what gets sent: repokit telemetry --show
You can opt out at any time:   repokit telemetry --disable

❯ Enable (recommended)
  Disable
```

### Commands

```bash
repokit telemetry --show      # print what would be sent
repokit telemetry --disable   # disable permanently
repokit telemetry --enable    # re-enable
repokit telemetry --status    # show current setting
```

### Implementation

- Single `POST` to a self-hosted endpoint (not a third-party analytics SaaS)
- Fire-and-forget with a 2-second timeout — never blocks the CLI
- Stored via `conf` (`telemetry.enabled`, `telemetry.sessionId`)

```ts
// src/telemetry/index.ts
export async function track(event: TelemetryEvent): Promise<void> {
  if (!isTelemetryEnabled()) return
  try {
    await Promise.race([
      fetch('https://telemetry.repokit.dev/event', {
        method: 'POST',
        body: JSON.stringify(event),
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(2000),
      }),
      new Promise((_, reject) => setTimeout(() => reject(), 2000))
    ])
  } catch {
    // Silently swallow — never crash the CLI over telemetry
  }
}
```

---

## Deliverable B — Hosted Dashboard (Org-Wide Repo Health)

### Purpose

The real moat. A CLI can scan one repo. A dashboard can scan an entire GitHub org and show health trends across 50 repos at once. This is where engineering managers will pay.

### What it does

```
Organization: your-org         Updated: 5 min ago

Repository           Score   Checks   Last fixed
───────────────────────────────────────────────
awesome-lib          91/100   13/13    3 days ago
backend-api           73/100    9/13    2 weeks ago
frontend              58/100    7/13    1 month ago
legacy-service        34/100    4/13    Never
```

- Sortable by score, last updated, most issues
- Drill into any repo to see exactly which checks failed
- Track score over time (trend chart)
- Email/Slack digest: "3 repos dropped below 70 this week"

### Authentication model

```
repokit auth --org your-org
```

- OAuth flow with GitHub — no password, no personal data beyond org membership
- API token scoped to read-only access to repo names and public metadata
- Org admin installs the GitHub App once; individual repos are scanned on-demand

### Architecture

```
CLI                Dashboard API          GitHub API
─────              ─────────────          ──────────
repokit auth   →   OAuth exchange    →    GitHub OAuth
                   Store JWT locally
repokit push   →   POST scan results →    (cached)
                   /api/repos/{repo}
                   
Browser            Dashboard UI
──────             ────────────
dashboard.repokit.dev
Shows org-level aggregated view
```

### Pricing model (if monetizing)

| Tier | Price | Limit |
|---|---|---|
| Free | $0 | 5 repos, no history |
| Team | $19/mo | 25 repos, 90-day history |
| Org | $49/mo | Unlimited repos, 1-year history, Slack digest |

---

## Deliverable C — `repokit push` (Dashboard integration)

```bash
repokit push
```

Uploads the last scan result to the dashboard. Zero interactive prompts — just a silent `POST`.

```
✓ Results synced to dashboard.repokit.dev
  View: https://dashboard.repokit.dev/org/your-org/your-repo
```

Can be added to CI:

```yaml
- run: npx repokit scan && npx repokit push
  env:
    REPOKIT_TOKEN: ${{ secrets.REPOKIT_TOKEN }}
```

---

## Deliverable D — Score Trend Over Time

Stored in the dashboard database, surfaced in two ways:

1. **In CLI:** `repokit scan --history` shows last 5 scores with dates
2. **In dashboard:** sparkline chart per repo

```
Repository Score History

  100 │
   90 │         ●─────●
   80 │   ●─────╯
   70 │───╯
   60 │
      └─────────────────────
      Aug  Sep  Oct  Nov  Dec
```

---

## Deliverable E — GitHub App

A GitHub App that:

1. Runs `repokit scan` on every PR
2. Posts a check result (pass/fail + score) on the PR
3. Optionally comments with specific missing files

This turns RepoKit into part of the PR review process — maintainers stop merging without a LICENSE or SECURITY.md by accident.

```
RepoKit Health Check   ✓ passed
Score: 91/100 (was 88/100)
Checks: 13/13

View full report: https://dashboard.repokit.dev/...
```

---

## Phase 6 Notes

- **Don't rush this.** Every item here is expensive to build and maintain.
- The telemetry endpoint needs a privacy policy and GDPR compliance if any EU users.
- The dashboard is a separate web project — not part of the CLI repo.
- The GitHub App is a separate service with its own deployment.
- Phase 6 is where the project transitions from a side project to a product.
