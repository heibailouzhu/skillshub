use anyhow::Result;
use clap::Args;

use crate::config::clear_auth;

#[derive(Debug, Args)]
pub struct LogoutCommand {}

impl LogoutCommand {
    pub async fn run(self) -> Result<()> {
        let path = clear_auth().await?;
        println!("Logged out. Cleared auth: {}", path.display());
        Ok(())
    }
}
