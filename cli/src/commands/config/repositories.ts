import { Args, Command, Flags } from '@oclif/core'

import { setRepository } from '../../lib/config.js'
import type { ConfigScope } from '../../lib/types.js'

function resolveScope(flags: { global: boolean; project: boolean }): ConfigScope {
  if (flags.global && flags.project) {
    throw new Error('Choose either --global or --project, not both.')
  }

  return flags.project ? 'project' : 'global'
}

export default class ConfigRepositories extends Command {
  static summary = 'Set the repository URL.'

  static args = {
    repository: Args.string({
      description: 'Repository URL',
      required: true,
    }),
  }

  static flags = {
    global: Flags.boolean({
      default: false,
      description: 'Write the repository to global config',
    }),
    project: Flags.boolean({
      default: false,
      description: 'Write the repository to project config',
    }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ConfigRepositories)
    const scope = resolveScope(flags)
    const result = await setRepository(scope, args.repository, process.cwd())
    this.log(`Saved ${scope} config to ${result.configPath}`)
    this.log(`Active repository: ${result.config.activeRepository}`)
  }
}
