# DockOrae Frontend

The **web frontend** of the [DockOrae](https://github.com/DockOrae/DockOrae) Docker management panel — maintained as a standalone repository, decoupled from the Go backend.

## Tech Stack

- **Vue 3 + TypeScript + Vite** — fully type-checked (`vue-tsc`, 0 errors)
- **Tailwind CSS 4** + **shadcn-vue** components built on **Reka UI**
- **vue-i18n** — 简体中文 / 繁體中文 / English
- **lucide** icons

## Development

```bash
npm install
npm run dev         # vite :5173,API proxied to :8080 (requires a running backend)
npm run typecheck   # vue-tsc full type check (0 errors)
npm run lint        # ESLint
npm run build       # vue-tsc + dist/ output (embedded into the Go binary)
npm run i18n-check  # verify key parity across the 3 locales
```

## Integration with the Backend

The backend ([DockOrae/DockOrae](https://github.com/DockOrae/DockOrae)) pulls this repository's `dist/` during CI: the frontend publishes a rolling release asset (`dockorae-frontend-dist-v<version>-<sha>.tar.gz`), which the backend downloads and embeds via `web/embed.go` (`//go:embed all:dist`).

- Frontend source changes → push to this repo's `master`
- Backend image / release builds automatically use the latest `master` code

## Languages

`src/locales/` holds 3 locale files (en / zh-CN / zh-TW) which must stay key-aligned (`npm run i18n-check` enforces this).

## License

See the [backend repository](https://github.com/DockOrae/DockOrae) main README.
