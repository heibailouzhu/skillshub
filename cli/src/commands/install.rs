use anyhow::{anyhow, Result};
use clap::Args;

use crate::api::client::SkillShubClient;
use crate::config::{load_config, load_install_state, save_install_state, InstallRecord};
use crate::install::{install_bundle, parse_target, save_archive};

#[derive(Debug, Args)]
pub struct InstallCommand {
    pub slug: String,
    #[arg(long)]
    pub codex: bool,
    #[arg(long)]
    pub cursor: bool,
    #[arg(long)]
    pub claude: bool,
    #[arg(long)]
    pub openclaw: bool,
    #[arg(long, short)]
    pub force: bool,
}

impl InstallCommand {
    pub async fn run(self) -> Result<()> {
        let selected = [
            self.codex.then_some("codex"),
            self.cursor.then_some("cursor"),
            self.claude.then_some("claude"),
            self.openclaw.then_some("openclaw"),
        ]
        .into_iter()
        .flatten()
        .collect::<Vec<_>>();

        if selected.len() != 1 {
            return Err(anyhow!("Specify exactly one target: --codex, --cursor, --claude, or --openclaw"));
        }

        let cwd = std::env::current_dir()?;
        let target = parse_target(selected[0])?;
        let config = load_config().await?;
        let repository = config.active_repository.unwrap_or_else(|| crate::config::DEFAULT_REPOSITORY.to_string());
        let client = SkillShubClient::new(&repository)?;
        let metadata = client.get_skill(&self.slug).await?;
        if !metadata.available_targets.iter().any(|value| value == target.as_str()) {
            return Err(anyhow!("Skill \"{}\" does not advertise support for {}", self.slug, target.as_str()));
        }

        let mut state = load_install_state(&cwd).await?;
        let already_installed = state
            .installs
            .iter()
            .any(|record| record.slug == metadata.slug && record.target == target.as_str());
        if already_installed && !self.force {
            return Err(anyhow!("Skill \"{}\" is already installed for {}. Re-run with --force.", metadata.slug, target.as_str()));
        }

        let bundle = client.get_bundle(&metadata.slug, &metadata.latest_version).await?;
        let mut installed_paths = install_bundle(
            &cwd,
            &metadata.slug,
            metadata.description.as_deref(),
            target,
            &bundle,
            self.force,
        )
        .await?;

        if matches!(target, crate::install::InstallTarget::Codex | crate::install::InstallTarget::OpenClaw) {
            let archive = client.download_archive(&metadata.skill_id).await?;
            let archive_path = save_archive(&cwd, &metadata.slug, &bundle.version, &archive, true).await?;
            installed_paths.push(archive_path.display().to_string());
        }

        state.installs.retain(|record| !(record.slug == metadata.slug && record.target == target.as_str()));
        state.installs.push(InstallRecord {
            slug: metadata.slug.clone(),
            version: bundle.version.clone(),
            repository: repository.clone(),
            target: target.as_str().to_string(),
            installed_paths: installed_paths.clone(),
            installed_at: chrono::Utc::now().to_rfc3339(),
            bundle_hash: bundle.bundle_hash.clone(),
        });
        state.installs.sort_by(|left, right| left.slug.cmp(&right.slug).then(left.target.cmp(&right.target)));
        let state_path = save_install_state(&cwd, &state).await?;

        println!("Installed {}@{} for {}.", metadata.slug, bundle.version, target.as_str());
        for path in installed_paths {
            println!("{path}");
        }
        println!("State updated: {}", state_path.display());
        Ok(())
    }
}
