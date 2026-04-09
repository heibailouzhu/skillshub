import path from 'node:path'
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises'

import { writeBundleFiles, writeTextFile } from './files.js'
import type { InstallTarget, RegistryBundle, RegistryBundleFile } from './types.js'

interface InstallBundleOptions {
  cwd: string
  slug: string
  description: string | null
  target: InstallTarget
  bundle: RegistryBundle
  force: boolean
}

const CLAUDE_MANAGED_START = '<!-- skhub:managed:start -->'
const CLAUDE_MANAGED_END = '<!-- skhub:managed:end -->'

function getSkillContent(files: RegistryBundleFile[]): string {
  const skillFile = files.find((file) => file.path === 'SKILL.md')
  if (!skillFile) {
    throw new Error('Canonical bundle is missing SKILL.md')
  }

  return skillFile.content.trim()
}

async function installDirectoryBundle(
  cwd: string,
  baseDirectory: string,
  slug: string,
  bundle: RegistryBundle,
  force: boolean,
): Promise<string[]> {
  const destination = path.join(cwd, baseDirectory, slug)
  return writeBundleFiles(destination, bundle.files, force)
}

async function installCursorRule(
  cwd: string,
  slug: string,
  description: string | null,
  bundle: RegistryBundle,
  force: boolean,
): Promise<string[]> {
  const destination = path.join(cwd, '.cursor', 'rules', `skhub-${slug}.mdc`)
  const content = [
    '---',
    `description: ${description ?? `SkillShub skill ${slug}`}`,
    'alwaysApply: false',
    '---',
    '',
    getSkillContent(bundle.files),
    '',
  ].join('\n')

  await writeTextFile(destination, content, force)
  return [destination]
}

async function refreshClaudeIndex(cwd: string): Promise<string> {
  const skillsDir = path.join(cwd, '.skhub', 'claude', 'skills')
  await mkdir(skillsDir, { recursive: true })
  const entries = (await readdir(skillsDir))
    .filter((entry) => entry.endsWith('.md'))
    .sort()

  const indexPath = path.join(cwd, '.skhub', 'claude', 'index.md')
  const lines = ['# SkillShub Claude Skills', '']
  for (const entry of entries) {
    lines.push(`@./skills/${entry}`)
  }
  lines.push('')
  await writeFile(indexPath, `${lines.join('\n')}`, 'utf8')
  return indexPath
}

async function upsertClaudeManagedBlock(cwd: string): Promise<string> {
  const claudePath = path.join(cwd, 'CLAUDE.md')
  const managedBlock = `${CLAUDE_MANAGED_START}\n@./.skhub/claude/index.md\n${CLAUDE_MANAGED_END}`

  let current = ''
  try {
    current = await readFile(claudePath, 'utf8')
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException
    if (nodeError.code !== 'ENOENT') {
      throw error
    }
  }

  let next: string
  const pattern = new RegExp(`${CLAUDE_MANAGED_START}[\\s\\S]*?${CLAUDE_MANAGED_END}`, 'm')
  if (pattern.test(current)) {
    next = current.replace(pattern, managedBlock)
  } else if (current.trim().length === 0) {
    next = `${managedBlock}\n`
  } else {
    next = `${current.replace(/\s*$/, '')}\n\n${managedBlock}\n`
  }

  await writeFile(claudePath, next, 'utf8')
  return claudePath
}

async function installClaudeSkill(
  cwd: string,
  slug: string,
  description: string | null,
  bundle: RegistryBundle,
  force: boolean,
): Promise<string[]> {
  const skillPath = path.join(cwd, '.skhub', 'claude', 'skills', `${slug}.md`)
  const skillLines = [
    `# ${slug}`,
    '',
    description ?? 'Installed from SkillShub.',
    '',
    getSkillContent(bundle.files),
    '',
  ]

  await writeTextFile(skillPath, skillLines.join('\n'), force)
  const indexPath = await refreshClaudeIndex(cwd)
  const claudePath = await upsertClaudeManagedBlock(cwd)
  return [skillPath, indexPath, claudePath]
}

export async function installBundle(options: InstallBundleOptions): Promise<string[]> {
  switch (options.target) {
    case 'codex':
      return installDirectoryBundle(options.cwd, '.agents/skills', options.slug, options.bundle, options.force)
    case 'openclaw':
      return installDirectoryBundle(options.cwd, 'skills', options.slug, options.bundle, options.force)
    case 'cursor':
      return installCursorRule(
        options.cwd,
        options.slug,
        options.description,
        options.bundle,
        options.force,
      )
    case 'claude':
      return installClaudeSkill(
        options.cwd,
        options.slug,
        options.description,
        options.bundle,
        options.force,
      )
  }
}
