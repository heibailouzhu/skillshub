import os from 'node:os'
import path from 'node:path'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

import type { ConfigScope, SkhubConfig } from './types.js'

export const DEFAULT_REPOSITORY = 'http://127.0.0.1:3000'

const DEFAULT_CONFIG: SkhubConfig = {
  repositories: [DEFAULT_REPOSITORY],
  activeRepository: DEFAULT_REPOSITORY,
}

export function normalizeRepository(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) {
    throw new Error('Repository URL cannot be empty.')
  }

  return trimmed.replace(/\/+$/, '')
}

export function getGlobalConfigPath(): string {
  if (process.platform === 'win32') {
    const appData = process.env.APPDATA
    if (!appData) {
      throw new Error('APPDATA is not set.')
    }

    return path.join(appData, 'skhub', 'config.json')
  }

  const xdg = process.env.XDG_CONFIG_HOME
  const base = xdg ? xdg : path.join(os.homedir(), '.config')
  return path.join(base, 'skhub', 'config.json')
}

export function getProjectStateDir(cwd = process.cwd()): string {
  return path.join(cwd, '.skhub')
}

export function getProjectConfigPath(cwd = process.cwd()): string {
  return path.join(getProjectStateDir(cwd), 'config.json')
}

async function readConfigFile(filePath: string): Promise<SkhubConfig | null> {
  try {
    const raw = await readFile(filePath, 'utf8')
    const parsed = JSON.parse(raw) as Partial<SkhubConfig>
    return {
      repositories: Array.isArray(parsed.repositories)
        ? parsed.repositories.filter((value): value is string => typeof value === 'string')
        : [],
      activeRepository:
        typeof parsed.activeRepository === 'string' ? parsed.activeRepository : null,
    }
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException
    if (nodeError.code === 'ENOENT') {
      return null
    }

    throw error
  }
}

export async function readScopedConfig(
  scope: ConfigScope,
  cwd = process.cwd(),
): Promise<SkhubConfig | null> {
  return readConfigFile(scope === 'global' ? getGlobalConfigPath() : getProjectConfigPath(cwd))
}

export async function writeScopedConfig(
  scope: ConfigScope,
  config: SkhubConfig,
  cwd = process.cwd(),
): Promise<string> {
  const filePath = scope === 'global' ? getGlobalConfigPath() : getProjectConfigPath(cwd)
  await mkdir(path.dirname(filePath), { recursive: true })
  await writeFile(filePath, `${JSON.stringify(config, null, 2)}\n`, 'utf8')
  return filePath
}

export async function resolveMergedConfig(cwd = process.cwd()): Promise<SkhubConfig> {
  const globalConfig = await readScopedConfig('global', cwd)
  const projectConfig = await readScopedConfig('project', cwd)

  const repositories =
    projectConfig?.repositories.length
      ? projectConfig.repositories
      : globalConfig?.repositories.length
        ? globalConfig.repositories
        : DEFAULT_CONFIG.repositories

  const activeRepository =
    projectConfig?.activeRepository ??
    globalConfig?.activeRepository ??
    repositories[0] ??
    DEFAULT_REPOSITORY

  return {
    repositories,
    activeRepository,
  }
}

export async function setRepository(
  scope: ConfigScope,
  repository: string,
  cwd = process.cwd(),
): Promise<{ configPath: string; config: SkhubConfig }> {
  const normalized = normalizeRepository(repository)
  const nextConfig: SkhubConfig = {
    repositories: [normalized],
    activeRepository: normalized,
  }

  const configPath = await writeScopedConfig(scope, nextConfig, cwd)
  return { configPath, config: nextConfig }
}
