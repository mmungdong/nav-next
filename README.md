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
| `npm run build` | Production build |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run format` | Format with Prettier |

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

---

## Data Sync

The project uses the GitHub API for remote storage and sync — no self-hosted backend needed.

```
local db.json  ──┐
                  ├──▶ diff  ──▶ visual commit  ──▶ GitHub repo
localStorage    ──┘
```

### Setup

1. Create a GitHub Personal Access Token (requires `repo` scope)
2. In the admin dashboard, go to **Settings** and enter the token + repo info
3. Use the **Data Sync** feature to diff and commit local vs. remote

Data flow:

- On first load, data is read from `public/data/db.json`
- localStorage caches for 1 hour to reduce repeated requests
- On sync, the admin compares local vs. remote and visualizes added / removed / modified entries

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
