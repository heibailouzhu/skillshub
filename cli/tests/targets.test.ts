import { describe, expect, it } from 'vitest'

import { resolveInstallTarget } from '../src/lib/targets.js'

describe('resolveInstallTarget', () => {
  it('returns the selected target', () => {
    expect(resolveInstallTarget({ codex: true })).toBe('codex')
    expect(resolveInstallTarget({ cursor: true })).toBe('cursor')
  })

  it('rejects missing or multiple targets', () => {
    expect(() => resolveInstallTarget({})).toThrow(/exactly one install target/i)
    expect(() => resolveInstallTarget({ codex: true, cursor: true })).toThrow(
      /exactly one install target/i,
    )
  })
})
