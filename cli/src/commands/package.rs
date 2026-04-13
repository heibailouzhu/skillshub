use std::path::PathBuf;

use anyhow::Result;
use clap::Args;

use crate::package::{package_skill_dir, validate_skill_dir};

#[derive(Debug, Args)]
pub struct PackageCommand {
    pub directory: PathBuf,
    #[arg(long, short)]
    pub output: Option<PathBuf>,
}

impl PackageCommand {
    pub async fn run(self) -> Result<()> {
        let metadata = validate_skill_dir(&self.directory)?;
        let slug = metadata.frontmatter.name.clone().unwrap_or_else(|| {
            self.directory
                .file_name()
                .and_then(|value| value.to_str())
                .unwrap_or("skill")
                .to_string()
        });
        let version = metadata.frontmatter.version.clone().unwrap_or_else(|| "1.0.0".to_string());
        let output = self
            .output
            .unwrap_or_else(|| self.directory.join(format!("{slug}-{version}.zip")));
        let packaged = package_skill_dir(&self.directory, &output)?;
        println!("Packaged: {}", packaged.output_path.display());
        println!("Bundle hash: {}", packaged.hash);
        Ok(())
    }
}
