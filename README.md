# DockOrae Frontend

DockOrae 面板的**前端仓库**(独立维护,与后端 `DockOrae/DockOrae` 分离)。

## 技术栈

- Vue 3 + Vite + vue-i18n(14 语言)
- Tailwind CSS + shadcn-vue 组件
- lucide 图标

## 开发

```bash
npm install
npm run dev        # vite :5173,API 代理到 :8080(需本地后端已启动)
npm run build      # 产物 dist/(go:embed 嵌入后端用)
npm run check-i18n # 校验 14 语言 key 一致性
```

## 与后端集成

后端(`DockOrae/DockOrae`)构建时通过 CI 拉取本仓库构建 `dist/`,拷贝到
`web/dist` 后由 `web/embed.go` 的 `//go:embed all:dist` 嵌入 Go 二进制。

- 前端源码改动 → 推送本仓库 master
- 后端镜像/发布构建自动使用本仓库 master 最新代码

## 语言

`src/locales/` 下 14 个语言文件必须 key 全量一致(`npm run check-i18n` 校验)。

## License

见后端仓库主 README。
