/**
 * 宿主终端长轮询 API(2026-09-02 重构:端点契约长轮询架构)。
 * open 开会话 → 循环 output(offset 游标,长轮询 1000ms)→ input/resize/close。
 * 彻底替代旧 WS 终端(连接不稳定根因)。
 */
import { api } from './client'

/** 终端会话(open 响应) */
export interface TerminalSession {
  sessionId: string
  offset: number
  createdAt: string
}

/** 输出块(output 响应) */
export interface TerminalOutput {
  data?: string
  offset: number
  nextOffset: number
  truncated?: boolean
  exitedAt?: string | null
  exitError?: string
  closed?: boolean
}

/** 打开终端会话(cwd 可选:文件管理器「在终端打开」指定目录) */
export const terminalOpen = (rows: number, columns: number, cwd?: string) =>
  api<TerminalSession>('/v1/terminal-sessions', {
    method: 'POST',
    json: { rows, columns, cwd },
  })

/** 长轮询拉取输出(offset 游标;wait 服务端固定 1000ms) */
export const terminalOutput = (sessionId: string, offset: number, signal?: AbortSignal) =>
  api<TerminalOutput>(
    `/v1/terminal-sessions/${encodeURIComponent(sessionId)}/output?offset=${offset}&wait=1000`,
    { signal },
  )

/** 输入(base64 编码,无 padding) */
export const terminalInput = (sessionId: string, data: string) =>
  api<{ accepted: boolean }>(`/v1/terminal-sessions/${encodeURIComponent(sessionId)}/input`, {
    method: 'POST',
    json: { data },
  })

/** 调整尺寸 */
export const terminalResize = (sessionId: string, rows: number, columns: number) =>
  api<{ accepted: boolean }>(`/v1/terminal-sessions/${encodeURIComponent(sessionId)}/resize`, {
    method: 'POST',
    json: { rows, columns },
  })

/** 关闭会话 */
export const terminalClose = (sessionId: string) =>
  api<{ closed: boolean }>(`/v1/terminal-sessions/${encodeURIComponent(sessionId)}/close`, {
    method: 'POST',
    json: {},
  })
