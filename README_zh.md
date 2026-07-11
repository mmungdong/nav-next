<div align="center">

# nav-next

**一个纯静态、支持 SEO、可在线编辑的个人导航网站**

从 Angular 迁移至 Next.js 16，内置 140+ 精选网站，零数据库、零服务器、一键部署。

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38BDF8?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![Zustand](https://img.shields.io/badge/Zustand-5-444?logo=zustand&logoColor=white)](https://github.com/pmndrs/zustand)
[![License](https://img.shields.io/badge/License-MIT-blue)](./LICENSE)

[功能特性](#功能特性) · [技术栈](#技术栈) · [快速开始](#快速开始) · [部署](#部署) · [数据同步](#数据同步)

**[English](./README.md)**

</div>

---

## 简介

**nav-next** 是一个基于 Next.js App Router 的书签 / 导航站项目。数据以 JSON 文件形式存储，通过 GitHub API 实现远程同步与版本对比，配合 localStorage 本地缓存——无需数据库与后端服务，即可拥有完整的后台管理体验。

### 核心亮点

- **纯静态输出** — 构建产物可托管于任意静态站点平台，天然支持 SEO
- **在线编辑** — 内置完整的后台管理系统，CRUD 网站 / 分类、拖拽排序、批量移动
- **GitHub 同步** — 本地与远程数据可视化 Diff 对比，一键提交变更
- **搜索体验** — 防抖过滤、`⌘K` 快捷键聚焦、站内即时检索
- **性能优化** — 图标预加载、骨架屏、滚动监听、动画配置统一管理
- **响应式** — 桌面侧边栏导航 + 移动端底部导航，自适应全设备
- **暗黑模式** — 全站深色主题，平滑切换

---

## 功能特性

### 前台展示

| 功能 | 说明 |
| --- | --- |
| 分类导航 | 粘性侧边栏 + 滚动监听（ScrollSpy）自动高亮当前分类 |
| 智能搜索 | 300ms 防抖过滤分类与网站，`⌘K` / `Ctrl+K` 快捷聚焦 |
| 网站卡片 | 入场动画、图标预加载、无障碍 `aria-label` |
| 移动端导航 | 底部抽屉式分类导航，触控友好 |
| 骨架屏 | 数据加载阶段展示占位骨架，避免内容跳动 |

### 后台管理

| 模块 | 说明 |
| --- | --- |
| 网站管理 | 网站增删改查、排序、跨分类移动 |
| 分类管理 | 分类增删改、排序 |
| 收录管理 | 在线收录新站点，自动抓取站点信息 |
| 数据同步 | 本地 vs GitHub 远程数据 Diff 对比，可视化提交 |
| 配置管理 | 站点标题、仓库地址、分支等运行时配置 |
| 权限控制 | JWT Token + RBAC 角色权限，受保护路由 |

---

## 技术栈

| 分类 | 技术 | 版本 |
| --- | --- | --- |
| 框架 | Next.js (App Router) | 16 |
| UI 库 | React | 19 |
| 状态管理 | Zustand | 5 |
| 样式 | Tailwind CSS | 4 |
| 动画 | Framer Motion | 12 |
| 语言 | TypeScript | 5 |
| 数据同步 | GitHub API | — |
| 认证 | 自定义 JWT + RBAC | — |

---

## 项目结构

```
nav-next/
├── public/
│   └── data/db.json          # 数据源（分类 + 网站）
├── src/
│   ├── app/
│   │   ├── (main)/           # 前台页面
│   │   ├── (admin)/system/   # 后台管理模块
│   │   ├── login/            # 登录页
│   │   └── unauthorized/     # 无权限页
│   ├── components/           # 可复用 UI 组件
│   ├── layouts/              # 布局组件（Admin / Main / Auth / Public）
│   ├── stores/               # Zustand 状态（navStore / authStore）
│   ├── hooks/                # 自定义 Hooks（防抖、滚动监听、预加载等）
│   ├── lib/                  # 工具与服务（githubApi / webInfoApi / animations）
│   └── types/                # TypeScript 类型定义
├── nav.config.json           # 应用运行时配置
└── next.config.ts            # Next.js 构建配置
```

---

## 快速开始

### 环境要求

- Node.js ≥ 18.18
- npm / pnpm / yarn 任一包管理器

### 安装与启动

```bash
# 1. 克隆仓库
git clone https://github.com/mmungdong/nav-next.git
cd nav-next

# 2. 安装依赖
npm install

# 3. 启动开发服务器
npm run dev
```

访问 [http://localhost:3000](http://localhost:3000) 查看效果。

### 可用脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 生产构建 |
| `npm run start` | 启动生产服务器 |
| `npm run lint` | ESLint 代码检查 |
| `npm run lint:fix` | 自动修复 lint 问题 |
| `npm run format` | Prettier 格式化 |

---

## 部署

得益于纯静态输出，本项目可部署于任意静态站点平台。

| 平台 | 说明 |
| --- | --- |
| **Vercel** | 推荐，导入仓库后自动识别 Next.js，零配置部署 |
| **Netlify** | 设置构建命令 `npm run build`，发布目录 `out` |
| **Cloudflare Pages** | 构建命令 `npm run build`，输出目录 `out` |
| **GitHub Pages** | 推送 `out` 目录至 `gh-pages` 分支 |

> 部署前请确保 `npm run build` 成功并生成 `out` 目录。

---

## 数据同步

项目通过 GitHub API 实现数据的远程存储与同步，无需自建后端。

```
本地 db.json  ──┐
                 ├──▶ Diff 对比  ──▶ 可视化提交  ──▶ GitHub 仓库
localStorage  ──┘
```

### 配置步骤

1. 在 GitHub 创建 Personal Access Token（需 `repo` 权限）
2. 进入后台 **系统设置** 录入 Token 与仓库信息
3. 使用 **数据同步** 功能进行本地与远程的 Diff 对比与提交

数据流说明：

- 首次加载从 `public/data/db.json` 读取
- localStorage 缓存 1 小时，减少重复请求
- 后台同步时对比本地与远程，可视化展示新增 / 删除 / 修改

---

## 配置

`nav.config.json` 定义应用运行时配置：

```json
{
  "version": "1.0.0",
  "gitRepoUrl": "https://github.com/mmungdong/nav-next",
  "branch": "main"
}
```

| 字段 | 说明 |
| --- | --- |
| `version` | 应用版本号 |
| `gitRepoUrl` | 数据同步目标仓库地址 |
| `branch` | 同步目标分支 |

---

## License

本项目采用 [MIT](./LICENSE) 协议 © 2026 mmungdong

---

<div align="center">

<sub>Built with Next.js · Tailwind CSS · Zustand · Framer Motion</sub>

</div>
