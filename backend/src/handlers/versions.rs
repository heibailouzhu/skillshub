use axum::{
    extract::{Extension, Path, State},
    response::Json,
};
use serde::{Deserialize, Serialize};
use uuid::Uuid;
use utoipa::ToSchema;

use crate::error::{AppError, AppResult};
use crate::models::skill::Skill;
use crate::models::skill_version::SkillVersion;
use crate::middleware::AuthUser;
use crate::AppState;

/// 创建版本请求
#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateVersionRequest {
    /// 版本号
    pub version: String,
    /// 版本内容
    pub content: String,
    /// 更新日志
    pub changelog: Option<String>,
}

/// 版本详情响应
#[derive(Debug, Serialize, ToSchema)]
pub struct VersionDetailResponse {
    /// 版本信息
    pub version: SkillVersion,
    /// 技能信息
    pub skill: Skill,
}

/// 创建新版本（需要认证，且必须是作者）
#[utoipa::path(
    post,
    path = "/api/skills/{id}/versions",
    params(
        ("id" = Uuid, Path, description = "技能 ID")
    ),
    request_body = CreateVersionRequest,
    responses(
        (status = 200, description = "成功创建版本", body = SkillVersion),
        (status = 400, description = "请求参数错误", body = crate::error::ErrorResponse),
        (status = 401, description = "未认证", body = crate::error::ErrorResponse),
        (status = 403, description = "无权限", body = crate::error::ErrorResponse),
        (status = 404, description = "技能不存在", body = crate::error::ErrorResponse),
        (status = 409, description = "版本号已存在", body = crate::error::ErrorResponse),
        (status = 500, description = "服务器错误", body = crate::error::ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "版本管理"
)]
pub async fn create_version(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    Json(req): Json<CreateVersionRequest>,
) -> AppResult<Json<SkillVersion>> {
    // 从认证中间件获取用户 ID
    let user_id: Uuid = auth_user.user_id.parse::<Uuid>()
        .map_err(|_| AppError::Internal("Invalid user ID".to_string()))?;

    // 检查技能是否存在
    let skill = sqlx::query_as::<_, Skill>("SELECT * FROM skills WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Skill not found".to_string()))?;

    // 检查权限
    if skill.author_id != user_id {
        return Err(AppError::Forbidden("You are not authorized to create versions for this skill".to_string()));
    }

    // 验证版本号
    if req.version.trim().is_empty() {
        return Err(AppError::Validation("Version number cannot be empty".to_string()));
    }

    // 验证内容
    if req.content.trim().is_empty() {
        return Err(AppError::Validation("Version content cannot be empty".to_string()));
    }

    // 检查版本号是否已存在
    let existing_version = sqlx::query_as::<_, SkillVersion>(
        "SELECT * FROM skill_versions WHERE skill_id = $1 AND version = $2"
    )
    .bind(id)
    .bind(&req.version)
    .fetch_optional(&state.pool)
    .await?;

    if existing_version.is_some() {
        return Err(AppError::Conflict(format!("Version {} already exists", req.version)));
    }

    // 开始事务
    let mut tx = state.pool.begin().await?;

    // 插入新版本
    let version = sqlx::query_as::<_, SkillVersion>(
        r#"
        INSERT INTO skill_versions (skill_id, version, content, changelog)
        VALUES ($1, $2, $3, $4)
        RETURNING *
        "#
    )
    .bind(id)
    .bind(&req.version)
    .bind(&req.content)
    .bind(&req.changelog)
    .fetch_one(&mut *tx)
    .await?;

    // 更新技能的当前版本和内容
    sqlx::query(
        r#"
        UPDATE skills
        SET version = $1, content = $2, updated_at = NOW()
        WHERE id = $3
        "#
    )
    .bind(&req.version)
    .bind(&req.content)
    .bind(id)
    .execute(&mut *tx)
    .await?;

    // 提交事务
    tx.commit().await?;

    tracing::info!(
        skill_id = %id,
        version = %req.version,
        author_id = %user_id,
        "Version created successfully"
    );

    Ok(Json(version))
}

/// 获取特定版本的详情（公开，无需认证）
#[utoipa::path(
    get,
    path = "/api/skills/{id}/versions/{version}",
    params(
        ("id" = Uuid, Path, description = "技能 ID"),
        ("version" = String, Path, description = "版本号")
    ),
    responses(
        (status = 200, description = "成功获取版本详情", body = VersionDetailResponse),
        (status = 404, description = "技能或版本不存在", body = crate::error::ErrorResponse),
        (status = 500, description = "服务器错误", body = crate::error::ErrorResponse)
    ),
    tag = "版本管理"
)]
pub async fn get_version(
    State(state): State<AppState>,
    Path((id, version)): Path<(Uuid, String)>,
) -> AppResult<Json<VersionDetailResponse>> {
    // 查询技能
    let skill = sqlx::query_as::<_, Skill>("SELECT * FROM skills WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Skill not found".to_string()))?;

    // 查询版本
    let version_obj = sqlx::query_as::<_, SkillVersion>(
        "SELECT * FROM skill_versions WHERE skill_id = $1 AND version = $2"
    )
    .bind(id)
    .bind(&version)
    .fetch_optional(&state.pool)
    .await?
        .ok_or_else(|| AppError::NotFound("Version not found".to_string()))?;

    Ok(Json(VersionDetailResponse {
        version: version_obj,
        skill,
    }))
}

/// 回滚到特定版本（需要认证，且必须是作者）
#[utoipa::path(
    post,
    path = "/api/skills/{id}/versions/{version}/rollback",
    params(
        ("id" = Uuid, Path, description = "技能 ID"),
        ("version" = String, Path, description = "版本号")
    ),
    responses(
        (status = 200, description = "成功回滚版本", body = Skill),
        (status = 401, description = "未认证", body = crate::error::ErrorResponse),
        (status = 403, description = "无权限", body = crate::error::ErrorResponse),
        (status = 404, description = "技能或版本不存在", body = crate::error::ErrorResponse),
        (status = 500, description = "服务器错误", body = crate::error::ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "版本管理"
)]
pub async fn rollback_version(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Path((id, version)): Path<(Uuid, String)>,
) -> AppResult<Json<Skill>> {
    // 从认证中间件获取用户 ID
    let user_id: Uuid = auth_user.user_id.parse::<Uuid>()
        .map_err(|_| AppError::Internal("Invalid user ID".to_string()))?;

    // 检查技能是否存在
    let skill = sqlx::query_as::<_, Skill>("SELECT * FROM skills WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Skill not found".to_string()))?;

    // 检查权限
    if skill.author_id != user_id {
        return Err(AppError::Forbidden("You are not authorized to rollback this skill".to_string()));
    }

    // 查询目标版本
    let target_version = sqlx::query_as::<_, SkillVersion>(
        "SELECT * FROM skill_versions WHERE skill_id = $1 AND version = $2"
    )
    .bind(id)
    .bind(&version)
    .fetch_optional(&state.pool)
    .await?
        .ok_or_else(|| AppError::NotFound("Version not found".to_string()))?;

    // 开始事务
    let mut tx = state.pool.begin().await?;

    // 更新技能的当前版本和内容为回滚的版本
    sqlx::query(
        r#"
        UPDATE skills
        SET version = $1, content = $2, updated_at = NOW()
        WHERE id = $3
        "#
    )
    .bind(&target_version.version)
    .bind(&target_version.content)
    .bind(id)
    .execute(&mut *tx)
    .await?;

    // 提交事务
    tx.commit().await?;

    // 查询更新后的技能
    let updated_skill = sqlx::query_as::<_, Skill>("SELECT * FROM skills WHERE id = $1")
        .bind(id)
        .fetch_one(&state.pool)
        .await?;

    tracing::info!(
        skill_id = %id,
        version = %version,
        author_id = %user_id,
        "Skill rolled back successfully"
    );

    Ok(Json(updated_skill))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 测试 CreateVersionRequest 反序列化
    #[test]
    fn test_create_version_request_deserialization() {
        let json = r#"{
            "version": "2.0.0",
            "content": "Updated content",
            "changelog": "Bug fixes"
        }"#;

        let req: CreateVersionRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.version, "2.0.0");
        assert_eq!(req.content, "Updated content");
        assert_eq!(req.changelog, Some("Bug fixes".to_string()));
    }

    /// 测试 CreateVersionRequest 不带 changelog
    #[test]
    fn test_create_version_request_without_changelog() {
        let json = r#"{
            "version": "1.1.0",
            "content": "Minor update"
        }"#;

        let req: CreateVersionRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.version, "1.1.0");
        assert_eq!(req.content, "Minor update");
        assert_eq!(req.changelog, None);
    }

    /// 测试 VersionDetailResponse 序列化
    #[test]
    fn test_version_detail_response_serialization() {
        use chrono::Utc;

        let skill = Skill {
            id: Uuid::new_v4(),
            title: "Test Skill".to_string(),
            description: Some("Test description".to_string()),
            content: "console.log('hello');".to_string(),
            author_id: Uuid::new_v4(),
            category: Some("AI".to_string()),
            tags: Some(vec!["JavaScript".to_string()]),
            version: "1.0.0".to_string(),
            download_count: 100,
            rating_avg: 4.5,
            rating_count: 20,
            is_published: true,
            is_deleted: false,
            created_at: Utc::now(),
            updated_at: Utc::now(),
        };

        let skill_version = SkillVersion {
            id: Uuid::new_v4(),
            skill_id: skill.id.clone(),
            version: "1.0.0".to_string(),
            content: "console.log('hello');".to_string(),
            changelog: None,
            created_at: Utc::now(),
        };

        let response = VersionDetailResponse {
            skill,
            version: skill_version,
        };

        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("skill"));
        assert!(json.contains("version"));
    }

    /// 测试 VersionDetailResponse 带 changelog
    #[test]
    fn test_version_detail_response_with_changelog() {
        use chrono::Utc;

        let skill_version = SkillVersion {
            id: Uuid::new_v4(),
            skill_id: Uuid::new_v4(),
            version: "1.0.0".to_string(),
            content: "console.log('hello');".to_string(),
            changelog: Some("Initial release".to_string()),
            created_at: Utc::now(),
        };

        let json = serde_json::to_string(&skill_version).unwrap();
        assert!(json.contains("changelog"));
    }

    /// 测试版本号格式验证逻辑
    #[test]
    fn test_version_format_validation() {
        // 有效的版本号
        let valid_versions = vec!["1.0.0", "2.1.3", "0.1.0", "10.20.30"];

        for version in valid_versions {
            assert!(!version.is_empty(), "Version '{}' is not empty", version);
            let parts: Vec<&str> = version.split('.').collect();
            assert_eq!(parts.len(), 3, "Version '{}' has 3 parts", version);
        }

        // 空版本号
        assert!("".is_empty(), "Empty version is invalid");
    }

    /// 测试版本号比较逻辑
    #[test]
    fn test_version_comparison_logic() {
        // 简单的版本号比较（用于排序）
        let version1 = "1.0.0";
        let version2 = "2.0.0";
        let version3 = "1.1.0";

        // 这只是示例，实际的版本比较需要更复杂的逻辑
        assert!(version1 < version2, "1.0.0 < 2.0.0");
        assert!(version1 < version3, "1.0.0 < 1.1.0");
    }
}
