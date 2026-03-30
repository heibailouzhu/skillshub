# ClawHub 技术分析与本地项目优化建议

_分析日期：2026-03-06_

---

## 📊 ClawHub GitHub 仓库分析

### 技术栈

| 层级 | 技术 | 说明 |
|--------|------|------|
| **前端** | TanStack Start (React + Vite) | SPA，快速路由，服务端渲染支持 |
| **后端** | Convex | 云数据库 + 文件存储 + HTTP Actions |
| **CLI** | TypeScript (packages/clawdhub) | 发布为 `clawhub`，继承 `clawdhub` |
| **搜索** | OpenAI Embeddings | text-embedding-3-small + Convex 向量搜索 |
| **运行时** | Bun | 高性能 JavaScript 运行时 |

### 架构分层

```
┌─────────────────────────────────────────────────────────────┐
│              Web Application (src/)                │
│         TanStack Start (React + Router)           │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP API
                     ↓
┌─────────────────────────────────────────────────────────────┐
│            Backend (convex/)                      │
│  ┌──────────┬──────────┬──────────┬────────┐ │
│  │ Schema   │ Queries  │ Actions  │ Auth   │ │
│  │ (.ts)    │ (.ts)    │ (.ts)    │ (.ts)  │ │
│  └──────────┴──────────┴──────────┴────────┘ │
└─────────────────────────────────────────────────────────────┘
         ↑                   ↓
    Embeddings         Convex Storage
 (OpenAI API)      (File Blob Storage)
```

### 数据模型

#### 核心实体

1. **User（用户）**
   ```typescript
   {
     authId: string,        // Convex Auth ID
     handle: string,        // GitHub 用户名
     name: string,
     bio: string,
     avatarUrl: string,      // GitHub/Gravatar
     role: 'admin' | 'moderator' | 'user',
     createdAt, updatedAt
   }
   ```

2. **Skill（技能）**
   ```typescript
   {
     slug: string,           // 唯一标识
     displayName: string,
     ownerUserId: string,
     summary: string,        // 从 SKILL.md description
     latestVersionId: string,
     latestTagVersionId: string, // latest 标签
     tags: { [tag]: versionId },  // 标签映射
     badges: {               // 徽章系统
       redactionApproved?: { byUserId, at },
       highlighted?: { byUserId, at },
       official?: { byUserId, at },
       deprecated?: { byUserId, at }
     },
     moderationStatus: 'active' | 'hidden' | 'removed',
     moderationFlags: string[],
     stats: {
       downloads, stars, versions, comments
     }
   }
   ```

3. **SkillVersion（技能版本）**
   ```typescript
   {
     skillId: string,
     version: string,         // SemVer
     tag?: string,            // 可选标签（latest 独立维护）
     changelog: string,       // 必需
     files: [{
       path, size, storageId, sha256
     }],
     parsed: {               // 从 SKILL.md frontmatter 提取
       name, description, homepage, website, url,
       emoji,
       metadata: {           // clawdis/agentSkills 扩展
         clawdis: {
           always, skillKey, primaryEnv, emoji, homepage, os,
           requires: { bins, anyBins, env, install[] },
           nix: { plugin, systems },
           config: { requiredEnv, stateDirs, example },
           cliHelp: string
         }
       }
     },
     vectorDocId: string,   // 嵌入向量 ID
     softDeletedAt?: string
   }
   ```

### API 端点

| 方法 | 路径 | 说明 |
|------|--------|------|
| `POST` | `/api/v1/skills` | 发布技能（需要认证） |
| `GET` | `/api/v1/skills` | 列出技能（分页） |
| `GET` | `/api/v1/skills/:slug` | 获取技能详情 |
| `GET` | `/api/v1/download` | 下载技能版本（ZIP） |
| `GET` | `/api/v1/search?q=` | 向量搜索 |
| `POST` | `/api/v1/resolve` | 解析本地版本（hash 对比） |

### 安全机制

1. **上传限制**
   - 总大小 ≤ 50MB
   - 仅文本文件（无二进制）
   - SKILL.md 必须存在且可解析
   - GitHub 账号 ≥ 14 天

2. **审核系统**
   - 任何人可报告技能
   - >3 个唯一报告自动隐藏
   - Soft-delete（管理员可恢复）
   - 硬删除（仅管理员）
   - 审核操作记录审计日志

3. **速率限制**
   - 每用户 20 个活跃报告上限
   - 上传频率限制
   - API 调用频率限制

4. **徽章系统**
   - `official`: 管理员验证的官方技能
   - `redactionApproved`: 通过隐私审查
   - `highlighted`: 社区推荐
   - `deprecated`: 不应再使用

### 版本管理

- **Latest 标签**: 始终指向最新版本（除非用户重新标记）
- **Rollback**: 将 latest（和其他标签）移动到旧版本
- **Changelog**: 可选但推荐
- **Soft-delete**: 删除版本但保留历史（已删除版本不可下载）

### 向量搜索

```
技能文本 + 元数据 → OpenAI Embeddings → Convex 向量索引
                                                ↓
                                           用户查询
                                                ↓
Convex Vector Search → 排序结果 → 返回匹配技能
```

**搜索维度：**
- SKILL.md 内容
- 其他文本文件
- metadata.summary（souls 索引 SOUL.md）

**过滤器：**
- 按标签
- 按所有者
- 仅审核批准
- 最低 star 数
- 更新时间

---

## 🔍 本地 Local ClawHub 项目对比

### 当前状态

| 项目 | 状态 | 文件数 |
|------|------|--------|
| Local ClawHub 设计文档 | ✅ 完成 | 3（design, changelog, state） |
| 设计版本 | v1.2 | 95% 可实施性 |
| 已完成阶段 | 15/15 | 设计阶段 |

### 设计覆盖度对比

| 功能模块 | ClawHub | Local ClawHub | 差距 |
|---------|-----------|---------------|------|
| 基础架构 | ✅ | ✅ | - |
| API 设计 | ✅ | ✅ | - |
| 数据模型 | ✅ | ✅ | - |
| 搜索（向量） | ✅ | ✅ | - |
| 版本管理 | ✅ | ✅ | - |
| 文件存储 | ✅ Convex Storage | ❌ 仅设计 | 🔴 缺失实现 |
| 后端 API | ✅ Convex Actions | ❌ 无实现 | 🔴 缺失实现 |
| 前端 Web UI | ✅ TanStack Start | ❌ 无实现 | 🔴 缺失实现 |
| 用户认证 | ✅ Convex Auth + GitHub OAuth | ❌ 无实现 | 🔴 缺失实现 |
| 审核系统 | ✅ Soft-delete + Flags | ❌ 仅设计 | 🟡 部分设计 |
| 速率限制 | ✅ | ❌ 无实现 | 🔴 缺失实现 |
| 向量嵌入 | ✅ OpenAI | ❌ 无实现 | 🔴 缺失实现 |
| 审计日志 | ✅ | ✅ 已设计 | - |

---

## 🚀 快速落地建议

### Phase 1: MVP（2-3 周）

**目标：** 本地可用的技能管理系统（无数据库）

#### 任务清单

- [ ] **项目初始化**
  ```bash
  mkdir skillshub
  cd skillshub
  cargo init  # 或 pnpm init
  ```

- [ ] **Core Library 实现**（参考 `packages/schema`）
  ```rust
  // core/models.rs
  struct Skill {
      slug: String,
      name: String,
      version: Version,
      description: String,
      files: Vec<SkillFile>,
  }

  struct LocalClawHub {
      config: Config,
      skills: HashMap<String, InstalledSkill>,
  }
  ```

- [ ] **基础 CLI 命令**（参考 `packages/clawdhub`）
  ```bash
  # 1. 技能列表
  lch list

  # 2. 技能搜索（本地关键词）
  lch search <query>

  # 3. 技能安装（本地文件系统）
  lch install <path>

  # 4. 技能卸载
  lch uninstall <slug>
  ```

- [ ] **本地仓库管理**
  ```rust
  // 实现本地文件系统索引
  - ~/.skillshub/repository/  # 技能包
  - ~/.skillshub/installed/ # 已安装
  - ~/.skillshub/index/      # 搜索索引
  ```

- [ ] **简单搜索功能**
  ```rust
  // 关键词搜索（无向量）
  - 按 name, description, tags 匹配
  - 模糊搜索（Levenshtein 距离）
  ```

**可交付物：**
- ✅ 基础 CLI（4 个命令）
- ✅ 本地技能管理
- ✅ 本地搜索
- ✅ 单元测试

---

### Phase 2: 搜索增强（1-2 周）

**目标：** 向量搜索 + 混合检索

#### 任务清单

- [ ] **选择向量库**
  ```rust
  // 选项 1: qdrant（推荐，本地）
  [dependencies]
  qdrant-client = "1.0"

  // 选项 2: sqlite-vec（更轻量）
  [dependencies]
  sqlite-vec = "0.1"
  ```

- [ ] **嵌入模型**
  ```rust
  // 本地向量生成（无需 OpenAI API）
  use fastembed::FastEmbed;

  let model = FastEmbed::new("all-MiniLM-L6-v2")?;
  let embedding = model.embed(text)?;
  ```

- [ ] **索引构建**
  ```rust
  impl IndexBuilder {
      pub fn build(&self, skills: Vec<Skill>) -> Result<Index> {
          for skill in skills {
              let text = format!("{} {}", skill.name, skill.description);
              let embedding = embed(&text)?;
              index.insert(skill.id, embedding);
          }
      }
  }

  pub fn update(&self, skill: &Skill) -> Result<()> {
          // 增量更新（检测变化）
          if skill.hash != self.cached.get(&skill.id) {
              self.build_index(vec![skill]);
          }
      }
  }
  ```

- [ ] **混合搜索**
  ```rust
  pub fn hybrid_search(&self, query: &str) -> Result<Vec<Skill>> {
      let vector_results = self.vector_search(query, 10)?;
      let keyword_results = self.keyword_search(query, 10)?;

      // 结果融合（0.6 向量 + 0.4 关键词）
      let mut combined = HashMap::new();
      for (skill, score) in vector_results {
          combined.entry(skill).or_insert(0.0) += score * 0.6;
      }
      for (skill, score) in keyword_results {
          combined.entry(skill).or_insert(0.0) += score * 0.4;
      }

      Ok(sort_by_score(combined))
  }
  ```

**可交付物：**
- ✅ 向量搜索（语义检索）
- ✅ 混合搜索（向量 + 关键词）
- ✅ 增量索引更新

---

### Phase 3: Web UI（2-3 周）

**目标：** 基础 Web 界面（可选，非必需）

#### 任务清单

- [ ] **选择框架**
  ```toml
  # 方案 1: Actix-Web（Rust，高性能）
  [dependencies]
  actix-web = "4.0"
  askama = "0.12"

  # 方案 2: Axum（Rust，类型安全）
  [dependencies]
  axum = "0.7"
  ```
- [ ] **基础页面**
  ```rust
  // 路由定义
  Router::new()
      .route("/", get(home))                    // 首页
      .route("/skills", get(list_skills))       // 技能列表
      .route("/skills/:slug", get(skill_detail))  // 技能详情
      .route("/search", get(search))              // 搜索页面
  ```

- [ ] **静态文件服务**
  ```rust
  // 提供 SKILL.md 渲染
  async fn skill_detail(Path(slug): Path<String>) -> impl Responder {
      let skill = load_skill(slug)?;
      let html = render_markdown(&skill.content)?;
      Ok(Html(html))
  }
  ```

**可交付物：**
- ✅ 基础 Web UI
- ✅ 技能浏览
- ✅ 搜索界面

---

### Phase 4: 集成与优化（持续）

**目标：** 与 ClawHub Registry 集成

#### 任务清单

- [ ] **Registry 同步**
  ```rust
  pub async fn sync_registry(&self, repo_url: &str) -> Result<()> {
      // 1. 获取远程技能列表
      let remote_skills = fetch_registry(repo_url).await?;

      // 2. 下载新技能
      for skill in remote_skills {
          if !self.is_installed(&skill.slug) {
              self.download_skill(&skill).await?;
          }
      }
  }
  ```

- [ ] **版本检查**
  ```rust
  pub async fn check_update(&self, slug: &str) -> Result<Option<Version>> {
      let local_version = self.get_installed_version(slug)?;
      let remote_version = fetch_remote_version(slug).await?;

      if remote_version > local_version {
          Ok(Some(remote_version))
      } else {
          Ok(None)
      }
  }
  ```

---

## 📋 技术选型建议

### 推荐栈（与设计文档一致）

| 组件 | 推荐技术 | 理由 |
|--------|-----------|------|
| **核心语言** | **Rust** | 高性能、内存安全、跨平台 |
| **CLI 框架** | **clap** | 强大的参数解析，社区标准 |
| **向量库** | **qdrant-client** | 轻量级本地向量库 |
| **嵌入模型** | **fastembed-rs** | 本地向量生成，无需 API |
| **Web 框架** | **Axum** 或 **Actix** | 类型安全，高性能 |
| **序列化** | **serde** | Rust 生态标准 |
| **测试框架** | **criterion** + **proptest** | 性能基准 + 模糊测试 |

### 备选方案（快速开发）

| 场景 | 技术栈 | 优势 |
|--------|---------|------|
| **快速原型** | **Golang + Cobra** | 更快的开发速度，Cobra 成熟 |
| **简单 UI** | **Go + Gin** | REST API + 服务端渲染 |

---

## 🎯 快速落地路径

### 最小可行产品（MVP）

**目标：1 周内可用的本地技能管理器**

```rust
// src/main.rs
use clap::{Parser, Subcommand};

#[derive(Parser)]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    List,
    Install { path: String },
    Uninstall { slug: String },
    Search { query: String },
}

fn main() -> Result<()> {
    let cli = Cli::parse();
    let hub = LocalClawHub::new()?;

    match cli.command {
        Commands::List => hub.list(),
        Commands::Install { path } => hub.install(&path)?,
        Commands::Uninstall { slug } => hub.uninstall(&slug)?,
        Commands::Search { query } => hub.search(&query)?,
    }
    Ok(())
}
```

**开发步骤：**

1. **Day 1-2**: 项目� + 数据模型
   ```bash
   cargo new skillshub --bin lch
   cd skillshub
   # 添加依赖
   ```

2. **Day 3-4**: CLI 基础命令
   ```rust
   // 实现 install/uninstall/list
   // 文件系统操作
   ```

3. **Day 5**: 搜索功能
   ```rust
   // 实现简单关键词搜索
   // 模糊匹配
   ```

4. **Day 6-7**: 测试 + 文档
   ```bash
   cargo test
   # 编写 README.md
   ```

**验证标准：**
- ✅ 可以列出已安装技能
- ✅ 可以从路径安装技能
- ✅ 可以卸载技能
- ✅ 可以搜索技能（关键词）
- ✅ 有基础文档

---

## 🔄 与 ClawHub 集成策略

### 渐进式集成

1. **Phase 1**: 完全本地（无网络）
   - 本地仓库
   - 本地索引
   - 好处：隐私、快速、离线可用

2. **Phase 2**: 可选同步（只读）
   - 从 Registry 下载技能
   - 不上传到 Registry
   - 好处：扩展技能库

3. **Phase 3**: 双向同步（完整）
   - 上传技能到 Registry
   - 同步更新
   - 需要账户认证

### 兼容性

| 功能 | Local ClawHub | ClawHub Registry | 兼容性 |
|------|---------------|------------------|---------|
| SKILL.md 格式 | ✅ | ✅ | 100% 兼容 |
| 元数据解析 | ✅ | ✅ | 100% 兼容 |
| 向量搜索 | ✅ | ✅ | 向量格式兼容 |
| 版本管理 | ✅ | ✅ | SemVer 兼容 |
| 文件打包 | ZIP | ZIP | 100% 兼容 |

---

## 📊 实施时间估算

| 阶段 | 功能 | 工作量 | 优先级 |
|------|------|--------|--------|
| **Phase 1: MVP** | 基础 CLI | 1 周 | 🔴 高 |
| **Phase 2: 搜索** | 向量搜索 | 1-2 周 | 🟡 中 |
| **Phase 3: Web UI** | Web 界面 | 2-3 周 | 🟢 低 |
| **Phase 4: 集成** | Registry 同步 | 2-3 周 | 🟡 中 |

**总计：6-9 周（1-2 个月）**

---

## ✅ 立即可开始的步骤

### 今天就可以开始

1. **克隆设计文档参考**
   ```bash
   git clone https://github.com/openclaw/clawhub.git /tmp/clawhub-reference
   cd /tmp/clawhub-reference
   ```

2. **初始化 Rust 项目**
   ```bash
   cd /root/.openclaw/workspace
   mkdir skillshub
   cd skillshub
   cargo init --name skillshub --bin lch
   ```

3. **添加核心依赖**
   ```toml
   # Cargo.toml
   [dependencies]
   clap = { version = "4.0", features = ["derive"] }
   serde = { version = "1.0", features = ["derive"] }
   toml = "0.8"
   walkdir = "2.0"
   ```

4. **实现第一个命令**
   ```rust
   // src/main.rs
   // 从简单的 `lch list` 开始
   ```

5. **测试运行**
   ```bash
   cargo run -- list
   ```

---

## 💡 关键决策点

1. **使用本地向量还是外部 API？**
   - ✅ 本地（fastembed-rs）：隐私、免费、快速
   - ⚠️ 外部（OpenAI）：质量更好、需要 API key

2. **需要 Web UI 吗？**
   - ✅ 是：更好的体验，但增加工作量
   - ❌ 否：聚焦 CLI，更快落地

3. **与 Registry 同步方向？**
   - 📥 只读：从 Registry 下载
   - 📤 双向：上传 + 下载（需要认证）

---

## 📚 参考资源

### ClawHub 仓库

- **主仓库**: https://github.com/openclaw/clawhub
- **架构文档**: docs/architecture.md
- **规格文档**: docs/spec.md
- **API 文档**: docs/http-api.md
- **CLI 文档**: docs/cli.md
- **技能格式**: docs/skill-format.md

### 技术参考

- **Rust 项目模板**: https://github.com/rust-lang/cargo-generate
- **Clap 示例**: https://github.com/clap-rs/clap
- **Serde 指南**: https://serde.rs/
- **FastEmbed Rust**: https://github.com/Anush008/fastembed-rs

---

## 🎯 结论

### 快速落地可行性：**✅ 可行**

**理由：**
1. ✅ 设计文档已完善（95% 可实施性）
2. ✅ ClawHub 架构清晰，可借鉴
3. ✅ Rust 生态成熟，依赖丰富
4. ✅ MVP 范围可控，1 周可达

### 建议起步

**从 MVP 开始**：
- 1 周实现基础 CLI（install/uninstall/list/search）
- 2-3 周添加向量搜索
- 可选：后续添加 Web UI

**优先顺序：**
1. 🔴 **MVP CLI**（必须）
2. 🟡 **向量搜索**（强烈推荐）
3. 🟢 **Web UI**（可选）
4. 🟢 **Registry 集成**（可选）

---

**准备好开始了吗？我可以帮你初始化项目并实现第一个命令！** 🚀
