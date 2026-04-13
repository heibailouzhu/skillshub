use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;

#[derive(Debug, Clone, Serialize, Deserialize, FromRow, ToSchema)]
pub struct SkillPackage {
    pub id: uuid::Uuid,
    pub skill_id: uuid::Uuid,
    pub version: String,
    pub archive_path: String,
    pub extracted_path: String,
    pub entry_file: String,
    pub manifest_json: serde_json::Value,
    pub file_count: i32,
    pub total_size: i64,
    pub bundle_hash: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, ToSchema)]
pub struct SkillPackageFile {
    pub path: String,
    pub size: u64,
}
