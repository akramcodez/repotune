import Conf from 'conf'
import { createHash } from 'crypto'

export const cacheStore = new Conf<Record<string, string>>({
  projectName: 'repotune-cache',
})

export function generateCacheKey(prompt: string, context: string, model: string): string {
  return createHash('sha256')
    .update(model)
    .update(prompt)
    .update(context)
    .digest('hex')
}

export function getCache(key: string): string | undefined {
  return cacheStore.get(key)
}

export function setCache(key: string, value: string): void {
  cacheStore.set(key, value)
}

export function clearCache(): void {
  cacheStore.clear()
}
