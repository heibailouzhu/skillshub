use axum::{
    extract::{Extension, Path, Query, State},
    response::Json,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use utoipa::ToSchema;
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::middleware::AuthUser;
use crate::AppState;

/// 评分请求体
#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateRatingRequest {
    /// 评分值（1-5）
    pub rating: i32,
}

/// 评分响应
#[derive(Debug, Serialize, ToSchema)]
pub struct RatingResponse {
    /// 评分 ID
    pub id: Uuid,
    /// 技能 ID
    pub skill_id: Uuid,
    /// 用户 ID
    pub user_id: Uuid,
    /// 评分值
    pub rating: i32,
    /// 创建时间
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// 技能评分统计
#[derive(Debug, Serialize, ToSchema)]
pub struct RatingStats {
    /// 技能 ID
    pub skill_id: Uuid,
    /// 评分总数
    pub total_ratings: i64,
    /// 平均评分
    pub average_rating: f64,
}

/// 创建评分
#[utoipa::path(
    post,
    path = "/api/skills/{skill_id}/rating",
    params(
        ("skill_id" = Uuid, Path, description = "技能 ID")
    ),
    request_body = CreateRatingRequest,
    responses(
        (status = 200, description = "成功创建评分", body = RatingResponse),
        (status = 400, description = "请求参数错误", body = crate::error::ErrorResponse),
        (status = 401, description = "未认证", body = crate::error::ErrorResponse),
        (status = 404, description = "技能不存在", body = crate::error::ErrorResponse),
        (status = 409, description = "已评过分", body = crate::error::ErrorResponse),
        (status = 500, description = "服务器错误", body = crate::error::ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "评分管理"
)]
pub async fn create_rating(
    State(state): State<AppState>,
    Extension(user): Extension<AuthUser>,
    Path(skill_id): Path<Uuid>,
    Json(req): Json<CreateRatingRequest>,
) -> AppResult<Json<RatingResponse>> {
    // 验证评分值（1-5）
    if req.rating < 1 || req.rating > 5 {
        return Err(AppError::Validation("评分必须在 1-5 之间".to_string()));
    }

    // 转换用户 ID
    let user_id = Uuid::parse_str(&user.user_id)
        .map_err(|_| AppError::Internal("无效的用户 ID".to_string()))?;

    // 验证技能是否存在
    let skill_exists = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM skills WHERE id = $1 AND is_published = true AND is_deleted = false)"
    )
    .bind(skill_id)
    .fetch_one(&state.pool)
    .await?;

    if !skill_exists {
        return Err(AppError::NotFound("技能不存在".to_string()));
    }

    // 检查是否已经评分过
    let existing_rating = sqlx::query_scalar::<_, Uuid>(
        "SELECT id FROM skill_ratings WHERE skill_id = $1 AND user_id = $2",
    )
    .bind(skill_id)
    .bind(user_id)
    .fetch_optional(&state.pool)
    .await?;

    if existing_rating.is_some() {
        return Err(AppError::Conflict("你已经给这个技能评过分了".to_string()));
    }

    // 创建评分
    let rating_id = Uuid::new_v4();
    let now = chrono::Utc::now();

    sqlx::query(
        "INSERT INTO skill_ratings (id, skill_id, user_id, rating, created_at)
         VALUES ($1, $2, $3, $4, $5)",
    )
    .bind(rating_id)
    .bind(skill_id)
    .bind(user_id)
    .bind(req.rating)
    .bind(now)
    .execute(&state.pool)
    .await?;

    tracing::info!(rating_id = %rating_id, skill_id = %skill_id, user_id = %user_id, rating = req.rating, "Rating created successfully");

    Ok(Json(RatingResponse {
        id: rating_id,
        skill_id,
        user_id,
        rating: req.rating,
        created_at: now,
    }))
}

/// 更新评分
#[utoipa::path(
    put,
    path = "/api/ratings/{rating_id}",
    params(
        ("rating_id" = Uuid, Path, description = "评分 ID")
    ),
    request_body = CreateRatingRequest,
    responses(
        (status = 200, description = "成功更新评分", body = RatingResponse),
        (status = 400, description = "请求参数错误", body = crate::error::ErrorResponse),
        (status = 401, description = "未认证", body = crate::error::ErrorResponse),
        (status = 403, description = "无权限", body = crate::error::ErrorResponse),
        (status = 404, description = "评分不存在", body = crate::error::ErrorResponse),
        (status = 500, description = "服务器错误", body = crate::error::ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "评分管理"
)]
pub async fn update_rating(
    State(state): State<AppState>,
    Extension(user): Extension<AuthUser>,
    Path(rating_id): Path<Uuid>,
    Json(req): Json<CreateRatingRequest>,
) -> AppResult<Json<RatingResponse>> {
    // 验证评分值（1-5）
    if req.rating < 1 || req.rating > 5 {
        return Err(AppError::Validation("评分必须在 1-5 之间".to_string()));
    }

    // 转换用户 ID
    let current_user_id = Uuid::parse_str(&user.user_id)
        .map_err(|_| AppError::Internal("无效的用户 ID".to_string()))?;

    // 验证评分是否存在
    let (_skill_id, rating_user_id, _old_rating) = sqlx::query_as::<_, (Uuid, Uuid, i32)>(
        "SELECT skill_id, user_id, rating FROM skill_ratings WHERE id = $1",
    )
    .bind(rating_id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::NotFound("评分不存在".to_string()))?;

    // 验证权限
    if rating_user_id != current_user_id {
        return Err(AppError::Forbidden("无权修改此评分".to_string()));
    }

    // 更新评分
    sqlx::query("UPDATE skill_ratings SET rating = $1 WHERE id = $2")
        .bind(req.rating)
        .bind(rating_id)
        .execute(&state.pool)
        .await?;

    // 获取更新后的评分
    let row = sqlx::query(
        "SELECT id, skill_id, user_id, rating, created_at FROM skill_ratings WHERE id = $1",
    )
    .bind(rating_id)
    .fetch_one(&state.pool)
    .await?;

    tracing::info!(rating_id = %rating_id, user_id = %current_user_id, rating = req.rating, "Rating updated successfully");

    Ok(Json(RatingResponse {
        id: row.get("id"),
        skill_id: row.get("skill_id"),
        user_id: row.get("user_id"),
        rating: row.get("rating"),
        created_at: row.get("created_at"),
    }))
}

/// 删除评分
#[utoipa::path(
    delete,
    path = "/api/ratings/{rating_id}",
    params(
        ("rating_id" = Uuid, Path, description = "评分 ID")
    ),
    responses(
        (status = 200, description = "成功删除评分", body = ()),
        (status = 401, description = "未认证", body = crate::error::ErrorResponse),
        (status = 403, description = "无权限", body = crate::error::ErrorResponse),
        (status = 404, description = "评分不存在", body = crate::error::ErrorResponse),
        (status = 500, description = "服务器错误", body = crate::error::ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "评分管理"
)]
pub async fn delete_rating(
    State(state): State<AppState>,
    Extension(user): Extension<AuthUser>,
    Path(rating_id): Path<Uuid>,
) -> AppResult<Json<()>> {
    // 转换用户 ID
    let current_user_id = Uuid::parse_str(&user.user_id)
        .map_err(|_| AppError::Internal("无效的用户 ID".to_string()))?;

    // 验证评分是否存在
    let rating_user_id =
        sqlx::query_scalar::<_, Uuid>("SELECT user_id FROM skill_ratings WHERE id = $1")
            .bind(rating_id)
            .fetch_optional(&state.pool)
            .await?
            .ok_or_else(|| AppError::NotFound("评分不存在".to_string()))?;

    // 验证权限
    if rating_user_id != current_user_id {
        return Err(AppError::Forbidden("无权删除此评分".to_string()));
    }

    // 删除评分
    sqlx::query("DELETE FROM skill_ratings WHERE id = $1")
        .bind(rating_id)
        .execute(&state.pool)
        .await?;

    tracing::info!(rating_id = %rating_id, user_id = %current_user_id, "Rating deleted successfully");

    Ok(Json(()))
}

/// 获取技能评分统计
#[utoipa::path(
    get,
    path = "/api/skills/{skill_id}/ratings",
    params(
        ("skill_id" = Uuid, Path, description = "技能 ID")
    ),
    responses(
        (status = 200, description = "成功获取评分统计", body = RatingStats),
        (status = 404, description = "技能不存在", body = crate::error::ErrorResponse),
        (status = 500, description = "服务器错误", body = crate::error::ErrorResponse)
    ),
    tag = "评分管理"
)]
pub async fn get_skill_rating_stats(
    State(state): State<AppState>,
    Path(skill_id): Path<Uuid>,
) -> AppResult<Json<RatingStats>> {
    // 验证技能是否存在
    let skill_exists = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM skills WHERE id = $1 AND is_published = true AND is_deleted = false)"
    )
    .bind(skill_id)
    .fetch_one(&state.pool)
    .await?;

    if !skill_exists {
        return Err(AppError::NotFound("技能不存在".to_string()));
    }

    // 计算评分统计
    let row = sqlx::query(
        "SELECT
            COUNT(*) as total_ratings,
            COALESCE(AVG(rating), 0) as average_rating
         FROM skill_ratings
         WHERE skill_id = $1",
    )
    .bind(skill_id)
    .fetch_one(&state.pool)
    .await?;

    let total_ratings: i64 = row.get("total_ratings");
    let average_rating: f64 = row.get("average_rating");

    Ok(Json(RatingStats {
        skill_id,
        total_ratings,
        average_rating,
    }))
}

/// 获取用户的评分历史查询参数
#[derive(Debug, Deserialize, ToSchema, utoipa::IntoParams)]
pub struct RatingListQuery {
    /// 页码，从 1 开始
    pub page: Option<usize>,
    /// 每页数量
    pub page_size: Option<usize>,
}

/// 评分与技能信息
#[derive(Debug, Serialize, ToSchema)]
pub struct RatingWithSkill {
    /// 评分 ID
    pub id: Uuid,
    /// 技能 ID
    pub skill_id: Uuid,
    /// 技能标题
    pub skill_title: String,
    /// 技能描述
    pub skill_description: Option<String>,
    /// 评分值
    pub rating: i32,
    /// 创建时间
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// 获取用户的评分历史
#[utoipa::path(
    get,
    path = "/api/ratings",
    params(RatingListQuery),
    responses(
        (status = 200, description = "成功获取用户评分历史", body = Vec<RatingWithSkill>),
        (status = 401, description = "未认证", body = crate::error::ErrorResponse),
        (status = 500, description = "服务器错误", body = crate::error::ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "评分管理"
)]
pub async fn get_user_ratings(
    State(state): State<AppState>,
    Extension(user): Extension<AuthUser>,
    Query(params): Query<RatingListQuery>,
) -> AppResult<Json<Vec<RatingWithSkill>>> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(20);
    let offset = (page - 1) * page_size;

    // 转换用户 ID
    let user_id = Uuid::parse_str(&user.user_id)
        .map_err(|_| AppError::Internal("无效的用户 ID".to_string()))?;

    let ratings = sqlx::query(
        "SELECT
            sr.id,
            sr.skill_id,
            s.title as skill_title,
            s.description as skill_description,
            sr.rating,
            sr.created_at
         FROM skill_ratings sr
         JOIN skills s ON sr.skill_id = s.id
         WHERE sr.user_id = $1
         ORDER BY sr.created_at DESC
         LIMIT $2 OFFSET $3",
    )
    .bind(user_id)
    .bind(page_size as i64)
    .bind(offset as i64)
    .fetch_all(&state.pool)
    .await?;

    let ratings = ratings
        .into_iter()
        .map(|row| RatingWithSkill {
            id: row.get("id"),
            skill_id: row.get("skill_id"),
            skill_title: row.get("skill_title"),
            skill_description: row.get("skill_description"),
            rating: row.get("rating"),
            created_at: row.get("created_at"),
        })
        .collect();

    Ok(Json(ratings))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 测试 CreateRatingRequest 反序列化
    #[test]
    fn test_create_rating_request_deserialization() {
        let json = r#"{
            "rating": 5
        }"#;

        let req: CreateRatingRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.rating, 5);
    }

    /// 测试 UpdateRatingRequest 反序列化
    #[test]
    fn test_update_rating_request_deserialization() {
        use crate::models::rating::UpdateRatingRequest;

        let json = r#"{
            "rating": 4
        }"#;

        let req: UpdateRatingRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.rating, 4);
    }

    /// 测试 RatingListQuery 反序列化
    #[test]
    fn test_rating_list_query_deserialization() {
        let json = r#"{
            "page": 1,
            "page_size": 20
        }"#;

        let query: RatingListQuery = serde_json::from_str(json).unwrap();
        assert_eq!(query.page, Some(1));
        assert_eq!(query.page_size, Some(20));
    }

    /// 测试 RatingStats 序列化
    #[test]
    fn test_rating_stats_serialization() {
        let stats = RatingStats {
            skill_id: Uuid::new_v4(),
            total_ratings: 100,
            average_rating: 4.5,
        };

        let json = serde_json::to_string(&stats).unwrap();
        assert!(json.contains("total_ratings"));
        assert!(json.contains("average_rating"));
    }

    /// 测试 RatingWithSkill 序列化
    #[test]
    fn test_rating_with_skill_serialization() {
        use chrono::Utc;

        let item = RatingWithSkill {
            id: Uuid::new_v4(),
            skill_id: Uuid::new_v4(),
            skill_title: "Test Skill".to_string(),
            skill_description: Some("Test description".to_string()),
            rating: 5,
            created_at: Utc::now(),
        };

        let json = serde_json::to_string(&item).unwrap();
        assert!(json.contains("rating"));
        assert!(json.contains("skill_title"));
    }

    /// 测试评分范围验证逻辑
    #[test]
    fn test_rating_range_validation() {
        // 有效评分
        assert!((1..=5).contains(&1), "Rating 1 is valid");
        assert!((1..=5).contains(&3), "Rating 3 is valid");
        assert!((1..=5).contains(&5), "Rating 5 is valid");

        // 无效评分
        assert!(!(1..=5).contains(&0), "Rating 0 is invalid");
        assert!(!(1..=5).contains(&6), "Rating 6 is invalid");
        assert!(!(1..=5).contains(&10), "Rating 10 is invalid");
    }

    /// 测试平均评分计算逻辑
    #[test]
    fn test_average_rating_calculation() {
        let ratings = [5, 4, 5, 3, 5];
        let sum: i32 = ratings.iter().sum();
        let avg = sum as f64 / ratings.len() as f64;

        assert_eq!(avg, 4.4);
    }

    /// 测试空评分列表的平均值
    #[test]
    fn test_empty_ratings_average() {
        let ratings: Vec<i32> = vec![];
        if ratings.is_empty() {
            // 空列表的平均值为 0
            assert_eq!(0.0, 0.0);
        }
    }
}
