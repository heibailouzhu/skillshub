use axum::{
    extract::{Extension, Path, Query, State},
    response::Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use utoipa::ToSchema;

use crate::error::{AppError, AppResult};
use crate::models::comment::Comment;
use crate::middleware::AuthUser;
use crate::AppState;

/// 评论列表查询参数
#[derive(Debug, Deserialize, ToSchema, utoipa::IntoParams)]
pub struct ListCommentsQuery {
    /// 页码，从 1 开始
    pub page: Option<u32>,
    /// 每页数量，最大 100
    pub page_size: Option<u32>,
}

/// 创建评论请求
#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateCommentRequest {
    /// 评论内容
    pub content: String,
    /// 父评论 ID（用于嵌套回复）
    pub parent_id: Option<Uuid>,
}

/// 更新评论请求
#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateCommentRequest {
    /// 评论内容
    pub content: String,
}

/// 评论列表响应
#[derive(Debug, Serialize, ToSchema)]
pub struct ListCommentsResponse {
    /// 评论列表
    pub comments: Vec<Comment>,
    /// 总数
    pub total: i64,
    /// 当前页
    pub page: u32,
    /// 每页数量
    pub page_size: u32,
}

/// 获取技能的评论列表（公开，无需认证）
#[utoipa::path(
    get,
    path = "/api/skills/{skill_id}/comments",
    params(
        ("skill_id" = Uuid, Path, description = "技能 ID"),
        ListCommentsQuery
    ),
    responses(
        (status = 200, description = "成功获取评论列表", body = ListCommentsResponse),
        (status = 500, description = "服务器错误", body = crate::error::ErrorResponse)
    ),
    tag = "评论管理"
)]
pub async fn list_comments(
    State(state): State<AppState>,
    Path(skill_id): Path<Uuid>,
    Query(query): Query<ListCommentsQuery>,
) -> AppResult<Json<ListCommentsResponse>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    // 查询总数
    let (total,) = sqlx::query_as::<_, (i64,)>(
        "SELECT COUNT(*) FROM comments WHERE skill_id = $1 AND is_deleted = false"
    )
    .bind(skill_id)
    .fetch_one(&state.pool)
    .await?;

    // 查询评论列表
    let comments = sqlx::query_as::<_, Comment>(
        "SELECT * FROM comments WHERE skill_id = $1 AND is_deleted = false ORDER BY created_at ASC LIMIT $2 OFFSET $3"
    )
    .bind(skill_id)
    .bind(page_size as i64)
    .bind(offset as i64)
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(ListCommentsResponse {
        comments,
        total,
        page,
        page_size,
    }))
}

/// 创建评论（需要认证）
#[utoipa::path(
    post,
    path = "/api/skills/{skill_id}/comments",
    params(
        ("skill_id" = Uuid, Path, description = "技能 ID")
    ),
    request_body = CreateCommentRequest,
    responses(
        (status = 200, description = "成功创建评论", body = Comment),
        (status = 400, description = "请求参数错误", body = crate::error::ErrorResponse),
        (status = 401, description = "未认证", body = crate::error::ErrorResponse),
        (status = 404, description = "技能不存在", body = crate::error::ErrorResponse),
        (status = 500, description = "服务器错误", body = crate::error::ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "评论管理"
)]
pub async fn create_comment(
    State(state): State<AppState>,
    Path(skill_id): Path<Uuid>,
    Extension(auth_user): Extension<AuthUser>,
    Json(req): Json<CreateCommentRequest>,
) -> AppResult<Json<Comment>> {
    // 从认证中间件获取用户 ID
    let user_id: Uuid = auth_user.user_id.parse::<Uuid>()
        .map_err(|_| AppError::Internal("Invalid user ID".to_string()))?;

    // 验证输入
    if req.content.trim().is_empty() {
        return Err(AppError::Validation("Comment content cannot be empty".to_string()));
    }

    // 验证技能是否存在
    let skill_exists = sqlx::query_scalar::<_, bool>(
        "SELECT EXISTS(SELECT 1 FROM skills WHERE id = $1 AND is_published = true)"
    )
    .bind(skill_id)
    .fetch_one(&state.pool)
    .await?;

    if !skill_exists {
        return Err(AppError::NotFound("Skill not found".to_string()));
    }

    // 如果有父评论 ID，验证父评论是否存在
    if let Some(parent_id) = req.parent_id {
        let parent_exists = sqlx::query_scalar::<_, bool>(
            "SELECT EXISTS(SELECT 1 FROM comments WHERE id = $1 AND skill_id = $2 AND is_deleted = false)"
        )
        .bind(parent_id)
        .bind(skill_id)
        .fetch_one(&state.pool)
        .await?;

        if !parent_exists {
            return Err(AppError::Validation("Parent comment not found".to_string()));
        }
    }

    // 插入评论
    let comment = sqlx::query_as::<_, Comment>(
        r#"
        INSERT INTO comments (skill_id, user_id, content, parent_id)
        VALUES ($1, $2, $3, $4)
        RETURNING *
        "#,
    )
    .bind(skill_id)
    .bind(user_id)
    .bind(&req.content)
    .bind(req.parent_id)
    .fetch_one(&state.pool)
    .await?;

    tracing::info!(comment_id = %comment.id, skill_id = %skill_id, user_id = %user_id, "Comment created successfully");

    Ok(Json(comment))
}

/// 更新评论（需要认证，且必须是作者）
#[utoipa::path(
    put,
    path = "/api/comments/{comment_id}",
    params(
        ("comment_id" = Uuid, Path, description = "评论 ID")
    ),
    request_body = UpdateCommentRequest,
    responses(
        (status = 200, description = "成功更新评论", body = Comment),
        (status = 400, description = "请求参数错误", body = crate::error::ErrorResponse),
        (status = 401, description = "未认证", body = crate::error::ErrorResponse),
        (status = 403, description = "无权限", body = crate::error::ErrorResponse),
        (status = 404, description = "评论不存在", body = crate::error::ErrorResponse),
        (status = 500, description = "服务器错误", body = crate::error::ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "评论管理"
)]
pub async fn update_comment(
    State(state): State<AppState>,
    Path(comment_id): Path<Uuid>,
    Extension(auth_user): Extension<AuthUser>,
    Json(req): Json<UpdateCommentRequest>,
) -> AppResult<Json<Comment>> {
    // 从认证中间件获取用户 ID
    let user_id: Uuid = auth_user.user_id.parse::<Uuid>()
        .map_err(|_| AppError::Internal("Invalid user ID".to_string()))?;

    // 验证输入
    if req.content.trim().is_empty() {
        return Err(AppError::Validation("Comment content cannot be empty".to_string()));
    }

    // 检查评论是否存在
    let existing_comment = sqlx::query_as::<_, Comment>("SELECT * FROM comments WHERE id = $1")
        .bind(comment_id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Comment not found".to_string()))?;

    // 检查权限
    if existing_comment.user_id != user_id {
        return Err(AppError::Forbidden("You are not authorized to update this comment".to_string()));
    }

    // 更新评论
    let comment = sqlx::query_as::<_, Comment>(
        r#"
        UPDATE comments
        SET content = $1, updated_at = NOW()
        WHERE id = $2
        RETURNING *
        "#,
    )
    .bind(&req.content)
    .bind(comment_id)
    .fetch_one(&state.pool)
    .await?;

    tracing::info!(comment_id = %comment_id, user_id = %user_id, "Comment updated successfully");

    Ok(Json(comment))
}

/// 删除评论（需要认证，且必须是作者）
#[utoipa::path(
    delete,
    path = "/api/comments/{comment_id}",
    params(
        ("comment_id" = Uuid, Path, description = "评论 ID")
    ),
    responses(
        (status = 200, description = "成功删除评论", body = ()),
        (status = 401, description = "未认证", body = crate::error::ErrorResponse),
        (status = 403, description = "无权限", body = crate::error::ErrorResponse),
        (status = 404, description = "评论不存在", body = crate::error::ErrorResponse),
        (status = 500, description = "服务器错误", body = crate::error::ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "评论管理"
)]
pub async fn delete_comment(
    State(state): State<AppState>,
    Path(comment_id): Path<Uuid>,
    Extension(auth_user): Extension<AuthUser>,
) -> AppResult<Json<()>> {
    // 从认证中间件获取用户 ID
    let user_id: Uuid = auth_user.user_id.parse::<Uuid>()
        .map_err(|_| AppError::Internal("Invalid user ID".to_string()))?;

    // 检查评论是否存在
    let existing_comment = sqlx::query_as::<_, Comment>("SELECT * FROM comments WHERE id = $1")
        .bind(comment_id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Comment not found".to_string()))?;

    // 检查权限
    if existing_comment.user_id != user_id {
        return Err(AppError::Forbidden("You are not authorized to delete this comment".to_string()));
    }

    // 删除评论（软删除）
    sqlx::query("UPDATE comments SET is_deleted = true WHERE id = $1")
        .bind(comment_id)
        .execute(&state.pool)
        .await?;

    tracing::info!(comment_id = %comment_id, user_id = %user_id, "Comment deleted successfully");

    Ok(Json(()))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 测试 CreateCommentRequest 反序列化
    #[test]
    fn test_create_comment_request_deserialization() {
        let json = r#"{
            "content": "Great skill!"
        }"#;

        let req: CreateCommentRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.content, "Great skill!");
    }

    /// 测试 CreateCommentRequest 带 parent_id
    #[test]
    fn test_create_comment_request_with_parent() {
        let json = r#"{
            "content": "Reply to comment",
            "parent_id": "123e4567-e89b-12d3-a456-426614174000"
        }"#;

        let req: CreateCommentRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.content, "Reply to comment");
        assert!(req.parent_id.is_some());
        assert_eq!(
            req.parent_id.unwrap(),
            Uuid::parse_str("123e4567-e89b-12d3-a456-426614174000").unwrap()
        );
    }

    /// 测试 UpdateCommentRequest 反序列化
    #[test]
    fn test_update_comment_request_deserialization() {
        let json = r#"{
            "content": "Updated comment"
        }"#;

        let req: UpdateCommentRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.content, "Updated comment");
    }

    /// 测试 ListCommentsQuery 反序列化
    #[test]
    fn test_list_comments_query_deserialization() {
        let json = r#"{
            "page": 1,
            "page_size": 20
        }"#;

        let query: ListCommentsQuery = serde_json::from_str(json).unwrap();
        assert_eq!(query.page, Some(1));
        assert_eq!(query.page_size, Some(20));
    }

    /// 测试 ListCommentsResponse 序列化
    #[test]
    fn test_list_comments_response_serialization() {
        let response = ListCommentsResponse {
            comments: vec![],
            total: 0,
            page: 1,
            page_size: 20,
        };

        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("comments"));
        assert!(json.contains("total"));
    }
}
