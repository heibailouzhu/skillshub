use axum::{Json, response::IntoResponse};
use utoipa::OpenApi;
use serde_json::json;

#[derive(OpenApi)]
#[openapi(
    info(
        title = "SkillShub API",
        version = "0.1.0",
        description = "SkillShub - 一个开源的技能分享平台 API",
        contact(
            name = "SkillShub Team",
            email = "support@skillshub.com"
        ),
        license(
            name = "MIT",
            url = "https://opensource.org/licenses/MIT"
        )
    ),
    paths(
        crate::handlers::health_check,
        crate::handlers::auth::register,
        crate::handlers::auth::login,
        crate::handlers::skills::list_skills,
        crate::handlers::skills::get_skill,
        crate::handlers::skills::create_skill,
        crate::handlers::skills::update_skill,
        crate::handlers::skills::delete_skill,
        crate::handlers::skills::get_popular_categories,
        crate::handlers::skills::get_popular_tags,
        crate::handlers::skills::search_suggestions,
        crate::handlers::comments::list_comments,
        crate::handlers::comments::create_comment,
        crate::handlers::comments::update_comment,
        crate::handlers::comments::delete_comment,
        crate::handlers::favorites::list_favorites,
        crate::handlers::favorites::add_favorite,
        crate::handlers::favorites::remove_favorite,
        crate::handlers::ratings::create_rating,
        crate::handlers::ratings::update_rating,
        crate::handlers::ratings::delete_rating,
        crate::handlers::ratings::get_skill_rating_stats,
        crate::handlers::ratings::get_user_ratings,
        crate::handlers::versions::create_version,
        crate::handlers::versions::get_version,
        crate::handlers::versions::rollback_version,
    ),
    servers(
        (url = "http://localhost:3000", description = "Development server"),
    )
)]
pub struct ApiDoc;

/// Get OpenAPI JSON spec
#[utoipa::path(
    get,
    path = "/api/docs/openapi.json",
    responses(
        (status = 200, description = "OpenAPI specification", body = serde_json::Value)
    ),
    tag = "docs"
)]
pub async fn openapi_json() -> impl IntoResponse {
    Json(ApiDoc::openapi())
}
