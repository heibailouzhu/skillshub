use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;
use std::fmt;
use utoipa::ToSchema;

/// 错误响应结构
#[derive(Debug, Serialize, ToSchema)]
pub struct ErrorResponse {
    pub error: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<String>,
}

/// 应用错误类型
#[derive(Debug)]
pub enum AppError {
    /// 数据库错误
    Database(String),
    /// 认证错误
    Auth(String),
    /// 验证错误
    Validation(String),
    /// 未找到资源
    NotFound(String),
    /// 权限错误
    Forbidden(String),
    /// 冲突错误（如重复创建）
    Conflict(String),
    /// 内部服务器错误
    Internal(String),
    /// 任何其他错误
    Anyhow(anyhow::Error),
}

impl AppError {
    /// 获取错误码
    pub fn error_code(&self) -> &'static str {
        match self {
            AppError::Database(_) => "DATABASE_ERROR",
            AppError::Auth(_) => "AUTH_ERROR",
            AppError::Validation(_) => "VALIDATION_ERROR",
            AppError::NotFound(_) => "NOT_FOUND",
            AppError::Forbidden(_) => "FORBIDDEN",
            AppError::Conflict(_) => "CONFLICT",
            AppError::Internal(_) => "INTERNAL_ERROR",
            AppError::Anyhow(_) => "INTERNAL_ERROR",
        }
    }

    /// 获取HTTP状态码
    pub fn status_code(&self) -> StatusCode {
        match self {
            AppError::Database(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::Auth(_) => StatusCode::UNAUTHORIZED,
            AppError::Validation(_) => StatusCode::BAD_REQUEST,
            AppError::NotFound(_) => StatusCode::NOT_FOUND,
            AppError::Forbidden(_) => StatusCode::FORBIDDEN,
            AppError::Conflict(_) => StatusCode::CONFLICT,
            AppError::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::Anyhow(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AppError::Database(msg) => write!(f, "Database error: {}", msg),
            AppError::Auth(msg) => write!(f, "Authentication error: {}", msg),
            AppError::Validation(msg) => write!(f, "Validation error: {}", msg),
            AppError::NotFound(msg) => write!(f, "Not found: {}", msg),
            AppError::Forbidden(msg) => write!(f, "Forbidden: {}", msg),
            AppError::Conflict(msg) => write!(f, "Conflict: {}", msg),
            AppError::Internal(msg) => write!(f, "Internal error: {}", msg),
            AppError::Anyhow(e) => write!(f, "{}", e),
        }
    }
}

impl std::error::Error for AppError {}

/// 将 AppError 转换为 HTTP 响应
impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = self.status_code();
        let error_message = self.to_string();
        let error_code = self.error_code();

        // 记录错误日志
        match &self {
            AppError::Database(msg) => {
                tracing::error!(error = %msg, error_code, "Database error");
            }
            AppError::Auth(msg) => {
                tracing::warn!(error = %msg, error_code, "Authentication error");
            }
            AppError::Validation(msg) => {
                tracing::warn!(error = %msg, error_code, "Validation error");
            }
            AppError::NotFound(msg) => {
                tracing::info!(error = %msg, error_code, "Resource not found");
            }
            AppError::Forbidden(msg) => {
                tracing::warn!(error = %msg, error_code, "Forbidden");
            }
            AppError::Conflict(msg) => {
                tracing::warn!(error = %msg, error_code, "Conflict");
            }
            AppError::Internal(msg) => {
                tracing::error!(error = %msg, error_code, "Internal server error");
            }
            AppError::Anyhow(e) => {
                tracing::error!(error = %e, error_code, "Unexpected error");
            }
        }

        let body = ErrorResponse {
            error: error_message.clone(),
            error_code: Some(error_code.to_string()),
            // 在生产环境中，不应该返回详细的内部错误信息
            details: if matches!(self, AppError::Internal(_) | AppError::Database(_) | AppError::Anyhow(_)) {
                None
            } else {
                None
            },
        };

        let body_json = Json(body);
        (status, body_json).into_response()
    }
}

/// 从 sqlx::Error 转换
impl From<sqlx::Error> for AppError {
    fn from(err: sqlx::Error) -> Self {
        let err_msg = err.to_string();

        // 检查是否是唯一性约束冲突
        if err_msg.contains("duplicate key") || err_msg.contains("unique constraint") {
            return AppError::Conflict("Resource already exists".to_string());
        }

        // 检查是否是外键约束错误
        if err_msg.contains("foreign key") {
            return AppError::Validation("Referenced resource does not exist".to_string());
        }

        // 检查是否是未找到错误
        if err_msg.contains("no rows returned") {
            return AppError::NotFound("Resource not found".to_string());
        }

        AppError::Database(err_msg)
    }
}

/// 从 anyhow::Error 转换
impl From<anyhow::Error> for AppError {
    fn from(err: anyhow::Error) -> Self {
        AppError::Anyhow(err)
    }
}

/// Result 类型别名
pub type AppResult<T> = Result<T, AppError>;
