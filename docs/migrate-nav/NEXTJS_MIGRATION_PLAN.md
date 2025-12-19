# 发现导航项目 Next.js 迁移计划

## 项目概述

这是一个基于 Angular 的纯静态导航网站项目，具有以下特点：
- 支持多种主题（Side、Light、Super、Sim、Shortcut、Mobile）
- 内置收录多达 800+ 优质网站
- 支持后台管理系统
- 无数据库、无服务器、零成本一键部署
- 支持 SEO 和 PWA

## 项目核心功能模块

### 1. 前端展示页面

#### 1.1 主题系统
- **Side 主题**（主要使用主题）：侧边栏导航结构
- Light 主题：简约风格
- Super 主题：超级风格
- Sim 主题：简单风格
- Shortcut 主题：快捷方式风格
- Mobile 主题：移动端适配

#### 1.2 核心功能
- 简化分类结构（一级分类 -> 网站）
- 网站卡片展示（支持多种卡片风格）
- 搜索功能（支持多种搜索类型）
- 响应式设计（移动端适配）
- 暗黑模式支持
- PWA 支持
- SEO 优化
- 组件系统（日历、倒计时、新闻等）

### 2. 后台管理系统

访问路径：`/system`

#### 2.1 系统信息管理（/system/info）
- 查看系统基本信息
- 查看统计数据
- 查看用户访问情况

#### 2.2 书签管理（/system/bookmark）
- 浏览器书签导入
- 数据导出为书签文件
- 书签数据管理

#### 2.3 网站收录管理（/system/collect）
- 用户提交的网站收录请求
- 审核和处理收录申请
- 批量处理功能

#### 2.4 权限管理（/system/auth）
- 登录认证
- 权限控制
- 用户管理

#### 2.5 标签管理（/system/tag）
- 标签创建、编辑、删除
- 标签排序
- 批量操作

#### 2.6 搜索管理（/system/search）
- 搜索引擎配置
- 自定义搜索引擎
- 搜索设置管理

#### 2.7 系统设置（/system/setting）
- 基础设置（标题、描述、关键词等）
- 主题配置
- SEO 设置
- 组件配置
- 爬虫设置
- 加载动画配置

#### 2.8 组件管理（/system/component）
- 小组件管理（日历、倒计时、新闻等）
- 组件配置
- 组件显示控制

#### 2.9 网站管理（/system/web）【核心功能】
- 一级分类管理（已简化，去除三级分类）
- 网站数据管理
- 分类移动和引用
- 网站上下架
- 数据备份和恢复
- 网站存活检测
- 批量操作功能

#### 2.10 配置管理（/system/config）
- 系统配置管理
- 高级设置

## 数据结构

### 1. 导航数据结构（db.json）
根据项目要求，新的项目没有三级分类的概念，只有分类和网站的概念，因此数据结构已简化：

```
ICategory[] {
  id: number
  title: string
  icon: string
  nav: IWebProps[] {
    id: number
    name: string
    desc: string
    url: string
    icon: string
    tags: IWebTag[]
    rate: number (0-5)
    top: boolean
    ownVisible: boolean
    // ... 其他字段
  }
}
```

### 2. 设置数据结构（settings.json）
包含网站基础设置、主题配置、SEO 设置等

### 3. 标签数据结构（tag.json）
```
ITagPropValues[] {
  id: number
  name: string
  color: string
  desc: string
  isInner: boolean
  noOpen: boolean
  sort: number
}
```

### 4. 搜索配置（search.json）
搜索引擎配置数据

### 5. 组件配置（component.json）
小组件配置数据

## 核心技术特性

### 1. 状态管理
- 使用 Angular Signals 进行状态管理
- 数据存储在 localStorage 和远程仓库

### 2. 路由系统
- Angular Router 实现前端路由
- 支持 Hash 模式和 History 模式

### 3. 数据持久化
- 本地存储：localStorage + localforage
- 远程存储：GitHub/Gitee/GitLab API
- 数据压缩：LZ-String

### 4. UI 组件库
- ng-zorro-antd（Ant Design for Angular）
- 自定义组件

### 5. 构建和部署
- Angular CLI 构建
- 支持多种部署方式（GitHub Pages、Netlify、Vercel等）
- 自动化部署（GitHub Actions）

## 迁移考虑事项

### 1. 技术栈变化
- 从 Angular 迁移到 Next.js (React)
- 状态管理：Angular Signals → React State/Zustand/Redux
- 路由：Angular Router → Next.js Router
- 组件库：ng-zorro-antd → Ant Design 或其他 React 组件库

### 2. 数据兼容性
- 保持现有 JSON 数据结构不变
- 确保迁移后数据可正常使用
- 保持与现有部署方式兼容

### 3. 功能完整性
- 确保所有主题功能完整迁移
- 后台管理系统功能完整保留
- 保持原有用户体验

### 4. 性能优化
- 利用 Next.js 的 SSR/SSG 优势
- 代码分割和懒加载
- 图片优化
- Bundle 优化

## 迁移优先级建议

### 第一阶段：核心功能迁移
1. Side 主题页面（主要使用主题，这里不需要主题切换，项目只使用side主题编写即可）
2. 基础路由配置
3. 数据加载和状态管理
4. 搜索功能

### 第二阶段：后台管理系统
1. 登录认证系统
2. 网站管理模块
3. 设置管理模块
4. 标签管理模块

### 第三阶段：完善功能
1. 其他主题迁移
2. 组件系统迁移
3. 移动端适配优化
4. PWA 功能实现

### 第四阶段：优化和测试
1. 性能优化
2. SEO 优化
3. 兼容性测试
4. 部署配置

## Next.js 迁移技术方案

### 1. 项目结构重组
```
nav-next/
├── public/                 # 静态资源文件
├── src/
│   ├── app/                # Next.js App Router 结构
│   │   ├── layout.tsx      # 根布局
│   │   ├── page.tsx        # 首页
│   │   ├── side/           # Side 主题页面
│   │   │   ├── page.tsx
│   │   │   └── components/ # Side 主题组件
│   │   ├── system/         # 后台管理系统
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   └── [module]/   # 各个管理模块
│   │   └── globals.css     # 全局样式
│   ├── components/         # 公共组件
│   ├── lib/                # 工具函数和库
│   ├── stores/             # 状态管理
│   ├── types/              # TypeScript 类型定义
│   └── data/               # 数据文件
├── next.config.js          # Next.js 配置
├── tsconfig.json           # TypeScript 配置
└── package.json            # 项目依赖
```

### 2. 状态管理方案
- 使用 Zustand 替代 Angular Signals
- 保持数据结构兼容性

### 3. 路由配置
- 使用 Next.js App Router
- 动态路由处理分类和网站详情页

### 4. UI 组件库选择
- ShardCN UI 库
- 视觉风格需要改造，提升用户交互体验感

### 5. 数据获取和缓存
- 使用 Next.js 的数据获取方法（getServerSideProps, getStaticProps）
- 本地数据读取和远程 API 调用

### 6. 样式方案
- Tailwind CSS
- 保持现有样式兼容性

## 关键技术挑战

### 1. 数据结构映射
- 将 Angular 的数据结构映射到 React 组件
- 保持数据一致性
- 根据项目要求，新的项目没有三级分类的概念，只有分类和网站的概念，因此需要简化数据结构

### 2. 状态管理迁移
- 从 Angular Signals 迁移到 React 状态管理
- 处理简化后的嵌套数据结构（一级分类 -> 网站）

### 3. 组件复用
- 尽可能复用现有 UI 逻辑
- 重构为 React 组件

### 4. 路由处理
- 处理复杂的路由参数和查询参数
- 保持 URL 结构一致性

### 5. 性能优化
- 利用 Next.js 的 SSR/SSG 特性
- 代码分割和懒加载优化

## 迁移步骤

### 1. 环境搭建
- 初始化 Next.js 项目
- 配置 TypeScript 和 ESLint
- 安装必要的依赖

### 2. 数据层迁移
- 复制数据文件（db.json, settings.json 等）
- 实现数据读取和写入逻辑
- 创建状态管理 Zustand
- 根据项目要求简化数据结构（去除三级分类，只保留一级分类和网站）

### 3. UI 组件迁移
- 逐个迁移 Angular 组件到 React
- 保持样式和交互一致性，样式需要优化，包括页面设计
- 处理组件间的通信

### 4. 页面路由迁移
- 实现各个页面的路由结构
- 处理动态路由和参数传递
- 实现后台管理系统的路由

### 5. 功能完善
- 实现搜索功能
- 实现主题切换
- 实现暗黑模式
- 实现 PWA 功能

### 6. 测试和优化
- 功能测试
- 性能优化
- SEO 优化
- 移动端适配测试

## 风险评估和应对措施

### 1. 数据兼容性风险
- **风险**：数据结构不兼容导致功能异常
- **应对**：详细分析数据结构，编写转换脚本

### 2. 功能缺失风险
- **风险**：某些功能在迁移过程中丢失
- **应对**：制定详细的功能清单，逐一验证

### 3. 性能下降风险
- **风险**：迁移后性能不如原版
- **应对**：利用 Next.js 优化特性，进行性能测试

### 4. 兼容性问题
- **风险**：在不同浏览器或设备上表现不一致
- **应对**：进行全面的兼容性测试

## 验收标准

### 1. 功能完整性
- 所有原有功能都能正常使用
- 后台管理系统功能完整

### 2. 性能指标
- 页面加载速度优于原版
- 首屏渲染时间符合预期

### 3. 用户体验
- 保持原有的视觉风格
- 交互体验流畅自然

### 4. 技术指标
- 代码质量符合规范
- 无重大安全隐患
- 易于维护和扩展