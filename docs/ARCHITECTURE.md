# SkillShub 架构设计

## 概览

SkillShub 当前是一套本地优先、自托管的技能平台，提供：

- Web UI：浏览、搜索、发布和管理技能
- Backend API：认证、技能、版本、评论、收藏、评分、registry bundle
- CLI：在当前项目中安装技能到不同 AI 工具工作区

系统目标不是公共托管平台，而是适合团队内网、私有服务器或本地环境部署的私有 skill registry。

## 运行时架构

```text
Browser
  |
  v
Frontend (React + Vite, Docker 中由 Nginx 提供服务)
  |
  v
Backend API (Rust + Axum)
  |
  +--> PostgreSQL
  |
  +--> Redis

Developer Terminal
  |
  v
skhub CLI
  |
  v
SkillShub Registry API
```

当前 `docker-compose.yml` 中的服务：

- `frontend`: 对外暴露 `80`
- `backend`: 对外暴露 `8080`
- `postgres`: 对外暴露 `5432`
- `redis`: 对外暴露 `6379`

## 后端模块

后端采用 Rust + Axum，入口在 `backend/src/main.rs`。

当前路由分层：

- `GET /health`
- `GET /api/docs/openapi.json`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/skills`
- `GET /api/skills/:id`
- `POST /api/skills`
- `PUT /api/skills/:id`
- `DELETE /api/skills/:id`
- 评论、收藏、评分、版本相关路由
- `GET /api/registry/skills/:slug`
- `GET /api/registry/skills/:slug/versions/:version/bundle`

认证方式：

- Bearer Token / JWT
- 受保护路由通过中间件校验

缓存方式：

- Redis 可用时启用缓存
- Redis 不可用时，后端仍可继续运行

## 数据模型

核心数据表：

- `users`
- `skills`
- `skill_versions`
- `comments`
- `favorites`
- `moderation_logs`

当前技能模型关键字段：

- `id`
- `slug`
- `title`
- `description`
- `content`
- `author_id`
- `category`
- `tags`
- `version`
- `is_published`
- `is_deleted`

设计要点：

- 技能用 `slug` 作为 registry 安装入口
- 技能正文当前以数据库中的文本 `content` 为 canonical 内容来源
- 版本内容保存在 `skill_versions.content`

## Registry 与安装模型

SkillShub 当前已经支持最小可用的 registry/bundle 协议，用于 CLI 安装。

元数据接口：

- `GET /api/registry/skills/:slug`

返回核心字段：

- `slug`
- `title`
- `description`
- `latest_version`
- `bundle_hash`
- `available_targets`

bundle 接口：

- `GET /api/registry/skills/:slug/versions/:version/bundle`

当前 canonical bundle 规则：

- 版本内容导出为单个 `SKILL.md`
- 返回 `files[]`、`bundle_hash`
- `encoding` 当前固定为 `utf-8`

## CLI 架构

CLI 位于 `cli/`，使用 TypeScript + oclif，命令名为 `skhub`。

当前命令：

- `skhub install <slug> --codex|--cursor|--claude|--openclaw`
- `skhub config`
- `skhub config repositories <url>`
- `skhub config rep <url>`

配置模型：

- 全局配置
- 项目配置：`.skhub/config.json`
- 安装状态：`.skhub/installs.json`

当前安装目标：

- Codex：`.agents/skills/<slug>/`
- Cursor：`.cursor/rules/skhub-<slug>.mdc`
- Claude Code：`CLAUDE.md` + `.skhub/claude/*`
- OpenClaw：`skills/<slug>/`

## 前端架构

前端位于 `frontend/`，使用 React + Vite。

主要职责：

- 登录、注册
- 技能列表与详情展示
- 评论、收藏、评分
- 版本浏览和管理

API 调用方式：

- 默认使用同源 API
- 可通过 `VITE_API_BASE_URL` 覆盖 API 地址

## 设计边界

本项目当前不再保留以下旧架构设想，避免文档和实现脱节：

- Qdrant / 向量检索方案
- 独立文件对象存储与资产服务
- 公有云 / 企业云平台扩展设计
- 旧版 CLI 规划稿

也就是说，当前唯一有效的安装链路是：

`skills` / `skill_versions` 中的 `content` -> registry bundle 中的 `SKILL.md` -> `skhub` 按目标规范落盘到项目目录。
