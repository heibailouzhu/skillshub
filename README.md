# Local SkillShub Deployment

English | [中文说明](README-zh.md)

> Deploy your own local SkillShub to privately manage, search, and share AI skills.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Rust](https://img.shields.io/badge/rust-1.94-orange.svg)](https://www.rust-lang.org/)
[![React](https://img.shields.io/badge/react-18-61DAFB.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/node.js-18+-339933.svg)](https://nodejs.org/)

## Overview

SkillShub is a self-hosted platform for building your own local AI skill hub.
It is designed for developers, teams, and organizations that want to deploy SkillShub on their own infrastructure and keep control of data, access, and workflow.

This project was completed by OpenClaw.

Repository: `https://github.com/heibailouzhu/skillshub`

## Why SkillShub

- Self-host your own SkillShub for local network or private server use
- Manage AI skills in one place instead of scattered local folders
- Search skills quickly with structured metadata and full-text search
- Support team collaboration with comments, favorites, and ratings
- Keep deployment simple with Docker Compose and a clear service split

## Core Capabilities

- Skill publishing and management
- Search and filtering
- User authentication
- Comments, favorites, and ratings
- Version tracking for skills
- Web UI plus backend API for integration

## Roadmap

Current progress:

- Backend development completed
- Frontend development completed
- CLI tool development planned as the next major milestone

Next task focus:

- Build a CLI tool for interacting with your local SkillShub
- Support login, search, list, detail lookup, and skill installation flows
- Make local SkillShub easier to use from terminals and automation scripts

## Local-First Positioning

SkillShub is especially suitable if you want to:

- build a local internal skill library
- deploy your own private SkillShub on a LAN or VPS
- avoid depending on third-party hosted platforms
- keep your data, user accounts, and deployment process under your control

## Tech Stack

| Component | Technology |
|-----------|------------|
| Backend | Rust + Axum + SQLx |
| Frontend | React 18 + Vite + Tailwind CSS |
| Database | PostgreSQL |
| Cache | Redis |
| Deployment | Docker + Docker Compose + Nginx |

## Quick Start

### Prerequisites

- Docker 24+
- Docker Compose
- Rust 1.94+ for backend development
- Node.js 18+ for frontend development

### Run with Docker Compose

```bash
git clone https://github.com/heibailouzhu/skillshub.git
cd skillshub
docker-compose up -d
```

After startup, access the app at:

- Frontend: `http://localhost`
- Backend health check: `http://localhost:8080/health`

### Environment Setup

Backend example config:

```bash
cp backend/.env.example backend/.env
```

Frontend example config:

```bash
cp frontend/.env.example frontend/.env
```

Then update the copied files with your local database, Redis, and JWT settings before production use.

## Documentation

- [Chinese README](README-zh.md)
- [Getting Started](docs/GETTING-STARTED.md)
- [API Documentation](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [Contributing Guide](CONTRIBUTING.md)

## Project Structure

```text
skillshub/
├── backend/            # Rust backend API
├── frontend/           # React frontend
├── docs/               # Project documentation
├── docker-compose.yml  # Local deployment entry
├── README.md           # English README
└── README-zh.md        # Chinese README
```

## Open Source Notes

- Review `.env` and deployment files before publishing your own fork
- Never commit real passwords, database URLs, or JWT secrets
- Prefer `.env.example` files for public configuration examples

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## License

This project is licensed under the [MIT License](LICENSE).

## Links

- GitHub Repository: https://github.com/heibailouzhu/skillshub
- Issues: https://github.com/heibailouzhu/skillshub/issues

Local SkillShub Deployment helps you deploy and operate your own SkillShub with full control.
