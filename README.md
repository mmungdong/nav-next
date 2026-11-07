<div align="center">

# nav-next

**A static, SEO-friendly, in-browser editable navigation website**

Migrated from Angular to Next.js 16. Ships with 140+ curated sites, zero database, zero server, one-click deploy.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Zustand](https://img.shields.io/badge/Zustand-5-444?logo=zustand&logoColor=white)](https://github.com/pmndrs/zustand)
[![License](https://img.shields.io/badge/License-MIT-blue)](./LICENSE)

[Features](#features) · [Tech Stack](#tech-stack) · [Getting Started](#getting-started) · [Deployment](#deployment) · [Data Sync](#data-sync)

**[中文文档](./README_zh.md)**

</div>

---

## Introduction

**nav-next** is a bookmark / navigation site built on the Next.js App Router. Data is stored as a JSON file and synced remotely via the GitHub API with visual diffing, backed by a localStorage cache — no database or backend required, yet you still get a full admin dashboard.

### Highlights

- **Static output** — Build artifacts can be hosted on any static platform; SEO-friendly out of the box
- **In-browser editing** — Full admin dashboard for CRUD on sites/categories, drag-to-sort, bulk move
- **GitHub sync** — Visual diff between local and remote data, one-click commit
- **Search UX** — Debounced filtering, `⌘K` shortcut focus, instant in-site search
- **Performance** — Icon preloading, skeleton screens, scroll spy, unified animation config
- **Responsive** — Desktop sidebar nav + mobile bottom nav, adapts to all devices
- **Dark mode** — Full dark theme with smooth transitions

---

## Features

### Frontend

| Feature | Description |
| --- | --- |
| Category navigation | Sticky sidebar + ScrollSpy auto-highlights the active section |
| Smart search | 300ms debounced filter across categories & sites, `⌘K` / `Ctrl+K` to focus |
| Website cards | Entrance animations, icon preloading, accessible `aria-label` |
| Mobile nav | Bottom drawer-style category navigation, touch-friendly |
| Skeleton screen | Placeholder skeletons during data loading to prevent layout shift |

### Admin

| Module | Description |
| --- | --- |
| Website management | Create / read / update / delete sites, reorder, move across categories |
| Category management | CRUD and reordering for categories |
| Collection | In-browser site collection with auto-fetched site metadata |
| Data sync | Local vs. GitHub remote diff with visual commit |
| Config | Runtime config for site title, repo URL, branch, etc. |
| Access control | JWT Token + RBAC role permissions, protected routes |

---

## Tech Stack

| Layer | Technology | Version |
| --- | --- | --- |
| Framework | Next.js (App Router) | 16 |
| UI library | React | 19 |
| State | Zustand | 5 |
| Styling | Tailwind CSS | 4 |
| Animation | Framer Motion | 12 |
| Language | TypeScript | 5 |
| Data sync | GitHub API | — |
| Auth | Custom JWT + RBAC | — |

---

## Project Structure

```
nav-next/
├── public/
│   └── data/db.json          # Data source (categories + websites)
├── src/
│   ├── app/
│   │   ├── (main)/           # Public-facing pages
│   │   ├── (admin)/system/   # Admin modules
│   │   ├── login/            # Login page
│   │   └── unauthorized/     # Access-denied page
│   ├── components/           # Reusable UI components
│   ├── layouts/              # Layout components (Admin / Main / Auth / Public)
│   ├── stores/               # Zustand stores (navStore / authStore)
│   ├── hooks/                # Custom hooks (debounce, scroll spy, preload, etc.)
│   ├── lib/                  # Utils & services (githubApi / webInfoApi / animations)
│   └── types/                # TypeScript type definitions
├── nav.config.json           # Runtime config
└── next.config.ts            # Next.js build config
```

---

## Getting Started

### Prerequisites

- Node.js ≥ 18.18
- Any of npm / pnpm / yarn

### Install & Run

```bash
# 1. Clone the repo
git clone https://github.com/mmungdong/nav-next.git
cd nav-next

# 2. Install dependencies
npm install

# 3. Start the dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the result.

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the dev server |
| `npm run build` | Production build (static export to `out/`) |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run format` | Format with Prettier |
| `npm run typecheck` | TypeScript check without emitting |
| `npm test` | Unit tests (node:test + tsx, no extra runtime) |
| `npm run validate:data` | Validate `db.json` and `site-config.json` |
| `npm run check:static` | Smoke-check the exported `out/` artifact |
| `npm run test:e2e` | Playwright against the exported `out/` build (run `npm run build` first) |

---

## Deployment

Thanks to the static output, this project can be deployed on any static hosting platform.

| Platform | Notes |
| --- | --- |
| **Vercel** | Recommended — import the repo, auto-detects Next.js, zero config |
| **Netlify** | Build command `npm run build`, publish directory `out` |
| **Cloudflare Pages** | Build command `npm run build`, output directory `out` |
| **GitHub Pages** | Push the `out` directory to a `gh-pages` branch |

> Ensure `npm run build` succeeds and the `out` directory is generated before deploying.

**Refresh boundary:** saving in the admin only commits to GitHub. The public site
reads the deployed `/data/db.json` and `/data/site-config.json`, so new content
appears after the host rebuilds/redeploys. If the project is not wired to auto-
deploy on push, redeploy manually; the admin message says "GitHub 已更新，首页
需等待部署" for exactly this reason. The front end revalidates with
`cache: no-cache` on load, on tab focus and via the refresh button, but a CDN
cache in front of the host can still delay the update.

---

## Data Sync

GitHub holds the remote data; the browser never syncs behind your back.

- Two remote files are independent resources: `public/data/db.json` (sites) and
  `public/data/site-config.json` (site/search settings).
- Admin edits are stored as a local draft keyed by repository + branch + path +
  GitHub account + tab. Drafts survive reloads and stay local until you push.
- Pushing sends the captured base SHA. If another device committed in the
  meantime the push is rejected and the local draft is kept — never silently
  overwritten. You can adopt the remote, keep the draft, or explicitly overwrite
  with a second confirmation.
- Edits made while a push is in flight stay dirty against the newly returned
  baseline instead of being cleared.
- `导出草稿` / `导入恢复草稿` move drafts as JSON without ever including the token.
- The public site reads only the deployed JSON and never the admin draft or the
  GitHub token.

### Testing

`npm test` runs the store/validation/sync unit tests with Node's test runner.
`npm run test:e2e` runs Playwright against the real static `out/` build; the
GitHub API is mocked, so no real repository is written. Install the browser once
with `npx playwright install chromium`. The e2e suite has been executed on
macOS only; it is not verified on Windows.

---

## Configuration

`nav.config.json` defines the runtime config:

```json
{
  "version": "1.0.0",
  "gitRepoUrl": "https://github.com/mmungdong/nav-next",
  "branch": "main"
}
```

| Field | Description |
| --- | --- |
| `version` | App version |
| `gitRepoUrl` | Target repo URL for data sync |
| `branch` | Target sync branch |

---

## License

[MIT](./LICENSE) © 2026 mmungdong

---

<div align="center">

<sub>Built with Next.js · Tailwind CSS · Zustand · Framer Motion</sub>

</div>
