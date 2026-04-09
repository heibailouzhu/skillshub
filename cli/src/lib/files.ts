import path from 'node:path'
import { mkdir, rm, stat, writeFile } from 'node:fs/promises'

import type { RegistryBundleFile } from './types.js'

function assertSafeRelativePath(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, '/')
  if (!normalized || path.isAbsolute(normalized)) {
    throw new Error(`Invalid bundle path: ${relativePath}`)
  }

  const segments = normalized.split('/')
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
    throw new Error(`Unsafe bundle path: ${relativePath}`)
  }

  return normalized
}

export async function pathExists(targetPath: string): Promise<boolean> {
  try {
    await stat(targetPath)
    return true
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException
    if (nodeError.code === 'ENOENT') {
      return false
    }

    throw error
  }
}

export async function prepareTarget(targetPath: string, force: boolean): Promise<void> {
  if (await pathExists(targetPath)) {
    if (!force) {
      throw new Error(`Target already exists: ${targetPath}. Re-run with --force to overwrite.`)
    }

    await rm(targetPath, { recursive: true, force: true })
  }
}

export async function writeTextFile(
  targetPath: string,
  content: string,
  force: boolean,
): Promise<void> {
  if ((await pathExists(targetPath)) && !force) {
    throw new Error(`Target already exists: ${targetPath}. Re-run with --force to overwrite.`)
  }

  await mkdir(path.dirname(targetPath), { recursive: true })
  await writeFile(targetPath, content, 'utf8')
}

export async function writeBundleFiles(
  baseDir: string,
  files: RegistryBundleFile[],
  force: boolean,
): Promise<string[]> {
  await prepareTarget(baseDir, force)
  await mkdir(baseDir, { recursive: true })

  const writtenPaths: string[] = []

  for (const file of files) {
    if (file.encoding !== 'utf-8') {
      throw new Error(`Unsupported file encoding "${file.encoding}" for ${file.path}`)
    }

    const safePath = assertSafeRelativePath(file.path)
    const destination = path.join(baseDir, safePath)
    await mkdir(path.dirname(destination), { recursive: true })
    await writeFile(destination, file.content, 'utf8')
    writtenPaths.push(destination)
  }

  return writtenPaths
}
