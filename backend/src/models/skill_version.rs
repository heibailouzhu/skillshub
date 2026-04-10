use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;
use uuid::Uuid;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_skill_version_serialization() {
        let version = SkillVersion {
            id: Uuid::new_v4(),
            skill_id: Uuid::new_v4(),
            version: "1.0.0".to_string(),
            changelog: Some("Initial version".to_string()),
            content: "Version content".to_string(),
            created_at: Utc::now(),
        };

        let json = serde_json::to_string(&version).unwrap();
        assert!(json.contains("1.0.0"));
        assert!(json.contains("Initial version"));
    }

    #[test]
    fn test_skill_version_without_changelog() {
        let version = SkillVersion {
            id: Uuid::new_v4(),
            skill_id: Uuid::new_v4(),
            version: "2.0.0".to_string(),
            changelog: None,
            content: "New content".to_string(),
            created_at: Utc::now(),
        };

        let json = serde_json::to_string(&version).unwrap();
        assert!(json.contains("2.0.0"));
    }

    #[test]
    fn test_create_version_request_deserialization() {
        let json = r#"{
            "version": "1.0.1",
            "content": "Updated content",
            "changelog": "Bug fixes"
        }"#;

        let request: CreateVersionRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.version, "1.0.1");
        assert_eq!(request.content, "Updated content");
        assert_eq!(request.changelog, Some("Bug fixes".to_string()));
    }

    #[test]
    fn test_create_version_request_without_changelog() {
        let json = r#"{
            "version": "1.0.2",
            "content": "Minor update"
        }"#;

        let request: CreateVersionRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.version, "1.0.2");
        assert_eq!(request.changelog, None);
    }

    #[test]
    fn test_version_detail_response_serialization() {
        let skill_id = Uuid::new_v4();
        let response = VersionDetailResponse {
            id: Uuid::new_v4(),
            skill_id,
            version: "1.0.0".to_string(),
            changelog: Some("Initial release".to_string()),
            content: "Version content".to_string(),
            created_at: Utc::now(),
            skill_title: Some("Test Skill".to_string()),
        };

        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("1.0.0"));
        assert!(json.contains("Test Skill"));
    }
}

#[derive(Debug, Clone, FromRow, Serialize, ToSchema)]
pub struct SkillVersion {
    pub id: Uuid,
    pub skill_id: Uuid,
    pub version: String,
    pub changelog: Option<String>,
    pub content: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct CreateVersionRequest {
    pub version: String,
    pub content: String,
    pub changelog: Option<String>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct VersionDetailResponse {
    pub id: Uuid,
    pub skill_id: Uuid,
    pub version: String,
    pub changelog: Option<String>,
    pub content: String,
    pub created_at: DateTime<Utc>,
    pub skill_title: Option<String>,
}
