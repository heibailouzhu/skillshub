use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use utoipa::ToSchema;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_user_serialization() {
        let user = User {
            id: uuid::Uuid::new_v4(),
            email: "test@example.com".to_string(),
            password_hash: "hashed_password".to_string(),
            username: "testuser".to_string(),
            is_admin: false,
            avatar_url: Some("https://example.com/avatar.jpg".to_string()),
            bio: Some("Test bio".to_string()),
            created_at: Utc::now(),
            updated_at: Utc::now(),
            is_deleted: false,
        };

        let json = serde_json::to_string(&user).unwrap();
        assert!(json.contains("test@example.com"));
        assert!(json.contains("testuser"));
    }

    #[test]
    fn test_user_deserialization() {
        let json = r#"{
            "id": "550e8400-e29b-41d4-a716-446655440000",
            "email": "test@example.com",
            "password_hash": "hashed_password",
            "username": "testuser",
            "is_admin": false,
            "avatar_url": "https://example.com/avatar.jpg",
            "bio": "Test bio",
            "created_at": "2024-01-01T00:00:00Z",
            "updated_at": "2024-01-01T00:00:00Z",
            "is_deleted": false
        }"#;

        let user: User = serde_json::from_str(json).unwrap();
        assert_eq!(user.email, "test@example.com");
        assert_eq!(user.username, "testuser");
    }

    #[test]
    fn test_user_public_serialization() {
        let user_public = UserPublic {
            id: uuid::Uuid::new_v4(),
            email: "test@example.com".to_string(),
            username: "testuser".to_string(),
            is_admin: false,
            avatar_url: Some("https://example.com/avatar.jpg".to_string()),
            bio: Some("Test bio".to_string()),
            created_at: Utc::now(),
        };

        let json = serde_json::to_string(&user_public).unwrap();
        assert!(json.contains("test@example.com"));
        assert!(!json.contains("password_hash"));
    }

    #[test]
    fn test_register_request_deserialization() {
        let json = r#"{
            "username": "testuser",
            "email": "test@example.com",
            "password": "password123"
        }"#;

        let request: RegisterRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.username, "testuser");
        assert_eq!(request.email, "test@example.com");
        assert_eq!(request.password, "password123");
    }

    #[test]
    fn test_login_request_deserialization() {
        let json = r#"{
            "username": "testuser",
            "password": "password123"
        }"#;

        let request: LoginRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.username, "testuser");
        assert_eq!(request.password, "password123");
    }

    #[test]
    fn test_login_response_serialization() {
        let response = LoginResponse {
            token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9".to_string(),
            user_id: "550e8400-e29b-41d4-a716-446655440000".to_string(),
            username: "testuser".to_string(),
            is_admin: false,
        };

        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"));
        assert!(json.contains("testuser"));
    }
}

#[derive(Debug, Clone, FromRow, Serialize, Deserialize, ToSchema)]
pub struct User {
    pub id: uuid::Uuid,
    pub email: String,
    pub password_hash: String,
    pub username: String,
    pub is_admin: bool,
    pub avatar_url: Option<String>,
    pub bio: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
    pub is_deleted: bool,
}

#[derive(Debug, Clone, FromRow, Serialize, ToSchema)]
#[allow(dead_code)]
pub struct UserPublic {
    pub id: uuid::Uuid,
    pub email: String,
    pub username: String,
    pub is_admin: bool,
    pub avatar_url: Option<String>,
    pub bio: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct RegisterRequest {
    pub username: String,
    pub email: String,
    pub password: String,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct LoginResponse {
    pub token: String,
    pub user_id: String,
    pub username: String,
    pub is_admin: bool,
}
