import path from 'node:path'
import { mkdir, readFile, writeFile } from 'node:fs/promises'

import { getProjectStateDir } from './config.js'
import type { InstallRecord, InstallTarget } from './types.js'

interface InstallState {
  installs: InstallRecord[]
}

function getStatePath(cwd = process.cwd()): string {
  return path.join(getProjectStateDir(cwd), 'installs.json')
}

export async function loadInstallState(cwd = process.cwd()): Promise<InstallState> {
  try {
    const raw = await readFile(getStatePath(cwd), 'utf8')
    const parsed = JSON.parse(raw) as Partial<InstallState>
    return {
      installs: Array.isArray(parsed.installs) ? (parsed.installs as InstallRecord[]) : [],
    }
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException
    if (nodeError.code === 'ENOENT') {
      return { installs: [] }
    }

    throw error
  }
}

export async function saveInstallState(state: InstallState, cwd = process.cwd()): Promise<string> {
  const statePath = getStatePath(cwd)
  await mkdir(path.dirname(statePath), { recursive: true })
  await writeFile(statePath, `${JSON.stringify(state, null, 2)}\n`, 'utf8')
  return statePath
}

export async function assertInstallAllowed(
  slug: string,
  target: InstallTarget,
  force: boolean,
  cwd = process.cwd(),
): Promise<void> {
  if (force) {
    return
  }

  const state = await loadInstallState(cwd)
  const existing = state.installs.find((install) => install.slug === slug && install.target === target)
  if (existing) {
    throw new Error(
      `Skill "${slug}" is already installed for ${target}. Re-run with --force to overwrite.`,
    )
  }
}

export async function upsertInstallRecord(
  record: InstallRecord,
  cwd = process.cwd(),
): Promise<string> {
  const state = await loadInstallState(cwd)
  const installs = state.installs.filter(
    (install) => !(install.slug === record.slug && install.target === record.target),
  )
  installs.push(record)
  installs.sort((left, right) => left.slug.localeCompare(right.slug) || left.target.localeCompare(right.target))
  return saveInstallState({ installs }, cwd)
}
