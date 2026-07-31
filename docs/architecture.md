# MedNotes — Architecture

## Overview

MedNotes is a healthcare-record platform built around the concept of a **Clinical Canvas** — a de-identified, longitudinal health record for each patient. The platform enables doctors, laboratories, and diagnostic centers to contribute clinical data while maintaining strict access controls and professional accountability.

## Technology Stack

| Layer | Technology |
|---|---|
| Frontend | React + Vite (JavaScript) |
| Backend | Node.js + Express (JavaScript) |
| Database | PostgreSQL |
| ORM | Prisma |
| API Style | REST, versioned under `/api/v1` |
| Dev Database | Docker Compose (PostgreSQL) |
| Code Quality | ESLint + Prettier |
| Version Control | Git |

## Repository Structure

```
mednotes/
├── frontend/          # React/Vite SPA
├── backend/           # Node.js/Express API
├── database/          # Database utilities & seeds (future)
├── docs/              # Project documentation
├── tests/             # Test suites (future)
├── docker-compose.yml # Local PostgreSQL
├── .env.example       # Environment variable template
└── package.json       # Root workspace scripts
```

## System Architecture

```
┌─────────────┐      ┌──────────────┐      ┌────────────┐
│   React     │─────▶│   Express    │─────▶│ PostgreSQL │
│   (Vite)    │ HTTP │   API        │Prisma│            │
│             │◀─────│   /api/v1    │◀─────│            │
└─────────────┘      └──────────────┘      └────────────┘
     :5173                :3001                :5432
```

## Backend Request Flow

The backend follows a layered architecture with strict separation of concerns:

```
HTTP Request
     ↓
Route          → Defines endpoints, delegates to controllers
     ↓
Controller     → Handles HTTP request/response, calls services
     ↓
Service        → Business logic, orchestrates repositories
     ↓
Repository     → Data access via Prisma
     ↓
PostgreSQL
```

### Layer Responsibilities

- **Routes**: Define HTTP endpoints and bind them to controllers. No logic.
- **Controllers**: Parse request parameters, call services, format HTTP responses.
- **Services**: Contain business logic. Orchestrate one or more repositories.
- **Repositories**: Direct database access through Prisma. No business logic.
- **Middleware**: Cross-cutting concerns (error handling, auth — future, validation — future).

## Architecture Decisions

### Monorepo with Separate Applications
Frontend and backend are separate applications within a single repository. This enables independent deployability while keeping the codebase unified for development.

### JavaScript (Not TypeScript)
The project uses JavaScript throughout to reduce build complexity and maintain a simpler toolchain.

### REST API (Not GraphQL)
REST was chosen for its simplicity, widespread tooling support, and alignment with the straightforward CRUD operations the platform requires.

### Prisma ORM
Prisma provides type-safe database access, schema-as-code, and excellent migration tooling — critical for a healthcare application where data integrity is paramount.

### PostgreSQL
PostgreSQL was selected for its robustness, ACID compliance, JSON support, and suitability for healthcare data requiring relational integrity.

### Versioned API Routes
All API routes are versioned under `/api/v1` to allow future breaking changes without disrupting existing clients.

### Docker Compose for Local Development
A containerized PostgreSQL instance ensures consistent development environments across team members.
