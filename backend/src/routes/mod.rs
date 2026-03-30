use axum::{
    routing::{get, post, put, delete},
    Router,
};
use crate::AppState;

use crate::handlers::{login, register};
use crate::handlers::skills::{
    list_skills, get_skill, create_skill, update_skill, delete_skill,
    get_popular_categories, get_popular_tags, search_suggestions
};
use crate::handlers::comments::{
    list_comments, create_comment, update_comment, delete_comment,
};
use crate::handlers::favorites::{list_favorites, add_favorite, remove_favorite};
use crate::handlers::versions::{create_version, get_version, rollback_version};
use crate::middleware::auth_middleware;

/// 认证路由
pub fn auth_routes() -> Router<AppState> {
    Router::new()
        .route("/register", post(register))
        .route("/login", post(login))
}

/// 公开技能路由（不需要认证）
pub fn skill_public_routes() -> Router<AppState> {
    Router::new()
        .route("/", get(list_skills))
        .route("/:id", get(get_skill))
        .route("/categories/popular", get(get_popular_categories))
        .route("/tags/popular", get(get_popular_tags))
        .route("/search/suggestions", get(search_suggestions))
}

/// 受保护技能路由（需要认证）
pub fn skill_protected_routes(state: AppState) -> Router<AppState> {
    Router::new()
        .route("/", post(create_skill))
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
    Router::new()
        // 公开路由（获取评论列表）
        .route("/:skill_id/comments", get(list_comments))
        // 受保护路由（需要认证）
        .route("/:skill_id/comments", post(create_comment))
        .route("/comments/:comment_id", put(update_comment))
        .route("/comments/:comment_id", delete(delete_comment))
        // 为受保护路由应用认证中间件
        .route_layer(axum::middleware::from_fn_with_state(
            state.auth_service,
            auth_middleware,
        ))
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
    let public_routes = Router::<AppState>::new()
        .route("/:id/ratings", get(crate::handlers::ratings::get_skill_rating_stats));

    // 受保护路由（需要认证）
    let protected_routes = Router::<AppState>::new()
        .route("/ratings", get(crate::handlers::ratings::get_user_ratings))
        .route("/:id/rating", post(crate::handlers::ratings::create_rating))
        .route("/ratings/:id", put(crate::handlers::ratings::update_rating))
        .route("/ratings/:id", delete(crate::handlers::ratings::delete_rating))
        .route_layer(axum::middleware::from_fn_with_state(
            state.auth_service.clone(),
            auth_middleware,
        ));

    public_routes.merge(protected_routes)
}

/// 版本路由
pub fn version_routes(state: AppState) -> Router<AppState> {
    // 公开路由（不需要认证）
    let public_routes = Router::<AppState>::new()
        .route("/:id/versions/:version", get(get_version));

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
