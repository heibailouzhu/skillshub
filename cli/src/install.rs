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

pub async fn install_bundle(
    cwd: &Path,
    slug: &str,
    description: Option<&str>,
    target: InstallTarget,
    bundle: &RegistryBundle,
    force: bool,
) -> Result<Vec<String>> {
    match target {
        InstallTarget::Codex => install_directory_bundle(&cwd.join(".agents/skills").join(slug), bundle, force).await,
        InstallTarget::OpenClaw => install_directory_bundle(&cwd.join("skills").join(slug), bundle, force).await,
        InstallTarget::Cursor => install_cursor_rule(cwd, slug, description, bundle, force).await,
        InstallTarget::Claude => install_claude_skill(cwd, slug, description, bundle, force).await,
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

async fn install_claude_skill(
    cwd: &Path,
    slug: &str,
    description: Option<&str>,
    bundle: &RegistryBundle,
    force: bool,
) -> Result<Vec<String>> {
    let skill_path = cwd.join(".skhub/claude/skills").join(format!("{slug}.md"));
    let index_path = cwd.join(".skhub/claude/index.md");
    let claude_path = cwd.join("CLAUDE.md");
    let managed_start = "<!-- skhub:managed:start -->";
    let managed_end = "<!-- skhub:managed:end -->";

    let skill_content = format!(
        "# {slug}\n\n{}\n\n{}\n",
        description.unwrap_or("Installed from SkillShub."),
        skill_markdown(&bundle.files)?
    );
    write_text(&skill_path, &skill_content, force).await?;

    let skills_dir = cwd.join(".skhub/claude/skills");
    tokio::fs::create_dir_all(&skills_dir).await?;
    let mut entries = tokio::fs::read_dir(&skills_dir).await?;
    let mut names = Vec::new();
    while let Some(entry) = entries.next_entry().await? {
        let name = entry.file_name().to_string_lossy().to_string();
        if name.ends_with(".md") {
            names.push(name);
        }
    }
    names.sort();
    let mut index = String::from("# SkillShub Claude Skills\n\n");
    for name in names {
        index.push_str(&format!("@./skills/{name}\n"));
    }
    index.push('\n');
    write_text(&index_path, &index, true).await?;

    let managed_block = format!("{managed_start}\n@./.skhub/claude/index.md\n{managed_end}");
    let current = tokio::fs::read_to_string(&claude_path).await.unwrap_or_default();
    let next = if let Some(start) = current.find(managed_start) {
        if let Some(end) = current.find(managed_end) {
            let after = end + managed_end.len();
            format!("{}{}{}", &current[..start], managed_block, &current[after..])
        } else {
            format!("{}\n\n{}\n", current.trim_end(), managed_block)
        }
    } else if current.trim().is_empty() {
        format!("{managed_block}\n")
    } else {
        format!("{}\n\n{}\n", current.trim_end(), managed_block)
    };
    write_text(&claude_path, &next, true).await?;

    Ok(vec![
        skill_path.display().to_string(),
        index_path.display().to_string(),
        claude_path.display().to_string(),
    ])
}

pub async fn save_archive(cwd: &Path, slug: &str, version: &str, bytes: &[u8], force: bool) -> Result<PathBuf> {
    let path = cwd.join(".skhub/downloads").join(format!("{slug}-{version}.zip"));
    write_binary(&path, bytes, force).await?;
    Ok(path)
}
