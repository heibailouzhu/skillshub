import os from 'node:os'
import path from 'node:path'
import { mkdtemp, readFile } from 'node:fs/promises'

import { describe, expect, it } from 'vitest'

import { assertInstallAllowed, upsertInstallRecord } from '../src/lib/state.js'

describe('install state', () => {
  it('blocks duplicate installs without force', async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), 'skhub-state-'))
    await upsertInstallRecord(
      {
        slug: 'demo-skill',
        version: '1.0.0',
        repository: 'http://127.0.0.1:3000',
        target: 'codex',
        installedPaths: ['x'],
        installedAt: new Date().toISOString(),
        bundleHash: 'abc',
      },
      cwd,
    )

    await expect(assertInstallAllowed('demo-skill', 'codex', false, cwd)).rejects.toThrow(
      /already installed/i,
    )
  })

  it('writes installs.json', async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), 'skhub-state-'))
    const statePath = await upsertInstallRecord(
      {
        slug: 'demo-skill',
        version: '1.0.0',
        repository: 'http://127.0.0.1:3000',
        target: 'cursor',
        installedPaths: ['y'],
        installedAt: new Date().toISOString(),
        bundleHash: 'def',
      },
      cwd,
    )

    const raw = await readFile(statePath, 'utf8')
    expect(raw).toContain('"slug": "demo-skill"')
    expect(raw).toContain('"target": "cursor"')
  })
})
