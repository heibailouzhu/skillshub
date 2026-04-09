import os from 'node:os'
import path from 'node:path'
import { mkdtemp, readFile } from 'node:fs/promises'

import { describe, expect, it } from 'vitest'

import { installBundle } from '../src/lib/installers.js'
import type { RegistryBundle } from '../src/lib/types.js'

const bundle: RegistryBundle = {
  slug: 'demo-skill',
  version: '1.0.0',
  bundle_hash: 'abc123',
  files: [
    {
      path: 'SKILL.md',
      content: '# Demo Skill\n\nUse it well.\n',
      encoding: 'utf-8',
    },
    {
      path: 'references/example.md',
      content: 'reference',
      encoding: 'utf-8',
    },
  ],
}

describe('installBundle', () => {
  it('preserves canonical files for codex', async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), 'skhub-codex-'))
    await installBundle({
      cwd,
      slug: bundle.slug,
      description: 'demo',
      target: 'codex',
      bundle,
      force: false,
    })

    const installed = await readFile(
      path.join(cwd, '.agents', 'skills', bundle.slug, 'references', 'example.md'),
      'utf8',
    )
    expect(installed).toBe('reference')
  })

  it('creates a cursor rule file', async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), 'skhub-cursor-'))
    await installBundle({
      cwd,
      slug: bundle.slug,
      description: 'demo',
      target: 'cursor',
      bundle,
      force: false,
    })

    const installed = await readFile(
      path.join(cwd, '.cursor', 'rules', 'skhub-demo-skill.mdc'),
      'utf8',
    )
    expect(installed).toContain('alwaysApply: false')
    expect(installed).toContain('# Demo Skill')
  })

  it('updates claude managed files without clobbering the whole file', async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), 'skhub-claude-'))
    await installBundle({
      cwd,
      slug: bundle.slug,
      description: 'demo',
      target: 'claude',
      bundle,
      force: false,
    })

    const claude = await readFile(path.join(cwd, 'CLAUDE.md'), 'utf8')
    expect(claude).toContain('<!-- skhub:managed:start -->')
    expect(claude).toContain('@./.skhub/claude/index.md')
  })

  it('preserves canonical files for openclaw', async () => {
    const cwd = await mkdtemp(path.join(os.tmpdir(), 'skhub-openclaw-'))
    await installBundle({
      cwd,
      slug: bundle.slug,
      description: 'demo',
      target: 'openclaw',
      bundle,
      force: false,
    })

    const installed = await readFile(path.join(cwd, 'skills', bundle.slug, 'SKILL.md'), 'utf8')
    expect(installed).toContain('# Demo Skill')
  })
})
