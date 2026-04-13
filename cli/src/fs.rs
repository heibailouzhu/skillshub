use std::path::{Path, PathBuf};

use anyhow::{anyhow, Result};
use tokio::fs;

pub async fn ensure_parent(path: &Path) -> Result<()> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).await?;
    }
    Ok(())
}

pub fn assert_safe_relative_path(relative: &str) -> Result<String> {
    let normalized = relative.replace('\\', "/");
    if normalized.is_empty() || Path::new(&normalized).is_absolute() {
        return Err(anyhow!("Invalid bundle path: {relative}"));
    }
    if normalized
        .split('/')
        .any(|segment| segment.is_empty() || segment == "." || segment == "..")
    {
        return Err(anyhow!("Unsafe bundle path: {relative}"));
    }
    Ok(normalized)
}

pub async fn write_text(path: &Path, content: &str, force: bool) -> Result<()> {
    if path.exists() && !force {
        return Err(anyhow!("File already exists: {}", path.display()));
    }
    ensure_parent(path).await?;
    fs::write(path, content).await?;
    Ok(())
}

pub async fn write_binary(path: &Path, content: &[u8], force: bool) -> Result<()> {
    if path.exists() && !force {
        return Err(anyhow!("File already exists: {}", path.display()));
    }
    ensure_parent(path).await?;
    fs::write(path, content).await?;
    Ok(())
}

pub fn join_relative(base: &Path, relative: &str) -> Result<PathBuf> {
    Ok(base.join(assert_safe_relative_path(relative)?))
}
