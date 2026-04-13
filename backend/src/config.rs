use serde::Deserialize;

#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    pub database_url: String,
    pub jwt_secret: String,
    pub server_address: String,
    pub redis_url: String,
    pub admin_username: Option<String>,
    pub admin_email: Option<String>,
    pub admin_password: Option<String>,
}

impl Config {
    pub fn from_env() -> Self {
        Self {
            database_url: std::env::var("DATABASE_URL").expect("DATABASE_URL is required"),
            jwt_secret: std::env::var("JWT_SECRET").expect("JWT_SECRET is required"),
            server_address: std::env::var("SERVER_ADDRESS")
                .unwrap_or_else(|_| "0.0.0.0:8080".to_string()),
            redis_url: std::env::var("REDIS_URL")
                .unwrap_or_else(|_| "redis://localhost:6379".to_string()),
            admin_username: std::env::var("ADMIN_USERNAME").ok(),
            admin_email: std::env::var("ADMIN_EMAIL").ok(),
            admin_password: std::env::var("ADMIN_PASSWORD").ok(),
        }
    }
}
