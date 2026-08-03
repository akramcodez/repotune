/* eslint-disable @typescript-eslint/no-explicit-any */
import { setConfig, store, hasConfig, clearConfig } from '../config/store.js'
import { startPulse } from '../ui/pulse.js'
import { select, password } from '../ui/prompts.js'
import { openaiAdapter } from '../adapters/openai.js'
import { anthropicAdapter } from '../adapters/anthropic.js'
import { geminiAdapter } from '../adapters/gemini.js'
import { openrouterAdapter } from '../adapters/openrouter.js'
import { ollamaAdapter } from '../adapters/ollama.js'
import { groqAdapter } from '../adapters/groq.js'
import type { ProviderAdapter } from '../adapters/types.js'

const ADAPTERS: Record<string, ProviderAdapter> = {
  openai: openaiAdapter,
  anthropic: anthropicAdapter,
  gemini: geminiAdapter,
  openrouter: openrouterAdapter,
  ollama: ollamaAdapter,
  groq: groqAdapter,
}

export interface ConfigOptions {
  provider?: string
  removeKey?: boolean
  reset?: boolean
  show?: boolean
  customAgent?: string
}

export async function runConfig(opts: ConfigOptions = {}) {
  if (opts.reset) {
    clearConfig()
    console.log('\n\x1b[32m✔ Configuration reset.\x1b[0m\n')
    return
  }

  if (opts.customAgent) {
    setConfig({ customAgent: opts.customAgent })
    console.log(`\n\x1b[32m✔ Custom external agent permanently set to:\x1b[0m ${opts.customAgent}`)
    console.log(`You can now run \`repotune doctor\` and it will automatically delegate to this agent.\n`)
    return
  }

  if (opts.removeKey) {
     
    store.delete('apiKey' as any)
    console.log('\n\x1b[32m✔ API key removed from configuration.\x1b[0m\n')
    return
  }

  if (opts.show) {
    if (!hasConfig()) {
      console.log('\nNo configuration found. Run \x1b[36mrepotune config\x1b[0m to set up.\n')
      return
    }
    const { provider, apiKey, model } = store.store
    const maskedKey = apiKey ? `sk-${'*'.repeat(Math.max(10, apiKey.length - 3))}` : 'None'
    console.log(`\nProvider:  ${provider}\nAPI Key:   ${maskedKey}\nModel:     ${model || 'Default'}\nStored at: ${store.path}\n`)
    return
  }

  console.log()
  
  const currentProvider = store.get('provider')
  if (currentProvider) {
    console.log(`Current: ${ADAPTERS[currentProvider]?.name || currentProvider}\n`)
  }

  // Interactive Flow
  const provider = opts.provider || await select({
    message: 'Which AI provider would you like to use?',
    choices: [
      { value: 'openai',     name: 'OpenAI' },
      { value: 'anthropic',  name: 'Anthropic' },
      { value: 'gemini',     name: 'Google Gemini' },
      { value: 'openrouter', name: 'OpenRouter' },
      { value: 'ollama',     name: 'Ollama (Local)' },
      { value: 'groq',       name: 'Groq' },
      { value: 'skip',       name: 'Skip for now' },
    ],
  })

  if (provider === 'skip') {
    console.log('\n\x1b[33mSetup cancelled.\x1b[0m\n')
    return process.exit(0)
  }

  const adapter = ADAPTERS[provider as string]
  if (!adapter) {
    console.log('\n\x1b[31m✗ Unknown provider.\x1b[0m\n')
    return process.exit(1)
  }

  let apiKey = ''
  if (adapter.requiresKey) {
    if (provider === 'groq') {
      console.log('\x1b[90m(You can get a free API key at https://console.groq.com)\x1b[0m')
    }
    apiKey = await password({ message: `Enter your ${adapter.name} API key` })
    if (!apiKey) {
      console.log('\n\x1b[33mSetup cancelled.\x1b[0m\n')
      return process.exit(0)
    }

    const s = startPulse('Validating key...')
    const result = await adapter.validateKey(apiKey)
    if (!result.valid) {
      s.stop(`\x1b[31m✗ Key rejected: ${result.reason}\x1b[0m`)
      process.exit(1)
    }
    s.stop('\x1b[32m✓ Key confirmed working\x1b[0m')
  } else {
    const s = startPulse(`Checking ${adapter.name} connection...`)
    const result = await adapter.validateKey('')
    if (!result.valid) {
      s.stop(`\x1b[31m✗ Could not connect to local server: ${result.reason}\x1b[0m`)
      process.exit(1)
    }
    s.stop(`\x1b[32m✓ ${adapter.name} is reachable\x1b[0m`)
  }

  let availableModels = adapter.availableModels
  if (adapter.fetchModels) {
    const s = startPulse('Fetching available models...')
    availableModels = await adapter.fetchModels()
    s.stop('')
  }

  let model = adapter.defaultModel
  if (availableModels.length > 0) {
    console.log()
    model = await select({
      message: 'Which model would you like to use?',
      choices: availableModels.map(m => ({ value: m, name: m })),
    }) as string
  } else if (availableModels.length === 0 && adapter.name.includes('Ollama')) {
    console.log('\n\x1b[33mNo models found on local Ollama server. Please run `ollama pull <model>` first.\x1b[0m')
    process.exit(1)
  }

  // Set config so the test generation can use it
   
  setConfig({ provider: provider as any, apiKey, model })

  console.log(`\n\x1b[32m✓ Switched to ${adapter.name}.\x1b[0m\n`)
  if (currentProvider && currentProvider !== provider) {
    console.log(`Note: files already generated under ${ADAPTERS[currentProvider]?.name || currentProvider} won't be`)
    console.log(`regenerated automatically. Run \`repotune doctor\` again`)
    console.log(`if you'd like them rewritten using ${adapter.name}.\n`)
  }

  // Run a quick test generation
  const testPulse = startPulse('Testing model generation...')
  try {
    const response = await adapter.generate('Say the word "pong". Output nothing else.', 'Ping.')
    testPulse.stop(`\x1b[32mNote: Model is generating correctly (Response: "${response}")\x1b[0m\n`)
  } catch (error: any) {
    testPulse.stop(`\x1b[31mNote: API returned an error during generation: ${error.message}\x1b[0m\n`)
  }

  console.log(`File permissions set to 600 (owner read/write only).\nStored at: ${store.path}\n`)
}
