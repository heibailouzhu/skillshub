export type InstallTarget = 'codex' | 'cursor' | 'claude' | 'openclaw'

export type ConfigScope = 'global' | 'project'

export interface SkhubConfig {
  repositories: string[]
  activeRepository: string | null
}

export interface RegistrySkillMetadata {
  slug: string
  title: string
  description: string | null
  latest_version: string
  bundle_hash: string
  available_targets: string[]
  source_repository: string | null
}

export interface RegistryBundleFile {
  path: string
  content: string
  encoding: string
}

export interface RegistryBundle {
  slug: string
  version: string
  files: RegistryBundleFile[]
  bundle_hash: string
}

export interface InstallRecord {
  slug: string
  version: string
  repository: string
  target: InstallTarget
  installedPaths: string[]
  installedAt: string
  bundleHash: string
}
