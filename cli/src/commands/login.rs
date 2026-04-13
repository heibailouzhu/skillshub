use anyhow::Result;
use clap::Args;

use crate::api::client::SkillShubClient;
use crate::config::{load_config, save_auth, AuthConfig};

#[derive(Debug, Args)]
pub struct LoginCommand {
    #[arg(long, short)]
    pub username: String,
    #[arg(long, short)]
    pub password: String,
}

impl LoginCommand {
    pub async fn run(self) -> Result<()> {
        let config = load_config().await?;
        let repository = config.active_repository.unwrap_or_else(|| crate::config::DEFAULT_REPOSITORY.to_string());
        let client = SkillShubClient::new(&repository)?;
        let response = client.login(&self.username, &self.password).await?;
        let path = save_auth(&AuthConfig {
            token: Some(response.token),
            username: Some(response.username.clone()),
        })
        .await?;
        println!("Logged in as {}{}", response.username, if response.is_admin { " (admin)" } else { "" });
        println!("Token saved: {}", path.display());
        Ok(())
    }
}
