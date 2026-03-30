# SkillHub - 云端技能平台设计方案

**目标：** 构建一个完整的云端技能管理平台，支持局域网部署和公网访问。

**使用场景：**
- 🏢 **内部人员**：局域网部署，快速访问
- 🌐 **外部人员**：公网访问，上传、评论、下载

**核心价值：**
- ☁️ 云端化：技能集中托管，版本管理
- 👥 社区化：评论、收藏、推荐
- 📦 私有化：企业内部技能仓库
- 🔍 智能化：向量搜索 + 关键词混合
- 🚀 易用性：Web UI + CLI 双入口

---

## 🏗️ 系统架构

### 整体架构图

```
┌─────────────────────────────────────────────────────┐
│              SkillHub 云端平台               │
├──────────────────────────────────────────────────────┤
│                                                  │
│  ┌──────────────┐        ┌──────────────┐       │
│  │  Web App     │        │  Backend      │       │
│  │  (前端)      │        │  (后端)      │       │
│  │  React UI     │        │  Rust API     │       │
│  └──────┬───────┘        └──────┬───────┘       │
│         │ HTTP API                      │              │
│         ▼                               ▼              │
│  ┌─────────────────────────────────────────────┐     │
│  │         Database + Storage               │     │
│  │  PostgreSQL + File Storage            │     │
│  │  (自建，不用 Convex)               │     │
│  └─────────────────────────────────────────────┘     │
│         │                                       │
│         ▼                                       │
│  ┌──────────────┐                             │
│  │  CLI 工具   │                             │
│  │  (skillhub)  │                             │
│  └──────────────┘                             │
└─────────────────────────────────────────────────────┘
```

### 访问模式

| 场景 | 网络 | 访问方式 | 功能权限 |
|--------|------|---------|---------|
| **内部人员** | 局域网 | http://skillhub.local | 完整功能（浏览、搜索、下载、上传） |
| **外部人员** | 公网 | https://skillhub.company.com | 浏览、搜索、下载（需登录） |
| **外部人员** | 公网 | https://skillhub.company.com | 上传、评论（需认证） |

---

## 📦 技术选型

### 完整云端平台（自建）

| 组件 | 技术选型 | 理由 |
|--------|-----------|------|
| **后端 API** | **Rust + Actix/Axum** | 高性能、内存安全、跨平台 |
| **前端** | **React + Vite** | 现代化、组件化、热更新 |
| **数据库** | **PostgreSQL** | 成熟、ACID、JSON 支持 |
| **文件存储** | **本地文件系统** | 完全控制、无需云存储 |
| **向量搜索** | **Qdrant + fastembed-rs** | 轻量、本地向量模型 |
| **CLI 工具** | **TypeScript + oclif** | 跨平台、易维护 |
| **部署** | **Docker + Docker Compose** | 容器化、易扩展 |
| **反向代理** | **Nginx** | HTTPS、负载均衡 |

### 数据库表设计

```sql
-- 用户表
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',  -- admin, moderator, user
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 技能表
CREATE TABLE skills (
    id SERIAL PRIMARY KEY,
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    owner_id INTEGER REFERENCES users(id),
    repository_url VARCHAR(500),
    latest_version_id INTEGER REFERENCES skill_versions(id),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 技能版本表
CREATE TABLE skill_versions (
    id SERIAL PRIMARY KEY,
    skill_id INTEGER REFERENCES skills(id) ON DELETE CASCADE,
    version VARCHAR(50) NOT NULL,  -- SemVer
    changelog TEXT,
    storage_path VARCHAR(500),  -- 本地文件路径
    sha256 VARCHAR(64),
    created_at TIMESTAMP DEFAULT NOW(),
    is_latest BOOLEAN DEFAULT FALSE
);

-- 技能文件表
CREATE TABLE skill_files (
    id SERIAL PRIMARY KEY,
    version_id INTEGER REFERENCES skill_versions(id) ON DELETE CASCADE,
    path VARCHAR(500) NOT NULL,
    size BIGINT,
    storage_id VARCHAR(100),
    sha256 VARCHAR(64),
    file_type VARCHAR(50)  -- SKILL.md, assets/, scripts/
);

-- 下载统计
CREATE TABLE downloads (
    id SERIAL PRIMARY KEY,
    skill_id INTEGER REFERENCES skills(id) ON DELETE CASCADE,
    version_id INTEGER REFERENCES skill_versions(id),
    user_id INTEGER REFERENCES users(id),
    ip_address VARCHAR(45),
    downloaded_at TIMESTAMP DEFAULT NOW()
);

-- 评论表
CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    skill_id INTEGER REFERENCES skills(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    body TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- 向量文档表（Qdrant 外部索引）
-- skill_files.storage_id 对应 Qdrant point ID
```

---

## 🌐 后端 API 设计

### 核心模块

```rust
// main.rs
mod auth;
mod skills;
mod search;
mod storage;
mod comments;

use actix_web::{web, App, HttpServer};
use sqlx::PgPool;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    let db_url = std::env::var("DATABASE_URL").expect("DATABASE_URL");
    let pool = PgPool::connect(&db_url).await?;

    HttpServer::new(|| {
        App::new()
            .app_data(pool.clone())
            .configure(cfg)
    })
    .bind("0.0.0.0:8080")?
    .run()
    .await
}
```

### API 端点

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|--------|
| `GET` | `/api/v1/skills` | 列出技能 | 否 |
| `GET` | `/api/v1/skills/:slug` | 获取技能详情 | 否 |
| `GET` | `/api/v1/skills/:slug/versions` | 获取版本历史 | 否 |
| `POST` | `/api/v1/skills` | 发布技能 | ✅ 需要 |
| `PUT` | `/api/v1/skills/:slug` | 更新技能 | ✅ 需要所有权 |
| `DELETE` | `/api/v1/skills/:slug` | 删除技能 | ✅ 需要所有权 |
| `GET` | `/api/v1/search` | 搜索技能 | 否 |
| `POST` | `/api/v1/comments` | 添加评论 | ✅ 需要 |
| `GET` | `/api/v1/comments/:id` | 获取评论 | 否 |
| `POST` | `/api/v1/download/:version_id` | 下载技能（记录统计） | 否 |
| `POST` | `/api/v1/auth/login` | 登录 | ❌ |
| `POST` | `/api/v1/auth/register` | 注册 | ❌ |

### 搜索 API

```rust
// search.rs
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
struct SearchRequest {
    query: String,
    filters: Option<SearchFilters>,
}

#[derive(Serialize, Deserialize)]
struct SearchFilters {
    owner: Option<String>,
    category: Option<String>,
    min_stars: Option<i32>,
}

#[derive(Serialize)]
struct SearchResult {
    skills: Vec<SkillSummary>,
    total: i64,
    query_type: String,  // "hybrid", "keyword", "vector"
}

pub async fn search_skills(
    pool: web::Data<PgPool>,
    q: Query<SearchRequest>,
) -> impl Responder {
    let results = hybrid_search(
        &pool,
        &q.query,
        q.filters.clone(),
    ).await?;

    web::Json(SearchResult {
        skills: results,
        total: results.len() as i64,
        query_type: "hybrid".to_string(),
    })
}

fn hybrid_search(
    pool: &PgPool,
    query: &str,
    filters: Option<SearchFilters>,
) -> Result<Vec<SkillSummary>, Error> {
    // 1. 向量搜索（Qdrant）
    let vector_results = qdrant_search(query, 10)?;

    // 2. 关键词搜索（PostgreSQL）
    let keyword_results = pg_keyword_search(pool, query, 10)?;

    // 3. 结果融合（0.6 向量 + 0.4 关键词）
    let mut combined = HashMap::new();
    for skill in vector_results {
        combined.entry(&skill.slug)
            .or_insert(0.0)
            .add_assign(0.6);
    }
    for skill in keyword_results {
        combined.entry(&skill.slug)
            .or_insert(0.0)
            .add_assign(0.4);
    }

    // 4. 排序 + 过滤
    let mut results: Vec<_> = combined
        .into_iter()
        .map(|(slug, score)| SkillSummary {
            slug: slug.clone(),
            score: score,
            // 从数据库加载完整信息
        })
        .collect();

    results.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap());

    Ok(results)
}
```

---

## 🔐 认证与权限

### JWT Token 方案

```rust
// auth.rs
use jsonwebtoken::{encode, decode, Header, Validation, EncodingKey};
use bcrypt::{hash, verify};

#[derive(Debug, Serialize, Deserialize)]
struct Claims {
    sub: String,  // user_id
    exp: usize,
    iat: usize,
}

pub async fn login(
    pool: web::Data<PgPool>,
    credentials: Json<LoginRequest>,
) -> impl Responder {
    // 1. 查找用户
    let user = sqlx::query_as!(
        "SELECT * FROM users WHERE username = $1"
    )
    .bind(&credentials.username)
    .fetch_one(pool)
    .await?;

    // 2. 验证密码
    let valid = verify(&credentials.password, &user.password_hash)?;

    if !valid {
        return web::Json(json!({ "error": "Invalid credentials" }))
            .with_status(actix_web::http::StatusCode::UNAUTHORIZED);
    }

    // 3. 生成 JWT
    let now = Utc::now();
    let expire = Utc::now()
        .checked_add_signed(chrono::Duration::days(7))
        .expect("valid timestamp");

    let claims = Claims {
        sub: user.id.to_string(),
        exp: expire.timestamp() as usize,
        iat: now.timestamp() as usize,
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret("your-secret-key"),
    )?;

    web::Json(json!({ "token": token }))
}

// 中间件：验证 Token
pub async fn auth_middleware(
    req: HttpRequest,
    next: Next<HttpResponse>,
) -> impl Responder {
    let auth_header = req.headers().get("Authorization");

    if let Some(auth_value) = auth_header {
        if let Ok(token) = token.to_str() {
            // 验证 JWT
            if verify_jwt(token).is_ok() {
                return next.call(req);
            }
        }
    }

    HttpResponse::Unauthorized().json(json!({ "error": "Invalid token" }))
}
```

### 权限矩阵

| 操作 | 游客 | 注册用户 | 技能所有者 | 管理员 |
|------|--------|---------|-----------|--------|
| 浏览技能 | ✅ | ✅ | ✅ | ✅ |
| 搜索技能 | ✅ | ✅ | ✅ | ✅ |
| 下载技能 | ✅ | ✅ | ✅ | ✅ |
| 评论技能 | ❌ | ✅ | ✅ | ✅ |
| 上传技能 | ❌ | ✅ | ✅ | ✅ |
| 删除技能 | ❌ | ❌ | ✅ | ✅ |
| 编辑技能 | ❌ | ❌ | ✅ | ✅ |
| 管理用户 | ❌ | ❌ | ❌ | ✅ |

---

## 📦 前端设计

### 技术栈

```json
{
  "framework": "React 18",
  "bundler": "Vite 5",
  "routing": "TanStack Router",
  "ui": "shadcn/ui",
  "styling": "Tailwind CSS",
  "state": "Zustand",
  "http": "Axios",
  "types": "TypeScript"
}
```

### 核心页面

| 路径 | 页面 | 功能 |
|------|------|------|
| `/` | 首页 | 技能浏览、搜索框、趋势榜 |
| `/skills/:slug` | 技能详情 | README 渲染、版本列表、下载按钮、评论区 |
| `/skills/upload` | 上传技能 | 表单上传、支持 ZIP 拖拽 |
| `/skills/manage` | 我的技能 | 列出我上传的技能、管理版本 |
| `/login` | 登录 | 用户名/密码表单 |
| `/register` | 注册 | 用户名/邮箱/密码表单 |
| `/search` | 搜索页 | 高级搜索过滤器、结果分页 |

### 状态管理

```typescript
// store/skillStore.ts
import { create } from 'zustand';

interface SkillStore {
  skills: Skill[];
  searchResults: SearchResult | null;
  currentUser: User | null;
}

export const useSkillStore = create<SkillStore>((set) => ({
  skills: [],
  searchResults: null,
  currentUser: null,

  fetchSkills: async () => {
    const res = await api.get('/api/v1/skills');
    set({ skills: res.data });
  },

  searchSkills: async (query: string) => {
    const res = await api.get('/api/v1/search', { params: { q: query }});
    set({ searchResults: res.data });
  },

  login: async (username: string, password: string) => {
    const res = await api.post('/api/v1/auth/login', { username, password });
    localStorage.setItem('token', res.data.token);
    set({ currentUser: res.data.user });
  },
}));
```

---

## 💾 存储设计

### 本地文件存储

```
/skillhub-storage/
├── skills/              # 技能包
│   ├── <skill-slug>/
│   │   ├── 1.0.0/
│   │   │   ├── SKILL.md
│   │   │   ├── _meta.json
│   │   │   ├── assets/
│   │   │   └── scripts/
│   │   └── 1.1.0/
│   │       └── ...
│
├── files/               # 其他文件（图片、文档）
│   └── <uuid>/     # 按文件 UUID 组织
│
└── temp/               # 临时上传目录
```

### 存储接口（Rust）

```rust
// storage.rs
use std::path::{Path, PathBuf};
use sha2::{Sha256, Digest};

pub struct Storage {
    base_path: PathBuf,
    skills_path: PathBuf,
    files_path: PathBuf,
}

impl Storage {
    pub fn new(base: &str) -> Self {
        let base = PathBuf::from(base);
        Storage {
            base_path: base.clone(),
            skills_path: base.join("skills"),
            files_path: base.join("files"),
        }
    }

    // 存储技能文件
    pub async fn store_skill(
        &self,
        slug: &str,
        version: &str,
        files: Vec<SkillFile>,
    ) -> Result<String, Error> {
        let skill_dir = self.skills_path
            .join(slug)
            .join(version);

        tokio::fs::create_dir_all(&skill_dir).await?;

        let mut stored_files = Vec::new();
        for file in files {
            let file_path = skill_dir.join(&file.path);
            tokio::fs::write(&file_path, &file.content).await?;

            // 计算 SHA256
            let hash = Self::sha256(&file.content)?;
            stored_files.push(SkillFileMeta {
                path: file.path,
                storage_id: Uuid::new_v4().to_string(),
                sha256: hash,
            });
        }

        Ok(skill_dir.display().to_string())
    }

    fn sha256(content: &[u8]) -> Result<String, Error> {
        let mut hasher = Sha256::new();
        hasher.update(content);
        Ok(format!("{:x}", hasher.finalize()))
    }
}

#[derive(Debug)]
pub struct SkillFile {
    pub path: String,
    pub content: Vec<u8>,
    pub file_type: String,
}

#[derive(Debug)]
pub struct SkillFileMeta {
    pub path: String,
    pub storage_id: String,
    pub sha256: String,
}
```

---

## 🔍 向量搜索设计

### Qdrant 集成

```rust
// qdrant.rs
use qdrant_client::prelude::*;
use qdrant_client::qdrant::payloads;

pub struct QdrantClient {
    client: QdrantClient,
    collection_name: String,
}

impl QdrantClient {
    pub async fn new(url: &str) -> Result<Self, Error> {
        let client = QdrantClient::from_url(url)?;
        let collection_name = "skills".to_string();

        // 创建集合
        client.create_collection(&CreateCollection {
            collection_name: collection_name.clone(),
            vectors_config: Some(VectorsConfig {
                size: 384,  // all-MiniLM-L6-v2 维度
                distance: Distance::Cosine,
            }),
        }).await?;

        Ok(Self { client, collection_name })
    }

    pub async fn search(&self, query: &str, limit: usize) -> Result<Vec<SkillMatch>, Error> {
        // 1. 生成本地向量
        let embedding = Self::generate_embedding(query)?;

        // 2. Qdrant 搜索
        let search_result = self.client.search_points(&SearchPoints {
            collection_name: self.collection_name.clone(),
            vector: embedding,
            limit: Some(limit as u64),
            with_payload: true,
        }).await?;

        // 3. 解析结果
        let mut matches = Vec::new();
        for point in search_result.result {
            if let Some(payload) = point.payload {
                matches.push(SkillMatch {
                    slug: payload.get("slug")
                        .and_then(|v| v.as_str())
                        .unwrap_or("")
                        .to_string(),
                    score: point.score,
                });
            }
        }

        Ok(matches)
    }

    fn generate_embedding(text: &str) -> Result<Vec<f32>, Error> {
        // 使用 fastembed-rs 生成本地向量
        // 或者调用 OpenAI API
        Ok(vec![0.0; 384])  // 示例
    }
}
```

---

## 🚀 部署方案

### Docker Compose 配置

```yaml
# docker-compose.yml
version: '3.8'

services:
  skillhub-db:
    image: postgres:15
    environment:
      POSTGRES_DB: skillhub
      POSTGRES_USER: skillhub
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
    volumes:
      - qdrant_data:/qdrant/storage

  skillhub-api:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://skillhub:${DB_PASSWORD}@skillhub-db:5432/skillhub
      QDRANT_URL: http://qdrant:6333
      JWT_SECRET: ${JWT_SECRET}
    depends_on:
      - skillhub-db
      - qdrant
    ports:
      - "8080:8080"
    volumes:
      - ./storage:/app/storage

  skillhub-web:
    build: ./frontend
    environment:
      VITE_API_URL: http://localhost:8080/api/v1
    depends_on:
      - skillhub-api
    ports:
      - "3000:80"

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - skillhub-web

volumes:
  postgres_data:
  qdrant_data:
```

### Nginx 反向代理配置

```nginx
server {
    listen 80;
    server_name skillhub.local;

    # 前端
    location / {
        proxy_pass http://skillhub-web:3000;
        proxy_set_header Host $host;
    }

    # 后端 API
    location /api/ {
        proxy_pass http://skillhub-api:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # 技能下载
    location /downloads/ {
        alias /app/storage/skills/;
        add_header Content-Disposition "attachment";
    }
}
```

### 局域网部署（内部）

```bash
# 1. 构建并启动
docker-compose up -d

# 2. 配置 DNS（内部）
# 在 /etc/hosts 或公司 DNS 添加：
# 192.168.1.100  skillhub.local

# 3. 访问
# 内部人员：http://skillhub.local
```

### 公网部署（外部）

```bash
# 1. 配置 HTTPS 证书
# 使用 Let's Encrypt 或公司证书

# 2. 配置公网访问
# 在公司 DNS 添加：
# skillhub.company.com -> 服务器公网 IP

# 3. 访问
# 外部人员：https://skillhub.company.com
```

---

## 📋 开发路线图

### Phase 1: MVP 后端（2 周）

**目标：** 基础 API + 数据库

- [ ] 数据库 Schema 实现
  ```rust
  // 使用 sqlx 创建表
  // users, skills, skill_versions, downloads, comments
  ```

- [ ] 认证系统（JWT + bcrypt）
  ```rust
  // 登录、注册、Token 验证中间件
  ```

- [ ] 基础技能 API
  ```rust
  // 列表、详情、上传、下载统计
  ```

- [ ] 本地文件存储
  ```rust
  // 技能包存储、SHA256 验证
  ```

**交付物：**
- ✅ 可运行的 Rust API（Actix）
- ✅ PostgreSQL 数据库
- ✅ 基础 CRUD API

---

### Phase 2: 搜索功能（1-2 周）

**目标：** 向量搜索 + 关键词搜索

- [ ] Qdrant 集成
  ```rust
  // 创建集合、索引技能
  ```

- [ ] 本地向量生成
  ```rust
  // 使用 fastembed-rs 生成 384 维向量
  ```

- [ ] 混合搜索 API
  ```rust
  // 0.6 向量 + 0.4 关键词
  ```

- [ ] 搜索结果排序

**交付物：**
- ✅ 向量搜索 API
- ✅ 混合检索算法
- ✅ 搜索性能优化

---

### Phase 3: 前端 Web UI（2-3 周）

**目标：** 技能浏览 + 上传 + 管理

- [ ] React + Vite 项目初始化
  ```bash
  npm create vite@latest skillhub-web -- --template react-ts
  ```

- [ ] shadcn/ui 组件库集成
  ```bash
  npx shadcn-ui@latest init
  ```

- [ ] 核心页面实现
  ```typescript
  // 首页、技能详情、搜索页、上传页
  ```

- [ ] API 客户端（Axios）
  ```typescript
  // 封装 API 调用
  ```

**交付物：**
- ✅ 响应式 Web UI
- ✅ 技能浏览功能
- ✅ 上传/管理功能

---

### Phase 4: 部署与优化（1 周）

**目标：** Docker + Nginx 部署

- [ ] Docker Compose 配置
- [ ] Nginx 反向代理
- [ ] HTTPS 证书配置
- [ ] 性能优化（缓存、CDN）

**交付物：**
- ✅ 可部署的 Docker 配置
- ✅ 局域网访问（http://skillhub.local）
- ✅ 公网访问（https://skillhub.company.com）

---

## ⚙️ 配置管理

### 环境变量

```bash
# .env
DATABASE_URL=postgresql://skillhub:password@localhost:5432/skillhub
QDRANT_URL=http://localhost:6333
JWT_SECRET=your-secret-key-change-me
STORAGE_PATH=/app/storage
MAX_UPLOAD_SIZE=52428800  # 50MB
ENABLE_REGISTRATION=true  # 是否开放注册
```

### 访问控制

| 配置项 | 说明 | 默认值 |
|--------|------|--------|
| `ENABLE_REGISTRATION` | 是否允许新用户注册 | `true` |
| `MAX_UPLOAD_SIZE` | 最大上传大小（字节） | `52428800` (50MB) |
| `REQUIRE_AUTH_COMMENT` | 评论是否需要登录 | `true` |
| `ENABLE_PUBLIC_SEARCH` | 公网是否可搜索 | `true` |

---

## 📊 监控与日志

### API 日志

```rust
use tracing::{info, error};

pub async fn upload_skill(
    pool: web::Data<PgPool>,
    req: HttpRequest,
    payload: Multipart,
) -> impl Responder {
    let user_id = req.extensions().get::<UserId>()?;
    info!(user = %s, action = "upload_skill", user_id);

    match process_upload(pool, payload).await {
        Ok(skill_id) => {
            info!(skill_id = %s, status = "success", skill_id);
            HttpResponse::Ok().json(json!({ "skill_id": skill_id }))
        }
        Err(e) => {
            error!(error = %s, user_id = %s, e, user_id);
            HttpResponse::InternalServerError().json(json!({ "error": e.to_string() }))
        }
    }
}
```

### 性能监控

```typescript
// 前端性能追踪
export const trackPageLoad = (page: string) => {
  const timing = performance.timing;
  console.log({
    page,
    domContentLoaded: timing.domContentLoadedEventEnd - timing.navigationStart,
    loadComplete: timing.loadEventEnd - timing.navigationStart,
  });
};
```

---

## ✅ 验收标准

### 功能验收

- [ ] 内部人员可通过 `http://skillhub.local` 访问
- [ ] 外部人员可通过 `https://skillhub.company.com` 访问
- [ ] 用户可注册/登录
- [ ] 技能可上传、下载
- [ ] 搜索功能正常（向量 + 关键词）
- [ ] 评论功能正常
- [ ] 下载统计准确

### 性能验收

- [ ] API 响应时间 < 200ms（P95）
- [ ] 搜索响应时间 < 500ms（P95）
- [ ] 前端首屏加载 < 2s
- [ ] 并发支持 > 100 用户

### 安全验收

- [ ] 所有 API 使用 HTTPS
- [ ] 密码使用 bcrypt 哈希
- [ ] JWT Token 有效期限制（7 天）
- [ ] SQL 注入防护（使用参数化查询）
- [ ] XSS 防护（前端输入过滤）

---

## 📄 文档

### 技术文档

| 文档 | 内容 |
|--------|------|
| `API.md` | API 端点、认证、错误码 |
| `DATABASE.md` | 数据库 Schema、索引设计 |
| `DEPLOYMENT.md` | Docker 部署、Nginx 配置 |
| `CONTRIBUTING.md` | 开发指南、代码规范 |

### 用户文档

| 文档 | 内容 |
|--------|------|
| `USER_GUIDE.md` | 用户使用手册 |
| `ADMIN_GUIDE.md` | 管理员操作手册 |
| `SKILL_FORMAT.md` | 技能上传格式说明 |

---

**文档版本：** v1.0
**最后更新：** 2026-03-06
**状态：** 设计完成，待评审
