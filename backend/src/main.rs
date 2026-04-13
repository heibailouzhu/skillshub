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

use handlers::favorites::list_favorites;
use middleware::logging_middleware;
use openapi::openapi_json;
use routes::skill_routes;
use routes::{admin_routes, auth_routes, registry_routes};
use services::auth::AuthService;
use services::database;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenv().ok();

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

    let config = config::Config::from_env();
    tracing::info!("Configuration loaded");

    let pool = database::create_pool(&config.database_url).await?;
    database::run_migrations(&pool).await?;

    let auth_service = AuthService::new(config.jwt_secret.clone(), 24);
    database::ensure_admin_user(&pool, &auth_service, &config).await?;

    let cache_service = match services::cache::CacheService::new(&config.redis_url).await {
        Ok(service) => service,
        Err(e) => {
            tracing::warn!(
                "Failed to initialize cache service: {}. Cache will be disabled.",
                e
            );
            services::cache::CacheService::disabled()
        }
    };

    let app_state = AppState {
        pool,
        auth_service,
        cache_service,
    };

    let api_routes = Router::new()
        .route("/health", get(handlers::health_check))
        .route("/api/docs/openapi.json", get(openapi_json))
        .nest("/api/auth", auth_routes())
        .nest("/api/admin", admin_routes(app_state.clone()))
        .route(
            "/api/favorites",
            get(list_favorites).route_layer(axum::middleware::from_fn_with_state(
                app_state.auth_service.clone(),
                middleware::auth_middleware,
            )),
        )
        .nest("/api/registry", registry_routes())
        .nest("/api/skills", skill_routes(app_state.clone()))
        .layer(axum::middleware::from_fn(logging_middleware));

    let app = Router::new().nest("", api_routes).with_state(app_state.clone());

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

#[derive(Clone)]
pub struct AppState {
    pub pool: database::DbPool,
    pub auth_service: AuthService,
    pub cache_service: services::cache::CacheService,
}
