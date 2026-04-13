use std::path::PathBuf;

use anyhow::{anyhow, Context, Result};
use directories::ProjectDirs;
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use tokio::fs;

pub const DEFAULT_REPOSITORY: &str = "http://127.0.0.1:3000";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkhubConfig {
    pub repositories: Vec<String>,
    pub active_repository: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct AuthConfig {
    pub token: Option<String>,
    pub username: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct InstallRecord {
    pub slug: String,
    pub version: String,
    pub repository: String,
    pub target: String,
    pub installed_paths: Vec<String>,
    pub installed_at: String,
    pub bundle_hash: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct InstallState {
    pub installs: Vec<InstallRecord>,
}

fn project_dirs() -> Result<ProjectDirs> {
    ProjectDirs::from("ai", "SkillShub", "skhub")
        .ok_or_else(|| anyhow!("Failed to resolve CLI configuration directories"))
}

pub fn normalize_repository(input: &str) -> Result<String> {
    let trimmed = input.trim();
    if trimmed.is_empty() {
        return Err(anyhow!("Repository URL cannot be empty"));
    }
    Ok(trimmed.trim_end_matches('/').to_string())
}

pub fn global_config_path() -> Result<PathBuf> {
    Ok(project_dirs()?.config_dir().join("config.json"))
}

pub fn global_auth_path() -> Result<PathBuf> {
    Ok(project_dirs()?.config_dir().join("auth.json"))
}

pub fn project_state_dir(cwd: &std::path::Path) -> PathBuf {
    cwd.join(".skhub")
}

pub fn project_state_path(cwd: &std::path::Path) -> PathBuf {
    project_state_dir(cwd).join("installs.json")
}

async fn read_json<T: DeserializeOwned>(path: &std::path::Path) -> Result<Option<T>> {
    match fs::read_to_string(path).await {
        Ok(raw) => Ok(Some(serde_json::from_str(&raw)?)),
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(err) => Err(err.into()),
    }
}

async fn write_json<T: Serialize>(path: &std::path::Path, value: &T) -> Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).await?;
    }
    let raw = serde_json::to_string_pretty(value)?;
    fs::write(path, format!("{raw}\n")).await?;
    Ok(())
}

pub async fn load_config() -> Result<SkhubConfig> {
    let path = global_config_path()?;
    Ok(read_json(&path)
        .await?
        .unwrap_or(SkhubConfig {
            repositories: vec![DEFAULT_REPOSITORY.to_string()],
            active_repository: Some(DEFAULT_REPOSITORY.to_string()),
        }))
}

pub async fn save_config(config: &SkhubConfig) -> Result<PathBuf> {
    let path = global_config_path()?;
    write_json(&path, config).await?;
    Ok(path)
}

pub async fn load_auth() -> Result<AuthConfig> {
    let path = global_auth_path()?;
    Ok(read_json(&path).await?.unwrap_or_default())
}

pub async fn save_auth(auth: &AuthConfig) -> Result<PathBuf> {
    let path = global_auth_path()?;
    write_json(&path, auth).await?;
    Ok(path)
}

pub async fn clear_auth() -> Result<PathBuf> {
    save_auth(&AuthConfig::default()).await
}

pub async fn load_install_state(cwd: &std::path::Path) -> Result<InstallState> {
    Ok(read_json(&project_state_path(cwd)).await?.unwrap_or_default())
}

pub async fn save_install_state(cwd: &std::path::Path, state: &InstallState) -> Result<PathBuf> {
    let path = project_state_path(cwd);
    write_json(&path, state).await.context("Failed to save install state")?;
    Ok(path)
}
