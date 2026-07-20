export interface ProviderAdapter {
  name: string
  requiresKey: boolean
  defaultModel: string
  availableModels: string[]
  fetchModels?(): Promise<string[]>
  validateKey(key: string): Promise<{ valid: boolean; reason: string }>
  generate(prompt: string, context: string): Promise<string>
}
