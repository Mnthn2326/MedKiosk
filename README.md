# MedNotes

Healthcare record platform with Clinical Canvas — a de-identified, longitudinal health record for each patient.

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Docker](https://www.docker.com/) & Docker Compose
- [Git](https://git-scm.com/)

### 1. Clone & Install

```bash
git clone <repository-url>
cd mednotes
npm run install:all
```

### 2. Environment Setup

```bash
cp .env.example .env
cp .env.example backend/.env
```

Edit `.env` files if you need to change defaults.

### 3. Start PostgreSQL

```bash
npm run db:up
```

### 4. Generate Prisma Client

```bash
npm run prisma:generate
```

### 5. Run Development Servers

```bash
npm run dev
```

This starts both:
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3001

### 6. Verify

- Open http://localhost:5173 — you should see the MedNotes status page
- Visit http://localhost:3001/api/v1/health — should return health JSON

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Run frontend + backend concurrently |
| `npm run dev:frontend` | Run frontend only |
| `npm run dev:backend` | Run backend only |
| `npm run db:up` | Start PostgreSQL container |
| `npm run db:down` | Stop PostgreSQL container |
| `npm run db:reset` | Reset PostgreSQL (destroys data) |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run Prisma migrations |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |

## Architecture

```
React/Vite ──▶ Express API ──▶ Prisma ──▶ PostgreSQL
  :5173           :3001                      :5432
```

See [docs/architecture.md](docs/architecture.md) for detailed architecture documentation.

## Documentation

- [Architecture](docs/architecture.md)
- [Product Requirements](docs/product-requirements.md)
- [Roles & Permissions](docs/roles-and-permissions.md)
- [Data Model](docs/data-model.md)

## Project Status

**Step 1: Foundation** ✅ — Project scaffolding, dev environment, connectivity verified.
