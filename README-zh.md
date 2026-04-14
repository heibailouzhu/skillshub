# SkillShub

[English](README.md) | 中文说明

> 一个适合本地化部署的 AI Skill Hub，支持通过 Web 界面和 `skhub` CLI 发布、浏览、评分、版本管理与安装技能。

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Rust](https://img.shields.io/badge/rust-1.94-orange.svg)](https://www.rust-lang.org/)
[![React](https://img.shields.io/badge/react-19-61DAFB.svg)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/node.js-22+-339933.svg)](https://nodejs.org/)

## 项目简介

SkillShub 是一个本地优先、自托管的技能平台，适合个人、团队和组织搭建自己的私有 AI skill registry。
当前仓库包含：

- Rust 后端 API，提供认证、技能管理、版本、评论、收藏、评分和 registry bundle 分发
- React 前端，用于浏览和管理技能
- TypeScript CLI，命令名为 `skhub`，可把技能安装到 Codex、Cursor、Claude Code 和 OpenClaw 项目中

## 当前状态

- 后端已实现，并带有自动化测试
- 前端已实现，并接入后端 API
- CLI 已实现 `install`、`config`，并保留 `login` 能力供后续扩展
- 已提供完整 Docker Compose 部署方式

## 核心能力

- 技能发布与版本管理
- 技能浏览、搜索、评论、收藏、评分
- 通过 registry API 分发 canonical bundle
- 在当前项目中安装技能：
  `skhub install <slug> --codex|--cursor|--claude|--openclaw`
- 配置 registry 地址：
  `skhub config`
  `skhub config set-repo <url>`
  `skhub config show`

## 当前架构

运行时组件：

- `frontend`：React + Vite UI，容器内由 Nginx 提供服务
- `backend`：Rust + Axum API，提供 OpenAPI JSON
- `postgres`：主数据库
- `redis`：缓存
- `cli`：本地 `skhub` 命令，用于项目级技能安装

当前安装分发接口：

- `GET /api/registry/skills/:slug`
- `GET /api/registry/skills/:slug/versions/:version/bundle`

## 快速开始

### 环境要求

- Docker 24+
- Docker Compose v2

### 启动服务

```bash
git clone https://github.com/heibailouzhu/skillshub.git
cd skillshub
docker compose up -d --build
```

启动后可访问：

- 前端：`http://localhost`
- 后端健康检查：`http://localhost:8080/health`
- OpenAPI JSON：`http://localhost:8080/api/docs/openapi.json`

## 本地开发

后端、前端和 CLI 的本地开发流程见 [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)。

常用命令：

```bash
# backend
cd backend
cargo test

# frontend
cd frontend
npm install
npm run dev

# cli
cd cli
npm install
npm test
npm run build
```

## 文档

- [架构设计](docs/ARCHITECTURE.md)
- [容器化部署](docs/DEPLOYMENT.md)
- [开发与测试环境](docs/DEVELOPMENT.md)
- [贡献指南](CONTRIBUTING.md)

## 项目结构

```text
skillshub/
├── backend/            # Rust 后端 API 与迁移
├── frontend/           # React 前端
├── cli/                # skhub CLI
├── docs/               # 当前项目文档
├── docker-compose.yml  # 全栈部署入口
├── README.md
└── README-zh.md
```

## 许可证

本项目基于 [MIT License](LICENSE) 开源。
