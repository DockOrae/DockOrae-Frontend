/**
 * WebSocket 消息类型(实时功能:License / 容器 Stats / Logs / Terminal / 系统事件)。
 * 认证:JWT 经 query ?token= 传递(浏览器 WebSocket 无法自定义 Header)。
 */

import type { LicenseInfo } from './license'

/** License 实时推送消息(/api/ws/license):后端 LicenseStateManager 状态变化时推送 */
export interface LicenseWSMessage {
  type: 'license'
  data: {
    active: boolean
    info: LicenseInfo['info']
    online: LicenseInfo['online']
  }
}

/** 容器 Stats 实时消息(/api/containers/:id/stats):每秒快照 */
export interface ContainerStatsMessage {
  cpu_pct: number
  mem_usage: number
  mem_limit: number
  mem_pct: number
  /** 累计字节(前端做差分求速率) */
  net_rx: number
  net_tx: number
}

/** 容器日志流(/api/containers/:id/logs):纯文本行(可能带 ANSI 转义) */
export type LogsWSMessage = string

/** 终端(/api/containers/:id/terminal):输入为文本,输出为二进制或文本 */
export type TerminalWSMessage = string | ArrayBuffer

/** 系统事件推送(/api/ws/events) */
export interface SystemEventWSMessage {
  type: string
  data?: unknown
}

/** 全部 WS 消息联合(按 type 区分) */
export type WebSocketMessage = LicenseWSMessage | ContainerStatsMessage | LogsWSMessage | SystemEventWSMessage
