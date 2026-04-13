use anyhow::Result;
use clap::{Args, Subcommand};

use crate::config::{load_config, normalize_repository, save_config, SkhubConfig};

#[derive(Debug, Args)]
pub struct ConfigCommand {
    #[command(subcommand)]
    command: Option<ConfigSubcommand>,
}

#[derive(Debug, Subcommand)]
enum ConfigSubcommand {
    SetRepo { url: String },
    Show,
}

impl ConfigCommand {
    pub async fn run(self) -> Result<()> {
        match self.command {
            Some(ConfigSubcommand::SetRepo { url }) => {
                let repository = normalize_repository(&url)?;
                let config = SkhubConfig {
                    repositories: vec![repository.clone()],
                    active_repository: Some(repository.clone()),
                };
                let path = save_config(&config).await?;
                println!("Saved config: {}", path.display());
                println!("Active repository: {repository}");
            }
            Some(ConfigSubcommand::Show) | None => {
                let config = load_config().await?;
                println!("Active repository: {}", config.active_repository.unwrap_or_default());
                for repository in config.repositories {
                    println!("- {repository}");
                }
            }
        }
        Ok(())
    }
}
