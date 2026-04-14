use std::path::{Path, PathBuf};

use anyhow::{anyhow, Result};

use crate::api::types::{RegistryBundle, RegistryBundleFile};
use crate::fs::{join_relative, write_binary, write_text};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InstallTarget {
    Codex,
    Cursor,
    Claude,
    OpenClaw,
}

impl InstallTarget {
    pub fn as_str(self) -> &'static str {
        match self {
            InstallTarget::Codex => "codex",
            InstallTarget::Cursor => "cursor",
            InstallTarget::Claude => "claude",
            InstallTarget::OpenClaw => "openclaw",
        }
    }
}

pub fn parse_target(input: &str) -> Result<InstallTarget> {
    match input {
        "codex" => Ok(InstallTarget::Codex),
        "cursor" => Ok(InstallTarget::Cursor),
        "claude" => Ok(InstallTarget::Claude),
        "openclaw" => Ok(InstallTarget::OpenClaw),
        _ => Err(anyhow!("Unsupported install target: {input}")),
    }
}

fn skill_markdown(files: &[RegistryBundleFile]) -> Result<String> {
    files.iter()
        .find(|file| file.path == "SKILL.md")
        .map(|file| file.content.trim().to_string())
        .ok_or_else(|| anyhow!("Bundle is missing SKILL.md"))
}

fn managed_block(references: &[String]) -> String {
    let body = references
        .iter()
        .map(|reference| format!("@{reference}"))
        .collect::<Vec<_>>()
        .join("\n");
    if body.is_empty() {
        "<!-- skillshub:managed:start -->\n<!-- skillshub:managed:end -->".to_string()
    } else {
        format!("<!-- skillshub:managed:start -->\n{}\n<!-- skillshub:managed:end -->", body)
    }
}

async fn update_managed_references(path: &Path, references: &[String]) -> Result<()> {
    let managed_start = "<!-- skillshub:managed:start -->";
    let managed_end = "<!-- skillshub:managed:end -->";
    let block = managed_block(references);
    let current = tokio::fs::read_to_string(path).await.unwrap_or_default();

    let next = if let Some(start) = current.find(managed_start) {
        if let Some(relative_end) = current[start..].find(managed_end) {
            let end = start + relative_end;
            let after = end + managed_end.len();
            format!("{}{}{}", &current[..start], block, &current[after..])
        } else if current.trim().is_empty() {
            format!("{block}\n")
        } else {
            format!("{}\n\n{}\n", current.trim_end(), block)
        }
    } else if current.trim().is_empty() {
        format!("{block}\n")
    } else {
        format!("{}\n\n{}\n", current.trim_end(), block)
    };

    write_text(path, &next, true).await
}

async fn clear_managed_reference(path: &Path) -> Result<Option<String>> {
    let managed_start = "<!-- skillshub:managed:start -->";
    let managed_end = "<!-- skillshub:managed:end -->";
    let current = match tokio::fs::read_to_string(path).await {
        Ok(value) => value,
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(err) => return Err(err.into()),
    };

    let Some(start) = current.find(managed_start) else {
        return Ok(None);
    };
    let Some(relative_end) = current[start..].find(managed_end) else {
        return Ok(None);
    };
    let end = start + relative_end;
    let after = end + managed_end.len();
    let mut next = format!("{}{}", &current[..start], &current[after..]);
    next = next.trim().to_string();
    if !next.is_empty() {
        next.push('\n');
    }
    write_text(path, &next, true).await?;
    Ok(Some(path.display().to_string()))
}

async fn collect_skill_entries(skills_dir: &Path) -> Result<Vec<String>> {
    let mut entries = Vec::new();
    let mut dir = match tokio::fs::read_dir(skills_dir).await {
        Ok(value) => value,
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => return Ok(entries),
        Err(err) => return Err(err.into()),
    };

    while let Some(entry) = dir.next_entry().await? {
        let path = entry.path();
        if !entry.file_type().await?.is_dir() {
            continue;
        }
        let skill_path = path.join("SKILL.md");
        if tokio::fs::try_exists(&skill_path).await? {
            if let Some(name) = path.file_name().and_then(|value| value.to_str()) {
                entries.push(name.to_string());
            }
        }
    }

    entries.sort();
    Ok(entries)
}

async fn remove_path_if_exists(path: &Path) -> Result<Option<String>> {
    match tokio::fs::metadata(path).await {
        Ok(metadata) => {
            if metadata.is_dir() {
                tokio::fs::remove_dir_all(path).await?;
            } else {
                tokio::fs::remove_file(path).await?;
            }
            Ok(Some(path.display().to_string()))
        }
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => Ok(None),
        Err(err) => Err(err.into()),
    }
}

async fn install_directory_bundle(destination: &Path, bundle: &RegistryBundle, force: bool) -> Result<Vec<String>> {
    let mut paths = Vec::new();
    for file in &bundle.files {
        let path = join_relative(destination, &file.path)?;
        write_text(&path, &file.content, true || force).await?;
        paths.push(path.display().to_string());
    }
    paths.sort();
    Ok(paths)
}

async fn install_codex_skill(cwd: &Path, slug: &str, bundle: &RegistryBundle, force: bool) -> Result<Vec<String>> {
    let skills_dir = cwd.join(".codex/skills");
    let destination = skills_dir.join(slug);
    let mut paths = install_directory_bundle(&destination, bundle, force).await?;

    let references = collect_skill_entries(&skills_dir)
        .await?
        .into_iter()
        .map(|entry| format!("./skills/{entry}/SKILL.md"))
        .collect::<Vec<_>>();
    let agents_path = cwd.join(".codex/AGENTS.md");
    update_managed_references(&agents_path, &references).await?;
    paths.push(agents_path.display().to_string());

    paths.sort();
    Ok(paths)
}

async fn uninstall_codex_skill(cwd: &Path, slug: &str) -> Result<Vec<String>> {
    let mut removed = Vec::new();
    let skills_dir = cwd.join(".codex/skills");
    if let Some(path) = remove_path_if_exists(&skills_dir.join(slug)).await? {
        removed.push(path);
    }

    let entries = collect_skill_entries(&skills_dir).await?;
    let agents_path = cwd.join(".codex/AGENTS.md");
    if entries.is_empty() {
        if let Some(path) = clear_managed_reference(&agents_path).await? {
            removed.push(path);
        }
    } else {
        let references = entries
            .into_iter()
            .map(|entry| format!("./skills/{entry}/SKILL.md"))
            .collect::<Vec<_>>();
        update_managed_references(&agents_path, &references).await?;
        removed.push(agents_path.display().to_string());
    }

    removed.sort();
    Ok(removed)
}

async fn install_cursor_rule(
    cwd: &Path,
    slug: &str,
    description: Option<&str>,
    bundle: &RegistryBundle,
    force: bool,
) -> Result<Vec<String>> {
    let path = cwd.join(".cursor/rules").join(format!("skhub-{slug}.mdc"));
    let content = format!(
        "---\ndescription: {}\nalwaysApply: false\n---\n\n{}\n",
        description.unwrap_or("Installed from SkillShub."),
        skill_markdown(&bundle.files)?
    );
    write_text(&path, &content, force).await?;
    Ok(vec![path.display().to_string()])
}

async fn uninstall_cursor_rule(cwd: &Path, slug: &str) -> Result<Vec<String>> {
    let mut removed = Vec::new();
    if let Some(path) = remove_path_if_exists(&cwd.join(".cursor/rules").join(format!("skhub-{slug}.mdc"))).await? {
        removed.push(path);
    }
    Ok(removed)
}

async fn install_claude_skill(cwd: &Path, slug: &str, bundle: &RegistryBundle, force: bool) -> Result<Vec<String>> {
    let skills_dir = cwd.join(".claude/skills");
    let destination = skills_dir.join(slug);
    let mut paths = install_directory_bundle(&destination, bundle, force).await?;

    let references = collect_skill_entries(&skills_dir)
        .await?
        .into_iter()
        .map(|entry| format!("./.claude/skills/{entry}/SKILL.md"))
        .collect::<Vec<_>>();
    let claude_path = cwd.join("CLAUDE.md");
    update_managed_references(&claude_path, &references).await?;
    paths.push(claude_path.display().to_string());

    paths.sort();
    Ok(paths)
}

async fn uninstall_claude_skill(cwd: &Path, slug: &str) -> Result<Vec<String>> {
    let mut removed = Vec::new();
    let skills_dir = cwd.join(".claude/skills");
    if let Some(path) = remove_path_if_exists(&skills_dir.join(slug)).await? {
        removed.push(path);
    }

    let entries = collect_skill_entries(&skills_dir).await?;
    let claude_path = cwd.join("CLAUDE.md");
    if entries.is_empty() {
        if let Some(path) = clear_managed_reference(&claude_path).await? {
            removed.push(path);
        }
    } else {
        let references = entries
            .into_iter()
            .map(|entry| format!("./.claude/skills/{entry}/SKILL.md"))
            .collect::<Vec<_>>();
        update_managed_references(&claude_path, &references).await?;
        removed.push(claude_path.display().to_string());
    }

    removed.sort();
    Ok(removed)
}

pub async fn install_bundle(
    cwd: &Path,
    slug: &str,
    description: Option<&str>,
    target: InstallTarget,
    bundle: &RegistryBundle,
    force: bool,
) -> Result<Vec<String>> {
    match target {
        InstallTarget::Codex => install_codex_skill(cwd, slug, bundle, force).await,
        InstallTarget::OpenClaw => install_directory_bundle(&cwd.join("skills").join(slug), bundle, force).await,
        InstallTarget::Cursor => install_cursor_rule(cwd, slug, description, bundle, force).await,
        InstallTarget::Claude => install_claude_skill(cwd, slug, bundle, force).await,
    }
}

pub async fn uninstall_target(cwd: &Path, slug: &str, target: InstallTarget) -> Result<Vec<String>> {
    match target {
        InstallTarget::Codex => uninstall_codex_skill(cwd, slug).await,
        InstallTarget::OpenClaw => {
            let mut removed = Vec::new();
            if let Some(path) = remove_path_if_exists(&cwd.join("skills").join(slug)).await? {
                removed.push(path);
            }
            Ok(removed)
        }
        InstallTarget::Cursor => uninstall_cursor_rule(cwd, slug).await,
        InstallTarget::Claude => uninstall_claude_skill(cwd, slug).await,
    }
}

pub async fn save_archive(slug: &str, version: &str, bytes: &[u8], force: bool) -> Result<PathBuf> {
    let path = std::env::temp_dir()
        .join("skillshub")
        .join("downloads")
        .join(format!("{slug}-{version}.zip"));
    write_binary(&path, bytes, force).await?;
    Ok(path)
}
