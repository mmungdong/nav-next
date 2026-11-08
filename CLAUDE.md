# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Next.js 16** web application (Bookmarks/导航网站) - a personal bookmark management system with admin dashboard. It features:

- **App Router** architecture with route groups `(admin)`, `(main)`
- **Zustand** for state management (`src/stores/`)
- **Tailwind CSS 4** for styling
- **Framer Motion** for animations
- **GitHub API integration** for data sync and storage
- Data stored in `public/data/db.json` and `public/data/site-config.json`; unsent admin edits live in localStorage drafts and backups

## Commands

```bash
pnpm run dev        # Start development server
pnpm run build      # Validate data + production build (static export to out/)
pnpm run start      # Start production server
pnpm run lint       # Run ESLint
pnpm run lint:fix   # Fix ESLint issues
pnpm run format     # Format code with Prettier
pnpm run typecheck  # tsc --noEmit
pnpm test           # Unit tests (node:test via tsx)
pnpm run validate:data   # Validate public/data JSON
pnpm run check:static    # Smoke-check the exported out/ artifact
pnpm run test:e2e        # Playwright against out/ (run build first)
```

The repo pins `packageManager` to pnpm and the only lockfile is `pnpm-lock.yaml`; use `corepack enable` rather than npm or yarn.

## Architecture

### Route Structure (`src/app/`)
- `(admin)/system/*` - Admin dashboard: `web` (网站管理), `search` (搜索管理), `setting` (系统设置), `info` (系统信息)
- `(main)/*` - Public-facing pages
- `login/` - Authentication page
- `unauthorized/` - Access denied page

### Key Directories
- `src/components/` - Reusable UI components (modals, cards, navigation)
- `src/layouts/` - Layout components (AdminLayout, MainLayout, AuthLayout, PublicLayout)
- `src/stores/` - Zustand stores: `navStore.ts` (categories), `configStore.ts` (site config), `authStore.ts`, plus the shared sync engine in `syncedResource.ts`
- `src/lib/` - Utility functions and API clients (githubApi.ts, webInfoApi.ts, syncEngine.ts, draftStorage.ts)
- `src/hooks/` - Custom React hooks (including `useDialogFocus` for dialogs)
- `src/types/` - TypeScript type definitions
- `public/data/db.json` - Data source (category + website entries)
- `public/data/site-config.json` - Site name, description, theme and search engines

### Data Model
- `ICategory`: id, title, icon, nav (array of IWebsite)
- `IWebsite`: id, name, desc, url, icon?, tags?, rate?, top?, topTypes?, index?
- `ownVisible` is retired: legacy payloads still containing it are normalized away on read, never written back

### State Management
- `useNavStore` (navStore.ts): categories, dirty tracking, drafts and GitHub sync for `db.json`
- `useConfigStore` (configStore.ts): the same lifecycle for `site-config.json`
- `useAuthStore` (authStore.ts): authentication state and token handling
- `syncedResource.ts`: `createSyncedResource` holds every shared sync rule (draft load/save, baseline SHA, conflict, push, discard) and each store supplies only its resource spec

### Data Sync Flow
1. Public pages read the deployed `public/data/*.json` (throttled to one request per minute) and paint from a localStorage copy; they never read admin drafts
2. Admin entry (`initAdmin`) reads the same file from GitHub, restores this tab's v2 draft, and keeps `baseSha` as the reviewed baseline
3. Edits are written to a per-tab draft before the page is considered saved; a draft is discarded only after a recovery copy is written, or with explicit user consent
4. Push sends the whole file with the reviewed `baseSha`; a moved SHA becomes a conflict that must be resolved (adopt remote / overwrite remote), never a silent overwrite
5. `compareData` in navStore only summarizes add/remove/modify changes for the conflict banner
6. Damage is preserved: corrupted drafts are listed and exportable, never deleted without an explicit discard

## Configuration

- `nav.config.json` - App configuration (version, gitRepoUrl, branch)
- `next.config.ts` - Next.js configuration
- `tailwind.config.*` - Tailwind CSS config (v4 uses CSS-based config)
- `eslint.config.mjs` - ESLint configuration

## Key Implementation Notes

- Admin route group uses its own layout with sidebar navigation
- All dialogs must use `useDialogFocus` (initial focus, Tab trap, Escape, scroll lock, focus restore); the mobile admin drawer reuses it too
- GitHub API integration requires a personal access token for authenticated requests
- `compareData` in navStore detects add/remove/modify/order changes for the conflict summary, not for syncing