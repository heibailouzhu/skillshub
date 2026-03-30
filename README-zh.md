# 本地部署自己的 SkillShub

[English](README.md) | 中文说明

> 在本地或私有服务器上部署你自己的 SkillShub，用于集中管理、搜索和分享 AI 技能。

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Rust](https://img.shields.io/badge/rust-1.94-orange.svg)](https://www.rust-lang.org/)
[![React](https://img.shields.io/badge/react-18-61DAFB.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/node.js-18+-339933.svg)](https://nodejs.org/)

## 项目简介

SkillShub 是一个适合本地化部署的自托管平台，帮助你搭建属于自己的 AI 技能中心。
它适用于个人开发者、团队和组织，在自己的基础设施上部署 SkillShub，掌控数据、访问权限和使用流程。

本程序由 OpenClaw 完成。

仓库地址：`https://github.com/heibailouzhu/skillshub`

## 为什么使用 SkillShub

- 本地化部署自己的 SkillShub，适合局域网或私有服务器环境
- 将分散的 AI 技能统一管理，而不是散落在多个本地目录中
- 基于结构化元数据和全文搜索快速查找技能
- 支持评论、收藏、评分等协作能力
- 使用 Docker Compose 即可快速启动，部署成本低

## 核心能力

- 技能发布与管理
- 搜索与筛选
- 用户认证
- 评论、收藏与评分
- 技能版本追踪
- Web 界面与后端 API 集成能力

## 任务计划

当前进度：

- 后端已完成
- 前端已完成
- 下一阶段将开发 CLI 工具

接下来重点任务：

- 开发用于操作本地 SkillShub 的 CLI 工具
- 支持登录、搜索、列表、详情查看、技能安装等流程
- 让本地部署的 SkillShub 更适合终端使用和自动化调用

## 本地化部署定位

如果你希望实现以下目标，SkillShub 会比较合适：

- 建立自己的本地技能仓库
- 在局域网、家庭服务器或 VPS 上部署私有 SkillShub
- 不依赖第三方托管平台
- 把数据、账号体系和部署流程掌握在自己手里

## 技术栈

| 组件 | 技术 |
|------|------|
| 后端 | Rust + Axum + SQLx |
| 前端 | React 18 + Vite + Tailwind CSS |
| 数据库 | PostgreSQL |
| 缓存 | Redis |
| 部署 | Docker + Docker Compose + Nginx |

## 快速开始

### 环境要求

- Docker 24+
- Docker Compose
- Rust 1.94+（用于后端开发）
- Node.js 18+（用于前端开发）

### 使用 Docker Compose 启动

```bash
git clone https://github.com/heibailouzhu/skillshub.git
cd skillshub
docker-compose up -d
```

启动后可访问：

- 前端：`http://localhost`
- 后端健康检查：`http://localhost:8080/health`

### 环境变量配置

后端示例配置：

```bash
cp backend/.env.example backend/.env
```

前端示例配置：

```bash
cp frontend/.env.example frontend/.env
```

复制后，请根据你的本地数据库、Redis 和 JWT 配置进行修改，再用于正式环境。

## 文档

- [English README](README.md)
- [快速导航](docs/GETTING-STARTED.md)
- [API 文档](docs/API.md)
- [部署指南](docs/DEPLOYMENT.md)
- [架构设计](docs/ARCHITECTURE.md)
- [贡献指南](CONTRIBUTING.md)

## 项目结构

```text
skillshub/
├── backend/            # Rust 后端 API
├── frontend/           # React 前端
├── docs/               # 项目文档
├── docker-compose.yml  # 本地部署入口
├── README.md           # 英文版 README
└── README-zh.md        # 中文版 README
```

## 开源发布说明

- 公开前请再次检查 `.env` 和部署配置
- 不要提交真实密码、数据库连接串或 JWT 密钥
- 公共仓库建议只保留 `.env.example` 作为配置示例

## 贡献

欢迎提交 Issue 和 Pull Request。提交前建议先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

## 许可证

本项目基于 [MIT License](LICENSE) 开源。

## 相关链接

- GitHub 仓库：https://github.com/heibailouzhu/skillshub
- Issues：https://github.com/heibailouzhu/skillshub/issues

本地部署自己的 SkillShub，让你以更可控的方式搭建和运营专属技能平台。
