use std::fs::File;
use std::io::Cursor;
use std::path::{Component, Path, PathBuf};

use anyhow::{anyhow, bail, Context, Result};
use serde_json::json;
use sha2::{Digest, Sha256};
use tokio::fs;
use walkdir::WalkDir;
use zip::ZipArchive;

use crate::models::skill_package::SkillPackageFile;

const ENTRY_FILE: &str = "SKILL.md";
const STORAGE_ROOT: &str = "storage";
const MAX_ARCHIVE_SIZE: usize = 25 * 1024 * 1024;
const MAX_FILE_COUNT: usize = 500;

pub struct StoredPackage {
    pub archive_path: String,
    pub extracted_path: String,
    pub files: Vec<SkillPackageFile>,
    pub total_size: i64,
    pub bundle_hash: String,
    pub skill_markdown: String,
    pub manifest_json: serde_json::Value,
}

pub async fn store_skill_archive(skill_id: uuid::Uuid, slug: &str, version: &str, archive_bytes: Vec<u8>) -> Result<StoredPackage> {
    if archive_bytes.is_empty() {
        bail!("Uploaded archive is empty");
    }
    if archive_bytes.len() > MAX_ARCHIVE_SIZE {
        bail!("Archive exceeds size limit");
    }

    let archive_dir = Path::new(STORAGE_ROOT).join("skill-archives").join(skill_id.to_string());
    let extracted_dir = Path::new(STORAGE_ROOT).join("skills").join(skill_id.to_string()).join(version);
    let archive_path = archive_dir.join(format!("{}-{}.zip", slug, version));

    fs::create_dir_all(&archive_dir).await?;
    if fs::try_exists(&extracted_dir).await? {
        fs::remove_dir_all(&extracted_dir).await?;
    }
    fs::create_dir_all(&extracted_dir).await?;
    fs::write(&archive_path, &archive_bytes).await?;

    unpack_archive(&archive_bytes, &extracted_dir)?;

    let files = collect_files(&extracted_dir)?;
    if files.is_empty() {
        bail!("Archive does not contain any files");
    }
    if files.len() > MAX_FILE_COUNT {
        bail!("Archive contains too many files");
    }
    if !files.iter().any(|file| file.path == ENTRY_FILE) {
        bail!("Archive must contain SKILL.md");
    }

    let skill_markdown = fs::read_to_string(extracted_dir.join(ENTRY_FILE)).await?;
    let total_size: i64 = files.iter().map(|file| file.size as i64).sum();
    let bundle_hash = compute_bundle_hash(&extracted_dir, &files)?;
    let meta_path = extracted_dir.join("_meta.json");
    let package_meta = if meta_path.exists() {
        match fs::read_to_string(&meta_path).await {
            Ok(raw) => serde_json::from_str::<serde_json::Value>(&raw).unwrap_or_else(|_| json!({})),
            Err(_) => json!({}),
        }
    } else {
        json!({})
    };
    let manifest_json = json!({
        "entry_file": ENTRY_FILE,
        "meta_file": if meta_path.exists() { Some("_meta.json") } else { None::<&str> },
        "files": files,
        "package_meta": package_meta,
    });

    Ok(StoredPackage {
        archive_path: archive_path.to_string_lossy().to_string(),
        extracted_path: extracted_dir.to_string_lossy().to_string(),
        files,
        total_size,
        bundle_hash,
        skill_markdown,
        manifest_json,
    })
}

fn unpack_archive(archive_bytes: &[u8], target_dir: &Path) -> Result<()> {
    let reader = Cursor::new(archive_bytes);
    let mut archive = ZipArchive::new(reader).context("Invalid zip archive")?;

    for index in 0..archive.len() {
        let mut file = archive.by_index(index)?;
        let enclosed = file.enclosed_name().ok_or_else(|| anyhow!("Archive contains invalid path"))?;
        let relative = sanitize_zip_path(&enclosed)?;
        let output_path = target_dir.join(&relative);

        if file.name().ends_with('/') {
          std::fs::create_dir_all(&output_path)?;
          continue;
        }

        if let Some(parent) = output_path.parent() {
            std::fs::create_dir_all(parent)?;
        }

        let mut output = File::create(&output_path)?;
        std::io::copy(&mut file, &mut output)?;
    }

    Ok(())
}

fn sanitize_zip_path(path: &Path) -> Result<PathBuf> {
    let mut sanitized = PathBuf::new();

    for component in path.components() {
        match component {
            Component::Normal(segment) => sanitized.push(segment),
            Component::CurDir => {}
            Component::RootDir | Component::Prefix(_) | Component::ParentDir => {
                bail!("Archive contains unsafe path");
            }
        }
    }

    if sanitized.as_os_str().is_empty() {
        bail!("Archive contains empty path");
    }

    Ok(sanitized)
}

fn collect_files(root: &Path) -> Result<Vec<SkillPackageFile>> {
    let mut files = Vec::new();
    for entry in WalkDir::new(root).into_iter().filter_map(|entry| entry.ok()) {
        if entry.file_type().is_file() {
            let relative = entry.path().strip_prefix(root)?.to_string_lossy().replace('\\', "/");
            let size = entry.metadata()?.len();
            files.push(SkillPackageFile { path: relative, size });
        }
    }
    files.sort_by(|a, b| a.path.cmp(&b.path));
    Ok(files)
}

fn compute_bundle_hash(root: &Path, files: &[SkillPackageFile]) -> Result<String> {
    let mut hasher = Sha256::new();
    for file in files {
        hasher.update(file.path.as_bytes());
        hasher.update([0]);
        let content = std::fs::read(root.join(&file.path))?;
        hasher.update(&content);
        hasher.update([0]);
    }
    Ok(format!("{:x}", hasher.finalize()))
}
