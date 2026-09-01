import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'

/**
 * 品牌字体 preload 注入(2026-09-02 字体首屏优化)。
 * 字体位于 src/assets/fonts/,构建后带内容 hash(assets/*-<hash>.woff2),
 * 静态路径无法预知 → 构建完成后扫描产物,把 woff2 的 preload 注入 index.html。
 * 带 hash 的字体由后端按 assets/* 规则返回 immutable 缓存,刷新零重下。
 */
function fontPreload(): Plugin {
  return {
    name: 'dockorae-font-preload',
    apply: 'build',
    transformIndexHtml(html, ctx) {
      const bundle = ctx.bundle
      if (!bundle) return html
      const links: string[] = []
      for (const chunk of Object.values(bundle)) {
        if (chunk.type === 'asset' && /\.woff2$/.test(chunk.fileName)) {
          links.push(
            `<link rel="preload" href="/${chunk.fileName}" as="font" type="font/woff2" crossorigin="anonymous" />`,
          )
        }
      }
      if (!links.length) return html
      return html.replace('</head>', `${links.join('\n    ')}\n  </head>`)
    },
  }
}

export default defineConfig({
  plugins: [vue(), tailwindcss(), fontPreload()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  build: { outDir: 'dist', assetsDir: 'assets' },
  server: {
    port: 5173,
    proxy: { '/api': 'http://localhost:8080' },
  },
})
