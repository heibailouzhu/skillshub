# SkillShub 手工部署文档

本文档说明如何在不使用 Docker 的前提下，分别部署并启动以下组件：

- PostgreSQL
- Redis
- Backend（Rust / Axum）
- Frontend（React / Vite / Nginx）

默认假设服务器为 Ubuntu 22.04/24.04，域名为 `skillshub.example.com`，项目目录为 `/opt/skillshub`。如果你的环境不同，只需要替换对应路径、域名和端口即可。

## 1. 部署结构

推荐使用如下结构：

- PostgreSQL：`127.0.0.1:5432`
- Redis：`127.0.0.1:6379`
- Backend：`127.0.0.1:8080`
- Frontend：Nginx 监听 `80/443`，静态文件目录为 `/opt/skillshub/frontend/dist`

请求链路：

1. 浏览器访问 Nginx
2. Nginx 返回前端静态资源
3. 前端通过同源 `/api/*` 请求后端
4. Nginx 将 `/api/*` 反向代理到 `127.0.0.1:8080`

注意：

- 后端根路径 `/` 返回 `404` 是正常现象
- 后端健康检查地址是 `/health`
- OpenAPI JSON 地址是 `/api/docs/openapi.json`

## 2. 系统依赖

先安装基础依赖：

```bash
sudo apt update
sudo apt install -y \
  build-essential \
  pkg-config \
  curl \
  git \
  nginx \
  redis-server \
  postgresql \
  postgresql-contrib
```

安装 Node.js 22：

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
```

安装 Rust：

```bash
curl https://sh.rustup.rs -sSf | sh -s -- -y
source "$HOME/.cargo/env"
rustc --version
cargo --version
node --version
npm --version
```

## 3. 获取代码

```bash
sudo mkdir -p /opt
sudo chown "$USER":"$USER" /opt
git clone <your-repo-url> /opt/skillshub
cd /opt/skillshub
```

如果 `/opt` 不方便写入，也可以使用其他目录，例如 `/srv/skillshub` 或当前用户家目录。

## 4. 单独部署 PostgreSQL

启动并设置开机自启：

```bash
sudo systemctl enable postgresql
sudo systemctl start postgresql
sudo systemctl status postgresql
```

创建数据库用户和数据库：

```bash
sudo -u postgres psql
```

在 `psql` 中执行：

```sql
CREATE USER skillshub WITH PASSWORD 'change_this_password';
CREATE DATABASE skillshub OWNER skillshub;
\q
```

验证连接：

```bash
psql "postgresql://skillshub:change_this_password@127.0.0.1:5432/skillshub" -c "SELECT 1;"
```

## 5. 单独部署 Redis

启动并设置开机自启：

```bash
sudo systemctl enable redis-server
sudo systemctl start redis-server
sudo systemctl status redis-server
```

验证连接：

```bash
redis-cli -h 127.0.0.1 -p 6379 ping
```

预期返回：

```text
PONG
```

说明：

- 当前后端在 Redis 不可用时仍然可以启动，但缓存会被禁用
- 生产环境仍然建议正常启用 Redis

## 6. 部署 Backend

### 6.1 配置环境变量

在 `backend` 目录创建 `.env`：

```bash
cd /opt/skillshub/backend
cat > .env <<'EOF'
DATABASE_URL=postgresql://skillshub:change_this_password@127.0.0.1:5432/skillshub
REDIS_URL=redis://127.0.0.1:6379
JWT_SECRET=replace_with_a_long_random_secret_at_least_32_chars
SERVER_ADDRESS=127.0.0.1:8080
RUST_LOG=info
EOF
```

说明：

- `DATABASE_URL` 和 `JWT_SECRET` 是必填项
- `SERVER_ADDRESS` 如果不写，默认是 `0.0.0.0:8080`
- 推荐生产环境只监听 `127.0.0.1:8080`，由 Nginx 代理对外暴露

### 6.2 编译并启动

```bash
cd /opt/skillshub/backend
cargo build --release
./target/release/backend
```

后端启动时会自动执行 `backend/migrations` 目录中的 SQLx migrations，无需手工再跑一遍。

验证后端：

```bash
curl http://127.0.0.1:8080/health
curl http://127.0.0.1:8080/api/skills?page=1&page_size=6
```

### 6.3 配置 systemd

为了让后端后台运行并支持开机自启，创建 systemd 服务：

```bash
sudo tee /etc/systemd/system/skillshub-backend.service > /dev/null <<'EOF'
[Unit]
Description=SkillShub Backend
After=network.target postgresql.service redis-server.service
Requires=postgresql.service redis-server.service

[Service]
Type=simple
User=root
WorkingDirectory=/opt/skillshub/backend
ExecStart=/opt/skillshub/backend/target/release/backend
Restart=always
RestartSec=5
Environment=RUST_LOG=info

[Install]
WantedBy=multi-user.target
EOF
```

加载并启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable skillshub-backend
sudo systemctl start skillshub-backend
sudo systemctl status skillshub-backend
```

查看实时日志：

```bash
journalctl -u skillshub-backend -f
```

如果你已经创建了专门的部署用户，例如 `skillshub`，请把 `User=root` 改成对应用户，并保证 `/opt/skillshub` 可读可执行。

## 7. 部署 Frontend

### 7.1 安装依赖并构建

因为前端现在默认走同源 `/api`，生产环境下可以不设置 `VITE_API_BASE_URL`。

```bash
cd /opt/skillshub/frontend
npm ci
npm run build
```

构建完成后会生成：

```text
/opt/skillshub/frontend/dist
```

### 7.2 配置 Nginx

创建 Nginx 站点配置：

```bash
sudo tee /etc/nginx/sites-available/skillshub > /dev/null <<'EOF'
server {
    listen 80;
    server_name skillshub.example.com;

    root /opt/skillshub/frontend/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /health {
        proxy_pass http://127.0.0.1:8080/health;
        proxy_http_version 1.1;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
EOF
```

启用站点：

```bash
sudo ln -sf /etc/nginx/sites-available/skillshub /etc/nginx/sites-enabled/skillshub
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable nginx
sudo systemctl restart nginx
sudo systemctl status nginx
```

### 7.3 验证前端

```bash
curl -I http://127.0.0.1/
curl http://127.0.0.1/health
```

浏览器访问：

```text
http://your-server-ip/
```

或：

```text
http://skillshub.example.com/
```

## 8. 推荐启动顺序

非 Docker 环境下，建议严格按顺序启动：

1. PostgreSQL
2. Redis
3. Backend
4. Nginx / Frontend

对应检查命令：

```bash
systemctl status postgresql
systemctl status redis-server
systemctl status skillshub-backend
systemctl status nginx
```

## 9. 故障排查

### 9.1 前端页面提示“加载数据失败”

优先检查：

```bash
curl http://127.0.0.1:8080/health
curl "http://127.0.0.1:8080/api/skills?page=1&page_size=6"
curl "http://127.0.0.1/api/skills?page=1&page_size=6"
```

如果后端接口正常、但经过 Nginx 的 `/api` 不正常，通常是 Nginx 反向代理配置问题。

### 9.2 访问 `http://127.0.0.1:8080` 返回 404

这是正常现象。后端没有提供根路径 `/`，应访问：

- `http://127.0.0.1:8080/health`
- `http://127.0.0.1:8080/api/skills`

### 9.3 后端启动失败

检查日志：

```bash
journalctl -u skillshub-backend -n 200 --no-pager
```

重点确认：

- `DATABASE_URL` 是否正确
- PostgreSQL 是否可连接
- `JWT_SECRET` 是否已配置
- `SERVER_ADDRESS` 端口是否被占用

### 9.4 数据库迁移失败

先验证数据库连通性：

```bash
psql "postgresql://skillshub:change_this_password@127.0.0.1:5432/skillshub" -c "SELECT now();"
```

再确认迁移文件存在：

```bash
ls /opt/skillshub/backend/migrations
```

当前仓库包含以下迁移文件：

- `001_initial.sql`
- `002_fulltext_search.sql`
- `003_fix_rating_avg.sql`

### 9.5 Redis 未启动

当前后端会降级为“无缓存模式”，一般不会阻止服务启动，但日志中会出现类似警告。仍然建议尽快恢复 Redis：

```bash
sudo systemctl restart redis-server
redis-cli ping
```

## 10. 可选：配置 HTTPS

安装 Certbot：

```bash
sudo apt install -y certbot python3-certbot-nginx
```

签发证书：

```bash
sudo certbot --nginx -d skillshub.example.com
```

验证自动续期：

```bash
sudo certbot renew --dry-run
```

## 11. 更新流程

更新代码后，推荐按下面顺序执行：

```bash
cd /opt/skillshub
git pull

cd /opt/skillshub/backend
cargo build --release
sudo systemctl restart skillshub-backend

cd /opt/skillshub/frontend
npm ci
npm run build
sudo systemctl reload nginx
```

## 12. 最终验收

全部启动完成后，至少执行以下检查：

```bash
curl http://127.0.0.1:8080/health
curl "http://127.0.0.1:8080/api/skills?page=1&page_size=6"
curl http://127.0.0.1/health
curl "http://127.0.0.1/api/skills?page=1&page_size=6"
```

浏览器验收点：

1. 打开首页不再出现“加载数据失败”
2. 首页可以正常加载热门技能、分类、标签
3. 打开开发者工具，确认前端请求发往同源 `/api/*`

