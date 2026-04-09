import { Command } from '@oclif/core'
import readline from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

import { setRepository } from '../../lib/config.js'
import type { ConfigScope } from '../../lib/types.js'

function parseScope(answer: string): ConfigScope {
  const normalized = answer.trim().toLowerCase()
  if (normalized === 'p' || normalized === 'project') {
    return 'project'
  }

  return 'global'
}

export default class Config extends Command {
  static summary = 'Interactively configure skhub.'

  async run(): Promise<void> {
    const rl = readline.createInterface({ input, output })

    try {
      const scopeAnswer = await rl.question('Config scope ([g]lobal/[p]roject): ')
      const repository = await rl.question('Repository URL: ')
      const scope = parseScope(scopeAnswer)
      const result = await setRepository(scope, repository, process.cwd())
      this.log(`Saved ${scope} config to ${result.configPath}`)
      this.log(`Active repository: ${result.config.activeRepository}`)
    } finally {
      rl.close()
    }
  }
}
