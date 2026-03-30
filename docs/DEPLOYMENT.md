# SkillShub 部署文档

## 📋 目录

- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [Docker 部署](#docker-部署)
- [生产环境部署](#生产环境部署)
- [监控与日志](#监控与日志)
- [故障排查](#故障排查)

---

## 🔧 环境要求

### Docker 部署
- Docker Engine 20.10+
- Docker Compose 2.0+
- 至少 2GB 内存
- 至少 10GB 磁盘空间

### 手动部署
- Rust 1.94.0+
- Node.js 22+
- PostgreSQL 16+
- Redis 7+

---

## 🚀 快速开始

### 1. 克隆仓库
```bash
git clone https://github.com/your-username/skillshub.git
cd skillshub
```

### 2. 配置环境变量
```bash
# 后端环境变量
cp backend/.env.example backend/.env
# 编辑 backend/.env，配置数据库、Redis、JWT 等

# 前端环境变量
cp frontend/.env.example frontend/.env
# 编辑 frontend/.env，配置 API 地址等
```

### 3. 使用 Docker Compose 启动
```bash
docker-compose up -d
```

### 4. 验证服务
```bash
# 检查服务状态
docker-compose ps

# 检查健康状态
curl http://localhost/health

# 访问前端
open http://localhost
```

---

## 🐳 Docker 部署

### 启动所有服务
```bash
docker-compose up -d
```

### 查看日志
```bash
# 查看所有服务日志
docker-compose logs -f

# 查看特定服务日志
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
docker-compose logs -f redis
```

### 停止服务
```bash
docker-compose down
```

### 停止并删除数据卷
```bash
docker-compose down -v
```

### 重新构建并启动
```bash
docker-compose up -d --build
```

### 进入容器
```bash
# 进入后端容器
docker-compose exec backend sh

# 进入数据库容器
docker-compose exec postgres psql -U skillshub -d skillshub

# 进入 Redis 容器
docker-compose exec redis redis-cli
```

---

## 🌐 生产环境部署

### 1. 准备服务器
```bash
# 安装 Docker 和 Docker Compose
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# 验证安装
docker --version
docker-compose --version
```

### 2. 配置环境变量
创建 `backend/.env.production`:
```bash
# 数据库配置
DATABASE_URL=postgresql://skillshub:strong_password_here@postgres:5432/skillshub

# Redis 配置
REDIS_URL=redis://redis:6379

# JWT 配置
JWT_SECRET=your-super-secret-jwt-key-at-least-32-characters-long

# 日志配置
RUST_LOG=info

# 缓存配置
CACHE_TTL=3600
```

### 3. 使用生产配置启动
```bash
# 使用生产环境变量
docker-compose --env-file backend/.env.production up -d
```

### 4. 配置 HTTPS (推荐)
使用 Nginx 或 Traefik 反向代理:

**Nginx 配置示例:**
```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 5. 配置 SSL 证书 (Let's Encrypt)
```bash
# 安装 Certbot
sudo apt-get install certbot python3-certbot-nginx

# 获取证书
sudo certbot --nginx -d your-domain.com

# 自动续期
sudo certbot renew --dry-run
```

### 6. 数据备份
创建定时任务备份数据库:
```bash
# 编辑 crontab
crontab -e

# 每天凌晨 2 点备份数据库
0 2 * * * docker-compose exec -T postgres pg_dump -U skillshub skillshub | gzip > /backup/skillshub_$(date +\%Y\%m\%d).sql.gz
```

### 7. 日志轮转
配置 Docker 日志轮转 (`/etc/docker/daemon.json`):
```json
{
  "log-driver": "json-file",
  "log-opts": {
    "max-size": "10m",
    "max-file": "3"
  }
}
```

---

## 📊 监控与日志

### 健康检查
```bash
# 检查所有服务健康状态
docker-compose ps

# 手动健康检查
curl http://localhost/health
curl http://localhost:8080/health
```

### 查看资源使用
```bash
# 查看容器资源使用
docker stats

# 查看磁盘使用
docker system df

# 清理未使用的资源
docker system prune -a
```

### 日志聚合
建议使用以下工具进行日志聚合:
- **ELK Stack** (Elasticsearch, Logstash, Kibana)
- **Grafana Loki**
- **Datadog**
- **Sentry** (错误追踪)

---

## 🔍 故障排查

### 常见问题

#### 1. 服务无法启动
```bash
# 查看服务日志
docker-compose logs backend

# 检查端口占用
netstat -tuln | grep 8080
netstat -tuln | grep 5432

# 检查磁盘空间
df -h
```

如果 `docker-compose up -d` 卡在 `container skillshub-backend is unhealthy`，且后端日志已经出现 `Server starting on 0.0.0.0:8080`，通常不是应用启动失败，而是健康检查命令失败。

当前后端健康检查依赖容器内的 `curl`:
```bash
curl http://localhost:8080/health
```

如果自定义了 `backend/Dockerfile`，需要确认运行时镜像安装了 `curl`，否则 Compose 会把容器标记为 `unhealthy`，即使服务本身已经成功启动。

#### 2. 数据库连接失败
```bash
# 进入数据库容器
docker-compose exec postgres psql -U skillshub -d skillshub

# 检查连接数
SELECT count(*) FROM pg_stat_activity;

# 查看数据库大小
SELECT pg_size_pretty(pg_database_size('skillshub'));
```

#### 3. Redis 连接失败
```bash
# 进入 Redis 容器
docker-compose exec redis redis-cli

# 检查连接
ping

# 检查内存使用
info memory
```

#### 4. 内存不足
```bash
# 查看 Docker 内存限制
docker stats --no-stream

# 增加内存限制 (在 docker-compose.yml 中)
services:
  backend:
    mem_limit: 1g
```

#### 5. 磁盘空间不足
```bash
# 清理未使用的镜像和容器
docker system prune -a --volumes

# 清理 PostgreSQL 旧数据
docker-compose exec postgres vacuumdb -U skillshub -d skillshub --analyze --full
```

### 获取支持
- 查看 GitHub Issues: https://github.com/your-username/skillshub/issues
- 提交 Bug Report
- 加入 Discord 社区

---

## 📚 相关文档

- [运维指南](./OPERATIONS.md)
- [API 文档](./API.md)
- [开发指南](./backend/README.md)
- [前端开发指南](./frontend/README.md)

---

## 🔄 更新与升级

### 更新代码
```bash
# 拉取最新代码
git pull origin main

# 重新构建并启动
docker-compose up -d --build

# 查看更新日志
docker-compose logs -f
```

### 数据库迁移
```bash
# 进入后端容器
docker-compose exec backend sh

# 手动运行迁移
./backend migrate
```

### 回滚
```bash
# 回滚到之前的版本
git checkout <previous-commit-hash>
docker-compose up -d --build
```

---

**部署文档最后更新:** 2026-03-08
**维护者:** 清风
