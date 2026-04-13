use axum::{extract::State, response::Json};
use serde::Serialize;
use sqlx::Row;
use uuid::Uuid;

use crate::error::{AppError, AppResult, ErrorResponse};
use crate::models::user::{LoginRequest, LoginResponse, RegisterRequest, User};
use crate::AppState;

#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct RegisterResponse {
    pub message: String,
    pub user_id: Uuid,
    pub username: String,
    pub token: String,
    pub is_admin: bool,
}

#[utoipa::path(
    post,
    path = "/api/auth/register",
    request_body = RegisterRequest,
    responses(
        (status = 201, description = "User registered successfully", body = RegisterResponse),
        (status = 400, description = "Invalid request", body = ErrorResponse),
        (status = 409, description = "User already exists", body = ErrorResponse)
    ),
    tag = "auth"
)]
pub async fn register(
    State(state): State<AppState>,
    Json(req): Json<RegisterRequest>,
) -> AppResult<Json<RegisterResponse>> {
    if req.username.len() < 3 || req.username.len() > 50 {
        return Err(AppError::validation("Username must be between 3 and 50 characters", "INVALID_USERNAME"));
    }
    if !req.email.contains('@') || !req.email.contains('.') {
        return Err(AppError::validation("Invalid email format", "INVALID_EMAIL"));
    }
    if req.password.len() < 6 {
        return Err(AppError::validation("Password must be at least 6 characters", "INVALID_PASSWORD"));
    }

    let auth_service = state.auth_service.clone();
    let is_admin = false;
    let password_hash = auth_service.hash_password(&req.password)?;

    let user_id: Uuid = sqlx::query(
        r#"
        INSERT INTO users (username, email, password_hash, is_admin)
        VALUES ($1, $2, $3, $4)
        RETURNING id
        "#,
    )
    .bind(&req.username)
    .bind(&req.email)
    .bind(&password_hash)
    .bind(is_admin)
    .fetch_one(&state.pool)
    .await?
    .get("id");

    let token = auth_service.generate_token(&user_id.to_string())?;

    Ok(Json(RegisterResponse {
        message: "User registered successfully".to_string(),
        user_id,
        username: req.username,
        token,
        is_admin,
    }))
}

#[utoipa::path(
    post,
    path = "/api/auth/login",
    request_body = LoginRequest,
    responses(
        (status = 200, description = "User logged in successfully", body = LoginResponse),
        (status = 401, description = "Invalid credentials", body = ErrorResponse)
    ),
    tag = "auth"
)]
pub async fn login(
    State(state): State<AppState>,
    Json(req): Json<LoginRequest>,
) -> AppResult<Json<LoginResponse>> {
    let user = sqlx::query_as::<_, User>(
        "SELECT id, email, username, is_admin, avatar_url, bio, password_hash, created_at, updated_at, is_deleted FROM users WHERE username = $1"
    )
    .bind(&req.username)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::auth("Invalid credentials", "INVALID_CREDENTIALS"))?;

    let auth_service = state.auth_service.clone();
    let is_valid = auth_service.verify_password(&req.password, &user.password_hash)?;

    if !is_valid {
        return Err(AppError::auth("Invalid credentials", "INVALID_CREDENTIALS"));
    }

    let token = auth_service.generate_token(&user.id.to_string())?;

    Ok(Json(LoginResponse {
        token,
        user_id: user.id.to_string(),
        username: user.username,
        is_admin: user.is_admin,
    }))
}