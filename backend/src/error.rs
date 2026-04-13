use axum::{
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::Serialize;
use std::fmt;
use utoipa::ToSchema;

#[derive(Debug, Serialize, ToSchema)]
pub struct ErrorResponse {
    pub error: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error_code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub details: Option<String>,
}

#[derive(Debug)]
pub enum AppError {
    Database { message: String, code: &'static str },
    Auth { message: String, code: &'static str },
    Validation { message: String, code: &'static str },
    NotFound { message: String, code: &'static str },
    Forbidden { message: String, code: &'static str },
    Conflict { message: String, code: &'static str },
    Internal { message: String, code: &'static str },
    Anyhow(anyhow::Error),
}

impl AppError {
    pub fn auth(message: impl Into<String>, code: &'static str) -> Self {
        Self::Auth { message: message.into(), code }
    }
    pub fn validation(message: impl Into<String>, code: &'static str) -> Self {
        Self::Validation { message: message.into(), code }
    }
    pub fn not_found(message: impl Into<String>, code: &'static str) -> Self {
        Self::NotFound { message: message.into(), code }
    }
    pub fn forbidden(message: impl Into<String>, code: &'static str) -> Self {
        Self::Forbidden { message: message.into(), code }
    }
    pub fn conflict(message: impl Into<String>, code: &'static str) -> Self {
        Self::Conflict { message: message.into(), code }
    }
    pub fn internal(message: impl Into<String>, code: &'static str) -> Self {
        Self::Internal { message: message.into(), code }
    }

    pub fn error_code(&self) -> &'static str {
        match self {
            AppError::Database { code, .. }
            | AppError::Auth { code, .. }
            | AppError::Validation { code, .. }
            | AppError::NotFound { code, .. }
            | AppError::Forbidden { code, .. }
            | AppError::Conflict { code, .. }
            | AppError::Internal { code, .. } => code,
            AppError::Anyhow(_) => "INTERNAL_ERROR",
        }
    }

    pub fn status_code(&self) -> StatusCode {
        match self {
            AppError::Database { .. } => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::Auth { .. } => StatusCode::UNAUTHORIZED,
            AppError::Validation { .. } => StatusCode::BAD_REQUEST,
            AppError::NotFound { .. } => StatusCode::NOT_FOUND,
            AppError::Forbidden { .. } => StatusCode::FORBIDDEN,
            AppError::Conflict { .. } => StatusCode::CONFLICT,
            AppError::Internal { .. } => StatusCode::INTERNAL_SERVER_ERROR,
            AppError::Anyhow(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    fn message(&self) -> String {
        match self {
            AppError::Database { message, .. }
            | AppError::Auth { message, .. }
            | AppError::Validation { message, .. }
            | AppError::NotFound { message, .. }
            | AppError::Forbidden { message, .. }
            | AppError::Conflict { message, .. }
            | AppError::Internal { message, .. } => message.clone(),
            AppError::Anyhow(err) => err.to_string(),
        }
    }
}

impl fmt::Display for AppError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.message())
    }
}

impl std::error::Error for AppError {}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        let status = self.status_code();
        let error_code = self.error_code();
        let error_message = self.message();

        match &self {
            AppError::Database { message, .. } => tracing::error!(error = %message, error_code, "Database error"),
            AppError::Auth { message, .. } => tracing::warn!(error = %message, error_code, "Authentication error"),
            AppError::Validation { message, .. } => tracing::warn!(error = %message, error_code, "Validation error"),
            AppError::NotFound { message, .. } => tracing::info!(error = %message, error_code, "Resource not found"),
            AppError::Forbidden { message, .. } => tracing::warn!(error = %message, error_code, "Forbidden"),
            AppError::Conflict { message, .. } => tracing::warn!(error = %message, error_code, "Conflict"),
            AppError::Internal { message, .. } => tracing::error!(error = %message, error_code, "Internal server error"),
            AppError::Anyhow(err) => tracing::error!(error = %err, error_code, "Unexpected error"),
        }

        let body = ErrorResponse {
            error: error_message,
            error_code: Some(error_code.to_string()),
            details: None,
        };

        (status, Json(body)).into_response()
    }
}

impl From<sqlx::Error> for AppError {
    fn from(err: sqlx::Error) -> Self {
        let err_msg = err.to_string();

        if err_msg.contains("duplicate key") || err_msg.contains("unique constraint") {
            return AppError::conflict("Resource already exists", "RESOURCE_ALREADY_EXISTS");
        }
        if err_msg.contains("foreign key") {
            return AppError::validation("Referenced resource does not exist", "REFERENCED_RESOURCE_NOT_FOUND");
        }
        if err_msg.contains("no rows returned") {
            return AppError::not_found("Resource not found", "RESOURCE_NOT_FOUND");
        }

        AppError::Database {
            message: err_msg,
            code: "DATABASE_ERROR",
        }
    }
}

impl From<anyhow::Error> for AppError {
    fn from(err: anyhow::Error) -> Self {
        AppError::Anyhow(err)
    }
}

pub type AppResult<T> = Result<T, AppError>;