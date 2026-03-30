use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_comment_serialization() {
        let comment = Comment {
            id: uuid::Uuid::new_v4(),
            skill_id: uuid::Uuid::new_v4(),
            user_id: uuid::Uuid::new_v4(),
            content: "Test comment".to_string(),
            parent_id: None,
            created_at: Utc::now(),
            updated_at: Utc::now(),
            is_deleted: false,
        };

        let json = serde_json::to_string(&comment).unwrap();
        assert!(json.contains("Test comment"));
    }

    #[test]
    fn test_comment_with_parent_serialization() {
        let parent_id = uuid::Uuid::new_v4();
        let comment = Comment {
            id: uuid::Uuid::new_v4(),
            skill_id: uuid::Uuid::new_v4(),
            user_id: uuid::Uuid::new_v4(),
            content: "Reply comment".to_string(),
            parent_id: Some(parent_id),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            is_deleted: false,
        };

        let json = serde_json::to_string(&comment).unwrap();
        assert!(json.contains("Reply comment"));
    }

    #[test]
    fn test_create_comment_request_deserialization() {
        let json = r#"{
            "content": "Test comment",
            "parent_id": null
        }"#;

        let request: CreateCommentRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.content, "Test comment");
        assert_eq!(request.parent_id, None);
    }

    #[test]
    fn test_create_comment_request_with_parent() {
        let json = r#"{
            "content": "Reply comment",
            "parent_id": "550e8400-e29b-41d4-a716-446655440000"
        }"#;

        let request: CreateCommentRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.content, "Reply comment");
        assert!(request.parent_id.is_some());
    }

    #[test]
    fn test_update_comment_request_deserialization() {
        let json = r#"{
            "content": "Updated comment"
        }"#;

        let request: UpdateCommentRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.content, "Updated comment");
    }

    #[test]
    fn test_comment_list_response_serialization() {
        let response = CommentListResponse {
            comments: vec![],
            total: 5,
            page: 1,
            page_size: 20,
        };

        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("5"));
    }
}

#[derive(Debug, Clone, FromRow, Serialize, ToSchema)]
pub struct Comment {
    pub id: uuid::Uuid,
    pub skill_id: uuid::Uuid,
    pub user_id: uuid::Uuid,
    pub content: String,
    pub parent_id: Option<uuid::Uuid>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub is_deleted: bool,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct CreateCommentRequest {
    pub content: String,
    pub parent_id: Option<uuid::Uuid>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct UpdateCommentRequest {
    pub content: String,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct CommentListResponse {
    pub comments: Vec<Comment>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}
