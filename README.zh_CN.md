# DockOrae Frontend

[DockOrae](https://github.com/DockOrae/DockOrae) Docker 管理面板的**前端仓库**(独立维护,与 Go 后端分离)。

## 技术栈

- **Vue 3 + TypeScript + Vite** — 全量类型检查(`vue-tsc`,0 errors)
- **Tailwind CSS 4** + 基于 **Reka UI** 的 **shadcn-vue** 组件
- **vue-i18n** — 简体中文 / 繁體中文 / English
- **lucide** 图标

## 开发

```bash
npm install
npm run dev         # vite :5173,API 代理到 :8080(需本地后端已启动)
npm run typecheck   # vue-tsc 全量类型检查(0 errors)
npm run lint        # ESLint
npm run build       # vue-tsc + 产物 dist/(嵌入 Go 二进制用)
npm run i18n-check  # 校验 3 语言 key 一致性
```

## 与后端集成

后端([DockOrae/DockOrae](https://github.com/DockOrae/DockOrae))构建时通过 CI 拉取本仓库的 `dist/`:前端发布 rolling release 资产(`dockorae-frontend-dist-v<version>-<sha>.tar.gz`),后端下载后由 `web/embed.go` 的 `//go:embed all:dist` 嵌入 Go 二进制。

- 前端源码改动 → 推送本仓库 `master`
- 后端镜像 / 发布构建自动使用本仓库 `master` 最新代码

## 语言

`src/locales/` 下 3 个语言文件(en / zh-CN / zh-TW)必须 key 全量一致(`npm run i18n-check` 校验)。

## License

见[后端仓库](https://github.com/DockOrae/DockOrae)主 README。
