use axum::{
    extract::{Path, State},
    response::Json,
};
use serde::Serialize;
use sha2::{Digest, Sha256};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::AppState;

#[derive(Debug, Serialize, ToSchema)]
pub struct RegistrySkillResponse {
    pub skill_id: Uuid,
    pub slug: String,
    pub title: String,
    pub description: Option<String>,
    pub latest_version: String,
    pub bundle_hash: String,
    pub available_targets: Vec<String>,
    pub source_repository: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct RegistryBundleFile {
    pub path: String,
    pub content: String,
    pub encoding: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct RegistryBundleResponse {
    pub slug: String,
    pub version: String,
    pub files: Vec<RegistryBundleFile>,
    pub bundle_hash: String,
}

#[utoipa::path(
    get,
    path = "/api/registry/skills/{slug}",
    params(
        ("slug" = String, Path, description = "Skill slug")
    ),
    responses(
        (status = 200, description = "Get registry skill metadata", body = RegistrySkillResponse),
        (status = 404, description = "Skill not found", body = crate::error::ErrorResponse)
    ),
    tag = "registry"
)]
pub async fn get_registry_skill(
    State(state): State<AppState>,
    Path(slug): Path<String>,
) -> AppResult<Json<RegistrySkillResponse>> {
    let row = sqlx::query_as::<_, (Uuid, String, String, Option<String>, String, String, Option<String>)>(
        r#"
        SELECT s.id, s.slug, s.title, s.description, s.version, s.content, sp.bundle_hash
        FROM skills s
        LEFT JOIN skill_packages sp ON sp.skill_id = s.id AND sp.version = s.version
        WHERE s.slug = $1 AND s.is_published = true AND s.is_deleted = false
        "#,
    )
    .bind(&slug)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::not_found("Skill not found", "SKILL_NOT_FOUND"))?;

    let response = RegistrySkillResponse {
        skill_id: row.0,
        slug: row.1,
        title: row.2,
        description: row.3,
        latest_version: row.4.clone(),
        bundle_hash: row.6.unwrap_or_else(|| canonical_bundle_hash(&row.4, &row.5)),
        available_targets: vec![
            "codex".to_string(),
            "cursor".to_string(),
            "claude".to_string(),
            "openclaw".to_string(),
        ],
        source_repository: None,
    };

    Ok(Json(response))
}

#[utoipa::path(
    get,
    path = "/api/registry/skills/{slug}/versions/{version}/bundle",
    params(
        ("slug" = String, Path, description = "Skill slug"),
        ("version" = String, Path, description = "Skill version")
    ),
    responses(
        (status = 200, description = "Get canonical bundle", body = RegistryBundleResponse),
        (status = 404, description = "Skill or version not found", body = crate::error::ErrorResponse)
    ),
    tag = "registry"
)]
pub async fn get_registry_bundle(
    State(state): State<AppState>,
    Path((slug, version)): Path<(String, String)>,
) -> AppResult<Json<RegistryBundleResponse>> {
    let row = sqlx::query_as::<_, (String, String, String, Option<String>, Option<String>)>(
        r#"
        SELECT s.slug, sv.version, sv.content, sp.extracted_path, sp.bundle_hash
        FROM skills s
        INNER JOIN skill_versions sv ON sv.skill_id = s.id
        LEFT JOIN skill_packages sp ON sp.skill_id = s.id AND sp.version = sv.version
        WHERE s.slug = $1
          AND sv.version = $2
          AND s.is_published = true
          AND s.is_deleted = false
        "#,
    )
    .bind(&slug)
    .bind(&version)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::not_found("Skill version not found", "RESOURCE_NOT_FOUND"))?;

    let files = if let Some(extracted_path) = row.3.as_ref() {
        read_bundle_files(extracted_path).await?
    } else {
        vec![RegistryBundleFile {
            path: "SKILL.md".to_string(),
            content: row.2.clone(),
            encoding: "utf-8".to_string(),
        }]
    };

    let bundle_hash = row
        .4
        .unwrap_or_else(|| canonical_bundle_hash(&row.1, &row.2));

    let response = RegistryBundleResponse {
        slug: row.0,
        version: row.1,
        files,
        bundle_hash,
    };

    Ok(Json(response))
}

async fn read_bundle_files(extracted_path: &str) -> AppResult<Vec<RegistryBundleFile>> {
    let package = tokio::task::spawn_blocking({
        let extracted_path = extracted_path.to_string();
        move || -> Result<Vec<RegistryBundleFile>, AppError> {
            let root = std::path::Path::new(&extracted_path);
            if !root.exists() {
                return Err(AppError::not_found("Skill package files not found", "RESOURCE_NOT_FOUND"));
            }

            let mut files = Vec::new();
            for entry in walkdir::WalkDir::new(root).into_iter().filter_map(|entry| entry.ok()) {
                if !entry.file_type().is_file() {
                    continue;
                }

                let relative = entry
                    .path()
                    .strip_prefix(root)
                    .map_err(|e| AppError::internal(e.to_string(), "INTERNAL_ERROR"))?
                    .to_string_lossy()
                    .replace('\\', "/");
                let content = std::fs::read_to_string(entry.path()).map_err(|_| {
                    AppError::validation(
                        format!("Package file is not valid UTF-8: {}", relative),
                        "ARCHIVE_INVALID",
                    )
                })?;

                files.push(RegistryBundleFile {
                    path: relative,
                    content,
                    encoding: "utf-8".to_string(),
                });
            }

            files.sort_by(|a, b| a.path.cmp(&b.path));
            Ok(files)
        }
    })
    .await
    .map_err(|e| AppError::internal(e.to_string(), "INTERNAL_ERROR"))??;

    Ok(package)
}

pub fn canonical_bundle_hash(version: &str, content: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(version.as_bytes());
    hasher.update([0]);
    hasher.update(b"SKILL.md");
    hasher.update([0]);
    hasher.update(content.as_bytes());
    format!("{:x}", hasher.finalize())
}

#[cfg(test)]
mod tests {
    use super::canonical_bundle_hash;

    #[test]
    fn test_canonical_bundle_hash_is_stable() {
        let hash_a = canonical_bundle_hash("1.0.0", "# Title");
        let hash_b = canonical_bundle_hash("1.0.0", "# Title");
        assert_eq!(hash_a, hash_b);
    }

    #[test]
    fn test_canonical_bundle_hash_changes_with_content() {
        let hash_a = canonical_bundle_hash("1.0.0", "# Title");
        let hash_b = canonical_bundle_hash("1.0.0", "# Other");
        assert_ne!(hash_a, hash_b);
    }
}
