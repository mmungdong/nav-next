# 发现导航项目 Next.js 技术规格文档

## 项目概述

这是一个基于 Angular 的纯静态导航网站项目，需要迁移到 Next.js 技术栈。该项目具有以下特点：
- 支持多种主题（Side、Light、Super、Sim、Shortcut、Mobile）
- 内置收录多达 800+ 优质网站
- 支持后台管理系统
- 无数据库、无服务器、零成本一键部署
- 支持 SEO 和 PWA

根据项目要求，本次迁移主要关注 **Side 主题**，其他主题暂不考虑。

## 技术架构

### 1. 技术栈选择

#### 前端框架
- **Next.js 14+** (App Router)
- **React 18+**
- **TypeScript**

#### 状态管理
- **Zustand** - 轻量级状态管理库，替代 Angular Signals

#### UI 组件库
- **ShadCN UI** - 基于 Tailwind CSS 的可定制组件库
- **Tailwind CSS** - 实用优先的 CSS 框架

#### 构建工具
- **Next.js 内置编译器**
- **ESLint** - 代码质量检查
- **Prettier** - 代码格式化

#### 数据持久化
- **localStorage** - 本地数据存储
- **GitHub API** - 远程数据存储和同步

### 2. 项目结构

```
nav-next/
├── public/                     # 静态资源文件
├── src/
│   ├── app/                    # Next.js App Router 结构
│   │   ├── layout.tsx          # 根布局
│   │   ├── page.tsx            # 首页 (重定向到 /side)
│   │   ├── side/               # Side 主题页面 (主要开发目标)
│   │   │   ├── page.tsx        # Side 主题首页
│   │   │   ├── layout.tsx      # Side 主题布局
│   │   │   └── components/     # Side 主题组件
│   │   ├── system/             # 后台管理系统
│   │   │   ├── layout.tsx      # 系统管理布局
│   │   │   ├── page.tsx        # 系统管理首页
│   │   │   └── [module]/       # 各个管理模块
│   │   │       ├── page.tsx
│   │   │       └── components/
│   │   └── globals.css         # 全局样式
│   ├── components/             # 公共组件
│   │   ├── ui/                 # ShadCN UI 组件
│   │   ├── navigation/         # 导航相关组件
│   │   ├── cards/              # 卡片组件
│   │   ├── search/             # 搜索组件
│   │   └── system/             # 系统管理组件
│   ├── lib/                    # 工具函数和库
│   │   ├── api/                # API 调用封装
│   │   ├── utils/              # 工具函数
│   │   └── constants/          # 常量定义
│   ├── stores/                 # Zustand 状态管理
│   ├── types/                  # TypeScript 类型定义
│   └── data/                   # 本地数据文件
├── next.config.js              # Next.js 配置
├── tsconfig.json               # TypeScript 配置
├── tailwind.config.js          # Tailwind CSS 配置
├── postcss.config.js           # PostCSS 配置
└── package.json                # 项目依赖
```

## 核心功能实现

### 1. 数据层迁移

#### 简化数据结构
- 根据项目要求，新的项目没有三级分类的概念，只有分类和网站的概念
- 保持与现有 db.json 数据结构的兼容性，但只使用一级分类结构
- 创建 TypeScript 类型定义与简化后的数据结构匹配

#### 状态管理实现
使用 Zustand 实现状态管理，替代 Angular Signals。根据简化后的数据结构，更新类型定义：

```typescript
// stores/navStore.ts
import { create } from 'zustand'
import { ICategory, IWebsite, ISettings } from '@/types'

interface NavState {
  categories: ICategory[]
  settings: ISettings
  loading: boolean
  fetchCategories: () => Promise<void>
  updateCategories: (categories: ICategory[]) => void
}

export const useNavStore = create<NavState>((set) => ({
  categories: [],
  settings: {} as ISettings,
  loading: true,
  fetchCategories: async () => {
    // 实现数据获取逻辑
  },
  updateCategories: (categories) => set({ categories })
}))
```

### 2. 路由系统

#### App Router 配置
- 使用 Next.js App Router 实现页面路由
- 动态路由处理分类和网站详情页

#### 路由结构
```
/                           # 首页，重定向到 /side
/side                       # Side 主题首页
/side/[categoryId]          # 指定分类页面
/system                     # 后台管理系统入口
/system/web                 # 网站管理
/system/tag                 # 标签管理
/system/search              # 搜索管理
/system/setting             # 系统设置
/system/component           # 组件管理
/system/collect             # 收录管理
/system/bookmark            # 书签管理
/system/info                # 系统信息
```

根据简化后的数据结构，路由只处理一级分类，不再需要三级分类的路由结构。

### 3. UI 组件实现

#### ShadCN UI 组件
使用 ShadCN UI 组件库，根据项目需求定制组件：

1. **导航组件**
   - Sidebar - 侧边栏导航
   - Navbar - 顶部导航栏
   - Breadcrumb - 面包屑导航

2. **数据展示组件**
   - Card - 网站卡片
   - DataTable - 数据表格（用于后台管理）
   - Badge - 标签徽章

3. **表单组件**
   - Input - 输入框
   - Select - 下拉选择
   - Switch - 开关
   - Button - 按钮

4. **反馈组件**
   - Dialog - 对话框
   - Toast - 消息提示
   - Alert - 警告提示

#### 自定义组件
根据项目需求开发自定义组件，注意数据结构已简化：

1. **搜索组件**
   - 搜索框
   - 搜索结果展示

2. **网站卡片组件**
   - 支持多种卡片风格
   - 响应式设计

3. **分类导航组件**
   - 一级分类展示（已简化，去除三级分类）
   - 分类折叠/展开

### 4. 样式系统

#### Tailwind CSS 配置
```javascript
// tailwind.config.js
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // 自定义颜色主题
      }
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
    require('tailwindcss-animate'),
  ],
}
```

#### 暗黑模式支持
- 使用 Tailwind CSS 的 dark: 前缀实现暗黑模式
- 通过 localStorage 保存用户偏好设置

### 5. 数据获取和缓存

#### 服务端渲染 (SSR)
使用 getServerSideProps 获取初始数据：

```typescript
// src/app/side/page.tsx
export async function getServerSideProps() {
  const navs = await fetchNavs()
  const settings = await fetchSettings()

  return {
    props: {
      navs,
      settings
    }
  }
}
```

#### 客户端数据更新
- 使用 SWR 或 React Query 处理客户端数据获取和缓存
- 实现数据同步机制与 GitHub API 交互

### 6. 搜索功能

#### 搜索实现
- 实现前端模糊搜索功能
- 支持多种搜索类型（站内搜索、搜索引擎切换）
- 搜索结果高亮显示

#### 搜索组件
```typescript
// components/search/SearchBar.tsx
interface SearchBarProps {
  onSearch: (keyword: string) => void
  searchEngines: ISearchItemProps[]
}
```

### 7. 后台管理系统

#### 权限认证
- 实现登录认证系统
- JWT Token 管理
- 权限控制（管理员/普通用户）

#### 功能模块
1. **网站管理**
   - 一级分类管理（已简化，去除三级分类）
   - 网站数据增删改查
   - 批量操作功能

2. **标签管理**
   - 标签创建、编辑、删除
   - 标签排序功能

3. **搜索管理**
   - 搜索引擎配置
   - 自定义搜索引擎

4. **系统设置**
   - 基础设置（标题、描述等）
   - 主题配置
   - SEO 设置

5. **组件管理**
   - 小组件配置
   - 组件显示控制

## 性能优化

### 1. 代码分割
- 使用 dynamic import 实现组件懒加载
- 路由级别代码分割

### 2. 图片优化
- 使用 Next.js Image 组件
- 实现图片懒加载
- 响应式图片处理

### 3. 打包优化
- 使用 webpack-bundle-analyzer 分析打包结果
- 移除未使用的代码
- 优化第三方库引入

## SEO 优化

### 1. 元数据管理
- 使用 Next.js Head 组件管理页面元数据
- 动态生成页面标题和描述

### 2. 结构化数据
- 实现 JSON-LD 结构化数据
- 支持网站、组织等结构化信息

### 3. sitemap.xml
- 自动生成网站地图
- 提交到搜索引擎

## PWA 支持

### 1. manifest.json
- 配置应用元数据
- 设置应用图标和启动画面

### 2. Service Worker
- 使用 Next.js 内置的 PWA 支持
- 实现离线缓存策略

## 部署配置

### 1. 环境变量
```bash
# .env.local
NEXT_PUBLIC_GITHUB_REPO_URL=
GITHUB_TOKEN=
NEXT_PUBLIC_BASE_PATH=
```

### 2. 构建配置
```javascript
// next.config.js
module.exports = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || '',
  output: 'standalone',
  // 其他配置...
}
```

### 3. 部署方式
- 支持 Vercel 一键部署
- 支持 Docker 容器化部署
- 支持静态文件部署

## 测试策略

### 1. 单元测试
- 使用 Jest 和 React Testing Library
- 测试核心组件和工具函数

### 2. 集成测试
- 测试页面路由和数据流
- 测试后台管理系统功能

### 3. E2E 测试
- 使用 Cypress 或 Playwright
- 测试用户交互流程

## 迁移计划

### 第一阶段：环境搭建和基础架构
1. 初始化 Next.js 项目
2. 配置 TypeScript、ESLint、Prettier
3. 集成 Tailwind CSS 和 ShadCN UI
4. 设置 Zustand 状态管理

### 第二阶段：数据层和核心功能
1. 实现数据读取和写入逻辑
2. 迁移导航数据结构
3. 实现搜索功能
4. 实现分类导航组件

### 第三阶段：UI 组件迁移
1. 迁移网站卡片组件
2. 实现侧边栏导航
3. 实现搜索组件
4. 实现响应式设计

### 第四阶段：后台管理系统
1. 实现登录认证系统
2. 迁移网站管理模块
3. 迁移标签管理模块
4. 迁移其他管理模块

### 第五阶段：优化和完善
1. 性能优化
2. SEO 优化
3. PWA 支持
4. 测试和部署

## 风险控制

### 1. 数据兼容性
- 保持 JSON 数据结构完全兼容
- 实现数据迁移脚本
- 进行数据验证测试

### 2. 功能完整性
- 制定详细的功能清单
- 逐一验证功能实现
- 进行回归测试

### 3. 性能监控
- 使用 Lighthouse 进行性能评估
- 监控关键性能指标
- 持续优化性能

## 验收标准

### 1. 功能验收
- 所有原有功能正常运行
- 后台管理系统功能完整
- 用户体验流畅自然

### 2. 性能验收
- 首屏加载时间 < 2s
- Core Web Vitals 达到良好水平
- 移动端体验优秀

### 3. 技术验收
- 代码质量符合规范
- 无重大安全隐患
- 易于维护和扩展