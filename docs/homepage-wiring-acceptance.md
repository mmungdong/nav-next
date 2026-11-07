# 首页 React Bits 接线验收说明

日期：2026-11-07。范围：`(main)` 首页及公共搜索弹窗、主题、分类导航、管理入口；后台 CRUD、配置同步与认证实现未重写。

## 所有权

- **数据**：`useNavStore` / `useConfigStore` / `useAuthStore` 仍是唯一数据源。首页只读取 store，不新增第二套加载逻辑；数据仍是 `public/data/db.json` 的 32 个分类 / 147 个站点，localStorage schema 未改。
- **搜索**：`src/lib/siteSearch.ts` 是首页与弹窗共用的纯过滤逻辑。分类名命中返回该分类全部站点；站点名、描述、URL、域名命中只返回匹配项；大小写、全半角、首尾空白、空描述和无效 URL 均有确定行为。站内搜索按 Enter 不跳转，外部引擎按配置 URL + `encodeURIComponent` 打开。
- **分类导航**：桌面 `LineSidebar` 与手机 `PillNav` 的 items 都由过滤后的真实分类派生。滚动高亮与点击定位共用 `useScrollSpy`；桌面侧栏独立滚动；手机 32 个分类可横向滚动，当前项自动进入可视区。sticky 由 CSS 从首屏生效。
- **主题**：仅使用 `next-themes`（`attribute="class"`、`useTheme`、`resolvedTheme`、`.dark`）。后台配置主题只作为“默认值”：无用户选择时应用；用户手动切换后写入 `theme`，后续配置默认值不再覆盖。`src/lib/theme.ts` 与 `theme.test.ts` 覆盖该判定。文档标题跟随配置，并在 Next 元数据 hydration 后继续同步。
- **管理入口**：仅 `isAuthenticated` 时渲染 `管理`，链接指向真实 `/system/`。沿用现有 localStorage 登录状态和后台 `useAdminSyncGuard` 门禁；未冒充登录，也未宣称提升服务端安全性。
- **动画**：首页只使用 React Bits 的 `SpotlightCard`、`PillNav`、`LineSidebar`、`AnimatedContent`。来源、commit、MIT + Commons Clause 许可与适配清单见 `src/components/react-bits/NOTICE.md`。后台仍使用 framer-motion，依赖保留。

## 本次兼容修复

- `build` 脚本改为单独 `next build`，不再与依赖安装并发（`npx pnpm install & next build`）。
- `next.config.ts` 增加 `trailingSlash: true`，静态导出生成 `system/index.html`，嵌套后台路由硬刷新不再依赖主机把 `/system` 映射到 `system.html`。
- 数据文件请求失败（HTTP 非 2xx 或网络异常）不再写入两条演示分类到 `NAV_CATEGORIES`，首页显示“还没有站点数据”和重试按钮，避免一次失败把假数据缓存一小时。
- 主题配置默认值与用户选择分离；首次 hydration 后文档标题继续跟随配置。

## 执行结果

| 命令 | 结果 |
| --- | --- |
| `pnpm test` | 33 passed, 0 failed |
| `pnpm exec tsc --noEmit` | 通过 |
| `pnpm build` | 通过，静态导出成功 |
| `pnpm lint` | 10 errors / 9 warnings，全部位于本次未修改的后台/旧组件（admin setting、admin web、EditCategoryModal、MoveWebsiteModal、OptimizedImage、AdminSidebar、useAdminSyncGuard、useDebounce、configStore.test）；本次新增/修改前台文件无 ESLint 错误 |

静态产物检查：`out/index.html` 仅 1 个 `<html>` / `<body>`；17 个 `_next/static` 引用均存在；`out/system/index.html` 与 `out/system/web/index.html` 存在；`/`、`/system/` 直接访问 200，`/system` 301 到 `/system/`。

浏览器验证（macOS 26.6，Chromium Headless 156，本地 `python3 -m http.server` 服务 `out/`）：

- 1440 桌面：32 分类 / 147 卡片；侧栏独立滚动；147 个卡片链接均 `target="_blank"`、`rel="noopener noreferrer"`；滚动后点击最后一个分类最终高亮“32 小程序”；键盘 Enter 可定位分类；回到顶部即时生效。
- 390 手机：`document.scrollWidth = 390`；32 个 PillNav 项；横向滚动容器 `scrollWidth 1897 > clientWidth 254`；点击第 21 / 32 项后目标分类吸顶对齐、当前 pill 在可视区；无全局 `overflow-x: hidden` 掩盖。
- 768 平板：3 列网格，`scrollWidth 762 <= 768`，无横向溢出。
- 搜索：`github` 首页 21 站点/10 分类，弹窗相同；`v2ex.com` 1/1；`AI` 25/9；中文“微信” 2/2；无结果 0；清空恢复 32/147。分类名命中展示整类，站点命中只展示匹配项。
- 弹窗：Cmd+K 与 Ctrl+K 均打开并聚焦输入框；Tab / Shift+Tab 循环；Esc 关闭并恢复触发按钮焦点；body `overflow` 恢复；点击结果关闭；站内 Enter 保持 URL 不变；外部 Google 编码结果 `https://www.google.com/search?q=%E4%B8%AD%E6%96%87%20%E6%90%9C%E7%B4%A2%2Fa%26b`。
- 主题：配置默认 dark 生效；用户切换 light 后刷新保持 light；system 跟随 `prefers-color-scheme`；无 hydration/console 警告。
- 其他：reduced-motion 下 hero/卡片 opacity 1、无隐藏离屏内容、分类跳转即时；图标缺失 39 个、模拟加载失败后回退首字母；空描述 98 个不造文案；长标题/长描述/长域名不撑破卡片；全量为空显示空状态；数据请求 500 显示空状态且不缓存演示数据；登录/未登录管理入口分别为 1/0。
- 截图：`docs/verification/desktop-dark-top.png`、`desktop-light-top.png`、`desktop-last-category.png`、`desktop-search-github.png`、`desktop-search-empty.png`、`desktop-empty-data.png`、`desktop-load-failure.png`、`desktop-authenticated-top.png`、`mobile-390-top.png`、`mobile-390-nav.png`、`mobile-390-last-category.png`、`tablet-768-top.png`。

## 未验证 / 边界

- **仅 macOS + Chromium 验证，Windows 未实机验证**；未执行跨平台浏览器矩阵。
- 后台 CRUD / 排序 / GitHub 拉取对比推送未做真实写入回归：环境无 GitHub 凭据，且按要求禁止远程写入。已验证 `/system/` 硬刷新、认证门禁和未登录跳转；带 token 的数据/保存流程未验证。
- `top`、`topTypes`、`ownVisible` 仍只参与后台展示/差异比较，首页未新增排序或权限规则（沿用既有语义）。
- localStorage 登录仅是前端状态，不是服务端安全边界。
- 数据原件未修改：`public/data/db.json`、`public/data/site-config.json` 无 diff；未提交、推送或部署。

## 本地复现

```bash
pnpm install
pnpm test
pnpm exec tsc --noEmit
pnpm build
python3 -m http.server 4173 --directory out
# 打开 http://127.0.0.1:4173/
```
