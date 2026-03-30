use chrono::{DateTime, Utc};
use serde::Serialize;
use sqlx::FromRow;

#[derive(Debug, Clone, FromRow, Serialize)]
pub struct ModerationLog {
    pub id: uuid::Uuid,
    pub skill_id: uuid::Uuid,
    pub moderator_id: Option<uuid::Uuid>,
    pub action: String,
    pub reason: Option<String>,
    pub previous_status: Option<String>,
    pub new_status: Option<String>,
    pub created_at: DateTime<Utc>,
}
