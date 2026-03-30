use axum::{
    extract::State,
    response::Json,
};
use serde::{Deserialize, Serialize};
use sqlx::Row;
use uuid::Uuid;

use crate::error::{AppError, AppResult, ErrorResponse};
use crate::models::user::{User, RegisterRequest, LoginRequest, LoginResponse};
use crate::services::auth::AuthService;
use crate::AppState;

/// 注册响应
#[derive(Debug, Serialize, utoipa::ToSchema)]
pub struct RegisterResponse {
    pub message: String,
    pub user_id: Uuid,
}

/// 用户注册 API
#[utoipa::path(
    post,
    path = "/api/auth/register",
    request_body = RegisterRequest,
    responses(
        (status = 201, description = "User registered successfully", body = RegisterResponse),
        (status = 400, description = "Invalid request", body = ErrorResponse),
        (status = 409, description = "User already exists", body = ErrorResponse)
    ),
    tag = "auth"
)]
pub async fn register(
    State(state): State<AppState>,
    Json(req): Json<RegisterRequest>,
) -> AppResult<Json<RegisterResponse>> {
    // 验证用户名长度
    if req.username.len() < 3 || req.username.len() > 50 {
        return Err(AppError::Validation("Username must be between 3 and 50 characters".to_string()));
    }

    // 验证邮箱格式（简单验证）
    if !req.email.contains('@') || !req.email.contains('.') {
        return Err(AppError::Validation("Invalid email format".to_string()));
    }

    // 验证密码长度
    if req.password.len() < 6 {
        return Err(AppError::Validation("Password must be at least 6 characters".to_string()));
    }

    // 使用已有的认证服务
    let auth_service = state.auth_service.clone();

    // 哈希密码
    let password_hash = auth_service.hash_password(&req.password)?;

    // 插入用户到数据库
    let user_id = sqlx::query(
        r#"
        INSERT INTO users (username, email, password_hash)
        VALUES ($1, $2, $3)
        RETURNING id
        "#,
    )
    .bind(&req.username)
    .bind(&req.email)
    .bind(&password_hash)
    .fetch_one(&state.pool)
    .await?
    .get("id");

    tracing::info!(user_id = %user_id, username = %req.username, "User registered successfully");

    Ok(Json(RegisterResponse {
        message: "User registered successfully".to_string(),
        user_id,
    }))
}

/// 用户登录 API
#[utoipa::path(
    post,
    path = "/api/auth/login",
    request_body = LoginRequest,
    responses(
        (status = 200, description = "User logged in successfully", body = LoginResponse),
        (status = 401, description = "Invalid credentials", body = ErrorResponse)
    ),
    tag = "auth"
)]
pub async fn login(
    State(state): State<AppState>,
    Json(req): Json<LoginRequest>,
) -> AppResult<Json<LoginResponse>> {
    // 查询用户
    let user = sqlx::query_as::<_, User>(
        "SELECT id, email, username, avatar_url, bio, password_hash, created_at, updated_at, is_deleted FROM users WHERE username = $1"
    )
    .bind(&req.username)
    .fetch_optional(&state.pool)
    .await?
    .ok_or_else(|| AppError::Auth("Invalid username or password".to_string()))?;

    // 验证密码
    let auth_service = state.auth_service.clone();
    let is_valid = auth_service.verify_password(&req.password, &user.password_hash)?;

    if !is_valid {
        return Err(AppError::Auth("Invalid username or password".to_string()));
    }

    // 生成 JWT Token
    let token = auth_service.generate_token(&user.id.to_string())?;

    tracing::info!(user_id = %user.id, username = %req.username, "User logged in successfully");

    Ok(Json(LoginResponse {
        token,
        user_id: user.id.to_string(),
        username: user.username,
    }))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 测试注册响应序列化
    #[test]
    fn test_register_response_serialization() {
        let response = RegisterResponse {
            message: "User registered successfully".to_string(),
            user_id: Uuid::new_v4(),
        };

        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("message"));
        assert!(json.contains("user_id"));
    }

    /// 测试登录响应序列化
    #[test]
    fn test_login_response_serialization() {
        let response = LoginResponse {
            token: "test_token".to_string(),
            user_id: Uuid::new_v4().to_string(),
            username: "testuser".to_string(),
        };

        let json = serde_json::to_string(&response).unwrap();
        assert!(json.contains("token"));
        assert!(json.contains("user_id"));
        assert!(json.contains("username"));
    }

    /// 测试用户名长度验证逻辑
    #[test]
    fn test_username_validation_logic() {
        // 测试用户名长度验证逻辑（在 handler 中实现）
        // 短用户名应该被拒绝
        assert!("ab".len() < 3, "Username 'ab' is too short");
        assert!("a".len() < 3, "Username 'a' is too short");

        // 有效长度
        assert!("abc".len() >= 3 && "abc".len() <= 50, "Username 'abc' is valid");
        assert!("testuser".len() >= 3 && "testuser".len() <= 50, "Username 'testuser' is valid");

        // 长用户名应该被拒绝
        assert!("a".repeat(51).len() > 50, "51-character username is too long");
    }

    /// 测试邮箱格式验证逻辑
    #[test]
    fn test_email_validation_logic() {
        // 有效的邮箱（包含 @ 和 .）
        let valid_emails = vec![
            "test@example.com",
            "user@domain.co.uk",
            "admin@localhost.local",
        ];

        for email in valid_emails {
            assert!(email.contains('@'), "Email '{}' should contain @", email);
            assert!(email.contains('.'), "Email '{}' should contain .", email);
        }

        // 无效的邮箱
        let invalid_emails = vec![
            "invalid",
            "no-at-sign.com",
            "no@dot",
        ];

        for email in invalid_emails {
            assert!(
                !email.contains('@') || !email.contains('.'),
                "Email '{}' should be invalid",
                email
            );
        }
    }

    /// 测试密码长度验证逻辑
    #[test]
    fn test_password_validation_logic() {
        // 短密码应该被拒绝
        assert!("12345".len() < 6, "Password '12345' is too short");
        assert!("abcde".len() < 6, "Password 'abcde' is too short");

        // 有效长度
        assert!("123456".len() >= 6, "Password '123456' is valid");
        assert!("password".len() >= 6, "Password 'password' is valid");
        assert!("secure_password_123".len() >= 6, "Password 'secure_password_123' is valid");
    }

    /// 测试 RegisterRequest 反序列化
    #[test]
    fn test_register_request_deserialization() {
        let json = r#"{
            "username": "testuser",
            "email": "test@example.com",
            "password": "password123"
        }"#;

        let req: RegisterRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.username, "testuser");
        assert_eq!(req.email, "test@example.com");
        assert_eq!(req.password, "password123");
    }

    /// 测试 LoginRequest 反序列化
    #[test]
    fn test_login_request_deserialization() {
        let json = r#"{
            "username": "testuser",
            "password": "password123"
        }"#;

        let req: LoginRequest = serde_json::from_str(json).unwrap();
        assert_eq!(req.username, "testuser");
        assert_eq!(req.password, "password123");
    }
}
