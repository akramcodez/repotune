# Phase 4 — Multi-Provider Support

> **Goal:** Add Anthropic, Gemini, OpenRouter, Ollama (local), and Groq adapters.  
> Add model selection per provider. Make switching providers seamless with clear UX for what happens to previously-generated files.

---

## Deliverables

- [ ] Anthropic adapter (Claude)
- [ ] Gemini adapter
- [ ] OpenRouter adapter (proxies many models)
- [ ] Ollama adapter (local, no key needed)
- [ ] Groq adapter (ultra-fast inference)
- [ ] Model selection per provider in `repokit config`
- [ ] Provider-switching UX with explicit "existing files won't regenerate" notice
- [ ] Tests for all 5 new adapters

---

## 1. Adapter Interface (unchanged from Phase 2)

```ts
// src/adapters/types.ts
export interface ProviderAdapter {
  name: string
  requiresKey: boolean
  defaultModel: string
  availableModels: string[]
  validateKey(key: string): Promise<boolean>
  generate(prompt: string, context: string): Promise<string>
}
```

All adapters implement this interface. The `requiresKey: false` flag lets Ollama skip key validation entirely.

---

## 2. Adapter Registry (`src/adapters/index.ts`)

```ts
import { openaiAdapter }      from './openai.js'
import { anthropicAdapter }   from './anthropic.js'
import { geminiAdapter }      from './gemini.js'
import { openrouterAdapter }  from './openrouter.js'
import { ollamaAdapter }      from './ollama.js'
import { groqAdapter }        from './groq.js'
import { getConfig }          from '../config/store.js'

const ADAPTERS = {
  openai:      openaiAdapter,
  anthropic:   anthropicAdapter,
  gemini:      geminiAdapter,
  openrouter:  openrouterAdapter,
  ollama:      ollamaAdapter,
  groq:        groqAdapter,
}

export function getAdapter(): ProviderAdapter {
  const { provider } = getConfig()
  if (!provider || !ADAPTERS[provider]) {
    throw new Error('No AI provider configured. Run: repokit config')
  }
  return ADAPTERS[provider]
}
```

---

## 3. Anthropic Adapter (`src/adapters/anthropic.ts`)

API: `https://api.anthropic.com/v1/messages`

```ts
const BASE = 'https://api.anthropic.com/v1'

export const anthropicAdapter: ProviderAdapter = {
  name: 'anthropic',
  requiresKey: true,
  defaultModel: 'claude-haiku-4-5-20251001',
  availableModels: [
    'claude-fable-5',               // most capable, best for complex tasks
    'claude-sonnet-5',              // fast + smart, great default for doctor runs
    'claude-opus-4-8',             // high-capability, enterprise-grade
    'claude-haiku-4-5-20251001',   // fastest, cheapest — recommended default
  ],

  async validateKey(key: string): Promise<boolean> {
    const res = await fetch(`${BASE}/models`, {
      headers: {
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
    })
    return res.status === 200
  },

  async generate(prompt: string, context: string): Promise<string> {
    const { apiKey, model } = getConfig()
    const res = await fetch(`${BASE}/messages`, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model ?? this.defaultModel,
        max_tokens: 2000,
        messages: [
          { role: 'user', content: `${prompt}\n\nContext:\n${context}` },
        ],
        system: 'You generate open source repository health files. Output only the file contents, no explanation.',
      }),
    })

    if (!res.ok) throw new Error(`Anthropic error: ${res.status}`)
    const data = await res.json()
    return data.content[0].text.trim()
  },
}
```

---

## 4. Gemini Adapter (`src/adapters/gemini.ts`)

API: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`

```ts
const BASE = 'https://generativelanguage.googleapis.com/v1beta'

export const geminiAdapter: ProviderAdapter = {
  name: 'gemini',
  requiresKey: true,
  defaultModel: 'gemini-3.5-flash',
  availableModels: [
    'gemini-3.5-pro',    // frontier reasoning flagship (July 2026)
    'gemini-3.5-flash',  // primary production model — fast, agentic ← default
    'gemini-3.1-pro',    // high-complexity reasoning
    'gemini-2.5-pro',    // stable, still widely used in enterprise
    'gemini-2.5-flash',  // production-ready, retiring late 2026
  ],

  async validateKey(key: string): Promise<boolean> {
    const res = await fetch(`${BASE}/models?key=${key}`)
    return res.status === 200
  },

  async generate(prompt: string, context: string): Promise<string> {
    const { apiKey, model } = getConfig()
    const m = model ?? this.defaultModel
    const res = await fetch(`${BASE}/models/${m}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: `${prompt}\n\nContext:\n${context}` }]
        }],
        systemInstruction: {
          parts: [{ text: 'Output only the file contents, no explanation.' }]
        },
      }),
    })

    if (!res.ok) throw new Error(`Gemini error: ${res.status}`)
    const data = await res.json()
    return data.candidates[0].content.parts[0].text.trim()
  },
}
```

---

## 5. OpenRouter Adapter (`src/adapters/openrouter.ts`)

OpenRouter uses an OpenAI-compatible API. The adapter is nearly identical to the OpenAI adapter with a different base URL and a required `HTTP-Referer` header.

```ts
const BASE = 'https://openrouter.ai/api/v1'

export const openrouterAdapter: ProviderAdapter = {
  name: 'openrouter',
  requiresKey: true,
  defaultModel: 'anthropic/claude-haiku-4-5',
  availableModels: [
    'anthropic/claude-fable-5',              // best Claude via OpenRouter
    'anthropic/claude-sonnet-5',
    'anthropic/claude-haiku-4-5',            // fast Claude ← default
    'openai/gpt-5.6-terra',                  // OpenAI mid-tier
    'openai/gpt-5.6-luna',                   // OpenAI cost-efficient
    'google/gemini-3.5-flash',
    'meta-llama/llama-3.3-70b-instruct',
    'meta-llama/llama-3.3-8b-instruct:free', // free tier
  ],

  async validateKey(key: string): Promise<boolean> {
    const res = await fetch(`${BASE}/models`, {
      headers: { Authorization: `Bearer ${key}` },
    })
    return res.status === 200
  },

  async generate(prompt: string, context: string): Promise<string> {
    const { apiKey, model } = getConfig()
    const res = await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://github.com/your-org/repokit',
        'X-Title': 'RepoKit CLI',
      },
      body: JSON.stringify({
        model: model ?? this.defaultModel,
        messages: [
          { role: 'system', content: 'Output only the file contents, no explanation.' },
          { role: 'user', content: `${prompt}\n\nContext:\n${context}` },
        ],
      }),
    })

    if (!res.ok) throw new Error(`OpenRouter error: ${res.status}`)
    const data = await res.json()
    return data.choices[0].message.content.trim()
  },
}
```

---

## 6. Ollama Adapter (`src/adapters/ollama.ts`)

Local only — no API key required. Users must have Ollama running on localhost.

```ts
const BASE = 'http://localhost:11434'

export const ollamaAdapter: ProviderAdapter = {
  name: 'ollama',
  requiresKey: false,
  defaultModel: 'llama3.2',
  availableModels: [], // dynamically fetched from local server

  async validateKey(_key: string): Promise<boolean> {
    // No key needed — just check if Ollama is reachable
    try {
      const res = await fetch(`${BASE}/api/tags`)
      return res.status === 200
    } catch {
      return false
    }
  },

  async generate(prompt: string, context: string): Promise<string> {
    const { model } = getConfig()
    const res = await fetch(`${BASE}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: model ?? this.defaultModel,
        prompt: `${prompt}\n\nContext:\n${context}`,
        stream: false,
        system: 'Output only the file contents, no explanation.',
      }),
    })

    if (!res.ok) throw new Error(`Ollama error: ${res.status}`)
    const data = await res.json()
    return data.response.trim()
  },
}
```

When Ollama is selected, validation checks if the local server is running:

```
Checking Ollama connection...
✓ Ollama is running at localhost:11434

Available models:
  llama3.2
  codellama
  mistral

Which model would you like to use?
❯ llama3.2
```

---

## 7. Groq Adapter (`src/adapters/groq.ts`)

Groq uses an OpenAI-compatible API — same request/response shape, different base URL and key.  
Groq's main differentiator is **speed**: inference is 5–10× faster than hosted OpenAI for the same model size. Good for snappy `doctor` runs.

```ts
const BASE = 'https://api.groq.com/openai/v1'

export const groqAdapter: ProviderAdapter = {
  name: 'groq',
  requiresKey: true,
  defaultModel: 'llama-3.3-70b-versatile',
  availableModels: [
    'llama-3.3-70b-versatile',  // recommended — best quality on Groq ← default
    'llama-3.3-8b-instant',     // ultra-fast, lightweight tasks
    'gemma2-9b-it',             // Google Gemma, good at instruction following
    // Note: mixtral-8x7b and llama-3.1 deprecated — use llama-3.3 instead
    // Always check console.groq.com for latest available model IDs
  ],

  async validateKey(key: string): Promise<boolean> {
    const res = await fetch(`${BASE}/models`, {
      headers: { Authorization: `Bearer ${key}` },
    })
    return res.status === 200
  },

  async generate(prompt: string, context: string): Promise<string> {
    const { apiKey, model } = getConfig()
    const res = await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model ?? this.defaultModel,
        messages: [
          { role: 'system', content: 'You generate open source repository health files. Output only the file contents, no explanation.' },
          { role: 'user', content: `${prompt}\n\nContext:\n${context}` },
        ],
        max_tokens: 2000,
      }),
    })

    if (!res.ok) throw new Error(`Groq error: ${res.status}`)
    const data = await res.json()
    return data.choices[0].message.content.trim()
  },
}
```

> **Note:** Groq API keys are free to get at [console.groq.com](https://console.groq.com) — worth calling out in the `repokit config` prompt since users may not know it exists.

---

## 7. Model Selection in `repokit config`

After provider selection, show available models:

```
Which model would you like to use?

❯ claude-haiku-4-5-20251001   (fastest, cheapest — recommended)
  claude-sonnet-5              (fast + smart, great for most tasks)
  claude-opus-4-8              (high-capability, enterprise-grade)
  claude-fable-5               (most capable, complex agentic tasks)
```

Models are hard-coded per adapter in Phase 4 (not fetched from API). Fetching from API can be added later.

Config schema update:

```ts
export interface RepokitConfig {
  provider: 'openai' | 'anthropic' | 'gemini' | 'openrouter' | 'ollama' | 'groq'
  apiKey: string
  model: string   // ← now stored explicitly
}
```

---

## 8. Provider Switching UX

```bash
repokit config
```

Select "Change provider":

```
Current: OpenAI

Choose provider
  Anthropic
  Google Gemini
  OpenRouter
  Ollama (Local)
  Groq
  OpenAI
```

After switching:

```
✓ Switched to Anthropic.

Note: files already generated under OpenAI won't be
regenerated automatically. Run `repokit doctor` again
if you'd like them rewritten using Anthropic.
```

This notice is non-optional — it always shows on provider switch.

---

## 9. Config Display (`repokit config --show`)

```
Provider     Anthropic
Model        claude-3-5-haiku-latest
API Key      sk-ant-*************
Stored at    ~/.config/repokit/config.json
```

---

## 10. Tests

```
tests/
├── adapters/
│   ├── anthropic.test.ts     # mock fetch, validate + generate
│   ├── gemini.test.ts
│   ├── openrouter.test.ts
│   ├── ollama.test.ts        # no key validation, server reachability
│   └── groq.test.ts          # OpenAI-compatible, mock fetch
└── config/
    └── provider-switch.test.ts
```

### Test pattern for all adapters

```ts
describe('anthropic adapter', () => {
  it('generates content via messages API', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        content: [{ text: '# Security Policy\n\nReport to...' }]
      })
    } as any)

    const result = await anthropicAdapter.generate('write a SECURITY.md', '')
    expect(result).toContain('Security Policy')
  })
})
```

---

## 11. Definition of Done for Phase 4

- [ ] All 5 new adapters implemented and tested with mocked fetch
- [ ] Ollama adapter handles server-unreachable gracefully (clear error message)
- [ ] Groq adapter tested with OpenAI-compatible mock response shape
- [ ] Model selection works for all providers in `repokit config`
- [ ] Model is stored in config and used on generate calls
- [ ] Provider-switching notice always shown
- [ ] `repokit config --show` displays current provider, model, masked key
- [ ] `test:all` passes clean for all adapter tests

---

## What's out of scope for Phase 4

- `repokit explain`, `repokit ci`, `repokit badge` → Phase 5
- Telemetry → Phase 6
- Hosted dashboard → Phase 6
