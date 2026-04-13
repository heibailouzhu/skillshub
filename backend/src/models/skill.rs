use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_skill_serialization() {
        let skill = Skill {
            id: uuid::Uuid::new_v4(),
            slug: "test-skill".to_string(),
            title: "Test Skill".to_string(),
            description: Some("Test description".to_string()),
            content: "Test content".to_string(),
            author_id: uuid::Uuid::new_v4(),
            category: Some("AI".to_string()),
            tags: Some(vec!["Python".to_string(), "ML".to_string()]),
            version: "1.0.0".to_string(),
            download_count: 100,
            rating_avg: 4.5,
            rating_count: 20,
            is_published: true,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            is_deleted: false,
        };

        let json = serde_json::to_string(&skill).unwrap();
        assert!(json.contains("Test Skill"));
        assert!(json.contains("Python"));
    }

    #[test]
    fn test_skill_deserialization() {
        let json = r#"{
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "slug": "test-skill",
            "title": "Test Skill",
            "description": "Test description",
            "content": "Test content",
            "author_id": "660e8400-e29b-41d4-a716-446655440001",
            "category": "AI",
            "tags": ["Python", "ML"],
            "version": "1.0.0",
            "download_count": 100,
            "rating_avg": 4.5,
            "rating_count": 20,
            "is_published": true,
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
            "is_deleted": false
        }"#;

        let skill: Skill = serde_json::from_str(json).unwrap();
        assert_eq!(skill.title, "Test Skill");
        assert_eq!(skill.slug, "test-skill");
        assert_eq!(skill.version, "1.0.0");
    }

    #[test]
    fn test_skill_list_item_serialization() {
        let item = SkillListItem {
            id: uuid::Uuid::new_v4(),
            slug: "test-skill".to_string(),
            title: "Test Skill".to_string(),
            description: Some("Test description".to_string()),
            author_id: uuid::Uuid::new_v4(),
            author_username: Some("testuser".to_string()),
            category: Some("AI".to_string()),
            version: "1.0.0".to_string(),
            download_count: 100,
            rating_avg: 4.5,
            favorite_count: 8,
            created_at: Utc::now(),
        };

        let json = serde_json::to_string(&item).unwrap();
        assert!(json.contains("Test Skill"));
        assert!(json.contains("testuser"));
    }

    #[test]
    fn test_create_skill_request_deserialization() {
        let json = r#"{
            "title": "Test Skill",
            "description": "Test description",
            "content": "Test content",
            "category": "AI",
            "tags": ["Python", "ML"]
        }"#;

        let request: CreateSkillRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.title, "Test Skill");
        assert_eq!(request.category, Some("AI".to_string()));
    }

    #[test]
    fn test_update_skill_request_deserialization() {
        let json = r#"{
            "title": "Updated Title",
            "content": "Updated content"
        }"#;

        let request: UpdateSkillRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.title, Some("Updated Title".to_string()));
        assert_eq!(request.description, None);
    }

    #[test]
    fn test_skill_list_response_serialization() {
        let response = SkillListResponse {
            skills: vec![],
            total: 10,
            page: 1,
            page_size: 20,
        };

        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("10"));
        assert!(json.contains("1"));
    }
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct Skill {
    pub id: uuid::Uuid,
    pub slug: String,
    pub title: String,
    pub description: Option<String>,
    pub content: String,
    pub author_id: uuid::Uuid,
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
    pub version: String,
    pub download_count: i32,
    pub rating_avg: f64,
    pub rating_count: i32,
    pub is_published: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub is_deleted: bool,
}

#[derive(Debug, Clone, FromRow, Serialize, ToSchema)]
pub struct SkillListItem {
    pub id: uuid::Uuid,
    pub slug: String,
    pub title: String,
    pub description: Option<String>,
    pub author_id: uuid::Uuid,
    pub author_username: Option<String>,
    pub category: Option<String>,
    pub version: String,
    pub download_count: i32,
    pub rating_avg: f64,
    pub favorite_count: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct CreateSkillRequest {
    pub title: String,
    pub description: Option<String>,
    pub content: String,
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct UpdateSkillRequest {
    pub title: Option<String>,
    pub description: Option<String>,
    pub content: Option<String>,
    pub category: Option<String>,
    pub tags: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct SkillListResponse {
    pub skills: Vec<SkillListItem>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}
