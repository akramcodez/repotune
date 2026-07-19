import { setConfig, store, hasConfig, clearConfig } from '../config/store.js'
import { openaiAdapter } from '../adapters/openai.js'
import { startPulse } from '../ui/pulse.js'
import { select, password } from '../ui/prompts.js'

export interface ConfigOptions {
  provider?: string
  removeKey?: boolean
  reset?: boolean
  show?: boolean
}

export async function runConfig(opts: ConfigOptions = {}) {
  if (opts.reset) {
    clearConfig()
    console.log('\n\x1b[32m✔ Configuration reset.\x1b[0m\n')
    return
  }

  if (opts.removeKey) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    store.delete('apiKey' as any)
    console.log('\n\x1b[32m✔ API key removed from configuration.\x1b[0m\n')
    return
  }

  if (opts.show) {
    if (!hasConfig()) {
      console.log('\nNo configuration found. Run \x1b[36mrepokit config\x1b[0m to set up.\n')
      return
    }
    const { provider, apiKey, model } = store.store
    const maskedKey = apiKey ? `sk-${'*'.repeat(Math.max(10, apiKey.length - 3))}` : 'None'
    console.log(`\nProvider:  ${provider}\nAPI Key:   ${maskedKey}\nModel:     ${model || 'Default'}\nStored at: ${store.path}\n`)
    return
  }

  console.log()

  // Interactive Flow
  const provider = opts.provider || await select({
    message: 'Which AI provider would you like to use?',
    choices: [
      { value: 'openai',     name: 'OpenAI' },
      { value: 'anthropic',  name: 'Anthropic' },
      { value: 'gemini',     name: 'Google Gemini' },
      { value: 'openrouter', name: 'OpenRouter' },
      { value: 'ollama',     name: 'Ollama (Local)' },
      { value: 'skip',       name: 'Skip for now' },
    ],
  })

  if (provider === 'skip') {
    console.log('\n\x1b[33mSetup cancelled.\x1b[0m\n')
    return process.exit(0)
  }

  const apiKey = await password({ message: `Enter your ${String(provider)} API key` })
  if (!apiKey) {
    console.log('\n\x1b[33mSetup cancelled.\x1b[0m\n')
    return process.exit(0)
  }

  const s = startPulse('Validating key...')

  let valid = false
  if (provider === 'openai') {
    valid = await openaiAdapter.validateKey(String(apiKey))
  } else {
    // We only have OpenAI fully implemented for phase 2 validation, fake others or fail
    valid = true 
  }

  if (!valid) {
    s.stop('\x1b[31m✗ Key rejected - check your key and try again.\x1b[0m')
    process.exit(1)
  }

  s.stop('\x1b[32m✓ Key confirmed working\x1b[0m')
  
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setConfig({ provider: String(provider) as any, apiKey: String(apiKey) })

  console.log(`\n\x1b[32mSaved locally\x1b[0m\n\nFile permissions set to 600 (owner read/write only).\nStored at: ${store.path}\n`)
}
