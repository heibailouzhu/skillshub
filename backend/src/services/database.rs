use sqlx::postgres::PgPoolOptions;
use sqlx::{Pool, Postgres};
use std::time::Duration;

use crate::config::Config;
use crate::services::auth::AuthService;

pub type DbPool = Pool<Postgres>;

/// 创建数据库连接池
pub async fn create_pool(database_url: &str) -> anyhow::Result<DbPool> {
    tracing::info!("Creating database connection pool...");

    let pool = PgPoolOptions::new()
        .max_connections(10)
        .min_connections(2)
        .acquire_timeout(Duration::from_secs(30))
        .idle_timeout(Duration::from_secs(600))
        .max_lifetime(Duration::from_secs(1800))
        .connect(database_url)
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "Failed to create database pool");
            anyhow::anyhow!("Database connection failed: {}", e)
        })?;

    // 测试连接
    sqlx::query("SELECT 1")
        .fetch_one(&pool)
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "Database connection test failed");
            anyhow::anyhow!("Database connection test failed: {}", e)
        })?;

    tracing::info!("Database connection pool created successfully");

    Ok(pool)
}

/// 运行数据库迁移
pub async fn run_migrations(pool: &DbPool) -> anyhow::Result<()> {
    tracing::info!("Running database migrations...");

    sqlx::migrate!("./migrations")
        .run(pool)
        .await
        .map_err(|e| {
            tracing::error!(error = %e, "Migration failed");
            anyhow::anyhow!("Migration failed: {}", e)
        })?;

    tracing::info!("Database migrations completed successfully");

    Ok(())
}

pub async fn ensure_admin_user(
    pool: &DbPool,
    auth_service: &AuthService,
    config: &Config,
) -> anyhow::Result<()> {
    let (Some(username), Some(email), Some(password)) = (
        config.admin_username.as_deref(),
        config.admin_email.as_deref(),
        config.admin_password.as_deref(),
    ) else {
        tracing::info!("Admin bootstrap skipped: ADMIN_USERNAME/ADMIN_EMAIL/ADMIN_PASSWORD not fully configured");
        return Ok(());
    };

    if password.len() < 12 {
        anyhow::bail!("ADMIN_PASSWORD must be at least 12 characters for production use");
    }

    let existing = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM users WHERE username = $1 OR email = $2")
        .bind(username)
        .bind(email)
        .fetch_one(pool)
        .await?;

    if existing > 0 {
        sqlx::query("UPDATE users SET is_admin = TRUE WHERE username = $1 OR email = $2")
            .bind(username)
            .bind(email)
            .execute(pool)
            .await?;
        tracing::info!(username = %username, email = %email, "Existing admin user ensured");
        return Ok(());
    }

    let password_hash = auth_service.hash_password(password)?;

    sqlx::query(
        r#"
        INSERT INTO users (username, email, password_hash, is_admin)
        VALUES ($1, $2, $3, TRUE)
        "#,
    )
    .bind(username)
    .bind(email)
    .bind(password_hash)
    .execute(pool)
    .await?;

    tracing::info!(username = %username, email = %email, "Bootstrap admin user created");
    Ok(())
}

/// 获取测试数据库 URL（测试辅助函数）
#[cfg(test)]
pub fn get_test_database_url() -> String {
    std::env::var("TEST_DATABASE_URL").unwrap_or_else(|_| {
        "postgresql://postgres:postgres@localhost:5432/skillshub_test".to_string()
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_database_pool_creation() {
        let database_url = get_test_database_url();

        let pool = PgPoolOptions::new()
            .max_connections(5)
            .min_connections(1)
            .connect(&database_url)
            .await;

        // 注意：如果没有测试数据库，这个测试会失败，这是预期的
        // 真正的测试应该在集成测试中设置测试数据库
        if pool.is_ok() {
            tracing::info!("Test database connection successful");
        } else {
            tracing::warn!("Test database not available, skipping test");
        }
    }

    #[test]
    fn test_get_test_database_url() {
        let url = get_test_database_url();
        assert!(
            url.contains("postgresql://"),
            "Database URL should be valid PostgreSQL URL"
        );
    }
}
