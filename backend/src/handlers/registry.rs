use axum::{
    extract::{Path, State},
    response::Json,
};
use serde::Serialize;
use sha2::{Digest, Sha256};
use utoipa::ToSchema;

use crate::error::{AppError, AppResult};
use crate::AppState;

#[derive(Debug, Serialize, ToSchema)]
pub struct RegistrySkillResponse {
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
        ("slug" = String, Path, description = "技能 slug")
    ),
    responses(
        (status = 200, description = "成功获取 registry 元数据", body = RegistrySkillResponse),
        (status = 404, description = "技能不存在", body = crate::error::ErrorResponse)
    ),
    tag = "registry"
)]
pub async fn get_registry_skill(
    State(state): State<AppState>,
    Path(slug): Path<String>,
) -> AppResult<Json<RegistrySkillResponse>> {
    let row = sqlx::query_as::<_, (String, String, Option<String>, String, String)>(
        r#"
        SELECT s.slug, s.title, s.description, s.version, s.content
        FROM skills s
        WHERE s.slug = $1 AND s.is_published = true AND s.is_deleted = false
        "#,
    )
    .bind(&slug)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Skill not found".to_string()))?;

    let response = RegistrySkillResponse {
        slug: row.0,
        title: row.1,
        description: row.2,
        latest_version: row.3.clone(),
        bundle_hash: canonical_bundle_hash(&row.3, &row.4),
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
        ("slug" = String, Path, description = "技能 slug"),
        ("version" = String, Path, description = "技能版本")
    ),
    responses(
        (status = 200, description = "成功获取 canonical bundle", body = RegistryBundleResponse),
        (status = 404, description = "技能或版本不存在", body = crate::error::ErrorResponse)
    ),
    tag = "registry"
)]
pub async fn get_registry_bundle(
    State(state): State<AppState>,
    Path((slug, version)): Path<(String, String)>,
) -> AppResult<Json<RegistryBundleResponse>> {
    let row = sqlx::query_as::<_, (String, String, String)>(
        r#"
        SELECT s.slug, sv.version, sv.content
        FROM skills s
        INNER JOIN skill_versions sv ON sv.skill_id = s.id
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
    .ok_or_else(|| AppError::NotFound("Skill version not found".to_string()))?;

    let bundle_hash = canonical_bundle_hash(&row.1, &row.2);
    let response = RegistryBundleResponse {
        slug: row.0,
        version: row.1,
        files: vec![RegistryBundleFile {
            path: "SKILL.md".to_string(),
            content: row.2,
            encoding: "utf-8".to_string(),
        }],
        bundle_hash,
    };

    Ok(Json(response))
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
