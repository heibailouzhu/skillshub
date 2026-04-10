// Request handlers module

pub mod auth;
pub mod comments;
pub mod favorites;
pub mod ratings;
pub mod registry;
pub mod skills;
pub mod versions;

pub use auth::{login, register};

use axum::Json;

/// Health check endpoint
#[utoipa::path(
    get,
    path = "/health",
    responses(
        (status = 200, description = "Service is healthy", body = HealthResponse)
    ),
    tag = "health"
)]
pub async fn health_check() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok".to_string(),
    })
}

#[derive(serde::Serialize, serde::Deserialize, utoipa::ToSchema)]
pub struct HealthResponse {
    pub status: String,
}
