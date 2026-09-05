import { execa } from 'execa'
import type { ProviderAdapter } from './types.js'

export interface AgentConfig {
  name: string
  command: string
  args: (prompt: string) => string[]
}

const AGENTS: Record<string, AgentConfig> = {
  claude: { name: 'Claude Code', command: 'claude', args: (p) => ['-p', p] },
  codex: { name: 'Codex CLI', command: 'codex', args: (p) => ['exec', '--json', p] },
  gemini: { name: 'Gemini CLI', command: 'gemini', args: (p) => ['--skip-trust', '--prompt', p] },
  cursor: { name: 'Cursor Agent', command: 'cursor-agent', args: (p) => ['-p', p] },
  opencode: { name: 'OpenCode', command: 'opencode', args: (p) => ['run', p] },
}

export function createAgentAdapter(agentId: string): ProviderAdapter {
  let agent = AGENTS[agentId]
  if (!agent) {
    const parts = agentId.split(' ')
    const cmd = parts.shift()!
    agent = {
      name: `Custom Agent (${cmd})`,
      command: cmd,
      args: (p) => [...parts, p],
    }
  }

  return {
    name: agent.name,
    defaultModel: agentId,
    requiresKey: false,
    availableModels: [],
    async validateKey(): Promise<{ valid: boolean; reason: string }> {
      return { valid: true, reason: '' }
    },
    async generate(prompt: string, context: string): Promise<string> {
      try {
        // Test if command exists
        await execa('which', [agent.command])
      } catch {
        throw new Error(`External agent tool '${agent.command}' is not installed or not in PATH.`)
      }

      // We prefix context since these CLIs typically don't have separate system prompt args
      const fullPrompt = `Repository Context:\n${context}\n\nTask:\n${prompt}`

      const args = agent.args(fullPrompt)

      let stdout = ''
      try {
        const result = await execa(agent.command, args, { stdin: 'ignore' })
        stdout = result.stdout
      } catch (e: unknown) {
        const err = e as { stderr?: string; stdout?: string; exitCode?: number }
        const stderr = err.stderr ? `\n\nStderr:\n${err.stderr.trim()}` : ''
        const stdoutErr = err.stdout ? `\n\nStdout:\n${err.stdout.trim()}` : ''
        throw new Error(
          `Agent '${agent.command}' failed (Exit ${err.exitCode || 'Unknown'}).${stderr}${stdoutErr}`,
        )
      }

      // Strip markdown code fences if the agent wrapped the whole output
      let clean = stdout.trim()

      if (agent.command === 'codex' && args.includes('--json')) {
        let codexOutput = ''
        for (const line of clean.split('\n')) {
          try {
            const data = JSON.parse(line)
            if (data.type === 'item.completed' && data.item?.type === 'agent_message') {
              codexOutput += data.item.text
            }
          } catch {}
        }
        if (codexOutput) clean = codexOutput.trim()
      }

      if (clean.startsWith('```') && clean.endsWith('```')) {
        const lines = clean.split('\n')
        lines.shift() // remove top ```...
        lines.pop() // remove bottom ```
        clean = lines.join('\n').trim()
      }
      return clean
    },
  }
}
