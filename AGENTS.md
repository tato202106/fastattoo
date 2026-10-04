<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Fastattoo — notes pour les agents

- Lire `docs/SPEC.md` (source de vérité) et `docs/DECISIONS.md` avant toute modification.
- Mobile d'abord : CSS de base = mobile, `md:`/`lg:` uniquement pour adapter au desktop. Zones tactiles ≥ 44 px, `100dvh`, `env(safe-area-inset-*)`.
- Interface en français, tutoiement.
- Logique métier pure dans `lib/` (testée par Vitest) ; l'UI ne passe que par `lib/data` (repository) et les actions du store `lib/store/app.ts`.
- Avant de livrer : `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, puis `npm run test:e2e`.
