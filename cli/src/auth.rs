use anyhow::{anyhow, Result};

use crate::config::load_auth;

pub async fn require_token() -> Result<String> {
    let auth = load_auth().await?;
    auth.token.ok_or_else(|| anyhow!("Not logged in. Run `skhub login` first."))
}
