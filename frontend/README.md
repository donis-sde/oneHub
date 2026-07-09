# OneHub Frontend

Production-ready React frontend for the WATI OneHub backoffice admin panel. Fully decoupled from the backend — communicates exclusively via REST APIs.

## Prerequisites

- Node.js 20+
- Backend running at `http://localhost:3000` (see `../backend`)

## Quick Start

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The Vite dev server proxies `/api` requests to the backend.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server (port 5173) |
| `npm run build` | TypeScript check + production build |
| `npm run preview` | Preview production build |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm run typecheck` | TypeScript only |

## Environment Variables

Copy and configure as needed:

```bash
# .env (local development — uses Vite proxy when empty)
VITE_API_BASE_URL=
VITE_APP_ENV=local
```

For deployed environments, set `VITE_API_BASE_URL` to your backend URL at **build time**:

```bash
# Production example
VITE_API_BASE_URL=https://api.yourdomain.com
VITE_APP_ENV=production
```

| File | Environment |
|------|-------------|
| `.env` | Local |
| `.env.development` | Development |
| `.env.staging` | Staging |
| `.env.production` | Production |

## Authentication

The backend uses HttpOnly cookie authentication (`__wati_auth`). The frontend sends cookies automatically via `withCredentials: true` — no manual token storage required.

1. Sign in at `/login` with admin credentials
2. Session persists across page reloads via cookie
3. Sign out from the user menu in the sidebar

## Project Structure

```
src/
├── components/     # UI components (Shadcn + shared)
├── config/         # Navigation, environment
├── contexts/       # Auth, theme customization
├── layouts/        # App shell layout
├── lib/            # API client, query client, utils
├── pages/          # Route pages
├── routes/         # React Router config
├── services/       # Backend API services
└── types/          # TypeScript types
```

## Documentation

- [API Reference](./docs/API_REFERENCE.md) — All backend endpoints
- [Frontend Architecture](./docs/FRONTEND_ARCHITECTURE.md) — Design decisions, data flow, patterns

## Features

- Cookie-based authentication with protected routes
- 96 backend API endpoints integrated via service layer
- WABA tools, internal ops tools, data browsers, PRM gateway
- Customizable theme (light/dark + CSS variable overrides)
- Command palette navigation (`Cmd/Ctrl+K`)
- Responsive sidebar layout
- TanStack Query for caching and mutations
- Zod-validated forms with React Hook Form

## Backend

This frontend does **not** modify the backend. Start the backend separately:

```bash
cd ../backend
npm install
npm run dev   # http://localhost:3000
```

## Build for Production

```bash
npm run build
```

Output in `dist/`. Deploy to any static host (Vercel, Netlify, S3, etc.) with `VITE_API_BASE_URL` set at build time.
