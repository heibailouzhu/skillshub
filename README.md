# SkillShub

English | [中文说明](README-zh.md)

> A self-hosted skill hub for publishing, browsing, rating, versioning, and installing AI skills through a web UI and the `skhub` CLI.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Rust](https://img.shields.io/badge/rust-1.94-orange.svg)](https://www.rust-lang.org/)
[![React](https://img.shields.io/badge/react-19-61DAFB.svg)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/node.js-22+-339933.svg)](https://nodejs.org/)

## Overview

SkillShub is a local-first, self-hosted platform for teams or individuals who want to run their own private AI skill registry.
It includes:

- a Rust backend API for auth, skills, versions, comments, favorites, ratings, and registry bundle delivery
- a React frontend for browsing and managing skills
- a Rust CLI published as `skhub` for packaging, publishing, and installing skills into Codex, Cursor, Claude Code, and OpenClaw workspaces

## Current Status

- Backend implemented and covered by automated tests
- Frontend implemented and wired to the backend API
- Rust CLI implemented with `config`, `login`, `logout`, `whoami`, `package`, `publish`, and `install`
- Docker Compose deployment available for the full stack

## Core Capabilities

- Publish and manage skills with version history
- Browse, search, comment, favorite, and rate skills
- Download canonical skill bundles through registry APIs
- Package local skill folders into zip archives with:
  `skhub package <dir>`
- Publish packaged skill archives with:
  `skhub publish <zip> --title "My Skill"`
- Install skills into the current project with:
  `skhub install <slug> --codex|--cursor|--claude|--openclaw`
- Configure registry endpoints with:
  `skhub config set-repo <url>`
  `skhub config show`
- Manage login state with:
  `skhub login --username <name> --password <password>`
  `skhub whoami`
  `skhub logout`

## Architecture

Runtime components:

- `frontend`: React + Vite UI served by Nginx in Docker
- `backend`: Rust + Axum API with OpenAPI output
- `postgres`: primary data store
- `redis`: cache layer
- `cli`: Rust `skhub` command for packaging, publishing, and project-scoped installation

Registry installation endpoints:

- `POST /api/auth/login`
- `POST /api/skills/upload`
- `GET /api/registry/skills/:slug`
- `GET /api/registry/skills/:slug/versions/:version/bundle`
- `GET /api/skills/:id/archive`

## Quick Start

### Prerequisites

- Docker 24+
- Docker Compose v2
- Rust 1.94+ for local Rust CLI development

### Start the stack

```bash
git clone https://github.com/heibailouzhu/skillshub.git
cd skillshub
docker compose up -d --build
```

Available endpoints after startup:

- Frontend: `http://localhost`
- Backend health check: `http://localhost:8080/health`
- OpenAPI JSON: `http://localhost:8080/api/docs/openapi.json`

### Production Admin Bootstrap

To provision an administrator account at startup, set all three backend environment variables:

- `ADMIN_USERNAME`
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`

Notes:

- The backend creates the admin user if it does not exist.
- If a user with the same username or email already exists, the backend upgrades that user to `is_admin = true`.
- `ADMIN_PASSWORD` must be at least 12 characters.
- If any of the three variables is missing, admin bootstrap is skipped.

## Local Development

For backend, frontend, and CLI development workflows, use [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md) and [docs/CLI-RUST.md](docs/CLI-RUST.md).

Typical commands:

```bash
# backend
cd backend
cargo test

# frontend
cd frontend
npm install
npm run dev

# rust cli
cd cli
cargo check
cargo run -- --help
```

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Container Deployment](docs/DEPLOYMENT.md)
- [Development Guide](docs/DEVELOPMENT.md)
- [Rust CLI Guide](docs/CLI-RUST.md)
- [Contributing](CONTRIBUTING.md)

## Project Structure

```text
skillshub/
├── backend/            # Rust backend API and migrations
├── frontend/           # React frontend
├── cli/           # Rust skhub CLI
├── docs/               # current project documentation
├── docker-compose.yml  # full-stack local deployment
├── README.md
└── README-zh.md
```

## License

This project is licensed under the [MIT License](LICENSE).
