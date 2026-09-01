/**
 * 容器 API。
 */
import { api } from './client'
import type { ContainerInspect, ContainerListItem, OkResponse } from '../types'

/** 容器列表(默认 all=true,含已停止) */
export const listContainers = () => api<ContainerListItem[]>('/containers')

/** 容器 inspect(moby 全量 JSON) */
export const inspectContainer = (id: string) => api<ContainerInspect>(`/containers/${id}`)

/** 删除容器(?force= 强制) */
export const removeContainer = (id: string, force = false, removeVolumes = false) =>
  api<OkResponse>(`/containers/${id}?force=${force}&v=${removeVolumes}`, { method: 'DELETE' })

/** 容器操作:start / stop / restart / kill / pause / unpause / recreate */
export type ContainerAction = 'start' | 'stop' | 'restart' | 'kill' | 'pause' | 'unpause' | 'recreate'

export const containerAction = (id: string, action: ContainerAction) =>
  api<OkResponse>(`/containers/${id}/${action}`, { method: 'POST' })

/** 容器单次命令执行结果(后端 agent.ContainerExecResult 契约) */
export interface ContainerExecResult {
  stdout: string
  stderr: string
  exit_code: number
  duration_ms: number
  truncated: boolean
}

/**
 * 容器内执行单条命令(输入命令 → 执行 → stdout/stderr/exit code)。
 * 命令退出码非 0 不抛错(200 + exit_code 字段);超时/容器未运行/Agent 离线会抛 ApiError。
 * timeoutSeconds:1~300(0 = 后端默认 30s)。
 */
export const execContainer = (id: string, command: string, timeoutSeconds = 0) =>
  api<ContainerExecResult>(`/containers/${id}/exec`, {
    method: 'POST',
    json: { command, timeout_seconds: timeoutSeconds },
  })
