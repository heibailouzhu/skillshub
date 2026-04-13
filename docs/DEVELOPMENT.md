# SkillShub 本地开发与测试

## 环境要求

建议本地环境至少满足以下版本：

- Rust `1.94+`
- Node.js `22+`
- npm `10+`
- PostgreSQL `16+`
- Redis `7+`

## 后端开发

初始化环境变量：

```bash
cp backend/.env.example backend/.env
```

按需修改以下配置：

- `SERVER_ADDRESS`
- `DATABASE_URL`
- `JWT_SECRET`
- `REDIS_URL`

启动开发服务：

```bash
cd backend
cargo run
```

运行测试：

```bash
cd backend
cargo test
```

默认本地监听地址应为 `0.0.0.0:8080`。

## 前端开发

初始化环境变量：

```bash
cp frontend/.env.example frontend/.env
```

安装依赖并启动：

```bash
cd frontend
npm install
npm run dev
```

运行测试：

```bash
cd frontend
npm run test
npm run test:coverage
```

说明：

- 未设置 `VITE_API_BASE_URL` 时，前端默认使用同源 API
- 本地联调时可保持 `frontend/.env.example` 中的 `http://localhost:8080`

## CLI 开发

CLI 目录为 `cli/`，命令名为 `skhub`。

本地开发命令：

```bash
cd cli
cargo check
cargo test
cargo run -- --help
```

当前 CLI 主要命令：

```bash
skhub install <slug> --codex
skhub install <slug> --cursor
skhub install <slug> --claude
skhub install <slug> --openclaw
skhub config
skhub config set-repo <url>
```

## 本地联调

如果后端运行在本机 `8080`，可以把 CLI 指向本地 registry：

```bash
skhub config set-repo http://127.0.0.1:8080
```

建议联调顺序：

1. 启动 PostgreSQL 与 Redis
2. 启动后端 `cargo run`
3. 启动前端 `npm run dev`
4. 在任意测试项目目录执行 `skhub install ...`

## 常见问题

前端请求失败时，优先检查：

- 后端是否运行在 `8080`
- `VITE_API_BASE_URL` 是否指向正确地址
- 浏览器控制台是否存在跨域或认证错误

CLI 安装失败时，优先检查：

- `skhub config` 中的 repository 是否正确
- 后端是否已暴露 `/api/registry/skills/:slug`
- 目标项目目录是否具有写入权限
