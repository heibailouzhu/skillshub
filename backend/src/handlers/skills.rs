use axum::{
    extract::{Extension, Multipart, Path, Query, State},
    http::{header, HeaderMap, StatusCode},
    response::{IntoResponse, Json, Response},
};
use serde::{Deserialize, Serialize};
use sqlx::{postgres::PgRow, QueryBuilder, Row};
use utoipa::ToSchema;
use uuid::Uuid;

use crate::error::{AppError, AppResult};
use crate::middleware::AuthUser;
use crate::models::skill::{CreateSkillRequest, Skill, SkillListItem, UpdateSkillRequest};
use crate::models::skill_package::SkillPackage;
use crate::models::skill_version::SkillVersion;
use crate::services::skill_package::store_skill_archive;
use crate::AppState;

#[derive(Debug, Deserialize, ToSchema, utoipa::IntoParams)]
pub struct ListSkillsQuery {
    pub page: Option<i64>,
    pub page_size: Option<i64>,
    pub search: Option<String>,
    pub category: Option<String>,
    pub tags: Option<String>,
    pub sort_by: Option<String>,
    pub sort_order: Option<String>,
}

#[derive(Debug, Clone, Serialize, ToSchema)]
pub struct ListSkillsResponse {
    pub skills: Vec<SkillListItem>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct SkillDetailResponse {
    pub skill: Skill,
    pub favorite_count: i32,
    pub versions: Vec<SkillVersion>,
    pub package: Option<SkillPackageSummary>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct SkillPackageSummary {
    pub version: String,
    pub file_count: i32,
    pub total_size: i64,
    pub bundle_hash: String,
    pub download_url: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct PopularCategoryItem {
    pub name: String,
    pub count: i64,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct PopularTagItem {
    pub name: String,
    pub count: i64,
}

#[derive(Debug, Deserialize, ToSchema, utoipa::IntoParams)]
pub struct SearchSuggestionsQuery {
    pub q: String,
    pub limit: Option<i64>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct SearchSuggestionsResponse {
    pub suggestions: Vec<String>,
}

fn parse_user_id(auth_user: &AuthUser) -> AppResult<Uuid> {
    auth_user
        .user_id
        .parse::<Uuid>()
        .map_err(|_| AppError::internal("Invalid user ID", "INVALID_USER_ID"))
}

fn slugify(input: &str) -> String {
    let mut slug = String::new();
    let mut prev_dash = false;

    for ch in input.chars().flat_map(|c| c.to_lowercase()) {
        if ch.is_ascii_alphanumeric() {
            slug.push(ch);
            prev_dash = false;
        } else if !prev_dash {
            slug.push('-');
            prev_dash = true;
        }
    }

    let slug = slug.trim_matches('-').to_string();
    if slug.is_empty() {
        "skill".to_string()
    } else {
        slug
    }
}

async fn ensure_unique_slug(state: &AppState, title: &str, exclude_id: Option<Uuid>) -> AppResult<String> {
    let base = slugify(title);
    let mut candidate = base.clone();
    let mut counter = 2;

    loop {
        let exists = if let Some(id) = exclude_id {
            sqlx::query_scalar::<_, bool>(
                "SELECT EXISTS(SELECT 1 FROM skills WHERE slug = $1 AND id <> $2)",
            )
            .bind(&candidate)
            .bind(id)
            .fetch_one(&state.pool)
            .await?
        } else {
            sqlx::query_scalar::<_, bool>("SELECT EXISTS(SELECT 1 FROM skills WHERE slug = $1)")
                .bind(&candidate)
                .fetch_one(&state.pool)
                .await?
        };

        if !exists {
            return Ok(candidate);
        }

        candidate = format!("{}-{}", base, counter);
        counter += 1;
    }
}

#[utoipa::path(get, path = "/api/skills", params(ListSkillsQuery), responses((status = 200, body = ListSkillsResponse)), tag = "skills")]
pub async fn list_skills(
    State(state): State<AppState>,
    Query(query): Query<ListSkillsQuery>,
) -> AppResult<Json<ListSkillsResponse>> {
    let page = query.page.unwrap_or(1).max(1);
    let page_size = query.page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;

    let mut base_builder = QueryBuilder::new(
        "SELECT s.id, s.slug, s.title, s.description, s.author_id, u.username AS author_username, s.category, s.version, s.download_count, s.rating_avg, COALESCE((SELECT COUNT(*)::INT FROM favorites f WHERE f.skill_id = s.id), 0) AS favorite_count, s.created_at FROM skills s LEFT JOIN users u ON s.author_id = u.id WHERE s.is_published = true AND s.is_deleted = false",
    );
    let mut count_builder = QueryBuilder::new(
        "SELECT COUNT(*) FROM skills s WHERE s.is_published = true AND s.is_deleted = false",
    );

    if let Some(search) = query.search.as_deref().map(str::trim).filter(|v| !v.is_empty()) {
        let search_like = format!("%{}%", search);
        base_builder.push(" AND (s.title ILIKE ").push_bind(search_like.clone()).push(" OR COALESCE(s.description, '') ILIKE ").push_bind(search_like.clone()).push(" OR COALESCE(s.content, '') ILIKE ").push_bind(search_like.clone()).push(")");
        count_builder.push(" AND (s.title ILIKE ").push_bind(search_like.clone()).push(" OR COALESCE(s.description, '') ILIKE ").push_bind(search_like.clone()).push(" OR COALESCE(s.content, '') ILIKE ").push_bind(search_like).push(")");
    }

    if let Some(category) = query.category.as_deref().map(str::trim).filter(|v| !v.is_empty()) {
        base_builder.push(" AND s.category = ").push_bind(category);
        count_builder.push(" AND s.category = ").push_bind(category);
    }

    if let Some(tags) = query.tags.as_deref() {
        for tag in tags.split(',').map(str::trim).filter(|v| !v.is_empty()) {
            base_builder.push(" AND ").push_bind(tag).push(" = ANY(COALESCE(s.tags, '{}'))");
            count_builder.push(" AND ").push_bind(tag).push(" = ANY(COALESCE(s.tags, '{}'))");
        }
    }

    let order_column = match query.sort_by.as_deref() {
        Some("title") => "s.title",
        Some("category") => "s.category",
        Some("download_count") => "s.download_count",
        Some("rating_avg") => "s.rating_avg",
        Some("favorite_count") => "COALESCE((SELECT COUNT(*)::INT FROM favorites f WHERE f.skill_id = s.id), 0)",
        _ => "s.created_at",
    };
    let order_direction = match query.sort_order.as_deref() {
        Some("asc") => "ASC",
        _ => "DESC",
    };

    base_builder
        .push(" ORDER BY ")
        .push(order_column)
        .push(" ")
        .push(order_direction)
        .push(", s.id DESC LIMIT ")
        .push_bind(page_size)
        .push(" OFFSET ")
        .push_bind(offset);

    let skills = base_builder
        .build_query_as::<SkillListItem>()
        .fetch_all(&state.pool)
        .await?;

    let total = count_builder
        .build_query_scalar::<i64>()
        .fetch_one(&state.pool)
        .await?;

    Ok(Json(ListSkillsResponse {
        skills,
        total,
        page,
        page_size,
    }))
}

#[utoipa::path(get, path = "/api/skills/{id}", responses((status = 200, body = SkillDetailResponse)), tag = "skills")]
pub async fn get_skill(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<SkillDetailResponse>> {
    let skill = sqlx::query_as::<_, Skill>(
        "SELECT * FROM skills WHERE id = $1 AND is_published = true AND is_deleted = false",
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::not_found("Skill not found", "SKILL_NOT_FOUND"))?;

    let favorite_count = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM favorites WHERE skill_id = $1")
        .bind(id)
        .fetch_one(&state.pool)
        .await? as i32;

    let versions = sqlx::query_as::<_, SkillVersion>(
        "SELECT * FROM skill_versions WHERE skill_id = $1 ORDER BY created_at DESC, version DESC",
    )
    .bind(id)
    .fetch_all(&state.pool)
    .await?;

    let package = sqlx::query_as::<_, SkillPackage>(
        "SELECT * FROM skill_packages WHERE skill_id = $1 ORDER BY created_at DESC LIMIT 1",
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await?
    .map(|pkg| SkillPackageSummary {
        version: pkg.version,
        file_count: pkg.file_count,
        total_size: pkg.total_size,
        bundle_hash: pkg.bundle_hash,
        download_url: format!("/api/skills/{}/archive", id),
    });

    Ok(Json(SkillDetailResponse {
        skill,
        favorite_count,
        versions,
        package,
    }))
}

#[utoipa::path(get, path = "/api/skills/{id}/archive", responses((status = 200, description = "zip archive")), tag = "skills")]
pub async fn download_skill_archive(
    State(state): State<AppState>,
    Path(id): Path<Uuid>,
) -> AppResult<Response> {
    let row = sqlx::query(
        r#"
        SELECT s.slug, s.version, p.archive_path
        FROM skills s
        INNER JOIN skill_packages p ON p.skill_id = s.id
        WHERE s.id = $1 AND s.is_published = true AND s.is_deleted = false
        ORDER BY p.created_at DESC
        LIMIT 1
        "#,
    )
    .bind(id)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::not_found("Skill package not found", "SKILL_PACKAGE_NOT_FOUND"))?;

    let slug: String = row.get("slug");
    let version: String = row.get("version");
    let archive_path: String = row.get("archive_path");
    let file_name = format!("{}-{}.zip", slug, version);

    let archive_bytes = tokio::fs::read(&archive_path)
        .await
        .map_err(|_| AppError::not_found("Archive file not found", "ARCHIVE_NOT_FOUND"))?;

    sqlx::query("UPDATE skills SET download_count = download_count + 1 WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await?;

    let mut headers = HeaderMap::new();
    headers.insert(
        header::CONTENT_TYPE,
        "application/zip".parse().expect("valid content type"),
    );
    headers.insert(
        header::CONTENT_DISPOSITION,
        format!("attachment; filename=\"{}\"", file_name)
            .parse()
            .expect("valid content disposition"),
    );

    Ok((StatusCode::OK, headers, archive_bytes).into_response())
}

#[utoipa::path(post, path = "/api/skills", request_body = CreateSkillRequest, responses((status = 200, body = Skill)), security(("bearer_auth" = [])), tag = "skills")]
pub async fn create_skill(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Json(req): Json<CreateSkillRequest>,
) -> AppResult<Json<Skill>> {
    let user_id = parse_user_id(&auth_user)?;

    if req.title.trim().is_empty() {
        return Err(AppError::validation("Title cannot be empty", "INVALID_TITLE"));
    }
    if req.content.trim().is_empty() {
        return Err(AppError::validation("Content cannot be empty", "INVALID_CONTENT"));
    }

    let slug = ensure_unique_slug(&state, &req.title, None).await?;

    let skill = sqlx::query_as::<_, Skill>(
        r#"
        INSERT INTO skills (slug, title, description, content, author_id, category, tags, version, is_published)
        VALUES ($1, $2, $3, $4, $5, $6, $7, '1.0.0', true)
        RETURNING *
        "#,
    )
    .bind(slug)
    .bind(req.title.trim())
    .bind(req.description.as_deref())
    .bind(req.content)
    .bind(user_id)
    .bind(req.category.as_deref())
    .bind(req.tags)
    .fetch_one(&state.pool)
    .await?;

    sqlx::query(
        "INSERT INTO skill_versions (skill_id, version, changelog, content) VALUES ($1, $2, $3, $4)",
    )
    .bind(skill.id)
    .bind(skill.version.clone())
    .bind(Some("Initial version".to_string()))
    .bind(skill.content.clone())
    .execute(&state.pool)
    .await?;

    Ok(Json(skill))
}

#[utoipa::path(post, path = "/api/skills/upload", responses((status = 200, body = SkillDetailResponse)), security(("bearer_auth" = [])), tag = "skills")]
pub async fn create_skill_package(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    mut multipart: Multipart,
) -> AppResult<Json<SkillDetailResponse>> {
    let user_id = parse_user_id(&auth_user)?;

    let mut title: Option<String> = None;
    let mut description: Option<String> = None;
    let mut category: Option<String> = None;
    let mut tags: Option<Vec<String>> = None;
    let mut version: Option<String> = None;
    let mut archive_bytes: Option<Vec<u8>> = None;
    let mut content_override: Option<String> = None;

    while let Some(field) = multipart
        .next_field()
        .await
        .map_err(|e| AppError::validation(format!("Invalid multipart payload: {e}"), "INVALID_MULTIPART"))?
    {
        let Some(name) = field.name().map(str::to_string) else {
            continue;
        };

        match name.as_str() {
            "archive" | "file" => {
                archive_bytes = Some(
                    field
                        .bytes()
                        .await
                        .map_err(|e| AppError::validation(format!("Failed to read archive: {e}"), "INVALID_ARCHIVE"))?
                        .to_vec(),
                );
            }
            "title" => title = Some(field.text().await.unwrap_or_default()),
            "description" => description = Some(field.text().await.unwrap_or_default()),
            "category" => category = Some(field.text().await.unwrap_or_default()),
            "version" => version = Some(field.text().await.unwrap_or_default()),
            "content" => content_override = Some(field.text().await.unwrap_or_default()),
            "tags" => {
                let raw = field.text().await.unwrap_or_default();
                let parsed = if raw.trim_start().starts_with('[') {
                    serde_json::from_str::<Vec<String>>(&raw).unwrap_or_default()
                } else {
                    raw.split(',')
                        .map(str::trim)
                        .filter(|item| !item.is_empty())
                        .map(ToString::to_string)
                        .collect()
                };
                tags = Some(parsed);
            }
            _ => {}
        }
    }

    let title = title
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .ok_or_else(|| AppError::validation("Title is required", "INVALID_TITLE"))?;
    let version = version
        .map(|value| value.trim().to_string())
        .filter(|value| !value.is_empty())
        .unwrap_or_else(|| "1.0.0".to_string());
    let archive_bytes = archive_bytes
        .ok_or_else(|| AppError::validation("Archive file is required", "ARCHIVE_REQUIRED"))?;
    let slug = ensure_unique_slug(&state, &title, None).await?;

    let content = content_override.unwrap_or_else(|| format!("# {}\n", title));

    let skill = sqlx::query_as::<_, Skill>(
        r#"
        INSERT INTO skills (slug, title, description, content, author_id, category, tags, version, is_published)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true)
        RETURNING *
        "#,
    )
    .bind(&slug)
    .bind(&title)
    .bind(description.as_deref())
    .bind(&content)
    .bind(user_id)
    .bind(category.as_deref())
    .bind(tags.clone())
    .bind(&version)
    .fetch_one(&state.pool)
    .await?;

    let stored = store_skill_archive(skill.id, &slug, &version, archive_bytes)
        .await
        .map_err(|e| AppError::validation(format!("Invalid skill archive: {e}"), "INVALID_SKILL_ARCHIVE"))?;

    sqlx::query(
        r#"
        INSERT INTO skill_packages (skill_id, version, archive_path, extracted_path, entry_file, manifest_json, file_count, total_size, bundle_hash)
        VALUES ($1, $2, $3, $4, 'SKILL.md', $5, $6, $7, $8)
        "#,
    )
    .bind(skill.id)
    .bind(&version)
    .bind(&stored.archive_path)
    .bind(&stored.extracted_path)
    .bind(&stored.manifest_json)
    .bind(stored.files.len() as i32)
    .bind(stored.total_size)
    .bind(&stored.bundle_hash)
    .execute(&state.pool)
    .await?;

    sqlx::query(
        "INSERT INTO skill_versions (skill_id, version, changelog, content) VALUES ($1, $2, $3, $4)",
    )
    .bind(skill.id)
    .bind(&version)
    .bind(Some("Initial package upload".to_string()))
    .bind(stored.skill_markdown)
    .execute(&state.pool)
    .await?;

    let response = SkillDetailResponse {
        skill: sqlx::query_as::<_, Skill>("SELECT * FROM skills WHERE id = $1")
            .bind(skill.id)
            .fetch_one(&state.pool)
            .await?,
        favorite_count: 0,
        versions: sqlx::query_as::<_, SkillVersion>(
            "SELECT * FROM skill_versions WHERE skill_id = $1 ORDER BY created_at DESC",
        )
        .bind(skill.id)
        .fetch_all(&state.pool)
        .await?,
        package: Some(SkillPackageSummary {
            version,
            file_count: stored.files.len() as i32,
            total_size: stored.total_size,
            bundle_hash: stored.bundle_hash,
            download_url: format!("/api/skills/{}/archive", skill.id),
        }),
    };

    Ok(Json(response))
}

#[utoipa::path(put, path = "/api/skills/{id}", request_body = UpdateSkillRequest, responses((status = 200, body = Skill)), security(("bearer_auth" = [])), tag = "skills")]
pub async fn update_skill(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
    Json(req): Json<UpdateSkillRequest>,
) -> AppResult<Json<Skill>> {
    let user_id = parse_user_id(&auth_user)?;

    let existing = sqlx::query_as::<_, Skill>("SELECT * FROM skills WHERE id = $1 AND is_deleted = false")
        .bind(id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or_else(|| AppError::not_found("Skill not found", "SKILL_NOT_FOUND"))?;

    if existing.author_id != user_id {
        return Err(AppError::forbidden("You are not allowed to update this skill", "FORBIDDEN"));
    }

    let original_title = existing.title.clone();
    let title = req.title.unwrap_or(existing.title);
    let slug = if title != original_title {
        ensure_unique_slug(&state, &title, Some(id)).await?
    } else {
        existing.slug
    };
    let description = req.description.or(existing.description);
    let content = req.content.unwrap_or(existing.content);
    let category = req.category.or(existing.category);
    let tags = req.tags.or(existing.tags);

    let skill = sqlx::query_as::<_, Skill>(
        r#"
        UPDATE skills
        SET slug = $2, title = $3, description = $4, content = $5, category = $6, tags = $7, updated_at = NOW()
        WHERE id = $1
        RETURNING *
        "#,
    )
    .bind(id)
    .bind(slug)
    .bind(title)
    .bind(description)
    .bind(content)
    .bind(category)
    .bind(tags)
    .fetch_one(&state.pool)
    .await?;

    Ok(Json(skill))
}

#[utoipa::path(delete, path = "/api/skills/{id}", responses((status = 200)), security(("bearer_auth" = [])), tag = "skills")]
pub async fn delete_skill(
    State(state): State<AppState>,
    Extension(auth_user): Extension<AuthUser>,
    Path(id): Path<Uuid>,
) -> AppResult<Json<()>> {
    let user_id = parse_user_id(&auth_user)?;

    let author_id = sqlx::query_scalar::<_, Uuid>("SELECT author_id FROM skills WHERE id = $1 AND is_deleted = false")
        .bind(id)
        .fetch_optional(&state.pool)
        .await?
        .ok_or_else(|| AppError::not_found("Skill not found", "SKILL_NOT_FOUND"))?;

    if author_id != user_id {
        return Err(AppError::forbidden("You are not allowed to delete this skill", "FORBIDDEN"));
    }

    sqlx::query("UPDATE skills SET is_deleted = true, is_published = false, updated_at = NOW() WHERE id = $1")
        .bind(id)
        .execute(&state.pool)
        .await?;

    Ok(Json(()))
}

#[utoipa::path(get, path = "/api/skills/categories/popular", responses((status = 200, body = Vec<PopularCategoryItem>)), tag = "skills")]
pub async fn get_popular_categories(
    State(state): State<AppState>,
) -> AppResult<Json<Vec<PopularCategoryItem>>> {
    let rows = sqlx::query(
        r#"
        SELECT category AS name, COUNT(*) AS count
        FROM skills
        WHERE is_published = true AND is_deleted = false AND category IS NOT NULL AND category <> ''
        GROUP BY category
        ORDER BY count DESC, category ASC
        LIMIT 20
        "#,
    )
    .fetch_all(&state.pool)
    .await?;

    let result = rows
        .into_iter()
        .map(|row| PopularCategoryItem {
            name: row.get("name"),
            count: row.get("count"),
        })
        .collect();

    Ok(Json(result))
}

#[utoipa::path(get, path = "/api/skills/tags/popular", responses((status = 200, body = Vec<PopularTagItem>)), tag = "skills")]
pub async fn get_popular_tags(
    State(state): State<AppState>,
) -> AppResult<Json<Vec<PopularTagItem>>> {
    let rows = sqlx::query(
        r#"
        SELECT tag AS name, COUNT(*) AS count
        FROM (
            SELECT unnest(COALESCE(tags, '{}')) AS tag
            FROM skills
            WHERE is_published = true AND is_deleted = false
        ) t
        WHERE tag <> ''
        GROUP BY tag
        ORDER BY count DESC, tag ASC
        LIMIT 30
        "#,
    )
    .fetch_all(&state.pool)
    .await?;

    let result = rows
        .into_iter()
        .map(|row| PopularTagItem {
            name: row.get("name"),
            count: row.get("count"),
        })
        .collect();

    Ok(Json(result))
}

#[utoipa::path(get, path = "/api/skills/search/suggestions", params(SearchSuggestionsQuery), responses((status = 200, body = SearchSuggestionsResponse)), tag = "skills")]
pub async fn search_suggestions(
    State(state): State<AppState>,
    Query(query): Query<SearchSuggestionsQuery>,
) -> AppResult<Json<SearchSuggestionsResponse>> {
    let keyword = query.q.trim();
    if keyword.is_empty() {
        return Ok(Json(SearchSuggestionsResponse {
            suggestions: Vec::new(),
        }));
    }

    let limit = query.limit.unwrap_or(8).clamp(1, 20);
    let pattern = format!("%{}%", keyword);

    let rows: Vec<PgRow> = sqlx::query(
        r#"
        SELECT DISTINCT title
        FROM skills
        WHERE is_published = true AND is_deleted = false AND title ILIKE $1
        ORDER BY title ASC
        LIMIT $2
        "#,
    )
    .bind(pattern)
    .bind(limit)
    .fetch_all(&state.pool)
    .await?;

    let suggestions = rows.into_iter().map(|row| row.get("title")).collect();

    Ok(Json(SearchSuggestionsResponse { suggestions }))
}
