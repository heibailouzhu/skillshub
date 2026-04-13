use std::path::PathBuf;

use anyhow::{anyhow, Result};
use clap::Args;

use crate::api::client::SkillShubClient;
use crate::config::load_config;
use crate::package::{package_skill_dir, parse_skill_markdown};

#[derive(Debug, Args)]
pub struct PublishCommand {
    pub archive: Option<PathBuf>,
    #[arg(long)]
    pub from: Option<PathBuf>,
    #[arg(long)]
    pub title: Option<String>,
    #[arg(long)]
    pub slug: Option<String>,
    #[arg(long)]
    pub description: Option<String>,
    #[arg(long)]
    pub category: Option<String>,
    #[arg(long)]
    pub version: Option<String>,
    #[arg(long)]
    pub tags: Option<String>,
}

impl PublishCommand {
    pub async fn run(self) -> Result<()> {
        let config = load_config().await?;
        let repository = config.active_repository.unwrap_or_else(|| crate::config::DEFAULT_REPOSITORY.to_string());
        let client = SkillShubClient::new(&repository)?;

        let (archive_path, inferred_title, inferred_version, inferred_description, inferred_category, inferred_tags) =
            if let Some(source_dir) = self.from.as_ref() {
                let metadata = parse_skill_markdown(source_dir)?;
                let title = metadata.frontmatter.name.clone();
                let version = metadata.frontmatter.version.clone().or_else(|| Some("1.0.0".to_string()));
                let output = source_dir.join(format!(
                    "{}-{}.zip",
                    title.clone().unwrap_or_else(|| "skill".to_string()),
                    version.clone().unwrap_or_else(|| "1.0.0".to_string())
                ));
                let packaged = package_skill_dir(source_dir, &output)?;
                (
                    packaged.output_path,
                    title,
                    version,
                    metadata.frontmatter.description.clone(),
                    metadata.frontmatter.category.clone(),
                    metadata.frontmatter.tags.clone().unwrap_or_default(),
                )
            } else if let Some(archive) = self.archive.clone() {
                (archive, None, None, None, None, Vec::new())
            } else {
                return Err(anyhow!("Provide either <zip> or --from <dir>"));
            };

        let title = self.title.or(inferred_title).ok_or_else(|| anyhow!("title is required; pass --title or provide SKILL.md frontmatter name"))?;
        let version = self.version.or(inferred_version);
        let description = self.description.or(inferred_description);
        let category = self.category.or(inferred_category);
        let tags = if let Some(tags) = self.tags {
            tags.split(',').filter_map(|tag| {
                let trimmed = tag.trim();
                (!trimmed.is_empty()).then(|| trimmed.to_string())
            }).collect::<Vec<_>>()
        } else {
            inferred_tags
        };

        let skill = client
            .publish_skill(
                &archive_path,
                self.slug.as_deref(),
                &title,
                description.as_deref(),
                category.as_deref(),
                version.as_deref(),
                &tags,
            )
            .await?;

        println!("Published {}@{}", skill.slug, skill.version);
        println!("Skill ID: {}", skill.id);
        Ok(())
    }
}
