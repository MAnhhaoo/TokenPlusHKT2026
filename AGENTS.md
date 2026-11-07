# AGENTS.md

## Repo

SaigonDrain AI demo — pnpm monorepo with two independent React apps under `fe/` and a reserved `be/` folder:

- `fe/user` — public map/navigation experience, port `5173`
- `fe/admin` — operations dashboard, port `5174`
- `be/` — placeholder for a future backend; no server, API, database or auth exists yet

Both apps are React 19 + TypeScript + Vite 8 + Tailwind CSS v4. The demo is frontend-only; all data is mocked in `fe/*/src/data`.

## Commands

Run from the repo root:

```bash
pnpm install
pnpm dev            # both apps in parallel
pnpm dev:user
pnpm dev:admin
pnpm typecheck
pnpm build
pnpm build:user
pnpm build:admin
```

## Ports

Ports are defined in each app's `vite.config.ts` and can be overridden with `PORT`. `strictPort` is enabled, so a busy port fails fast instead of silently changing.

## Conventions

- Keep each app self-contained; there is no shared package yet.
- Use the `@/` alias for imports inside an app.
- Components live under `src/components/<feature>/`; shared primitives under `src/components/ui/`.
- Mock data and static demo content belong in `src/data/`.
- Each app keeps a single global `src/index.css` (design tokens + component classes). Do not split it: cascade order matters and the class names are shared across components.
- Visual language, tokens, component rules and accessibility floor live in `DESIGN.md`; product truth lives in `PRODUCT.md`. Read them before changing UI.
- Keep the current visual design when refactoring. This repo is a demo; do not introduce a router, state library, backend, or auth without an explicit request.
- Do not commit `dist/` or `node_modules/`.
- Do not run a repo-wide formatter pass while doing structural refactors; it obscures the real diff.

## Notes

- The user app loads OpenStreetMap tiles and the public OSRM routing API at runtime.
- Brand is **SaigonDrain AI**; the original product brief still says “DrainGuard AI”.
- The original Figma Make scaffolding (`.figma/`, Figma Vite plugins) has been removed; use plain Vite configs.
