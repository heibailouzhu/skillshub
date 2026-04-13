use crate::AppState;
use axum::{
    routing::{delete, get, post, put},
    Router,
};

use crate::handlers::admin::{
    list_admin_skills, list_admin_users, update_admin_skill_status, update_admin_user_role,
};
use crate::handlers::comments::{create_comment, delete_comment, list_comments, update_comment};
use crate::handlers::favorites::{add_favorite, list_favorites, remove_favorite};
use crate::handlers::registry::{get_registry_bundle, get_registry_skill};
use crate::handlers::skills::{
    create_skill, create_skill_package, delete_skill, download_skill_archive,
    get_popular_categories, get_popular_tags, get_skill, list_skills, search_suggestions,
    update_skill,
};
use crate::handlers::versions::{create_version, get_version, rollback_version};
use crate::handlers::{login, register};
use crate::middleware::auth_middleware;

/// 认证路由
pub fn auth_routes() -> Router<AppState> {
    Router::new()
        .route("/register", post(register))
        .route("/login", post(login))
}

pub fn admin_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/skills", get(list_admin_skills))
        .route("/skills/:id/status", axum::routing::patch(update_admin_skill_status))
        .route("/users", get(list_admin_users))
        .route("/users/:id/role", axum::routing::patch(update_admin_user_role))
        .route_layer(axum::middleware::from_fn_with_state(
            state.auth_service,
            auth_middleware,
        ))
}

/// registry 路由
pub fn registry_routes() -> Router<AppState> {
    Router::new()
        .route("/skills/:slug", get(get_registry_skill))
        .route(
            "/skills/:slug/versions/:version/bundle",
            get(get_registry_bundle),
        )
}

/// 公开技能路由（不需要认证）
pub fn skill_public_routes() -> Router<AppState> {
    Router::new()
        .route("/", get(list_skills))
        .route("/:id", get(get_skill))
        .route("/:id/archive", get(download_skill_archive))
        .route("/categories/popular", get(get_popular_categories))
        .route("/tags/popular", get(get_popular_tags))
        .route("/search/suggestions", get(search_suggestions))
}

/// 受保护技能路由（需要认证）
pub fn skill_protected_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/", post(create_skill))
        .route("/upload", post(create_skill_package))
        .route("/:id", put(update_skill))
        .route("/:id", delete(delete_skill))
        .route_layer(axum::middleware::from_fn_with_state(
            state.auth_service,
            auth_middleware,
        ))
}

/// 技能路由（合并公开和受保护路由）
pub fn skill_routes(state: AppState) -> Router<AppState> {
    skill_public_routes()
        .merge(skill_protected_routes(state.clone()))
        .merge(comment_routes(state.clone()))
        .merge(favorite_routes(state.clone()))
        .merge(rating_routes(state.clone()))
        .merge(version_routes(state))
}

/// 评论路由
pub fn comment_routes(state: AppState) -> Router<AppState> {
    let public_routes = Router::<AppState>::new()
        .route("/:skill_id/comments", get(list_comments));

    let protected_routes = Router::<AppState>::new()
        .route("/:skill_id/comments", post(create_comment))
        .route("/comments/:comment_id", put(update_comment))
        .route("/comments/:comment_id", delete(delete_comment))
        .route_layer(axum::middleware::from_fn_with_state(
            state.auth_service,
            auth_middleware,
        ));

    public_routes.merge(protected_routes)
}

/// 收藏路由
pub fn favorite_routes(state: AppState) -> Router<AppState> {
    Router::new()
        // 获取用户收藏列表（需要认证）
        .route("/favorites", get(list_favorites))
        // 添加/取消收藏（需要认证）
        .route("/:id/favorite", post(add_favorite))
        .route("/:id/favorite", delete(remove_favorite))
        // 为所有路由应用认证中间件
        .route_layer(axum::middleware::from_fn_with_state(
            state.auth_service,
            auth_middleware,
        ))
}

/// 评分路由
pub fn rating_routes(state: AppState) -> Router<AppState> {
    // 公开路由（不需要认证）
    let public_routes = Router::<AppState>::new().route(
        "/:id/ratings",
        get(crate::handlers::ratings::get_skill_rating_stats),
    );

    // 受保护路由（需要认证）
    let protected_routes = Router::<AppState>::new()
        .route("/ratings", get(crate::handlers::ratings::get_user_ratings))
        .route("/:id/rating", post(crate::handlers::ratings::create_rating))
        .route("/ratings/:id", put(crate::handlers::ratings::update_rating))
        .route(
            "/ratings/:id",
            delete(crate::handlers::ratings::delete_rating),
        )
        .route_layer(axum::middleware::from_fn_with_state(
            state.auth_service.clone(),
            auth_middleware,
        ));

    public_routes.merge(protected_routes)
}

/// 版本路由
pub fn version_routes(state: AppState) -> Router<AppState> {
    // 公开路由（不需要认证）
    let public_routes = Router::<AppState>::new().route("/:id/versions/:version", get(get_version));

    // 受保护路由（需要认证）
    let protected_routes = Router::<AppState>::new()
        .route("/:id/versions", post(create_version))
        .route("/:id/versions/:version/rollback", post(rollback_version))
        .route_layer(axum::middleware::from_fn_with_state(
            state.auth_service,
            auth_middleware,
        ));

    public_routes.merge(protected_routes)
}
