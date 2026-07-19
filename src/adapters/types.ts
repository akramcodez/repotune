export interface ProviderAdapter {
  name: string
  validateKey(key: string): Promise<boolean>
  generate(prompt: string, context: string): Promise<string>
}
