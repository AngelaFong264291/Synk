# Synk

**React + TypeScript** (Vite) and **PocketBase** (auth, REST/realtime API, SQLite).

## Layout

- `frontend/` — SPA with React Router (`/`, `/about`, `/login`, `/dashboard`). PocketBase JS client in `src/lib/pocketbase.ts`, auth wiring under `src/auth/`.
- `pocketbase/` — `docker-compose.yml` to run PocketBase on port **8090** (admin UI at `http://127.0.0.1:8090/_/`).

## Quick start

1. **Backend:** from `pocketbase/`, run `docker compose up` (creates `pb_data/`). Complete the admin setup in the browser, then create a user in **Collections → users** for app login.
2. **Frontend:** copy `frontend/.env.example` to `frontend/.env` if you need a non-default API URL.
3. **Install & dev:** `make install` then `make dev` (or `cd frontend && npm install && npm run dev`). To start **backend and frontend together**, use `make all`.

## Makefile

Run `make` for targets: `install`, `dev`, `all`, `lint`, `fmt`, `test`, `build`, `ci`, `docker-run`, etc.

## Optional Conda

`environment.yml` pins Node 20+ via conda-forge; use `conda env create -f environment.yml` if you prefer Conda over a system Node.
