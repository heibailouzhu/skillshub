# SkillShub 容器化部署

## 概览

本仓库使用根目录 `docker-compose.yml` 启动完整栈：

- `postgres`
- `redis`
- `backend`
- `frontend`

默认端口：

- 前端：`80`
- 后端：`8080`
- PostgreSQL：`5432`
- Redis：`6379`

## 前置要求

- Docker 24+
- Docker Compose v2

## 启动步骤

```bash
git clone https://github.com/heibailouzhu/skillshub.git
cd skillshub
docker compose up -d --build
```

首次启动后可检查：

```bash
docker compose ps
docker compose logs -f backend
docker compose logs -f frontend
```

## 访问入口

- 前端首页：`http://localhost`
- 后端健康检查：`http://localhost:8080/health`
- OpenAPI JSON：`http://localhost:8080/api/docs/openapi.json`

说明：

- `frontend` 容器暴露在 `80`
- `backend` 容器直接暴露在 `8080`
- 容器间连接使用 compose 内部网络

## 默认配置

当前 `docker-compose.yml` 使用以下默认值：

- PostgreSQL 用户：`skillshub`
- PostgreSQL 密码：`skillshub_password`
- PostgreSQL 数据库：`skillshub`
- Redis 地址：`redis://redis:6379`
- Backend 数据库地址：`postgresql://skillshub:skillshub_password@postgres:5432/skillshub`

生产环境建议至少修改：

- PostgreSQL 密码
- `JWT_SECRET`
- `RUST_LOG`

## 常用运维命令

启动：

```bash
docker compose up -d
```

重建：

```bash
docker compose up -d --build
```

停止：

```bash
docker compose down
```

删除数据卷：

```bash
docker compose down -v
```

查看日志：

```bash
docker compose logs -f
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f postgres
docker compose logs -f redis
```

进入容器：

```bash
docker compose exec backend sh
docker compose exec postgres psql -U skillshub -d skillshub
docker compose exec redis redis-cli
```

## 健康检查

当前 compose 已为主要服务配置健康检查：

- `postgres`: `pg_isready`
- `redis`: `redis-cli ping`
- `backend`: `curl http://127.0.0.1:8080/health`
- `frontend`: `wget --spider http://localhost/`

如果 `frontend` 未正常启动，先看：

```bash
docker compose logs -f frontend
docker compose logs -f backend
```

如果 `backend` 未正常启动，重点检查：

- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- 数据库连接状态

## 升级与回滚

拉取新代码后：

```bash
git pull
docker compose up -d --build
```

如果需要回滚到旧镜像或旧代码版本，先切回目标代码，再重新执行：

```bash
docker compose up -d --build
```

## 故障排查

### 前端能打开，API 不通

优先检查：

- `backend` 容器是否健康
- 浏览器请求是否打到 `http://localhost:8080`
- 前端环境变量是否错误覆盖了 `VITE_API_BASE_URL`

### Backend 启动失败

优先检查：

- PostgreSQL 是否健康
- 数据库账号密码是否与 compose 一致
- `JWT_SECRET` 是否已设置

### CLI 连接本地部署实例

本地部署后可直接配置 CLI 指向当前服务：

```bash
cd your-project
skhub config
# 或
skhub config set-repo http://127.0.0.1:8080
```

简写命令同样可用：

```bash

```
