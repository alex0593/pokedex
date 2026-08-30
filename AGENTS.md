# Repository Guidelines

## Project Structure & Module Organization

This is a full-stack Pokédex monorepo. `backend/` contains the asynchronous FastAPI application: route handlers live in `routers/`, API and cache logic in `services/`, SQLAlchemy/Pydantic models in `models/`, helpers in `utils/`, and static JSON/maps in `data/` and `assets/`. Tests are under `backend/tests/`.

The Next.js 16 frontend lives in `frontend/`. App Router pages belong in `frontend/src/app/`, reusable UI in `src/components/`, state providers in `src/contexts/`, and API logic in `src/services/`. Tests live in `frontend/tests/`; browser assets belong in `frontend/public/`. Root Compose files define infrastructure and deployment variants.

## Build, Test, and Development Commands

- `docker compose up -d`: start PostgreSQL, Redis, and the backend development stack.
- `cd backend && uvicorn main:app --reload`: run the API locally at port 8000.
- `cd backend && pytest`: run all backend tests with concise tracebacks.
- `cd backend && ruff check .`: lint Python and validate import ordering.
- `cd frontend && npm install && npm run dev`: install dependencies and run Next.js at port 3000.
- `cd frontend && npm run build`: produce and validate the production build.
- `cd frontend && npm run lint`: run the Next.js ESLint configuration.
- `cd frontend && npm run test:run`: execute Vitest once; use `npm run test:coverage` for coverage.
- `cd frontend && npx tsc --noEmit`: check strict TypeScript types.

## Coding Style & Naming Conventions

Python uses four-space indentation, snake_case modules/functions, PascalCase classes, type hints, and a 100-character Ruff line length. Keep FastAPI endpoints async and use module loggers instead of `print`. TypeScript is strict: use two-space indentation, PascalCase React components, camelCase hooks/functions, and `useX` hook names. Pair component files with `ComponentName.module.css`; avoid broad global CSS changes.

## Testing Guidelines

Backend tests use pytest, pytest-asyncio, and `test_*.py` names. Frontend tests use Vitest and Testing Library with `*.test.ts` or `*.test.tsx`. Add regression tests for bug fixes and cover success, authentication, and failure paths where relevant. Backend tests use an in-memory database and should not require local PostgreSQL.

## Commit & Pull Request Guidelines

History generally uses concise, imperative subjects, often with prefixes such as `fix:`, `perf:`, or `deploy:`. Keep each commit focused; prefer `type: summary` and explain non-obvious decisions in the body. Pull requests should summarize behavior changes, list verification commands, link relevant issues, and include screenshots for visible UI changes. Note environment, schema, or deployment changes explicitly; never commit real `.env` files or credentials.
