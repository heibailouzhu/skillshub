# Contributing to SkillShub

> Thank you for your interest in contributing to SkillShub!
> 感谢您对 SkillShub 贡献的兴趣！

---

## 🤝 How to Contribute / 如何贡献

### Reporting Bugs / 报告 Bug

If you find a bug, please open an issue on GitHub with:

如果您发现了 bug，请在 GitHub 上提交 issue，包含：

1. A clear description of the problem / 问题的清晰描述
2. Steps to reproduce the problem / 重现问题的步骤
3. Expected behavior / 预期的行为
4. Actual behavior / 实际的行为
5. Screenshots (if applicable) / 截图（如果适用）

### Suggesting Enhancements / 提出改进建议

We welcome enhancement suggestions! Please:

我们欢迎改进建议！请：

1. Check if the suggestion already exists / 检查建议是否已存在
2. Provide a clear description / 提供清晰的描述
3. Explain why this enhancement would be useful / 解释为什么这个改进有用

---

## 🛠️ Development Setup / 开发环境搭建

### Backend / 后端

```bash
cd backend

# Install dependencies / 安装依赖
cargo build

# Run tests / 运行测试
cargo test

# Run the server / 运行服务器
cargo run
```

### Frontend / 前端

```bash
cd frontend

# Install dependencies / 安装依赖
npm install

# Run development server / 运行开发服务器
npm run dev

# Run tests / 运行测试
npm run test

# Build for production / 构建生产版本
npm run build
```

---

## 📝 Code Style / 代码规范

### Rust

- Use `cargo fmt` for formatting / 使用 `cargo fmt` 格式化代码
- Use `cargo clippy` for linting / 使用 `cargo clippy` 进行代码检查

### TypeScript/JavaScript

- Follow ESLint rules / 遵循 ESLint 规则
- Use `npm run lint` to check / 使用 `npm run lint` 检查
- Use `npm run format` to format / 使用 `npm run format` 格式化

---

## 📦 Commit Guidelines / 提交规范

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

遵循 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
feat: add new feature
fix: fix a bug
docs: update documentation
style: code formatting
refactor: code refactoring
test: add or update tests
chore: build process or auxiliary tool changes
```

---

## 🧪 Testing / 测试

Before submitting a pull request, please ensure:

在提交 pull request 之前，请确保：

- All tests pass / 所有测试通过
- Code is formatted / 代码已格式化
- No linting errors / 没有代码检查错误

```bash
# Run all tests / 运行所有测试
cd backend && cargo test
cd frontend && npm test
```

---

## 📄 Pull Request Process / Pull Request 流程

1. Fork the repository / Fork 仓库
2. Create a branch / 创建分支
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. Commit your changes / 提交更改
   ```bash
   git commit -m "feat: add new feature"
   ```
4. Push to the branch / 推送到分支
   ```bash
   git push origin feature/your-feature-name
   ```
5. Open a Pull Request / 打开 Pull Request

---

## 🌟 Code of Conduct / 行为准则

- Be respectful and inclusive / 保持尊重和包容
- Provide constructive feedback / 提供建设性反馈
- Focus on what is best for the community / 关注对社区最有利的事情

---

**Thank you for contributing! / 感谢您的贡献！** 🎉
