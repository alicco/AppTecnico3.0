# CLAUDE.md — AppTecnico3.0 (KM Insight)

## Project Overview

Service technician diagnostic tool for Konica Minolta printers. Provides error code lookup, spare parts search, DIP switch configuration viewing, and maintenance scheduling. Beta/development status.

## Architecture

Full-stack application with two independent services:

- **Frontend**: Next.js 16 (React 19) with TypeScript, MUI 7, Tailwind CSS v4
- **Backend**: Rust (Axum 0.7) REST API with SQLx
- **Database**: Supabase-hosted PostgreSQL with `uuid-ossp` and `pg_trgm` extensions

## Repository Structure

```
/
├── frontend/                   # Next.js frontend (App Router)
│   ├── app/
│   │   ├── page.tsx            # Main page (error search, parts, maintenance)
│   │   ├── layout.tsx          # Root layout with theme provider
│   │   ├── actions/
│   │   │   ├── search.ts       # Server actions: getPrinters, searchErrors, searchSpareParts, etc.
│   │   │   └── import.ts       # Server action: importErrorCodes
│   │   ├── parts/page.tsx      # Dedicated spare parts page
│   │   └── admin/import/page.tsx # Data import admin page
│   ├── components/
│   │   ├── ThemeRegistry/      # MUI dark theme provider (cyan primary, pink secondary)
│   │   └── ui/                 # Reusable UI components
│   │       ├── ErrorCard.tsx           # Error display with DIP switch refs & linked parts
│   │       ├── DipSwitchViewer.tsx     # Interactive DIP switch matrix
│   │       ├── AutocompleteSearch.tsx  # Error code autocomplete
│   │       ├── PartSearchAutocomplete.tsx # Part code search
│   │       └── SparePartsSearch.tsx    # Parts modal search
│   ├── lib/
│   │   ├── supabase.ts         # Supabase client init
│   │   └── redis.ts            # Redis client (configured but unused)
│   ├── data/                   # Static JSON data (maintenance schedules)
│   ├── public/data/            # Public static data
│   ├── schema.sql              # Database schema reference
│   ├── package.json
│   ├── tsconfig.json           # Strict mode, paths: @/* -> ./*
│   ├── next.config.ts          # 50MB server action body limit
│   ├── eslint.config.mjs       # next/core-web-vitals + next/typescript
│   └── postcss.config.mjs
│
├── backend/                    # Rust Axum API server
│   ├── src/
│   │   ├── main.rs             # Server setup, routes, DB migrations
│   │   ├── handlers.rs         # All API endpoint handler functions
│   │   └── models.rs           # Data structs (Serialize/Deserialize)
│   ├── migrations/             # SQL migration files
│   ├── Cargo.toml
│   └── .env                    # DATABASE_URL, REDIS_URL, PORT
│
├── docker-compose.yml          # Backend container config
├── *.py                        # Data extraction/processing scripts (PDF, CSV)
└── README.md                   # Setup guide (Italian)
```

## Development Setup

### Frontend

```bash
cd frontend
npm install
npm run dev          # Starts on http://localhost:3000
```

**Required env vars** (set in `.env.local` or environment):
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anonymous key
- `NEXT_PUBLIC_API_URL` — Backend URL (default: `http://localhost:8000`)

### Backend

```bash
cd backend
cargo run            # Starts on http://localhost:8000 (or PORT env var)
```

**Required env vars** (set in `.env`):
- `DATABASE_URL` — PostgreSQL connection string

The backend runs automatic migrations on startup (creates `dip_switches` table, enables `pg_trgm`, adds columns if missing, deduplicates printer records).

### Docker

```bash
docker-compose up    # Starts backend on port 8000
```

## Available Commands

### Frontend (`frontend/`)

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server with hot reload |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | Run ESLint (next/core-web-vitals + TypeScript) |

### Backend (`backend/`)

| Command | Description |
|---------|-------------|
| `cargo run` | Run the API server |
| `cargo build` | Build the binary |
| `cargo build --release` | Production build |

## API Routes (Backend)

```
GET  /api/health          Health check (returns "OK")
GET  /api/printers         List all printer models
GET  /api/errors           Search error codes (?model=...&code=...)
GET  /api/dipswitches      DIP switch configs (?model=...)
GET  /api/parts            Search spare parts (?q=...&model=...)
GET  /api/parts/sections   Part sections for a model (?model=...)
GET  /api/maintenance      Maintenance schedule (?model=...)
POST /api/import           Import error codes (multipart CSV/XLSX)
POST /api/import-dipsw     Import DIP switch data (JSON body)
```

## Frontend Routes

```
/                   Main page — error code search, parts search, maintenance
/parts              Dedicated spare parts browsing page
/admin/import       Data import admin interface
```

## Database Schema

Key tables (see `frontend/schema.sql` for full DDL):

- **printers** — Printer models (`id`, `model_name` UNIQUE)
- **error_codes** — Error diagnostics (`printer_id` FK, `code`, `cause`, `measures`, `solution`, `faulty_part_isolation`; UNIQUE on `printer_id, code`)
- **spare_parts** — Parts catalog (`oem_code` UNIQUE, `description`, `ranking` 1-5)
- **error_parts** — M2M: errors ↔ spare parts (with per-error `ranking`)
- **sections** — Hierarchical part sections (`printer_id` FK, `parent_section_id` self-ref)
- **section_parts** — M2M: sections ↔ spare parts
- **dip_switches** — DIP switch configurations (`model_name`, `switch_number`, `bit_number`)
- **manual_spare_parts** — Parts extracted from service manuals

## Key Conventions

### Code Patterns

- **Frontend components**: PascalCase filenames, functional components with hooks
- **Server actions**: Marked with `'use server'` in `app/actions/`; all data fetching goes through these
- **Client components**: Marked with `'use client'` at top of file
- **State management**: Local `useState` hooks; no global store. `localStorage` for cart persistence
- **Search debouncing**: 300ms via `use-debounce`
- **Path aliases**: `@/*` maps to project root (configured in `tsconfig.json`)

### Backend Patterns

- **Shared state**: `Arc<AppState>` containing `PgPool` and `priority_parts: HashSet<String>`
- **Handler functions**: All in `handlers.rs`, extracted via Axum's `State` and `Query` extractors
- **Error handling**: `tracing` crate for logging; handlers return JSON errors
- **Migrations**: Inline in `main.rs` (not a separate migration runner)

### Model Aliasing

The system normalizes equivalent printer models to avoid data duplication:
- C4065/C4070 → C4080
- C7090 → C7100
- C6085 → C6100
- C5065/C5070 → C5080

This aliasing is applied in both frontend server actions and backend query logic.

### Naming

- **Files/directories**: kebab-case for directories, PascalCase for component files
- **TypeScript variables**: camelCase
- **Database columns/tables**: snake_case
- **Rust structs**: PascalCase, fields snake_case with `#[serde(rename)]` where needed

### UI Theme

Dark mode by default using MUI's `createTheme`:
- Primary color: cyan
- Secondary color: pink
- Background: dark surfaces

## Testing

No formal test suite exists. Quality is maintained through:
- TypeScript strict mode
- ESLint with Next.js recommended rules
- Rust compiler checks

## Important Notes

- The `docker-compose.yml` contains a database connection string — do not commit credentials changes
- Backend `.env` file contains database credentials — not committed to repo
- CORS is set to permissive (all origins allowed) — intended for development
- Server actions have a 50MB body size limit (for CSV/XLSX imports)
- Backend multipart uploads also limited to 50MB
- The `*.py` files at repo root are one-off data extraction scripts, not part of the application
- The application language/UI is primarily Italian
- Redis client code exists in `frontend/lib/redis.ts` but is not actively used
