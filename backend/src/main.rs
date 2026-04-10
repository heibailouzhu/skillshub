use axum::{routing::get, Router};
use dotenv::dotenv;
use std::net::SocketAddr;

mod config;
mod error;
mod handlers;
mod middleware;
mod models;
mod openapi;
mod routes;
mod services;

use middleware::logging_middleware;
use openapi::openapi_json;
use routes::skill_routes;
use routes::{auth_routes, registry_routes};
use services::auth::AuthService;
use services::database;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv().ok();

    // 初始化 tracing（结构化日志）
    tracing_subscriber::fmt()
        .with_env_filter(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "skillshub=debug,tower_http=debug,axum=debug".into()),
        )
        .with_target(false)
        .with_thread_ids(true)
        .with_file(true)
        .with_line_number(true)
        .pretty()
        .init();

    // 加载配置
    let config = config::Config::from_env();
    tracing::info!("Configuration loaded");

    // 创建数据库连接池
    let pool = database::create_pool(&config.database_url).await?;

    // 运行数据库迁移
    database::run_migrations(&pool).await?;

    // 创建认证服务
    let auth_service = AuthService::new(config.jwt_secret.clone(), 24);

    // 创建 Redis 缓存服务（如果 Redis 不可用，继续运行但不启用缓存）
    let cache_service = match services::cache::CacheService::new(&config.redis_url).await {
        Ok(service) => service,
        Err(e) => {
            tracing::warn!(
                "Failed to initialize cache service: {}. Cache will be disabled.",
                e
            );
            // 返回一个禁用的缓存服务
            services::cache::CacheService::disabled()
        }
    };

    // 创建应用状态
    let app_state = AppState {
        pool,
        auth_service,
        cache_service,
    };

    // 创建 API 路由（带 State）
    let api_routes = Router::new()
        .route("/health", get(handlers::health_check))
        .route("/api/docs/openapi.json", get(openapi_json))
        .nest("/api/auth", auth_routes())
        .nest("/api/registry", registry_routes())
        .nest("/api/skills", skill_routes(app_state.clone()))
        .layer(axum::middleware::from_fn(logging_middleware));

    // 创建主应用路由
    let app = Router::new()
        .nest("", api_routes)
        .with_state(app_state.clone());

    let server_address = config.server_address;
    let addr: SocketAddr = server_address
        .parse()
        .expect("SERVER_ADDRESS must be a valid socket address");

    tracing::info!("Server starting on {}", addr);

    let listener = tokio::net::TcpListener::bind(addr)
        .await
        .expect("Failed to bind TCP listener");

    axum::serve(listener, app).await?;

    Ok(())
}

/// 应用状态
#[derive(Clone)]
pub struct AppState {
    pub pool: database::DbPool,
    pub auth_service: AuthService,
    pub cache_service: services::cache::CacheService,
}
