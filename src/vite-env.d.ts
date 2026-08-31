/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** 面板 API 基础地址(代理目标),留空 = Vite 代理到 localhost:8080 */
  readonly VITE_API_BASE?: string
  /** 是否启用 mock 数据(本地无后端调试用) */
  readonly VITE_MOCK?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
