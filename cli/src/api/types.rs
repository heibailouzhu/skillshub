use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginResponse {
    pub token: String,
    pub user_id: String,
    pub username: String,
    pub is_admin: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegistrySkillMetadata {
    pub skill_id: String,
    pub slug: String,
    pub title: String,
    pub description: Option<String>,
    pub latest_version: String,
    pub bundle_hash: String,
    pub available_targets: Vec<String>,
    pub source_repository: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegistryBundleFile {
    pub path: String,
    pub content: String,
    pub encoding: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RegistryBundle {
    pub slug: String,
    pub version: String,
    pub files: Vec<RegistryBundleFile>,
    pub bundle_hash: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PublishedSkill {
    pub id: String,
    pub slug: String,
    pub title: String,
    pub description: Option<String>,
    pub category: Option<String>,
    pub version: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorPayload {
    pub error: Option<String>,
    pub error_code: Option<String>,
}
