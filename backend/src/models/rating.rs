use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use utoipa::ToSchema;

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rating_serialization() {
        let rating = Rating {
            id: Uuid::new_v4(),
            skill_id: Uuid::new_v4(),
            user_id: Uuid::new_v4(),
            rating: 5,
            created_at: Utc::now(),
        };

        let json = serde_json::to_string(&rating).unwrap();
        assert!(json.contains("5"));
    }

    #[test]
    fn test_create_rating_request_deserialization() {
        let json = r#"{
            "rating": 4
        }"#;

        let request: CreateRatingRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.rating, 4);
    }

    #[test]
    fn test_update_rating_request_deserialization() {
        let json = r#"{
            "rating": 3
        }"#;

        let request: UpdateRatingRequest = serde_json::from_str(json).unwrap();
        assert_eq!(request.rating, 3);
    }

    #[test]
    fn test_rating_stats_response_serialization() {
        let skill_id = Uuid::new_v4();
        let response = RatingStatsResponse {
            skill_id,
            total_ratings: 10,
            average_rating: 4.5,
        };

        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("10"));
        assert!(json.contains("4.5"));
    }

    #[test]
    fn test_rating_list_response_serialization() {
        let response = RatingListResponse {
            ratings: vec![],
            total: 5,
            page: 1,
            page_size: 20,
        };

        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("5"));
    }
}

#[derive(Debug, Clone, FromRow, Serialize, ToSchema)]
pub struct Rating {
    pub id: Uuid,
    pub skill_id: Uuid,
    pub user_id: Uuid,
    pub rating: i32,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct CreateRatingRequest {
    pub rating: i32,
}

#[derive(Debug, Clone, Deserialize, ToSchema)]
pub struct UpdateRatingRequest {
    pub rating: i32,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct RatingStatsResponse {
    pub skill_id: Uuid,
    pub total_ratings: i64,
    pub average_rating: f64,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct RatingListResponse {
    pub ratings: Vec<Rating>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}
