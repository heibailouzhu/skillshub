use std::fs::File;
use std::io::{Read, Write};
use std::path::{Path, PathBuf};

use anyhow::{anyhow, Result};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use walkdir::WalkDir;
use zip::write::SimpleFileOptions;
use zip::CompressionMethod;

use crate::fs::assert_safe_relative_path;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SkillFrontmatter {
    pub name: Option<String>,
    pub description: Option<String>,
    pub homepage: Option<String>,
    pub version: Option<String>,
    pub author: Option<String>,
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
    pub targets: Option<Vec<String>>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Clone)]
pub struct SkillPackageMetadata {
    pub frontmatter: SkillFrontmatter,
    pub markdown: String,
}

#[derive(Debug, Clone)]
pub struct PackagedSkill {
    pub output_path: PathBuf,
    pub metadata: SkillPackageMetadata,
    pub hash: String,
}

pub fn parse_skill_markdown(skill_dir: &Path) -> Result<SkillPackageMetadata> {
    let path = skill_dir.join("SKILL.md");
    if !path.exists() {
        return Err(anyhow!("Skill directory must contain SKILL.md"));
    }

    let markdown = std::fs::read_to_string(path)?;
    let frontmatter = parse_frontmatter(&markdown)?;
    Ok(SkillPackageMetadata { frontmatter, markdown })
}

fn parse_frontmatter(markdown: &str) -> Result<SkillFrontmatter> {
    let trimmed = markdown.trim_start();
    if !trimmed.starts_with("---\n") && !trimmed.starts_with("---\r\n") {
        return Ok(SkillFrontmatter::default());
    }

    let without_start = &trimmed[4..];
    let end_marker = if let Some(index) = without_start.find("\n---\n") {
        Some((index, 5usize))
    } else if let Some(index) = without_start.find("\n---\r\n") {
        Some((index, 6usize))
    } else {
        None
    };

    let Some((end_index, _marker_len)) = end_marker else {
        return Ok(SkillFrontmatter::default());
    };

    let yaml = &without_start[..end_index];
    let mut frontmatter = SkillFrontmatter::default();
    for raw_line in yaml.lines() {
        let line = raw_line.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        let Some((key, value)) = line.split_once(':') else {
            continue;
        };
        let key = key.trim();
        let value = value.trim().trim_matches('"').trim_matches('\'');
        match key {
            "name" => frontmatter.name = Some(value.to_string()),
            "description" => frontmatter.description = Some(value.to_string()),
            "homepage" => frontmatter.homepage = Some(value.to_string()),
            "version" => frontmatter.version = Some(value.to_string()),
            "author" => frontmatter.author = Some(value.to_string()),
            "category" => frontmatter.category = Some(value.to_string()),
            "tags" => {
                frontmatter.tags = Some(parse_list_or_csv(value));
            }
            "targets" => {
                frontmatter.targets = Some(parse_list_or_csv(value));
            }
            "metadata" => {
                if let Ok(json) = serde_json::from_str::<serde_json::Value>(value) {
                    frontmatter.metadata = Some(json);
                }
            }
            _ => {}
        }
    }
    Ok(frontmatter)
}

fn parse_list_or_csv(value: &str) -> Vec<String> {
    let trimmed = value.trim();
    if trimmed.starts_with('[') && trimmed.ends_with(']') {
        trimmed
            .trim_start_matches('[')
            .trim_end_matches(']')
            .split(',')
            .filter_map(|item| {
                let item = item.trim().trim_matches('"').trim_matches('\'');
                (!item.is_empty()).then(|| item.to_string())
            })
            .collect()
    } else {
        trimmed
            .split(',')
            .filter_map(|item| {
                let item = item.trim().trim_matches('"').trim_matches('\'');
                (!item.is_empty()).then(|| item.to_string())
            })
            .collect()
    }
}

pub fn validate_skill_dir(skill_dir: &Path) -> Result<SkillPackageMetadata> {
    parse_skill_markdown(skill_dir)
}

pub fn package_skill_dir(skill_dir: &Path, output_path: &Path) -> Result<PackagedSkill> {
    let metadata = validate_skill_dir(skill_dir)?;
    if let Some(parent) = output_path.parent() {
        std::fs::create_dir_all(parent)?;
    }

    let file = File::create(output_path)?;
    let mut zip = zip::ZipWriter::new(file);
    let options = SimpleFileOptions::default().compression_method(CompressionMethod::Deflated);
    let mut hasher = Sha256::new();

    for entry in WalkDir::new(skill_dir).into_iter().filter_map(|entry| entry.ok()) {
        let path = entry.path();
        if path.is_dir() {
            continue;
        }
        let name = path.file_name().and_then(|value| value.to_str()).unwrap_or_default();
        if name.eq_ignore_ascii_case("manifest.json") {
            continue;
        }
        let relative = path.strip_prefix(skill_dir)?.to_string_lossy().replace('\\', "/");
        let safe_relative = assert_safe_relative_path(&relative)?;
        zip.start_file(&safe_relative, options)?;
        let mut source = File::open(path)?;
        let mut buffer = Vec::new();
        source.read_to_end(&mut buffer)?;
        hasher.update(safe_relative.as_bytes());
        hasher.update([0]);
        hasher.update(&buffer);
        zip.write_all(&buffer)?;
    }

    zip.finish()?;
    Ok(PackagedSkill {
        output_path: output_path.to_path_buf(),
        metadata,
        hash: format!("{:x}", hasher.finalize()),
    })
}
