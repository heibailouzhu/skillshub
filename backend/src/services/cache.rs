/// Redis 缓存服务
use anyhow::Result;
use deadpool_redis::{Config, Runtime};
use redis::AsyncCommands;
use serde::{de::DeserializeOwned, Serialize};
use std::time::Duration;

/// Redis 连接池类型
pub type CachePool = deadpool_redis::Pool;

/// 缓存服务
#[derive(Clone)]
pub struct CacheService {
    pool: Option<CachePool>,
}

impl CacheService {
    /// 创建新的缓存服务
    pub async fn new(redis_url: &str) -> Result<Self> {
        let cfg = Config::from_url(redis_url);
        match cfg.create_pool(Some(Runtime::Tokio1)) {
            Ok(pool) => {
                // 测试连接
                match pool.get().await {
                    Ok(mut conn) => {
                        let _: String = redis::cmd("PING").query_async(&mut *conn).await?;
                        tracing::info!("Redis cache connected");
                        Ok(Self { pool: Some(pool) })
                    }
                    Err(e) => {
                        tracing::warn!("Failed to connect to Redis: {}. Cache will be disabled.", e);
                        Ok(Self { pool: None })
                    }
                }
            }
            Err(e) => {
                tracing::warn!("Failed to create Redis pool: {}. Cache will be disabled.", e);
                Ok(Self { pool: None })
            }
        }
    }

    /// 创建禁用的缓存服务（Redis 不可用时使用）
    pub fn disabled() -> Self {
        Self { pool: None }
    }

    /// 获取缓存
    pub async fn get<T: DeserializeOwned>(&self, key: &str) -> Result<Option<T>> {
        let Some(pool) = &self.pool else {
            return Ok(None);
        };

        let mut conn = pool.get().await?;
        let value: Option<String> = conn.get(key).await?;

        match value {
            Some(json_str) => {
                let data: T = serde_json::from_str(&json_str)?;
                Ok(Some(data))
            }
            None => Ok(None),
        }
    }

    /// 设置缓存
    pub async fn set<T: Serialize>(
        &self,
        key: &str,
        value: &T,
        ttl: Option<Duration>,
    ) -> Result<()> {
        let Some(pool) = &self.pool else {
            return Ok(());
        };

        let mut conn = pool.get().await?;
        let json_str = serde_json::to_string(value)?;

        match ttl {
            Some(duration) => {
                let ttl_secs: u64 = duration.as_secs();
                conn.set_ex::<_, _, ()>(key, json_str, ttl_secs).await?;
            }
            None => {
                conn.set::<_, _, ()>(key, json_str).await?;
            }
        }

        Ok(())
    }

    /// 删除缓存
    pub async fn delete(&self, key: &str) -> Result<()> {
        let Some(pool) = &self.pool else {
            return Ok(());
        };

        let mut conn = pool.get().await?;
        conn.del::<_, ()>(key).await?;
        Ok(())
    }

    /// 删除匹配模式的缓存
    pub async fn delete_pattern(&self, pattern: &str) -> Result<u64> {
        let Some(pool) = &self.pool else {
            return Ok(0);
        };

        let mut conn = pool.get().await?;
        let keys: Vec<String> = redis::cmd("KEYS")
            .arg(pattern)
            .query_async(&mut *conn)
            .await?;

        if keys.is_empty() {
            return Ok(0);
        }

        let mut pipe = redis::pipe();
        for key in &keys {
            pipe.del(key);
        }
        let results: Vec<u64> = pipe.query_async(&mut *conn).await?;

        Ok(results.iter().sum())
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_cache_service_new() {
        // 测试需要 Redis 实例，这里只测试结构编译
        // 实际测试在集成测试中进行
    }
}
