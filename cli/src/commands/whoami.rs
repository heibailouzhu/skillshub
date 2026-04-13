use anyhow::Result;
use clap::Args;

use crate::config::{load_auth, load_config};

#[derive(Debug, Args)]
pub struct WhoamiCommand {}

impl WhoamiCommand {
    pub async fn run(self) -> Result<()> {
        let config = load_config().await?;
        let auth = load_auth().await?;
        println!("Repository: {}", config.active_repository.unwrap_or_default());
        println!("Username: {}", auth.username.unwrap_or_else(|| "<not logged in>".to_string()));
        println!("Authenticated: {}", if auth.token.is_some() { "yes" } else { "no" });
        Ok(())
    }
}
