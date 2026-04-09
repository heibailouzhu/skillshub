import os from 'node:os'
import path from 'node:path'
import { mkdtemp, mkdir } from 'node:fs/promises'

import { afterEach, describe, expect, it } from 'vitest'

import {
  getProjectConfigPath,
  readScopedConfig,
  resolveMergedConfig,
  setRepository,
} from '../src/lib/config.js'

const appDataRoot = await mkdtemp(path.join(os.tmpdir(), 'skhub-appdata-'))
process.env.APPDATA = appDataRoot

describe('config', () => {
  const createdDirs: string[] = []

  afterEach(async () => {
    createdDirs.length = 0
  })

  it('prefers project config over global config', async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), 'skhub-project-'))
    createdDirs.push(cwd)

    await setRepository('global', 'http://global.example.com', cwd)
    await setRepository('project', 'http://project.example.com', cwd)

    const merged = await resolveMergedConfig(cwd)
    expect(merged.activeRepository).toBe('http://project.example.com')
  })

  it('writes project config into .skhub/config.json', async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), 'skhub-project-'))
    await mkdir(cwd, { recursive: true })
    const result = await setRepository('project', 'http://repo.example.com', cwd)

    expect(result.configPath).toBe(getProjectConfigPath(cwd))
    expect((await readScopedConfig('project', cwd))?.activeRepository).toBe('http://repo.example.com')
  })
})
