use anyhow::{anyhow, Result};
use clap::Args;

use crate::config::{load_install_state, save_install_state};
use crate::install::{parse_target, uninstall_target};

#[derive(Debug, Args)]
pub struct UninstallCommand {
    pub slug: String,
    #[arg(long)]
    pub codex: bool,
    #[arg(long)]
    pub cursor: bool,
    #[arg(long)]
    pub claude: bool,
    #[arg(long)]
    pub openclaw: bool,
}

impl UninstallCommand {
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
        let mut state = load_install_state(&cwd).await?;
        let existing = state
            .installs
            .iter()
            .find(|record| record.slug == self.slug && record.target == target.as_str())
            .cloned()
            .ok_or_else(|| anyhow!("Skill \"{}\" is not installed for {}.", self.slug, target.as_str()))?;

        let removed_paths = uninstall_target(&cwd, &self.slug, target).await?;

        state.installs.retain(|record| !(record.slug == existing.slug && record.target == existing.target));
        let state_path = save_install_state(&cwd, &state).await?;

        println!("Uninstalled {} from {}.", existing.slug, target.as_str());
        for path in removed_paths {
            println!("{path}");
        }
        println!("State updated: {}", state_path.display());
        Ok(())
    }
}
