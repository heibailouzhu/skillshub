import type { RegistryBundle, RegistrySkillMetadata } from './types.js'
import { normalizeRepository } from './config.js'

async function requestJson<T>(url: string): Promise<T> {
  const response = await fetch(url)
  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`
    try {
      const payload = (await response.json()) as { error?: string }
      if (payload.error) {
        detail = payload.error
      }
    } catch {
      // Ignore non-JSON error payloads.
    }

    throw new Error(`Request failed for ${url}: ${detail}`)
  }

  return (await response.json()) as T
}

export class SkillShubClient {
  constructor(private readonly repository: string) {}

  get normalizedRepository(): string {
    return normalizeRepository(this.repository)
  }

  async getSkill(slug: string): Promise<RegistrySkillMetadata> {
    return requestJson<RegistrySkillMetadata>(
      `${this.normalizedRepository}/api/registry/skills/${encodeURIComponent(slug)}`,
    )
  }

  async getBundle(slug: string, version: string): Promise<RegistryBundle> {
    return requestJson<RegistryBundle>(
      `${this.normalizedRepository}/api/registry/skills/${encodeURIComponent(slug)}/versions/${encodeURIComponent(version)}/bundle`,
    )
  }
}
