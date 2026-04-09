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
- a TypeScript CLI published as `skhub` for installing skills into Codex, Cursor, Claude Code, and OpenClaw workspaces

## Current Status

- Backend implemented and covered by automated tests
- Frontend implemented and wired to the backend API
- CLI implemented with `install` and `config` flows
- Docker Compose deployment available for the full stack

## Core Capabilities

- Publish and manage skills with version history
- Browse, search, comment, favorite, and rate skills
- Download canonical skill bundles through registry APIs
- Install skills into the current project with:
  `skhub install <slug> --codex|--cursor|--claude|--openclaw`
- Configure registry endpoints with:
  `skhub config`
  `skhub config repositories <url>`
  `skhub config rep <url>`

## Architecture

Runtime components:

- `frontend`: React + Vite UI served by Nginx in Docker
- `backend`: Rust + Axum API with OpenAPI output
- `postgres`: primary data store
- `redis`: cache layer
- `cli`: local `skhub` command for project-scoped skill installation

Registry installation endpoints:

- `GET /api/registry/skills/:slug`
- `GET /api/registry/skills/:slug/versions/:version/bundle`

## Quick Start

### Prerequisites

- Docker 24+
- Docker Compose v2

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

## Local Development

For backend, frontend, and CLI development workflows, use [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md).

Typical commands:

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

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Container Deployment](docs/DEPLOYMENT.md)
- [Development Guide](docs/DEVELOPMENT.md)
- [Contributing](CONTRIBUTING.md)

## Project Structure

```text
skillshub/
├── backend/            # Rust backend API and migrations
├── frontend/           # React frontend
├── cli/                # skhub CLI
├── docs/               # current project documentation
├── docker-compose.yml  # full-stack local deployment
├── README.md
└── README-zh.md
```

## License

This project is licensed under the [MIT License](LICENSE).
