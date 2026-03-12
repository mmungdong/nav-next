# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Next.js 16** web application (Bookmarks/导航网站) - a personal bookmark management system with admin dashboard. It features:

- **App Router** architecture with route groups `(admin)`, `(main)`
- **Zustand** for state management (`src/stores/`)
- **Tailwind CSS 4** for styling
- **Framer Motion** for animations
- **GitHub API integration** for data sync and storage
- Data stored in `public/data/db.json` with localStorage caching

## Commands

```bash
npm run dev        # Start development server
npm run build      # Production build
npm run start      # Start production server
npm run lint       # Run ESLint
npm run lint:fix   # Fix ESLint issues
npm run format     # Format code with Prettier
```

## Architecture

### Route Structure (`src/app/`)
- `(admin)/system/*` - Admin dashboard pages (config, search, collect, bookmark, component, info, setting)
- `(main)/*` - Public-facing pages
- `login/` - Authentication page
- `unauthorized/` - Access denied page

### Key Directories
- `src/components/` - Reusable UI components (modals, cards, navigation)
- `src/layouts/` - Layout components (AdminLayout, MainLayout, AuthLayout, PublicLayout)
- `src/stores/` - Zustand state stores (navStore.ts, authStore.ts)
- `src/lib/` - Utility functions and API clients (githubApi.ts, webInfoApi.ts)
- `src/hooks/` - Custom React hooks
- `src/types/` - TypeScript type definitions
- `public/data/db.json` - Data source (category + website entries)

### Data Model
- `ICategory`: id, title, icon, nav (array of IWebsite)
- `IWebsite`: id, name, desc, url, icon, rate, top, ownVisible

### State Management
- `useNavStore` (navStore.ts): Manages categories, settings, data sync with GitHub
- `useAuthStore` (authStore.ts): Handles authentication state

### Data Sync Flow
1. Fetches from `public/data/db.json` on load
2. Caches in localStorage with 1-hour expiry
3. Admin can sync with remote GitHub repo via GitHub API
4. Compares local vs remote data with diff visualization

## Configuration

- `nav.config.json` - App configuration (version, gitRepoUrl, branch)
- `next.config.ts` - Next.js configuration
- `tailwind.config.*` - Tailwind CSS config (v4 uses CSS-based config)
- `eslint.config.mjs` - ESLint configuration

## Key Implementation Notes

- Admin route group uses its own layout with sidebar navigation
- All components in `src/components/` should follow the existing pattern for modals (using portals or fixed positioning)
- GitHub API integration requires a personal access token for authenticated requests
- Data comparison logic in navStore handles add/remove/modify detection for both categories and websites