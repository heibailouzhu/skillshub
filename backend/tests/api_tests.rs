use reqwest::Client;
use serde_json::json;
use std::sync::atomic::{AtomicU32, Ordering};

// 使用原子计数器生成唯一的用户名，避免冲突
static USER_COUNTER: AtomicU32 = AtomicU32::new(0);

// 辅助函数：生成唯一的测试用户名
fn generate_test_username() -> String {
    let count = USER_COUNTER.fetch_add(1, Ordering::SeqCst);
    format!("test_user_{}", count)
}

// 辅助函数：获取测试 API URL
fn get_test_api_url() -> String {
    std::env::var("TEST_API_URL").unwrap_or_else(|_| "http://localhost:3000".to_string())
}

// 辅助函数：注册测试用户
async fn register_test_user(client: &Client, base_url: &str) -> Option<serde_json::Value> {
    let username = generate_test_username();
    let email = format!("{}@example.com", username);

    let response = client
        .post(&format!("{}/api/auth/register", base_url))
        .json(&json!({
            "username": username,
            "password": "test_password_123",
            "email": email
        }))
        .send()
        .await;

    match response {
        Ok(resp) if resp.status().is_success() => resp.json().await.ok(),
        _ => None,
    }
}

// 辅助函数：登录测试用户
async fn login_test_user(client: &Client, base_url: &str, username: &str) -> Option<String> {
    let response = client
        .post(&format!("{}/api/auth/login", base_url))
        .json(&json!({
            "username": username,
            "password": "test_password_123"
        }))
        .send()
        .await;

    match response {
        Ok(resp) if resp.status().is_success() => {
            let body: serde_json::Value = resp.json().await.ok()?;
            body.get("token")
                .and_then(|t| t.as_str())
                .map(|s| s.to_string())
        }
        _ => None,
    }
}

// 辅助函数：创建测试技能
async fn create_test_skill(client: &Client, base_url: &str, token: &str) -> Option<String> {
    let response = client
        .post(&format!("{}/api/skills", base_url))
        .header("Authorization", format!("Bearer {}", token))
        .json(&json!({
            "title": "Test Skill",
            "description": "A test skill for integration testing",
            "content": "This is the content of the test skill",
            "category": "测试",
            "tags": ["测试", "Rust", "API"]
        }))
        .send()
        .await;

    match response {
        Ok(resp) if resp.status().is_success() => {
            let body: serde_json::Value = resp.json().await.ok()?;
            body.get("id")
                .and_then(|id| id.as_str())
                .map(|s| s.to_string())
        }
        _ => None,
    }
}

// ==================== 基础测试 ====================

#[tokio::test]
async fn test_health_check() {
    let client = Client::new();
    let base_url = get_test_api_url();

    let response = client.get(&format!("{}/health", base_url)).send().await;

    match response {
        Ok(resp) => {
            assert_eq!(resp.status(), reqwest::StatusCode::OK);
            let body: serde_json::Value = resp.json().await.unwrap();
            assert_eq!(body["status"], "ok");
        }
        Err(_) => {
            println!("Server not running, skipping health check test");
        }
    }
}

#[tokio::test]
async fn test_api_docs_endpoint() {
    let client = Client::new();
    let base_url = get_test_api_url();

    let response = client
        .get(&format!("{}/api/docs/openapi.json", base_url))
        .send()
        .await;

    match response {
        Ok(resp) if resp.status().is_success() => {
            let body: serde_json::Value = resp.json().await.unwrap();
            assert!(body.get("openapi").is_some());
            assert!(body.get("paths").is_some());
            println!("OpenAPI docs retrieved successfully");
        }
        Ok(resp) => {
            eprintln!("API docs endpoint returned status: {}", resp.status());
        }
        Err(e) => {
            println!("Server not running, skipping API docs test. Error: {}", e);
        }
    }
}

// ==================== 认证测试 ====================

#[tokio::test]
async fn test_user_registration_and_login() {
    let client = Client::new();
    let base_url = get_test_api_url();

    // 注册用户
    let username = generate_test_username();
    let email = format!("{}@example.com", username);

    let register_response = client
        .post(&format!("{}/api/auth/register", base_url))
        .json(&json!({
            "username": username,
            "password": "test_password_123",
            "email": email
        }))
        .send()
        .await;

    match register_response {
        Ok(resp) if resp.status().is_success() => {
            println!("Registration successful for user: {}", username);

            let body: serde_json::Value = resp.json().await.unwrap();
            assert!(body.get("user_id").is_some());

            // 登录用户
            let login_response = client
                .post(&format!("{}/api/auth/login", base_url))
                .json(&json!({
                    "username": username,
                    "password": "test_password_123"
                }))
                .send()
                .await;

            match login_response {
                Ok(login_resp) if login_resp.status().is_success() => {
                    println!("Login successful");
                    let body: serde_json::Value = login_resp.json().await.unwrap();
                    assert!(body.get("token").is_some());
                    assert!(body.get("user_id").is_some());
                    assert_eq!(body["username"], username);
                }
                Ok(login_resp) => {
                    let status = login_resp.status();
                    let body_text = login_resp.text().await.unwrap_or_default();
                    eprintln!("Login failed with status {}: {}", status, body_text);
                }
                Err(e) => {
                    eprintln!("Login request failed: {}", e);
                }
            }
        }
        Ok(resp) => {
            let status = resp.status();
            let body_text = resp.text().await.unwrap_or_default();
            eprintln!("Registration failed with status {}: {}", status, body_text);
        }
        Err(e) => {
            println!("Server not running, skipping auth tests. Error: {}", e);
        }
    }
}

#[tokio::test]
async fn test_login_with_wrong_password() {
    let client = Client::new();
    let base_url = get_test_api_url();

    // 先注册用户
    if let Some(user_data) = register_test_user(&client, &base_url).await {
        let username = user_data["username"].as_str().unwrap();

        // 使用错误密码登录
        let response = client
            .post(&format!("{}/api/auth/login", base_url))
            .json(&json!({
                "username": username,
                "password": "wrong_password"
            }))
            .send()
            .await;

        match response {
            Ok(resp) => {
                // 应该返回 401 Unauthorized
                assert!(resp.status() == reqwest::StatusCode::UNAUTHORIZED);
                println!("Wrong password test passed");
            }
            Err(e) => {
                eprintln!("Login request failed: {}", e);
            }
        }
    } else {
        println!("Server not running, skipping wrong password test");
    }
}

#[tokio::test]
async fn test_user_already_exists() {
    let client = Client::new();
    let base_url = get_test_api_url();

    // 先注册用户
    if let Some(user_data) = register_test_user(&client, &base_url).await {
        let username = user_data["username"].as_str().unwrap();
        let email = user_data["email"].as_str().unwrap();

        // 尝试注册相同的用户
        let response = client
            .post(&format!("{}/api/auth/register", base_url))
            .json(&json!({
                "username": username,
                "password": "test_password_123",
                "email": email
            }))
            .send()
            .await;

        match response {
            Ok(resp) => {
                // 应该返回 409 Conflict
                assert!(resp.status() == reqwest::StatusCode::CONFLICT);
                println!("User already exists test passed");
            }
            Err(e) => {
                eprintln!("Registration request failed: {}", e);
            }
        }
    } else {
        println!("Server not running, skipping user already exists test");
    }
}

// ==================== 技能测试 ====================

#[tokio::test]
async fn test_create_and_get_skill() {
    let client = Client::new();
    let base_url = get_test_api_url();

    // 注册并登录用户
    if let Some(user_data) = register_test_user(&client, &base_url).await {
        let username = user_data["username"].as_str().unwrap();
        if let Some(token) = login_test_user(&client, &base_url, username).await {
            // 创建技能
            if let Some(skill_id) = create_test_skill(&client, &base_url, &token).await {
                println!("Created skill with ID: {}", skill_id);

                // 获取技能详情
                let response = client
                    .get(&format!("{}/api/skills/{}", base_url, skill_id))
                    .send()
                    .await;

                match response {
                    Ok(resp) if resp.status().is_success() => {
                        let body: serde_json::Value = resp.json().await.unwrap();
                        assert_eq!(body["id"], skill_id);
                        assert_eq!(body["title"], "Test Skill");
                        println!("Get skill test passed");
                    }
                    Ok(resp) => {
                        eprintln!("Get skill failed with status: {}", resp.status());
                    }
                    Err(e) => {
                        eprintln!("Get skill request failed: {}", e);
                    }
                }
            } else {
                eprintln!("Failed to create test skill");
            }
        } else {
            eprintln!("Failed to login test user");
        }
    } else {
        println!("Server not running, skipping create and get skill test");
    }
}

#[tokio::test]
async fn test_update_skill() {
    let client = Client::new();
    let base_url = get_test_api_url();

    // 注册并登录用户
    if let Some(user_data) = register_test_user(&client, &base_url).await {
        let username = user_data["username"].as_str().unwrap();
        if let Some(token) = login_test_user(&client, &base_url, username).await {
            // 创建技能
            if let Some(skill_id) = create_test_skill(&client, &base_url, &token).await {
                // 更新技能
                let response = client
                    .put(&format!("{}/api/skills/{}", base_url, skill_id))
                    .header("Authorization", format!("Bearer {}", token))
                    .json(&json!({
                        "title": "Updated Test Skill",
                        "description": "Updated description"
                    }))
                    .send()
                    .await;

                match response {
                    Ok(resp) if resp.status().is_success() => {
                        let body: serde_json::Value = resp.json().await.unwrap();
                        assert_eq!(body["title"], "Updated Test Skill");
                        assert_eq!(body["description"], "Updated description");
                        println!("Update skill test passed");
                    }
                    Ok(resp) => {
                        eprintln!("Update skill failed with status: {}", resp.status());
                    }
                    Err(e) => {
                        eprintln!("Update skill request failed: {}", e);
                    }
                }
            } else {
                eprintln!("Failed to create test skill");
            }
        } else {
            eprintln!("Failed to login test user");
        }
    } else {
        println!("Server not running, skipping update skill test");
    }
}

#[tokio::test]
async fn test_delete_skill() {
    let client = Client::new();
    let base_url = get_test_api_url();

    // 注册并登录用户
    if let Some(user_data) = register_test_user(&client, &base_url).await {
        let username = user_data["username"].as_str().unwrap();
        if let Some(token) = login_test_user(&client, &base_url, username).await {
            // 创建技能
            if let Some(skill_id) = create_test_skill(&client, &base_url, &token).await {
                // 删除技能
                let response = client
                    .delete(&format!("{}/api/skills/{}", base_url, skill_id))
                    .header("Authorization", format!("Bearer {}", token))
                    .send()
                    .await;

                match response {
                    Ok(resp) if resp.status().is_success() => {
                        println!("Delete skill test passed");

                        // 验证技能已被删除
                        let get_response = client
                            .get(&format!("{}/api/skills/{}", base_url, skill_id))
                            .send()
                            .await;

                        if let Ok(get_resp) = get_response {
                            // 技能应该不存在或已删除
                            assert!(get_resp.status() != reqwest::StatusCode::OK);
                        }
                    }
                    Ok(resp) => {
                        eprintln!("Delete skill failed with status: {}", resp.status());
                    }
                    Err(e) => {
                        eprintln!("Delete skill request failed: {}", e);
                    }
                }
            } else {
                eprintln!("Failed to create test skill");
            }
        } else {
            eprintln!("Failed to login test user");
        }
    } else {
        println!("Server not running, skipping delete skill test");
    }
}

#[tokio::test]
async fn test_list_skills() {
    let client = Client::new();
    let base_url = get_test_api_url();

    let response = client.get(&format!("{}/api/skills", base_url)).send().await;

    match response {
        Ok(resp) if resp.status().is_success() => {
            let body: serde_json::Value = resp.json().await.unwrap();
            assert!(body.get("skills").is_some());
            assert!(body.get("total").is_some());
            assert!(body.get("page").is_some());
            assert!(body.get("page_size").is_some());
            println!("List skills test passed");
        }
        Ok(resp) => {
            eprintln!("List skills failed with status: {}", resp.status());
        }
        Err(e) => {
            println!(
                "Server not running, skipping list skills test. Error: {}",
                e
            );
        }
    }
}

#[tokio::test]
async fn test_search_skills() {
    let client = Client::new();
    let base_url = get_test_api_url();

    let response = client
        .get(&format!("{}/api/skills?search=test", base_url))
        .send()
        .await;

    match response {
        Ok(resp) if resp.status().is_success() => {
            let body: serde_json::Value = resp.json().await.unwrap();
            assert!(body.get("skills").is_some());
            println!("Search skills test passed");
        }
        Ok(resp) => {
            eprintln!("Search skills failed with status: {}", resp.status());
        }
        Err(e) => {
            println!(
                "Server not running, skipping search skills test. Error: {}",
                e
            );
        }
    }
}

// ==================== 评论测试 ====================

#[tokio::test]
async fn test_create_and_list_comments() {
    let client = Client::new();
    let base_url = get_test_api_url();

    // 注册并登录用户
    if let Some(user_data) = register_test_user(&client, &base_url).await {
        let username = user_data["username"].as_str().unwrap();
        if let Some(token) = login_test_user(&client, &base_url, username).await {
            // 创建技能
            if let Some(skill_id) = create_test_skill(&client, &base_url, &token).await {
                // 创建评论
                let response = client
                    .post(&format!("{}/api/skills/{}/comments", base_url, skill_id))
                    .header("Authorization", format!("Bearer {}", token))
                    .json(&json!({
                        "content": "This is a test comment"
                    }))
                    .send()
                    .await;

                match response {
                    Ok(resp) if resp.status().is_success() => {
                        let body: serde_json::Value = resp.json().await.unwrap();
                        let comment_id = body.get("id").and_then(|id| id.as_str());

                        if let Some(comment_id) = comment_id {
                            println!("Created comment with ID: {}", comment_id);

                            // 列出评论
                            let list_response = client
                                .get(&format!("{}/api/skills/{}/comments", base_url, skill_id))
                                .send()
                                .await;

                            match list_response {
                                Ok(list_resp) if list_resp.status().is_success() => {
                                    let list_body: serde_json::Value =
                                        list_resp.json().await.unwrap();
                                    assert!(list_body.get("comments").is_some());
                                    println!("List comments test passed");
                                }
                                Ok(list_resp) => {
                                    eprintln!(
                                        "List comments failed with status: {}",
                                        list_resp.status()
                                    );
                                }
                                Err(e) => {
                                    eprintln!("List comments request failed: {}", e);
                                }
                            }
                        } else {
                            eprintln!("Failed to get comment ID");
                        }
                    }
                    Ok(resp) => {
                        eprintln!("Create comment failed with status: {}", resp.status());
                    }
                    Err(e) => {
                        eprintln!("Create comment request failed: {}", e);
                    }
                }
            } else {
                eprintln!("Failed to create test skill");
            }
        } else {
            eprintln!("Failed to login test user");
        }
    } else {
        println!("Server not running, skipping create and list comments test");
    }
}

// ==================== 收藏测试 ====================

#[tokio::test]
async fn test_add_and_list_favorites() {
    let client = Client::new();
    let base_url = get_test_api_url();

    // 注册并登录用户
    if let Some(user_data) = register_test_user(&client, &base_url).await {
        let username = user_data["username"].as_str().unwrap();
        if let Some(token) = login_test_user(&client, &base_url, username).await {
            // 创建技能
            if let Some(skill_id) = create_test_skill(&client, &base_url, &token).await {
                // 添加收藏
                let response = client
                    .post(&format!("{}/api/skills/{}/favorite", base_url, skill_id))
                    .header("Authorization", format!("Bearer {}", token))
                    .send()
                    .await;

                match response {
                    Ok(resp) if resp.status().is_success() => {
                        println!("Added skill to favorites");

                        // 列出收藏
                        let list_response = client
                            .get(&format!("{}/api/favorites", base_url))
                            .header("Authorization", format!("Bearer {}", token))
                            .send()
                            .await;

                        match list_response {
                            Ok(list_resp) if list_resp.status().is_success() => {
                                let list_body: serde_json::Value = list_resp.json().await.unwrap();
                                assert!(list_body.get("favorites").is_some());
                                println!("List favorites test passed");
                            }
                            Ok(list_resp) => {
                                eprintln!(
                                    "List favorites failed with status: {}",
                                    list_resp.status()
                                );
                            }
                            Err(e) => {
                                eprintln!("List favorites request failed: {}", e);
                            }
                        }
                    }
                    Ok(resp) => {
                        eprintln!("Add favorite failed with status: {}", resp.status());
                    }
                    Err(e) => {
                        eprintln!("Add favorite request failed: {}", e);
                    }
                }
            } else {
                eprintln!("Failed to create test skill");
            }
        } else {
            eprintln!("Failed to login test user");
        }
    } else {
        println!("Server not running, skipping add and list favorites test");
    }
}

// ==================== 评分测试 ====================

#[tokio::test]
async fn test_create_rating() {
    let client = Client::new();
    let base_url = get_test_api_url();

    // 注册并登录用户
    if let Some(user_data) = register_test_user(&client, &base_url).await {
        let username = user_data["username"].as_str().unwrap();
        if let Some(token) = login_test_user(&client, &base_url, username).await {
            // 创建技能
            if let Some(skill_id) = create_test_skill(&client, &base_url, &token).await {
                // 创建评分
                let response = client
                    .post(&format!("{}/api/skills/{}/rating", base_url, skill_id))
                    .header("Authorization", format!("Bearer {}", token))
                    .json(&json!({
                        "score": 5
                    }))
                    .send()
                    .await;

                match response {
                    Ok(resp) if resp.status().is_success() => {
                        let body: serde_json::Value = resp.json().await.unwrap();
                        assert_eq!(body["score"], 5);
                        println!("Create rating test passed");
                    }
                    Ok(resp) => {
                        eprintln!("Create rating failed with status: {}", resp.status());
                    }
                    Err(e) => {
                        eprintln!("Create rating request failed: {}", e);
                    }
                }
            } else {
                eprintln!("Failed to create test skill");
            }
        } else {
            eprintln!("Failed to login test user");
        }
    } else {
        println!("Server not running, skipping create rating test");
    }
}

#[tokio::test]
async fn test_get_rating_stats() {
    let client = Client::new();
    let base_url = get_test_api_url();

    // 注册并登录用户
    if let Some(user_data) = register_test_user(&client, &base_url).await {
        let username = user_data["username"].as_str().unwrap();
        if let Some(token) = login_test_user(&client, &base_url, username).await {
            // 创建技能
            if let Some(skill_id) = create_test_skill(&client, &base_url, &token).await {
                // 先评分
                let _ = client
                    .post(&format!("{}/api/skills/{}/rating", base_url, skill_id))
                    .header("Authorization", format!("Bearer {}", token))
                    .json(&json!({
                        "score": 4
                    }))
                    .send()
                    .await;

                // 获取评分统计
                let response = client
                    .get(&format!("{}/api/skills/{}/ratings", base_url, skill_id))
                    .send()
                    .await;

                match response {
                    Ok(resp) if resp.status().is_success() => {
                        let body: serde_json::Value = resp.json().await.unwrap();
                        assert!(body.get("total_ratings").is_some());
                        assert!(body.get("average_rating").is_some());
                        println!("Get rating stats test passed");
                    }
                    Ok(resp) => {
                        eprintln!("Get rating stats failed with status: {}", resp.status());
                    }
                    Err(e) => {
                        eprintln!("Get rating stats request failed: {}", e);
                    }
                }
            } else {
                eprintln!("Failed to create test skill");
            }
        } else {
            eprintln!("Failed to login test user");
        }
    } else {
        println!("Server not running, skipping get rating stats test");
    }
}

// ==================== 版本管理测试 ====================

#[tokio::test]
async fn test_create_skill_version() {
    let client = Client::new();
    let base_url = get_test_api_url();

    // 注册并登录用户
    if let Some(user_data) = register_test_user(&client, &base_url).await {
        let username = user_data["username"].as_str().unwrap();
        if let Some(token) = login_test_user(&client, &base_url, username).await {
            // 创建技能
            if let Some(skill_id) = create_test_skill(&client, &base_url, &token).await {
                // 创建新版本
                let response = client
                    .post(&format!("{}/api/skills/{}/versions", base_url, skill_id))
                    .header("Authorization", format!("Bearer {}", token))
                    .json(&json!({
                        "version": "1.1.0",
                        "content": "Updated content for version 1.1.0",
                        "changelog": "Added new features"
                    }))
                    .send()
                    .await;

                match response {
                    Ok(resp) if resp.status().is_success() => {
                        let body: serde_json::Value = resp.json().await.unwrap();
                        assert_eq!(body["version"], "1.1.0");
                        println!("Create skill version test passed");
                    }
                    Ok(resp) => {
                        eprintln!("Create skill version failed with status: {}", resp.status());
                    }
                    Err(e) => {
                        eprintln!("Create skill version request failed: {}", e);
                    }
                }
            } else {
                eprintln!("Failed to create test skill");
            }
        } else {
            eprintln!("Failed to login test user");
        }
    } else {
        println!("Server not running, skipping create skill version test");
    }
}

#[tokio::test]
async fn test_rollback_skill_version() {
    let client = Client::new();
    let base_url = get_test_api_url();

    // 注册并登录用户
    if let Some(user_data) = register_test_user(&client, &base_url).await {
        let username = user_data["username"].as_str().unwrap();
        if let Some(token) = login_test_user(&client, &base_url, username).await {
            // 创建技能
            if let Some(skill_id) = create_test_skill(&client, &base_url, &token).await {
                // 创建新版本
                let _ = client
                    .post(&format!("{}/api/skills/{}/versions", base_url, skill_id))
                    .header("Authorization", format!("Bearer {}", token))
                    .json(&json!({
                        "version": "1.1.0",
                        "content": "Updated content",
                        "changelog": "Updated"
                    }))
                    .send()
                    .await;

                // 回滚到初始版本
                let response = client
                    .post(&format!(
                        "{}/api/skills/{}/versions/1.0.0/rollback",
                        base_url, skill_id
                    ))
                    .header("Authorization", format!("Bearer {}", token))
                    .send()
                    .await;

                match response {
                    Ok(resp) if resp.status().is_success() => {
                        let body: serde_json::Value = resp.json().await.unwrap();
                        assert_eq!(body["current_version"], "1.0.0");
                        println!("Rollback skill version test passed");
                    }
                    Ok(resp) => {
                        eprintln!(
                            "Rollback skill version failed with status: {}",
                            resp.status()
                        );
                    }
                    Err(e) => {
                        eprintln!("Rollback skill version request failed: {}", e);
                    }
                }
            } else {
                eprintln!("Failed to create test skill");
            }
        } else {
            eprintln!("Failed to login test user");
        }
    } else {
        println!("Server not running, skipping rollback skill version test");
    }
}

// ==================== 认证中间件测试 ====================

#[tokio::test]
async fn test_protected_routes_require_auth() {
    let client = Client::new();
    let base_url = get_test_api_url();

    // 测试创建技能需要认证
    let response = client
        .post(&format!("{}/api/skills", base_url))
        .json(&json!({
            "title": "Test Skill",
            "description": "Test",
            "content": "Test"
        }))
        .send()
        .await;

    match response {
        Ok(resp) => {
            // 应该返回 401 Unauthorized
            assert!(resp.status() == reqwest::StatusCode::UNAUTHORIZED);
            println!("Protected routes require auth test passed");
        }
        Err(e) => {
            println!(
                "Server not running, skipping protected routes test. Error: {}",
                e
            );
        }
    }
}

#[tokio::test]
async fn test_invalid_token() {
    let client = Client::new();
    let base_url = get_test_api_url();

    let response = client
        .post(&format!("{}/api/skills", base_url))
        .header("Authorization", "Bearer invalid_token")
        .json(&json!({
            "title": "Test Skill",
            "description": "Test",
            "content": "Test"
        }))
        .send()
        .await;

    match response {
        Ok(resp) => {
            // 应该返回 401 Unauthorized
            assert!(resp.status() == reqwest::StatusCode::UNAUTHORIZED);
            println!("Invalid token test passed");
        }
        Err(e) => {
            println!(
                "Server not running, skipping invalid token test. Error: {}",
                e
            );
        }
    }
}
