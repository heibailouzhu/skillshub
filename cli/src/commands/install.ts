import { Args, Command, Flags } from '@oclif/core'

import { resolveMergedConfig, normalizeRepository } from '../lib/config.js'
import { SkillShubClient } from '../lib/client.js'
import { installBundle } from '../lib/installers.js'
import { assertInstallAllowed, upsertInstallRecord } from '../lib/state.js'
import { resolveInstallTarget } from '../lib/targets.js'

export default class Install extends Command {
  static summary = 'Install a skill into the current project.'

  static args = {
    slug: Args.string({
      description: 'Skill slug to install',
      required: true,
    }),
  }

  static flags = {
    codex: Flags.boolean({ default: false, description: 'Install for Codex' }),
    cursor: Flags.boolean({ default: false, description: 'Install for Cursor' }),
    claude: Flags.boolean({ default: false, description: 'Install for Claude Code' }),
    openclaw: Flags.boolean({ default: false, description: 'Install for OpenClaw' }),
    repository: Flags.string({
      char: 'r',
      description: 'Temporarily override the configured repository URL',
    }),
    force: Flags.boolean({
      char: 'f',
      default: false,
      description: 'Overwrite an existing installation target',
    }),
  }

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Install)
    const cwd = process.cwd()
    const target = resolveInstallTarget(flags)
    const config = await resolveMergedConfig(cwd)
    const repository = normalizeRepository(flags.repository ?? config.activeRepository ?? config.repositories[0])

    await assertInstallAllowed(args.slug, target, flags.force, cwd)

    const client = new SkillShubClient(repository)
    const metadata = await client.getSkill(args.slug)

    if (!metadata.available_targets.includes(target)) {
      this.error(`Skill "${args.slug}" does not advertise support for ${target}.`)
    }

    const bundle = await client.getBundle(args.slug, metadata.latest_version)
    const installedPaths = await installBundle({
      cwd,
      slug: metadata.slug,
      description: metadata.description,
      target,
      bundle,
      force: flags.force,
    })

    const statePath = await upsertInstallRecord(
      {
        slug: metadata.slug,
        version: bundle.version,
        repository,
        target,
        installedPaths,
        installedAt: new Date().toISOString(),
        bundleHash: bundle.bundle_hash,
      },
      cwd,
    )

    this.log(`Installed ${metadata.slug}@${bundle.version} for ${target}.`)
    for (const installedPath of installedPaths) {
      this.log(installedPath)
    }
    this.log(`State updated: ${statePath}`)
  }
}
