use axum::{
    extract::{Extension, Path, Query, State},
    response::Json,
};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;
use utoipa::ToSchema;

use crate::error::{AppError, AppResult};
use crate::models::skill::Skill;
use crate::models::skill_version::SkillVersion;
use crate::middleware::AuthUser;
use crate::AppState;

/// 技能列表查询参数
#[derive(Debug, Deserialize, ToSchema, utoipa::IntoParams)]
pub struct ListSkillsQuery {
    /// 页码，从 1 开始
    pub page: Option<u32>,
    /// 每页数量，最大 100
    pub page_size: Option<u32>,
    /// 搜索关键词（全文搜索）
    pub search: Option<String>,
    /// 分类过滤
    pub category: Option<String>,
    /// 标签过滤（逗号分隔的标签列表）
    pub tags: Option<String>,
    /// 排序字段（title, category, download_count, rating_avg, created_at, relevance）
    pub sort_by: Option<String>,
    /// 排序方式（asc, desc）
    pub sort_order: Option<String>,
}

/// 创建技能请求
#[derive(Debug, Deserialize, ToSchema)]
pub struct CreateSkillRequest {
    /// 技能标题
    pub title: String,
    /// 技能描述
    pub description: Option<String>,
    /// 技能分类
    pub category: Option<String>,
    /// 技能内容
    pub content: String,
    /// 技能标签
    #[allow(dead_code)]
    pub tags: Option<Vec<String>>,
}

/// 更新技能请求
#[derive(Debug, Deserialize, ToSchema)]
pub struct UpdateSkillRequest {
    /// 技能标题
    pub title: Option<String>,
    /// 技能描述
    pub description: Option<String>,
    /// 技能分类
    pub category: Option<String>,
    /// 技能内容
    pub content: Option<String>,
    /// 技能标签
    #[allow(dead_code)]
    pub tags: Option<Vec<String>>,
}

/// 技能列表响应
#[derive(Debug, Serialize, Deserialize, ToSchema)]
pub struct ListSkillsResponse {
    /// 技能列表
    pub skills: Vec<SkillListItem>,
    /// 总数
    pub total: i64,
    /// 当前页
    pub page: u32,
    /// 每页数量
    pub page_size: u32,
}

/// 技能列表项
#[derive(Debug, Serialize, Deserialize, FromRow, ToSchema)]
pub struct SkillListItem {
    /// 技能 ID
    pub id: Uuid,
    /// 技能标题
    pub title: String,
    /// 技能描述
    pub description: Option<String>,
    /// 作者 ID
    pub author_id: Uuid,
    /// 作者用户名
    pub author_username: Option<String>,
    /// 技能分类
    pub category: Option<String>,
    /// 当前版本
    pub version: String,
    /// 下载次数
    pub download_count: i32,
    /// 平均评分
    pub rating_avg: f64,
    /// 创建时间
    pub created_at: String,
}

/// 技能详情响应
#[derive(Debug, Serialize, ToSchema)]
pub struct SkillDetailResponse {
    /// 技能信息
    pub skill: Skill,
    /// 版本历史
    pub versions: Vec<SkillVersion>,
}

/// 获取技能列表（公开，无需认证）
#[utoipa::path(
    get,
    path = "/api/skills",
    params(ListSkillsQuery),
    responses(
        (status = 200, description = "成功获取技能列表", body = ListSkillsResponse),
        (status = 500, description = "服务器错误", body = crate::error::ErrorResponse)
    ),
    tag = "技能管理"
)]
pub async fn list_skills(
    State(state): State<AppState>,
    Query(query): Query<ListSkillsQuery>,
) -> AppResult<Json<ListSkillsResponse>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).min(100);
    let offset = (page - 1) * page_size;

    // 生成缓存键
    let cache_key = format!(
        "skills:list:{}:{}:{}:{}:{}",
        query.search.as_ref().map(|s| s.as_str()).unwrap_or_default(),
        query.category.as_ref().map(|s| s.as_str()).unwrap_or_default(),
        query.tags.as_ref().map(|s| s.as_str()).unwrap_or_default(),
        query.sort_by.as_ref().map(|s| s.as_str()).unwrap_or_default(),
        format!("{}:{}", page, page_size)
    );

    // 尝试从缓存获取
    if let Ok(Some(cached)) = state.cache_service.get::<ListSkillsResponse>(&cache_key).await {
        tracing::debug!("Cache hit for list_skills");
        return Ok(Json(cached));
    }

    // 构建基础查询
    let mut base_query = String::from("SELECT s.*, u.username as author_username FROM skills s LEFT JOIN users u ON s.author_id = u.id WHERE s.is_published = true");
    let mut count_query = String::from("SELECT COUNT(*) FROM skills s WHERE s.is_published = true");
    let mut conditions = Vec::new();
    let mut query_params: Vec<String> = Vec::new();

    // 全文搜索条件（使用 tsvector）
    if let Some(search) = &query.search {
        conditions.push(format!("s.search_vector @@ to_tsquery('english', $1)"));
        query_params.push(search.clone());
    }

    // 分类过滤
    if let Some(category) = &query.category {
        conditions.push(format!("s.category = ${}", query_params.len() + 1));
        query_params.push(category.clone());
    }

    // 标签过滤（使用数组包含操作符）
    if let Some(tags) = &query.tags {
        let tag_list: Vec<&str> = tags.split(',').collect();
        for tag in tag_list {
            let trimmed_tag = tag.trim();
            if !trimmed_tag.is_empty() {
                conditions.push(format!("${} = ANY(s.tags)", query_params.len() + 1));
                query_params.push(trimmed_tag.to_string());
            }
        }
    }

    // 添加条件到查询
    if !conditions.is_empty() {
        let where_clause = conditions.join(" AND ");
        base_query = format!("{} AND {}", base_query, where_clause);
        count_query = format!("{} AND {}", count_query, where_clause);
    }

    // 排序
    let sort_by = query.sort_by.as_deref().unwrap_or("created_at");
    let sort_order = query.sort_order.as_deref().unwrap_or("desc");

    // 安全验证排序字段
    let safe_sort_by = match sort_by {
        "title" | "category" | "download_count" | "rating_avg" | "created_at" => sort_by,
        "relevance" => { // 搜索相关性排序
            if query.search.is_some() {
                "ts_rank(s.search_vector, to_tsquery('english', $1))"
            } else {
                "created_at"
            }
        }
        _ => "created_at",
    };

    let safe_sort_order = match sort_order {
        "asc" | "desc" => sort_order,
        _ => "desc",
    };

    // 添加排序和分页
    base_query = format!(
        "{} ORDER BY s.{} {} LIMIT {} OFFSET {}",
        base_query, safe_sort_by, safe_sort_order, page_size, offset
    );

    // 查询总数
    let total_query_result = if query_params.is_empty() {
        sqlx::query_as::<_, (i64,)>(&count_query)
            .fetch_one(&state.pool)
            .await?
    } else {
        // 使用参数化查询
        let mut count_query_builder = sqlx::query_as::<_, (i64,)>(&count_query);
        for param in &query_params {
            count_query_builder = count_query_builder.bind(param);
        }
        count_query_builder.fetch_one(&state.pool).await?
    };

    let (total,) = total_query_result;

    // 查询技能列表
    let skills = if query_params.is_empty() {
        sqlx::query_as::<_, SkillListItem>(&base_query)
            .fetch_all(&state.pool)
            .await?
    } else {
        let mut query_builder = sqlx::query_as::<_, SkillListItem>(&base_query);
        for param in &query_params {
            query_builder = query_builder.bind(param);
        }
        query_builder.fetch_all(&state.pool).await?
    };

    tracing::debug!(
        search = query.search,
        category = query.category,
        tags = query.tags,
        total = total,
        page = page,
        "List skills query completed"
    );

    let response = ListSkillsResponse {
        skills,
        total,
        page,
        page_size,
    };

    // 设置缓存（5分钟）
    if let Err(e) = state
        .cache_service
        .set(&cache_key, &response, Some(std::time::Duration::from_secs(300)))
        .await
    {
        tracing::warn!("Failed to set cache for list_skills: {}", e);
    }

    Ok(Json(response))
}

/// 获取单个技能详情（公开，无需认证）
#[utoipa::path(
    get,
    path = "/api/skills/{id}",
    params(
        ("id" = Uuid, Path, description = "技能 ID")
    ),
    responses(
        (status = 200, description = "成功获取技能详情", body = SkillDetailResponse),
        (status = 404, description = "技能不存在", body = crate::error::ErrorResponse),
        (status = 500, description = "服务器错误", body = crate::error::ErrorResponse)
    ),
    tag = "技能管理"
)]
pub async fn get_skill(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<SkillDetailResponse>> {
    // 查询技能
    let skill = sqlx::query_as::<_, Skill>("SELECT * FROM skills WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Skill not found".to_string()))?;

    // 查询技能的所有版本
    let versions = sqlx::query_as::<_, SkillVersion>(
        "SELECT * FROM skill_versions WHERE skill_id = $1 ORDER BY version DESC"
    )
    .bind(id)
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(SkillDetailResponse {
        skill,
        versions,
    }))
}

/// 创建技能（需要认证）
#[utoipa::path(
    post,
    path = "/api/skills",
    request_body = CreateSkillRequest,
    responses(
        (status = 200, description = "成功创建技能", body = Skill),
        (status = 400, description = "请求参数错误", body = crate::error::ErrorResponse),
        (status = 401, description = "未认证", body = crate::error::ErrorResponse),
        (status = 500, description = "服务器错误", body = crate::error::ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "技能管理"
)]
pub async fn create_skill(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Json(req): Json<CreateSkillRequest>,
) -> AppResult<Json<Skill>> {
    // 从认证中间件获取用户 ID
    let user_id: Uuid = auth_user.user_id.parse::<Uuid>()
        .map_err(|_| AppError::Internal("Invalid user ID".to_string()))?;

    // 验证输入
    if req.title.trim().is_empty() {
        return Err(AppError::Validation("Skill title cannot be empty".to_string()));
    }

    if req.content.trim().is_empty() {
        return Err(AppError::Validation("Skill content cannot be empty".to_string()));
    }

    // 开始事务
    let mut tx = state.pool.begin().await?;

    // 插入技能
    let skill_id = sqlx::query_scalar::<_, Uuid>(
        r#"
        INSERT INTO skills (title, description, category, content, author_id, version)
        VALUES ($1, $2, $3, $4, $5, '1.0.0')
        RETURNING id
        "#,
    )
    .bind(&req.title)
    .bind(&req.description)
    .bind(&req.category)
    .bind(&req.content)
    .bind(user_id)
    .fetch_one(&mut *tx)
    .await?;

    // 插入初始版本
    sqlx::query(
        r#"
        INSERT INTO skill_versions (skill_id, version, content, changelog)
        VALUES ($1, '1.0.0', $2, 'Initial version')
        "#,
    )
    .bind(&skill_id)
    .bind(&req.content)
    .execute(&mut *tx)
    .await?;

    // 提交事务
    tx.commit().await?;

    // 查询创建的技能
    let skill = sqlx::query_as::<_, Skill>("SELECT * FROM skills WHERE id = $1")
        .bind(skill_id)
        .fetch_one(&state.pool)
        .await?;

    // 使相关缓存失效
    if let Err(e) = state.cache_service.delete_pattern("skills:list:*").await {
        tracing::warn!("Failed to delete pattern cache: {}", e);
    }
    if let Err(e) = state.cache_service.delete("popular_categories").await {
        tracing::warn!("Failed to delete popular_categories cache: {}", e);
    }
    if let Err(e) = state.cache_service.delete("popular_tags").await {
        tracing::warn!("Failed to delete popular_tags cache: {}", e);
    }

    tracing::info!(skill_id = %skill_id, title = %req.title, author_id = %user_id, "Skill created successfully");

    Ok(Json(skill))
}

/// 更新技能（需要认证，且必须是作者）
#[utoipa::path(
    put,
    path = "/api/skills/{id}",
    params(
        ("id" = Uuid, Path, description = "技能 ID")
    ),
    request_body = UpdateSkillRequest,
    responses(
        (status = 200, description = "成功更新技能", body = Skill),
        (status = 400, description = "请求参数错误", body = crate::error::ErrorResponse),
        (status = 401, description = "未认证", body = crate::error::ErrorResponse),
        (status = 403, description = "无权限", body = crate::error::ErrorResponse),
        (status = 404, description = "技能不存在", body = crate::error::ErrorResponse),
        (status = 500, description = "服务器错误", body = crate::error::ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "技能管理"
)]
pub async fn update_skill(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateSkillRequest>,
) -> AppResult<Json<Skill>> {
    // 从认证中间件获取用户 ID
    let user_id: Uuid = auth_user.user_id.parse::<Uuid>()
        .map_err(|_| AppError::Internal("Invalid user ID".to_string()))?;

    // 检查技能是否存在
    let existing_skill = sqlx::query_as::<_, Skill>("SELECT * FROM skills WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Skill not found".to_string()))?;

    // 检查权限
    if existing_skill.author_id != user_id {
        return Err(AppError::Forbidden("You are not authorized to update this skill".to_string()));
    }

    // 构建动态更新查询
    let mut updates = Vec::new();
    let mut params_count = 1;

    if let Some(title) = &req.title {
        if !title.trim().is_empty() {
            updates.push(format!("title = ${}", params_count));
            params_count += 1;
        }
    }

    if let Some(description) = &req.description {
        updates.push(format!("description = ${}", params_count));
        params_count += 1;
    }

    if let Some(category) = &req.category {
        updates.push(format!("category = ${}", params_count));
        params_count += 1;
    }

    if let Some(content) = &req.content {
        if !content.trim().is_empty() {
            updates.push(format!("content = ${}", params_count));
            params_count += 1;
        }
    }

    // 添加 updated_at
    updates.push(format!("updated_at = NOW()"));

    if updates.is_empty() {
        return Err(AppError::Validation("No fields to update".to_string()));
    }

    let update_query = format!("UPDATE skills SET {} WHERE id = ${}", updates.join(", "), params_count);

    // 执行更新
    let mut query = sqlx::query(&update_query);

    if let Some(title) = req.title {
        if !title.trim().is_empty() {
            query = query.bind(title);
        }
    }

    if let Some(description) = req.description {
        query = query.bind(description);
    }

    if let Some(category) = req.category {
        query = query.bind(category);
    }

    if let Some(content) = req.content {
        if !content.trim().is_empty() {
            query = query.bind(content);
        }
    }

    query = query.bind(id);

    query.execute(&state.pool).await?;

    // 查询更新后的技能
    let skill = sqlx::query_as::<_, Skill>("SELECT * FROM skills WHERE id = $1")
        .bind(id)
        .fetch_one(&state.pool)
        .await?;

    // 使相关缓存失效
    if let Err(e) = state.cache_service.delete_pattern("skills:list:*").await {
        tracing::warn!("Failed to delete pattern cache: {}", e);
    }
    if let Err(e) = state.cache_service.delete("popular_categories").await {
        tracing::warn!("Failed to delete popular_categories cache: {}", e);
    }
    if let Err(e) = state.cache_service.delete("popular_tags").await {
        tracing::warn!("Failed to delete popular_tags cache: {}", e);
    }

    tracing::info!(skill_id = %id, author_id = %user_id, "Skill updated successfully");

    Ok(Json(skill))
}

/// 删除技能（需要认证，且必须是作者）
#[utoipa::path(
    delete,
    path = "/api/skills/{id}",
    params(
        ("id" = Uuid, Path, description = "技能 ID")
    ),
    responses(
        (status = 200, description = "成功删除技能", body = ()),
        (status = 401, description = "未认证", body = crate::error::ErrorResponse),
        (status = 403, description = "无权限", body = crate::error::ErrorResponse),
        (status = 404, description = "技能不存在", body = crate::error::ErrorResponse),
        (status = 500, description = "服务器错误", body = crate::error::ErrorResponse)
    ),
    security(
        ("bearer_auth" = [])
    ),
    tag = "技能管理"
)]
pub async fn delete_skill(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<()>> {
    // 从认证中间件获取用户 ID
    let user_id: Uuid = auth_user.user_id.parse::<Uuid>()
        .map_err(|_| AppError::Internal("Invalid user ID".to_string()))?;

    // 检查技能是否存在
    let existing_skill = sqlx::query_as::<_, Skill>("SELECT * FROM skills WHERE id = $1")
        .bind(id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or_else(|| AppError::NotFound("Skill not found".to_string()))?;

    // 检查权限
    if existing_skill.author_id != user_id {
        return Err(AppError::Forbidden("You are not authorized to delete this skill".to_string()));
    }

    // 删除技能（软删除）
    sqlx::query("UPDATE skills SET is_deleted = true WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await?;

    // 使相关缓存失效
    if let Err(e) = state.cache_service.delete_pattern("skills:list:*").await {
        tracing::warn!("Failed to delete pattern cache: {}", e);
    }
    if let Err(e) = state.cache_service.delete("popular_categories").await {
        tracing::warn!("Failed to delete popular_categories cache: {}", e);
    }
    if let Err(e) = state.cache_service.delete("popular_tags").await {
        tracing::warn!("Failed to delete popular_tags cache: {}", e);
    }

    tracing::info!(skill_id = %id, author_id = %user_id, "Skill deleted successfully");

    Ok(Json(()))
}

/// 热门分类响应
#[derive(Debug, Serialize, Deserialize, FromRow, ToSchema)]
pub struct PopularCategory {
    /// 分类名称
    pub category: String,
    /// 该分类下的技能数量
    pub skill_count: i64,
}

/// 获取热门分类（公开，无需认证）
#[utoipa::path(
    get,
    path = "/api/skills/categories/popular",
    responses(
        (status = 200, description = "成功获取热门分类", body = Vec<PopularCategory>),
        (status = 500, description = "服务器错误", body = crate::error::ErrorResponse)
    ),
    tag = "技能管理"
)]
pub async fn get_popular_categories(
    State(state): State<AppState>,
) -> AppResult<Json<Vec<PopularCategory>>> {
    use std::time::Duration;

    let cache_key = "popular_categories";

    // 尝试从缓存获取
    if let Ok(Some(cached)) = state.cache_service.get::<Vec<PopularCategory>>(cache_key).await {
        tracing::debug!("Cache hit for {}", cache_key);
        return Ok(Json(cached));
    }

    // 缓存未命中，查询数据库
    let categories = sqlx::query_as::<_, PopularCategory>(
        "SELECT category, COUNT(*) as skill_count FROM skills
         WHERE is_published = true AND is_deleted = false
         GROUP BY category
         ORDER BY skill_count DESC
         LIMIT 20"
    )
    .fetch_all(&state.pool)
    .await?;

    // 写入缓存（TTL 1 小时）
    if let Err(e) = state.cache_service
        .set(cache_key, &categories, Some(Duration::from_secs(3600)))
        .await
    {
        tracing::warn!("Failed to cache {}: {}", cache_key, e);
    }

    Ok(Json(categories))
}

/// 热门标签响应
#[derive(Debug, Serialize, Deserialize, FromRow, ToSchema)]
pub struct PopularTag {
    /// 标签名称
    pub tag: String,
    /// 该标签下的技能数量
    pub skill_count: i64,
}

/// 获取热门标签（公开，无需认证）
#[utoipa::path(
    get,
    path = "/api/skills/tags/popular",
    responses(
        (status = 200, description = "成功获取热门标签", body = Vec<PopularTag>),
        (status = 500, description = "服务器错误", body = crate::error::ErrorResponse)
    ),
    tag = "技能管理"
)]
pub async fn get_popular_tags(
    State(state): State<AppState>,
) -> AppResult<Json<Vec<PopularTag>>> {
    use std::time::Duration;

    let cache_key = "popular_tags";

    // 尝试从缓存获取
    if let Ok(Some(cached)) = state.cache_service.get::<Vec<PopularTag>>(cache_key).await {
        tracing::debug!("Cache hit for {}", cache_key);
        return Ok(Json(cached));
    }

    // 缓存未命中，查询数据库
    let tags = sqlx::query_as::<_, PopularTag>(
        "SELECT unnest(tags) as tag, COUNT(*) as skill_count FROM skills
         WHERE is_published = true AND is_deleted = false AND array_length(tags, 1) > 0
         GROUP BY tag
         ORDER BY skill_count DESC
         LIMIT 50"
    )
    .fetch_all(&state.pool)
    .await?;

    // 写入缓存（TTL 1 小时）
    if let Err(e) = state.cache_service
        .set(cache_key, &tags, Some(Duration::from_secs(3600)))
        .await
    {
        tracing::warn!("Failed to cache {}: {}", cache_key, e);
    }

    Ok(Json(tags))
}

/// 搜索建议响应
#[derive(Debug, Serialize, FromRow, ToSchema)]
pub struct SearchSuggestion {
    /// 技能标题
    pub title: String,
    /// 技能 ID
    pub id: Uuid,
}

/// 搜索建议（公开，无需认证）
#[utoipa::path(
    get,
    path = "/api/skills/search/suggestions",
    params(
        ("q" = String, Query, description = "搜索关键词（最少 2 个字符）")
    ),
    responses(
        (status = 200, description = "成功获取搜索建议", body = Vec<SearchSuggestion>),
        (status = 500, description = "服务器错误", body = crate::error::ErrorResponse)
    ),
    tag = "技能管理"
)]
pub async fn search_suggestions(
    State(state): State<AppState>,
    Query(params): Query<std::collections::HashMap<String, String>>,
) -> AppResult<Json<Vec<SearchSuggestion>>> {
    let query = params.get("q").unwrap_or(&String::new()).clone();

    if query.len() < 2 {
        return Ok(Json(vec![]));
    }

    let suggestions = sqlx::query_as::<_, SearchSuggestion>(
        "SELECT title, id FROM skills
         WHERE is_published = true
         AND is_deleted = false
         AND (title ILIKE $1 OR description ILIKE $1)
         LIMIT 10"
    )
    .bind(format!("{}%", query))
    .fetch_all(&state.pool)
    .await?;

    Ok(Json(suggestions))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 测试 ListSkillsQuery 反序列化
    #[test]
    fn test_list_skills_query_deserialization() {
        let json = r#"{
            "page": 1,
            "page_size": 20,
            "search": "test",
            "category": "tutorial",
            "tags": "AI,Python",
            "sort_by": "title",
            "sort_order": "asc"
        }"#;

        let query: ListSkillsQuery = serde_json::from_str(json).unwrap();
        assert_eq!(query.page, Some(1));
        assert_eq!(query.page_size, Some(20));
        assert_eq!(query.search, Some("test".to_string()));
        assert_eq!(query.category, Some("tutorial".to_string()));
        assert_eq!(query.tags, Some("AI,Python".to_string()));
        assert_eq!(query.sort_by, Some("title".to_string()));
        assert_eq!(query.sort_order, Some("asc".to_string()));
    }

    /// 测试 CreateSkillRequest 反序列化
    #[test]
    fn test_create_skill_request_deserialization() {
        let json = r#"{
            "title": "Test Skill",
            "description": "A test skill",
            "category": "AI",
            "content": "console.log('hello');",
            "tags": ["JavaScript", "Tutorial"]
        }"#;

        let req: CreateSkillRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.title, "Test Skill");
        assert_eq!(req.description, Some("A test skill".to_string()));
        assert_eq!(req.category, Some("AI".to_string()));
        assert_eq!(req.content, "console.log('hello');");
        assert_eq!(req.tags, Some(vec!["JavaScript".to_string(), "Tutorial".to_string()]));
    }

    /// 测试 UpdateSkillRequest 反序列化（可选字段）
    #[test]
    fn test_update_skill_request_partial_deserialization() {
        let json = r#"{
            "title": "Updated Title",
            "content": "new content"
        }"#;

        let req: UpdateSkillRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.title, Some("Updated Title".to_string()));
        assert_eq!(req.content, Some("new content".to_string()));
        assert_eq!(req.description, None);
        assert_eq!(req.category, None);
        assert_eq!(req.tags, None);
    }

    /// 测试 SkillListItem 序列化
    #[test]
    fn test_skill_list_item_serialization() {
        let item = SkillListItem {
            id: Uuid::new_v4(),
            title: "Test Skill".to_string(),
            description: Some("Test description".to_string()),
            author_id: Uuid::new_v4(),
            author_username: Some("testuser".to_string()),
            category: Some("AI".to_string()),
            version: "1.0.0".to_string(),
            download_count: 100,
            rating_avg: 4.5,
            created_at: "2024-01-01T00:00:00Z".to_string(),
        };

        let json = serde_json::to_string(&item).unwrap();
        assert!(json.contains("title"));
        assert!(json.contains("Test Skill"));
    }

    /// 测试 SearchSuggestion 序列化
    #[test]
    fn test_search_suggestion_serialization() {
        let suggestion = SearchSuggestion {
            title: "Machine Learning Skill".to_string(),
            id: Uuid::new_v4(),
        };

        let json = serde_json::to_string(&suggestion).unwrap();
        assert!(json.contains("title"));
        assert!(json.contains("id"));
    }

    /// 测试 PopularCategory 序列化
    #[test]
    fn test_popular_category_serialization() {
        let category = PopularCategory {
            category: "AI".to_string(),
            skill_count: 100,
        };

        let json = serde_json::to_string(&category).unwrap();
        assert!(json.contains("category"));
        assert!(json.contains("skill_count"));
    }

    /// 测试 PopularTag 序列化
    #[test]
    fn test_popular_tag_serialization() {
        let tag = PopularTag {
            tag: "Python".to_string(),
            skill_count: 50,
        };

        let json = serde_json::to_string(&tag).unwrap();
        assert!(json.contains("tag"));
        assert!(json.contains("skill_count"));
    }

    /// 测试搜索查询长度验证逻辑
    #[test]
    fn test_search_query_validation() {
        // 有效长度
        assert!("ab".len() >= 2, "Query 'ab' is valid");
        assert!("test".len() >= 2, "Query 'test' is valid");

        // 无效长度
        assert!("a".len() < 2, "Query 'a' is too short");
        assert!("".len() < 2, "Empty query is too short");
    }

    /// 测试标签解析逻辑
    #[test]
    fn test_tags_parsing_logic() {
        let tags_str = "AI,Python,Rust";
        let tags: Vec<String> = tags_str.split(',').map(|s| s.to_string()).collect();

        assert_eq!(tags.len(), 3);
        assert_eq!(tags[0], "AI");
        assert_eq!(tags[1], "Python");
        assert_eq!(tags[2], "Rust");
    }

    /// 测试单标签
    #[test]
    fn test_single_tag_parsing() {
        let tags_str = "AI";
        let tags: Vec<String> = tags_str.split(',').map(|s| s.to_string()).collect();

        assert_eq!(tags.len(), 1);
        assert_eq!(tags[0], "AI");
    }

    /// 测试空标签字符串
    #[test]
    fn test_empty_tags_parsing() {
        let tags_str = "";
        let tags: Vec<String> = tags_str.split(',').filter(|s| !s.is_empty()).map(|s| s.to_string()).collect();

        assert_eq!(tags.len(), 0);
    }
}
