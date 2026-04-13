use axum::{
  extract::{Extension, Path, Query, State},
  response::Json,
};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::middleware::AuthUser;
use crate::AppState;

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct AdminSkillListQuery {
  pub page: Option<u32>,
  pub page_size: Option<u32>,
  pub search: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow, utoipa::ToSchema)]
pub struct AdminSkillListItem {
  pub id: Uuid,
  pub slug: String,
  pub title: String,
  pub description: Option<String>,
  pub author_id: Uuid,
  pub author_username: Option<String>,
  pub category: Option<String>,
  pub version: String,
  pub download_count: i32,
  pub rating_avg: f64,
  pub is_published: bool,
  pub is_deleted: bool,
  pub created_at: String,
  pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct AdminSkillListResponse {
  pub skills: Vec<AdminSkillListItem>,
  pub total: i64,
  pub page: u32,
  pub page_size: u32,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct AdminSkillStatusUpdateRequest {
  pub is_published: Option<bool>,
  pub is_deleted: Option<bool>,
}

#[derive(Debug, Deserialize, utoipa::IntoParams)]
pub struct AdminUserListQuery {
  pub page: Option<u32>,
  pub page_size: Option<u32>,
  pub search: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow, utoipa::ToSchema)]
pub struct AdminUserListItem {
  pub id: Uuid,
  pub username: String,
  pub email: String,
  pub is_admin: bool,
  pub is_deleted: bool,
  pub created_at: String,
  pub updated_at: String,
}

#[derive(Debug, Serialize, Deserialize, utoipa::ToSchema)]
pub struct AdminUserListResponse {
  pub users: Vec<AdminUserListItem>,
  pub total: i64,
  pub page: u32,
  pub page_size: u32,
}

#[derive(Debug, Deserialize, utoipa::ToSchema)]
pub struct AdminUserRoleUpdateRequest {
  pub is_admin: bool,
}

async fn require_admin(state: &AppState, auth_user: &AuthUser) -> AppResult<Uuid> {
  let user_id = auth_user
    .user_id
    .parse::<Uuid>()
    .map_err(|_| AppError::internal("Invalid user ID", "INVALID_USER_ID"))?;

  let is_admin = sqlx::query_scalar::<_, bool>("SELECT is_admin FROM users WHERE id = $1")
    .bind(user_id)
    .fetch_one(&state.pool)
    .await?;

  if !is_admin {
    return Err(AppError::forbidden("Administrator access required", "FORBIDDEN"));
  }

  Ok(user_id)
}

#[utoipa::path(
  get,
  path = "/api/admin/skills",
  params(AdminSkillListQuery),
  responses(
    (status = 200, description = "Admin skill list", body = AdminSkillListResponse),
    (status = 403, description = "Administrator access required", body = crate::error::ErrorResponse)
  ),
  security(("bearer_auth" = [])),
  tag = "admin"
)]
pub async fn list_admin_skills(
  State(state): State<AppState>,
  Extension(auth_user): Extension<AuthUser>,
  Query(query): Query<AdminSkillListQuery>,
) -> AppResult<Json<AdminSkillListResponse>> {
  require_admin(&state, &auth_user).await?;

  let page = query.page.unwrap_or(1).max(1);
  let page_size = query.page_size.unwrap_or(20).min(100);
  let offset = (page - 1) * page_size;
  let search = query.search.unwrap_or_default();
  let pattern = format!("%{}%", search);

  let total = sqlx::query_scalar::<_, i64>(
    r#"
    SELECT COUNT(*)
    FROM skills s
    LEFT JOIN users u ON u.id = s.author_id
    WHERE ($1 = '' OR s.title ILIKE $2 OR COALESCE(s.description, '') ILIKE $2 OR COALESCE(u.username, '') ILIKE $2)
    "#,
  )
  .bind(&search)
  .bind(&pattern)
  .fetch_one(&state.pool)
  .await?;

  let skills = sqlx::query_as::<_, AdminSkillListItem>(
    r#"
    SELECT
      s.id,
      s.slug,
      s.title,
      s.description,
      s.author_id,
      u.username AS author_username,
      s.category,
      s.version,
      s.download_count,
      s.rating_avg,
      s.is_published,
      s.is_deleted,
      s.created_at::text AS created_at,
      s.updated_at::text AS updated_at
    FROM skills s
    LEFT JOIN users u ON u.id = s.author_id
    WHERE ($1 = '' OR s.title ILIKE $2 OR COALESCE(s.description, '') ILIKE $2 OR COALESCE(u.username, '') ILIKE $2)
    ORDER BY s.updated_at DESC
    LIMIT $3 OFFSET $4
    "#,
  )
  .bind(&search)
  .bind(&pattern)
  .bind(page_size as i64)
  .bind(offset as i64)
  .fetch_all(&state.pool)
  .await?;

  Ok(Json(AdminSkillListResponse { skills, total, page, page_size }))
}

#[utoipa::path(
  patch,
  path = "/api/admin/skills/{id}/status",
  request_body = AdminSkillStatusUpdateRequest,
  params(("id" = Uuid, Path, description = "Skill ID")),
  responses(
    (status = 200, description = "Admin skill status updated", body = ()),
    (status = 403, description = "Administrator access required", body = crate::error::ErrorResponse)
  ),
  security(("bearer_auth" = [])),
  tag = "admin"
)]
pub async fn update_admin_skill_status(
  State(state): State<AppState>,
  Extension(auth_user): Extension<AuthUser>,
  Path(id): Path<Uuid>,
  Json(req): Json<AdminSkillStatusUpdateRequest>,
) -> AppResult<Json<()>> {
  require_admin(&state, &auth_user).await?;

  if req.is_published.is_none() && req.is_deleted.is_none() {
    return Err(AppError::validation("At least one status field is required", "EMPTY_UPDATE_PAYLOAD"));
  }

  sqlx::query(
    r#"
    UPDATE skills
    SET is_published = COALESCE($2, is_published),
        is_deleted = COALESCE($3, is_deleted),
        updated_at = NOW()
    WHERE id = $1
    "#,
  )
  .bind(id)
  .bind(req.is_published)
  .bind(req.is_deleted)
  .execute(&state.pool)
  .await?;

  if let Err(e) = state.cache_service.delete_pattern("skills:list:*").await {
    tracing::warn!("Failed to delete pattern cache: {}", e);
  }
  if let Err(e) = state.cache_service.delete("popular_categories").await {
    tracing::warn!("Failed to delete popular_categories cache: {}", e);
  }
  if let Err(e) = state.cache_service.delete("popular_tags").await {
    tracing::warn!("Failed to delete popular_tags cache: {}", e);
  }

  Ok(Json(()))
}

#[utoipa::path(
  get,
  path = "/api/admin/users",
  params(AdminUserListQuery),
  responses(
    (status = 200, description = "Admin user list", body = AdminUserListResponse),
    (status = 403, description = "Administrator access required", body = crate::error::ErrorResponse)
  ),
  security(("bearer_auth" = [])),
  tag = "admin"
)]
pub async fn list_admin_users(
  State(state): State<AppState>,
  Extension(auth_user): Extension<AuthUser>,
  Query(query): Query<AdminUserListQuery>,
) -> AppResult<Json<AdminUserListResponse>> {
  require_admin(&state, &auth_user).await?;

  let page = query.page.unwrap_or(1).max(1);
  let page_size = query.page_size.unwrap_or(20).min(100);
  let offset = (page - 1) * page_size;
  let search = query.search.unwrap_or_default();
  let pattern = format!("%{}%", search);

  let total = sqlx::query_scalar::<_, i64>(
    r#"
    SELECT COUNT(*)
    FROM users
    WHERE ($1 = '' OR username ILIKE $2 OR email ILIKE $2)
    "#,
  )
  .bind(&search)
  .bind(&pattern)
  .fetch_one(&state.pool)
  .await?;

  let users = sqlx::query_as::<_, AdminUserListItem>(
    r#"
    SELECT id, username, email, is_admin, is_deleted,
           created_at::text AS created_at,
           updated_at::text AS updated_at
    FROM users
    WHERE ($1 = '' OR username ILIKE $2 OR email ILIKE $2)
    ORDER BY created_at DESC
    LIMIT $3 OFFSET $4
    "#,
  )
  .bind(&search)
  .bind(&pattern)
  .bind(page_size as i64)
  .bind(offset as i64)
  .fetch_all(&state.pool)
  .await?;

  Ok(Json(AdminUserListResponse { users, total, page, page_size }))
}

#[utoipa::path(
  patch,
  path = "/api/admin/users/{id}/role",
  request_body = AdminUserRoleUpdateRequest,
  params(("id" = Uuid, Path, description = "User ID")),
  responses(
    (status = 200, description = "Admin role updated", body = ()),
    (status = 403, description = "Administrator access required", body = crate::error::ErrorResponse)
  ),
  security(("bearer_auth" = [])),
  tag = "admin"
)]
pub async fn update_admin_user_role(
  State(state): State<AppState>,
  Extension(auth_user): Extension<AuthUser>,
  Path(id): Path<Uuid>,
  Json(req): Json<AdminUserRoleUpdateRequest>,
) -> AppResult<Json<()>> {
  let current_admin_id = require_admin(&state, &auth_user).await?;

  if current_admin_id == id && !req.is_admin {
    let admin_count = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM users WHERE is_admin = TRUE AND is_deleted = FALSE")
      .fetch_one(&state.pool)
      .await?;

    if admin_count <= 1 {
      return Err(AppError::validation("Cannot remove the last administrator", "INVALID_ADMIN_OPERATION"));
    }
  }

  sqlx::query("UPDATE users SET is_admin = $2, updated_at = NOW() WHERE id = $1")
    .bind(id)
    .bind(req.is_admin)
    .execute(&state.pool)
    .await?;

  Ok(Json(()))
}
