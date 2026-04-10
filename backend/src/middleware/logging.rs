use axum::{extract::Request, middleware::Next, response::Response};
use std::time::Instant;
use uuid::Uuid;

/// 日志中间件
///
/// 记录每个请求的详细信息：
/// - 请求 ID
/// - 方法
/// - 路径
/// - 状态码
/// - 处理时间
pub async fn logging_middleware(req: Request, next: Next) -> Response {
    let start = Instant::now();
    let method = req.method().clone();
    let uri = req.uri().clone();

    // 生成请求 ID
    let request_id = Uuid::new_v4().to_string();

    // 将请求 ID 注入到请求扩展中
    let mut req = req;
    req.extensions_mut().insert(request_id.clone());

    tracing::info!(
        request_id = %request_id,
        method = %method,
        uri = %uri,
        "Incoming request"
    );

    let response = next.run(req).await;

    let duration = start.elapsed();
    let status = response.status();

    tracing::info!(
        request_id = %request_id,
        method = %method,
        uri = %uri,
        status = %status.as_u16(),
        duration_ms = duration.as_millis(),
        "Request completed"
    );

    // 如果请求失败（状态码 >= 500），记录错误级别日志
    if status.is_server_error() {
        tracing::error!(
            request_id = %request_id,
            method = %method,
            uri = %uri,
            status = %status.as_u16(),
            duration_ms = duration.as_millis(),
            "Server error"
        );
    }

    response
}
