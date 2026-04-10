use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::FromRow;
use utoipa::ToSchema;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_favorite_serialization() {
        let favorite = Favorite {
            id: uuid::Uuid::new_v4(),
            user_id: uuid::Uuid::new_v4(),
            skill_id: uuid::Uuid::new_v4(),
            created_at: Utc::now(),
        };

        let json = serde_json::to_string(&favorite).unwrap();
        assert!(json.contains("user_id"));
        assert!(json.contains("skill_id"));
    }

    #[test]
    fn test_favorite_item_serialization() {
        let item = FavoriteItem {
            id: uuid::Uuid::new_v4(),
            skill_id: uuid::Uuid::new_v4(),
            skill_title: "Test Skill".to_string(),
            skill_description: Some("Test description".to_string()),
            created_at: Utc::now(),
        };

        let json = serde_json::to_string(&item).unwrap();
        assert!(json.contains("Test Skill"));
        assert!(json.contains("Test description"));
    }

    #[test]
    fn test_favorite_item_without_description() {
        let item = FavoriteItem {
            id: uuid::Uuid::new_v4(),
            skill_id: uuid::Uuid::new_v4(),
            skill_title: "Test Skill".to_string(),
            skill_description: None,
            created_at: Utc::now(),
        };

        let json = serde_json::to_string(&item).unwrap();
        assert!(json.contains("Test Skill"));
    }

    #[test]
    fn test_favorite_list_response_serialization() {
        let response = FavoriteListResponse {
            favorites: vec![],
            total: 3,
            page: 1,
            page_size: 20,
        };

        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("3"));
    }
}

#[derive(Debug, Clone, FromRow, Serialize, ToSchema)]
pub struct Favorite {
    pub id: uuid::Uuid,
    pub user_id: uuid::Uuid,
    pub skill_id: uuid::Uuid,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct FavoriteItem {
    pub id: uuid::Uuid,
    pub skill_id: uuid::Uuid,
    pub skill_title: String,
    pub skill_description: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct FavoriteListResponse {
    pub favorites: Vec<FavoriteItem>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}
