use axum::{
    extract::{Extension, Path, Query, State},
    response::Json,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;
use utoipa::ToSchema;

use crate::error::{AppError, AppResult};
use crate::models::favorite::Favorite;
use crate::models::skill::Skill;
use crate::middleware::AuthUser;
use crate::AppState;

/// 收藏列表查询参数
#[derive(Debug, Deserialize, ToSchema, utoipa::IntoParams)]
pub struct ListFavoritesQuery {
    /// 页码，从 1 开始
    pub page: Option<u32>,
    /// 每页数量，最大 100
    pub page_size: Option<u32>,
}

/// 收藏列表响应
#[derive(Debug, Serialize, ToSchema)]
pub struct FavoriteItem {
    /// 收藏 ID
    pub id: Uuid,
    /// 技能 ID
    pub skill_id: Uuid,
    /// 技能标题
    pub skill_title: String,
    /// 技能描述
    pub skill_description: Option<String>,
    /// 技能分类
    pub skill_category: Option<String>,
    /// 技能作者 ID
    pub skill_author_id: Uuid,
    /// 收藏时间
    pub created_at: String,
}

/// 收藏列表响应
#[derive(Debug, Serialize, ToSchema)]
pub struct ListFavoritesResponse {
    /// 收藏列表
    pub favorites: Vec<FavoriteItem>,
    /// 总数
    pub total: i64,
    /// 当前页
    pub page: u32,
    /// 每页数量
    pub page_size: u32,
}

/// 获取用户收藏列表（需要认证）
#[utoipa::path(
    get,
    path = "/api/favorites",
    params(ListFavoritesQuery),
    responses(
        (status = 200, description = "成功获取收藏列表", body = ListFavoritesResponse),
        (status = 401, description = "未认证", body = crate::error::ErrorResponse),
        (status = 500, description = "服务器错误", body = crate::error::ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "收藏管理"
)]
pub async fn list_favorites(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Query(query): Query<ListFavoritesQuery>,
) -> AppResult<Json<ListFavoritesResponse>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    // 从认证中间件获取用户 ID
    let user_id: Uuid = auth_user.user_id.parse::<Uuid>()
        .map_err(|_| AppError::Internal("Invalid user ID".to_string()))?;

    // 查询总数
    let (total,) = sqlx::query_as::<_, (i64,)>(
        "SELECT COUNT(*) FROM favorites WHERE user_id = $1"
    )
    .bind(user_id)
    .fetch_one(&state.pool)
    .await?;

    // 查询收藏列表（JOIN skills 表获取技能信息）
    let rows = sqlx::query(
        r#"
        SELECT
            f.id,
            f.skill_id,
            s.title as skill_title,
            s.description as skill_description,
            s.category as skill_category,
            s.author_id as skill_author_id,
            f.created_at
        FROM favorites f
        INNER JOIN skills s ON f.skill_id = s.id
        WHERE f.user_id = $1 AND s.is_published = true AND s.is_deleted = false
        ORDER BY f.created_at DESC
        LIMIT $2 OFFSET $3
        "#,
    )
    .bind(user_id)
    .bind(page_size as i64)
    .bind(offset as i64)
    .fetch_all(&state.pool)
    .await?;

    let favorites: Vec<FavoriteItem> = rows
        .iter()
        .map(|row| FavoriteItem {
            id: row.get("id"),
            skill_id: row.get("skill_id"),
            skill_title: row.get("skill_title"),
            skill_description: row.get("skill_description"),
            skill_category: row.get("skill_category"),
            skill_author_id: row.get("skill_author_id"),
            created_at: row.get("created_at"),
        })
        .collect();

    Ok(Json(ListFavoritesResponse {
        favorites,
        total,
        page,
        page_size,
    }))
}

/// 添加收藏（需要认证）
#[utoipa::path(
    post,
    path = "/api/skills/{id}/favorite",
    params(
        ("id" = Uuid, Path, description = "技能 ID")
    ),
    responses(
        (status = 200, description = "成功添加收藏", body = Favorite),
        (status = 401, description = "未认证", body = crate::error::ErrorResponse),
        (status = 404, description = "技能不存在", body = crate::error::ErrorResponse),
        (status = 409, description = "已收藏该技能", body = crate::error::ErrorResponse),
        (status = 500, description = "服务器错误", body = crate::error::ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "收藏管理"
)]
pub async fn add_favorite(
    State(state): State<AppState>,
    Path(skill_id): Path<Uuid>,
    Extension(auth_user): Extension<AuthUser>,
) -> AppResult<Json<Favorite>> {
    // 从认证中间件获取用户 ID
    let user_id: Uuid = auth_user.user_id.parse::<Uuid>()
        .map_err(|_| AppError::Internal("Invalid user ID".to_string()))?;

    // 验证技能是否存在
    let _skill = sqlx::query_as::<_, Skill>(
        "SELECT * FROM skills WHERE id = $1 AND is_published = true AND is_deleted = false"
    )
    .bind(skill_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("Skill not found".to_string()))?;

    // 检查是否已经收藏
    let already_favorited = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM favorites WHERE user_id = $1 AND skill_id = $2)"
    )
    .bind(user_id)
    .bind(skill_id)
    .fetch_one(&state.pool)
    .await?;

    if already_favorited {
        return Err(AppError::Conflict("Skill already favorited".to_string()));
    }

    // 添加收藏
    let favorite = sqlx::query_as::<_, Favorite>(
        r#"
        INSERT INTO favorites (user_id, skill_id)
        VALUES ($1, $2)
        RETURNING *
        "#,
    )
    .bind(user_id)
    .bind(skill_id)
    .fetch_one(&state.pool)
    .await?;

    tracing::info!(favorite_id = %favorite.id, skill_id = %skill_id, user_id = %user_id, "Favorite added successfully");

    Ok(Json(favorite))
}

/// 取消收藏（需要认证）
#[utoipa::path(
    delete,
    path = "/api/skills/{id}/favorite",
    params(
        ("id" = Uuid, Path, description = "技能 ID")
    ),
    responses(
        (status = 200, description = "成功取消收藏", body = ()),
        (status = 401, description = "未认证", body = crate::error::ErrorResponse),
        (status = 404, description = "收藏不存在", body = crate::error::ErrorResponse),
        (status = 500, description = "服务器错误", body = crate::error::ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "收藏管理"
)]
pub async fn remove_favorite(
    State(state): State<AppState>,
    Path(skill_id): Path<Uuid>,
    Extension(auth_user): Extension<AuthUser>,
) -> AppResult<Json<()>> {
    // 从认证中间件获取用户 ID
    let user_id: Uuid = auth_user.user_id.parse::<Uuid>()
        .map_err(|_| AppError::Internal("Invalid user ID".to_string()))?;

    // 删除收藏
    let result = sqlx::query("DELETE FROM favorites WHERE user_id = $1 AND skill_id = $2")
        .bind(user_id)
        .bind(skill_id)
        .execute(&state.pool)
        .await?;

    // 检查是否删除了记录
    if result.rows_affected() == 0 {
        return Err(AppError::NotFound("Favorite not found".to_string()));
    }

    tracing::info!(skill_id = %skill_id, user_id = %user_id, "Favorite removed successfully");

    Ok(Json(()))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 测试 ListFavoritesQuery 反序列化
    #[test]
    fn test_list_favorites_query_deserialization() {
        let json = r#"{
            "page": 1,
            "page_size": 20
        }"#;

        let query: ListFavoritesQuery = serde_json::from_str(json).unwrap();
        assert_eq!(query.page, Some(1));
        assert_eq!(query.page_size, Some(20));
    }

    /// 测试 ListFavoritesResponse 序列化
    #[test]
    fn test_list_favorites_response_serialization() {
        let response = ListFavoritesResponse {
            favorites: vec![],
            total: 0,
            page: 1,
            page_size: 20,
        };

        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("favorites"));
        assert!(json.contains("total"));
    }

    /// 测试 FavoriteItem 序列化
    #[test]
    fn test_favorite_item_serialization() {
        let item = FavoriteItem {
            id: Uuid::new_v4(),
            skill_id: Uuid::new_v4(),
            skill_title: "Test Skill".to_string(),
            skill_description: Some("Test description".to_string()),
            skill_category: Some("AI".to_string()),
            skill_author_id: Uuid::new_v4(),
            created_at: "2024-01-01T00:00:00Z".to_string(),
        };

        let json = serde_json::to_string(&item).unwrap();
        assert!(json.contains("skill_title"));
        assert!(json.contains("created_at"));
    }

    /// 测试 FavoriteItem 可选字段
    #[test]
    fn test_favorite_item_optional_fields() {
        let item = FavoriteItem {
            id: Uuid::new_v4(),
            skill_id: Uuid::new_v4(),
            skill_title: "Test Skill".to_string(),
            skill_description: None,
            skill_category: None,
            skill_author_id: Uuid::new_v4(),
            created_at: "2024-01-01T00:00:00Z".to_string(),
        };

        let json = serde_json::to_string(&item).unwrap();
        assert!(json.contains("Test Skill"));
    }
}
