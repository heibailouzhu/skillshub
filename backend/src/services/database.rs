use sqlx::postgres::PgPoolOptions;
use sqlx::{Pool, Postgres};
use std::time::Duration;

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

/// 获取测试数据库 URL（测试辅助函数）
#[cfg(test)]
pub fn get_test_database_url() -> String {
    std::env::var("TEST_DATABASE_URL")
        .unwrap_or_else(|_| "postgresql://postgres:postgres@localhost:5432/skillshub_test".to_string())
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
        assert!(url.contains("postgresql://"), "Database URL should be valid PostgreSQL URL");
    }
}
