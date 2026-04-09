import type { InstallTarget } from './types.js'

export interface InstallTargetFlags {
  codex?: boolean
  cursor?: boolean
  claude?: boolean
  openclaw?: boolean
}

export function resolveInstallTarget(flags: InstallTargetFlags): InstallTarget {
  const selected = ([
    flags.codex ? 'codex' : null,
    flags.cursor ? 'cursor' : null,
    flags.claude ? 'claude' : null,
    flags.openclaw ? 'openclaw' : null,
  ].filter(Boolean) as InstallTarget[])

  if (selected.length !== 1) {
    throw new Error('Specify exactly one install target: --codex, --cursor, --claude, or --openclaw.')
  }

  return selected[0]
}
