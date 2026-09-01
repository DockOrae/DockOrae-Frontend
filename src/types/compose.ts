/**
 * Compose 相关类型(后端 internal/model/compose.go + 前端栈状态)。
 */

/** Compose 栈列表项 */
export interface ComposeProject {
  project: string
  services: number
  running: number
  status: string
  managed: boolean
}

/** Compose 栈详情(inspect) */
export interface ComposeInspect {
  project: string
  managed: boolean
  containers: import('./container').ContainerListItem[]
  /** 托管栈才有 yaml;外部栈为空(null) */
  yaml?: string | null
}

/** 前端推导的栈运行状态(ComposeManageDialog status computed) */
export type ComposeStackStatus = 'running' | 'stopped' | 'partial'

/** 部署/更新请求体 */
export interface ComposeDeployPayload {
  project: string
  yaml: string
}

/** 接管外部栈请求 */
export interface ComposeAdoptPayload {
  yaml: string
}

/** Compose 部署 NDJSON 流消息:line = 实时输出行;done = 结束(ok/error) */
export type ComposeStreamMessage =
  | { type: 'line'; data: string }
  | { type: 'done'; ok: boolean; error?: string }
