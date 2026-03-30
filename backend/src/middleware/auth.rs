use axum::{
    extract::{Request, State},
    http::{header::AUTHORIZATION, StatusCode},
    middleware::Next,
    response::Response,
};
use serde::{Deserialize, Serialize};

use crate::services::auth::AuthService;

/// 用户信息结构体（从 Token 中提取）
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuthUser {
    pub user_id: String,
}

/// 认证中间件
///
/// 验证 JWT Token 并将用户信息注入到请求扩展中
pub async fn auth_middleware(
    State(auth_service): State<AuthService>,
    mut request: Request,
    next: Next,
) -> Result<Response, StatusCode> {
    // 从请求头中提取 Authorization
    let headers = request.headers();
    let auth_header = headers
        .get(AUTHORIZATION)
        .and_then(|h| h.to_str().ok());

    // 验证 Token
    let user_id = match auth_header {
        Some(header) => {
            // 检查是否为 Bearer Token
            if !header.starts_with("Bearer ") {
                return Err(StatusCode::UNAUTHORIZED);
            }

            let token = &header[7..]; // 去掉 "Bearer " 前缀

            // 验证 Token
            match auth_service.verify_token(token) {
                Ok(claims) => claims.sub,
                Err(_) => return Err(StatusCode::UNAUTHORIZED),
            }
        }
        None => return Err(StatusCode::UNAUTHORIZED),
    };

    // 将用户信息注入到请求扩展中
    request.extensions_mut().insert(AuthUser { user_id });

    // 继续处理请求
    Ok(next.run(request).await)
}

/// 可选的认证中间件
///
/// 如果提供了 Token 则验证，否则允许匿名访问
#[allow(dead_code)]
pub async fn optional_auth_middleware(
    State(auth_service): State<AuthService>,
    mut request: Request,
    next: Next,
) -> Response {
    // 从请求头中提取 Authorization
    let headers = request.headers();
    let auth_header = headers
        .get(AUTHORIZATION)
        .and_then(|h| h.to_str().ok());

    // 尝试验证 Token
    if let Some(header) = auth_header {
        if header.starts_with("Bearer ") {
            let token = &header[7..];

            if let Ok(claims) = auth_service.verify_token(token) {
                // Token 有效，注入用户信息
                request.extensions_mut().insert(AuthUser {
                    user_id: claims.sub,
                });
            }
        }
    }

    // 继续处理请求
    next.run(request).await
}
