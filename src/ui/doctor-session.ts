import { getAdapter } from '../adapters/index.js'
import { buildContext } from '../utils/context.js'
import { startPulse } from '../ui/pulse.js'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { select } from './prompts.js'
import type { CheckResult } from '../checks/types.js'
import { renderDiff } from './diff.js'
import { generateCacheKey, getCache, setCache } from '../utils/cache.js'
import type { ProviderAdapter } from '../adapters/types.js'
import { readFileSafe } from '../utils/fs.js'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { getConfig } from '../config/store.js'
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { track } from '../telemetry/index.js'
import { recordAction, type HistoryChange } from '../utils/history.js'

async function generateCached(adapter: ProviderAdapter, prompt: string, context: string): Promise<string> {
  const wrappedPrompt = `${prompt}\n\nCRITICAL FORMATTING: You MUST wrap the final file content entirely inside <REPOTUNE_FILE> and </REPOTUNE_FILE> XML tags. Do NOT put any conversational text or chain-of-thought inside these tags.`
  
  const { model = adapter.defaultModel } = getConfig()
  const key = generateCacheKey(wrappedPrompt, context, model)
  const cached = getCache(key)
  if (cached) {
    process.stdout.write(`  \x1b[32m[Cache Hit: $0.00]\x1b[0m\n`)
    return cached
  }
  let result = await adapter.generate(wrappedPrompt, context)
  
  const match = result.match(/<REPOTUNE_FILE>\s*([\s\S]*?)\s*<\/REPOTUNE_FILE>/)
  if (match && match[1] !== undefined) {
    result = match[1]
    if (result.startsWith('```') && result.endsWith('```')) {
       const lines = result.split('\n')
       lines.shift()
       lines.pop()
       result = lines.join('\n').trim()
    }
  }

  setCache(key, result)
  return result
}

function getMissingFilePrompt(checkId: string): string {
  // Simple mapping for Phase 2 missing files
  const map: Record<string, string> = {
    'security': 'Generate a minimal, standard SECURITY.md file. It MUST include a section for "Reporting a Vulnerability" using the author\'s contact info from the manifest. DO NOT use dummy placeholders like "[Insert Email]" or fake links.',
    'contributing': 'Generate a highly detailed and comprehensive CONTRIBUTING.md file. Include step-by-step sections for Development Setup (using scripts from the manifest), Testing Guidelines, and Pull Request Instructions. Make it professional and robust.',
    'code-of-conduct': 'Generate a standard Code of Conduct strictly using the Contributor Covenant v2.1 text. Replace any contact placeholders with the author\'s email from the manifest. DO NOT add extra fluff or emojis.',
    'issue-template': 'Generate a single, unified GitHub issue template. It MUST use exactly this format and no other text or signatures:\n## Description\n...\n## Steps to Reproduce (If reporting a bug)\n...\n## Expected Behavior / Proposed Solution\n...\n## Environment\n...\n## Additional Information',
    'pr-template': 'Generate a minimal, short GitHub Pull Request template with only 3 sections: Description, Related Issues, and a short Checklist. DO NOT add a hardcoded "Signed-off-by" or pre-sign the template with the author name.',
    'changelog': 'Generate a CHANGELOG.md file strictly based on Keep a Changelog. Use the project version from the manifest as the initial release version. DO NOT output skeleton text, dummy placeholders like "[Unreleased]", fake dates, or any extra text.',
    'readme': 'Generate a very high-quality, comprehensive README.md. Use the project manifest (name, description, scripts, dependencies) to write sections for Features, Installation, Usage, and Contributing. It must be polished and ready for production.'
  }
  const basePrompt = map[checkId] || `Generate a missing ${checkId} file for this repository.`
  return `${basePrompt}\n\nCRITICAL INSTRUCTION: DO NOT use emojis anywhere in the file. DO NOT use placeholders like <your-username> or <repo-name>. Instead, infer the actual repository URL, author name, and project name from the provided context (git config, remote URL, or package.json). Internally verify your output before answering to ensure it is extremely high quality and follows all rules.`
}

function getMissingFilePath(checkId: string): string {
  const map: Record<string, string> = {
    'security': 'SECURITY.md',
    'contributing': 'CONTRIBUTING.md',
    'code-of-conduct': 'CODE_OF_CONDUCT.md',
    'issue-template': '.github/ISSUE_TEMPLATE.md',
    'pr-template': '.github/PULL_REQUEST_TEMPLATE.md',
    'changelog': 'CHANGELOG.md',
    'readme': 'README.md',
    'license': 'LICENSE'
  }
  return map[checkId] || `${checkId}.md`
}

function printFileContext(check: CheckResult, providerName: string, filePath: string) {
  process.stdout.write(`\n────────────────────────────────────────\n`)
  process.stdout.write(`\x1b[1m${filePath}\x1b[0m   \x1b[32m[new]\x1b[0m\n\n`)
  process.stdout.write(`\x1b[1mWhy?\x1b[0m\n  This repository is missing a ${check.label}.\n\n`)
  if (providerName) {
    process.stdout.write(`\x1b[1mWhat gets sent to ${providerName}:\x1b[0m\n`)
    process.stdout.write(`  • Your repo's file/folder names\n`)
    process.stdout.write(`  • package.json (or equivalent manifest)\n`)
    process.stdout.write(`  • Nothing else - no source code is transmitted.\n\n`)
  } else {
    process.stdout.write(`\x1b[1mOffline Template Mode:\x1b[0m\n`)
    process.stdout.write(`  • This file will be generated locally using a standard template.\n`)
    process.stdout.write(`  • No data will be sent to any external service.\n\n`)
  }
}

export async function runDoctorSession(
  dir: string,
  missing: CheckResult[],
  outdated: CheckResult[],
  weak: CheckResult[],
  autoAllowAll = false,
  agentName?: string
): Promise<void> {
  const { hasConfig } = await import('../config/store.js')
  let adapter: ProviderAdapter | null = null
  
  if (agentName) {
    const { createAgentAdapter } = await import('../adapters/agent.js')
    adapter = createAgentAdapter(agentName)
  } else if (hasConfig()) {
    adapter = getAdapter()
  }

  let allowAll = autoAllowAll
  const historyChanges: HistoryChange[] = []

  // --- Group 1: Missing files ---
  for (const check of missing) {
    let templateId = check.id
    if (check.id === 'license') {
      const { select } = await import('./prompts.js')
      const lic = await select({
        message: 'Which license would you like to use?',
        choices: [
          { value: 'license-mit', name: 'MIT License' },
          { value: 'license-apache', name: 'Apache 2.0 License' }
        ]
      })
      if (lic === 'cancel') {
        console.log('\n\x1b[33mRun cancelled by user.\x1b[0m\n')
        process.exit(0)
      }
      templateId = lic as string
    }

    const { getTemplateContent } = await import('../templates/index.js')
    const templateContent = await getTemplateContent(templateId, dir)

    const filePath = getMissingFilePath(check.id)
    printFileContext(check, adapter?.name || '', filePath)

    if (!allowAll) {
      const action = await select({
        message: 'Actions',
        choices: [
          { value: 'allow', name: 'Allow' },
          { value: 'deny', name: 'Deny' },
          { value: 'allow-all', name: 'Allow All (this run)' },
          { value: 'cancel', name: 'Cancel Run (Exit)' },
        ]
      })

      process.stdout.write(`────────────────────────────────────────\n`)
      if (action === 'cancel') {
        console.log('\n\x1b[33mRun cancelled by user.\x1b[0m\n')
        process.exit(0)
      }
      if (action === 'deny') {
        if (adapter) await track({ event: 'doctor_deny', checkId: check.id, provider: getConfig().provider })
        continue
      }
      if (action === 'allow-all') {
        if (adapter) await track({ event: 'doctor_allow_all', checkId: check.id, provider: getConfig().provider })
        allowAll = true
      }
    } else {
      process.stdout.write(`────────────────────────────────────────\n`)
    }

    const s = startPulse(`Generating ${check.label}...`)
    try {
      let content = ''
      if (!adapter) {
        if (!templateContent) {
          s.stop(`\x1b[33m✗ Skipped ${check.label} (requires AI provider or valid template)\x1b[0m`)
          continue
        }
        content = templateContent
      } else {
        let prompt = getMissingFilePrompt(check.id)
        if (templateContent) {
          prompt += `\n\nHere is a solid template you can start with. Customize it for this repository:\n\n${templateContent}`
        }
        const context = await buildContext(dir)
        content = await generateCached(adapter, prompt, context)
      }
      
      const fullPath = path.join(dir, filePath)
      await mkdir(path.dirname(fullPath), { recursive: true })
      await writeFile(fullPath, content, 'utf8')
      historyChanges.push({ filePath, originalContent: null })
      if (adapter) await track({ event: 'doctor_generate', checkId: check.id, provider: getConfig().provider })
      s.stop(`\x1b[32m✓ Generated ${check.label}\x1b[0m`)
    } catch (e: unknown) {
      s.stop(`\x1b[31m✗ Failed to generate ${check.label}: ${(e as Error).message}\x1b[0m`)
    }
  }

  // --- Group 2: Outdated files ---
  for (const check of outdated) {
    if (!adapter) {
      console.log(`\x1b[33m✗ Skipped ${check.file} update (requires AI provider)\x1b[0m`)
      continue
    }

    if (!check.file) continue
    const filePath = check.file
    const fullPath = path.join(dir, filePath)
    const currentContent = await readFileSafe(fullPath)
    if (currentContent === null) continue

    process.stdout.write(`\n────────────────────────────────────────\n`)
    process.stdout.write(`\x1b[1m${filePath}\x1b[0m   \x1b[33m[update]\x1b[0m\n\n`)
    process.stdout.write(`\x1b[1mWhy?\x1b[0m\n  ${check.issue}\n\n`)
    process.stdout.write(`\x1b[1mWhat gets sent to ${adapter.name}:\x1b[0m\n`)
    process.stdout.write(`  • The full current contents of ${filePath}\n`)
    if (check.id === 'changelog-outdated') {
      process.stdout.write(`  • Your recent git commit history\n\n`)
    } else {
      process.stdout.write(`  • package.json (to confirm the current package manager)\n\n`)
    }

    const s = startPulse(`Generating patch for ${filePath}...`)
    let newContent = ''
    try {
      let prompt = `You are editing an existing file to fix a specific issue.

Issue to fix: ${check.issue}

Current file contents:
${currentContent}

CRITICAL INSTRUCTION: Your output MUST be the complete, modified file from the very first line to the very last line. DO NOT output a diff or patch format. DO NOT use placeholders like "..." or "rest of the file". DO NOT omit unchanged sections. You must output the entire file with the fix applied.`

      if (check.id === 'changelog-outdated') {
        const { getRecentCommits } = await import('../utils/git.js')
        const gitLog = await getRecentCommits(dir)
        prompt = `You are updating a CHANGELOG.md file. 
Issue: ${check.issue} (The new version is not documented).

Here are the recent git commits:
${gitLog}

CRITICAL INSTRUCTION: Prepend a new section at the top (under the main header) for the new version. Format it exactly like the previous entries following "Keep a Changelog". Group the commits into Added, Changed, Deprecated, Removed, Fixed, or Security based on their meaning. 
Your output MUST be the complete, modified file from the very first line to the very last line. DO NOT output a diff or patch format. DO NOT use placeholders like "..." or "rest of the file". DO NOT omit unchanged sections.`
      }

      const context = await buildContext(dir)
      newContent = await generateCached(adapter, prompt, context)
      s.stop('')
    } catch (e: unknown) {
      s.stop(`\x1b[31m✗ Failed to generate patch: ${(e as Error).message}\x1b[0m`)
      continue
    }

    const diffOutput = renderDiff(currentContent, newContent)
    process.stdout.write(`\x1b[1mPreview (diff)\x1b[0m\n${diffOutput}\n\n`)

    if (!allowAll) {
      const action = await select({
        message: 'Actions',
        choices: [
          { value: 'allow', name: 'Allow (apply this section only)' },
          { value: 'deny', name: 'Deny' },
          { value: 'allow-all', name: 'Allow All (this run)' },
          { value: 'cancel', name: 'Cancel Run (Exit)' },
        ]
      })

      process.stdout.write(`────────────────────────────────────────\n`)
      if (action === 'cancel') {
        console.log('\n\x1b[33mRun cancelled by user.\x1b[0m\n')
        process.exit(0)
      }
      if (action === 'deny') {
        await track({ event: 'doctor_deny', checkId: check.id, provider: getConfig().provider })
        continue
      }
      if (action === 'allow-all') {
        await track({ event: 'doctor_allow_all', checkId: check.id, provider: getConfig().provider })
        allowAll = true
      }
    } else {
      process.stdout.write(`────────────────────────────────────────\n`)
    }

    try {
      await writeFile(fullPath, newContent, 'utf8')
      historyChanges.push({ filePath, originalContent: currentContent })
      await track({ event: 'doctor_generate', checkId: check.id, provider: getConfig().provider })
      console.log(`\x1b[32m✓ Updated ${filePath}\x1b[0m`)
    } catch (e: unknown) {
      console.log(`\x1b[31m✗ Failed to write patch: ${(e as Error).message}\x1b[0m`)
    }
  }

  // --- Group 3: Weak files ---
  for (const check of weak) {
    if (!adapter) {
      console.log(`\x1b[33m✗ Skipped ${check.file} expansion (requires AI provider)\x1b[0m`)
      continue
    }

    if (!check.file) continue
    const filePath = check.file
    const fullPath = path.join(dir, filePath)
    const currentContent = await readFileSafe(fullPath)
    if (currentContent === null) continue

    process.stdout.write(`\n────────────────────────────────────────\n`)
    process.stdout.write(`\x1b[1m${filePath}\x1b[0m   \x1b[36m[expand]\x1b[0m\n\n`)
    process.stdout.write(`\x1b[1mWhy?\x1b[0m\n  ${check.issue}\n\n`)
    process.stdout.write(`\x1b[1mWhat gets sent to ${adapter.name}:\x1b[0m\n`)
    process.stdout.write(`  • The full current contents of ${filePath}\n`)
    process.stdout.write(`  • package.json\n\n`)

    const s = startPulse(`Expanding ${filePath}...`)
    let newContent = ''
    try {
      const prompt = `You are improving an existing but weak ${filePath}.
You must expand sections that are missing or too brief to make it highly professional and comprehensive.

CRITICAL INSTRUCTION FOR EXISTING CONTENT: 
If the file contains default framework boilerplate (e.g. from Vite, Next.js), repotune init boilerplate, or auto-generated template placeholders (e.g. "A wonderful open source project", "maintainers@example.com", "- Feature 1", or "[your-project-name]"), you MUST completely remove and rewrite those sections with real, specific details about this repository. Otherwise, preserve any genuine content the user has written.

If you are expanding a CONTRIBUTING.md, ensure you add comprehensive sections for Development Setup (using manifest scripts), Testing Guidelines, and Pull Request Instructions.
If you are expanding a README.md, ensure you add comprehensive sections for Features, Installation, Usage, and Contributing.

Issue: ${check.issue}

Current file contents:
${currentContent}

CRITICAL INSTRUCTION: Your output MUST be the complete, modified file from the very first line to the very last line. DO NOT output a diff or patch format. DO NOT use placeholders like "..." or "rest of the file". DO NOT omit unchanged sections. You must output the entire file with the expansions applied.`
      const context = await buildContext(dir)
      newContent = await generateCached(adapter, prompt, context)
      s.stop('')
    } catch (e: unknown) {
      s.stop(`\x1b[31m✗ Failed to expand file: ${(e as Error).message}\x1b[0m`)
      continue
    }

    const diffOutput = renderDiff(currentContent, newContent)
    process.stdout.write(`\x1b[1mPreview (diff)\x1b[0m\n${diffOutput}\n\n`)

    if (!allowAll) {
      const action = await select({
        message: 'Actions',
        choices: [
          { value: 'allow', name: 'Allow' },
          { value: 'deny', name: 'Deny' },
          { value: 'allow-all', name: 'Allow All (this run)' },
          { value: 'cancel', name: 'Cancel Run (Exit)' },
        ]
      })

      process.stdout.write(`────────────────────────────────────────\n`)
      if (action === 'cancel') {
        console.log('\n\x1b[33mRun cancelled by user.\x1b[0m\n')
        process.exit(0)
      }
      if (action === 'deny') {
        await track({ event: 'doctor_deny', checkId: check.id, provider: getConfig().provider })
        continue
      }
      if (action === 'allow-all') {
        await track({ event: 'doctor_allow_all', checkId: check.id, provider: getConfig().provider })
        allowAll = true
      }
    } else {
      process.stdout.write(`────────────────────────────────────────\n`)
    }

    try {
      await writeFile(fullPath, newContent, 'utf8')
      historyChanges.push({ filePath, originalContent: currentContent })
      await track({ event: 'doctor_generate', checkId: check.id, provider: getConfig().provider })
      console.log(`\x1b[32m✓ Expanded ${filePath}\x1b[0m`)
    } catch (e: unknown) {
      console.log(`\x1b[31m✗ Failed to write file: ${(e as Error).message}\x1b[0m`)
    }
  }

  if (historyChanges.length > 0) {
    const isFirstTime = await recordAction(dir, 'doctor', historyChanges)
    if (isFirstTime) {
      console.log(`\x1b[36mℹ Created .repotune folder to track history (so you can run 'repotune revert').\x1b[0m\n`)
    }
  }

  console.log('\n\x1b[32m✔ Done.\x1b[0m\n')
}
