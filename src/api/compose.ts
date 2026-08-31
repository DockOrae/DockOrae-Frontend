/**
 * Compose API(部署/更新为 NDJSON 进度流)。
 */
import { api, composeStream } from './client'
import type { ComposeAdoptPayload, ComposeDeployPayload, ComposeInspect, OkResponse } from '../types'

/** Compose 栈详情 */
export const inspectCompose = (project: string) => api<ComposeInspect>(`/compose/${project}`)

/** 新建栈并部署(进度流) */
export const deployCompose = (payload: ComposeDeployPayload, onLine: (data: string) => void) =>
  composeStream('/compose', payload, onLine)

/** 更新栈并重新部署(进度流) */
export const updateCompose = (project: string, payload: ComposeDeployPayload, onLine: (data: string) => void) =>
  composeStream(`/compose/${project}`, payload, onLine)

/** 接管外部栈(粘贴 yaml 保存到面板) */
export const adoptCompose = (project: string, payload: ComposeAdoptPayload) =>
  api<OkResponse>(`/compose/${project}/adopt`, { method: 'POST', json: payload })

/** 删除栈 */
export const removeCompose = (project: string) => api<OkResponse>(`/compose/${project}`, { method: 'DELETE' })

/** 栈操作:start / stop / restart / down */
export type ComposeAction = 'start' | 'stop' | 'restart' | 'down'

export const composeAction = (project: string, action: ComposeAction, volumes = false) =>
  api<OkResponse>(`/compose/${project}/${action}${action === 'down' && volumes ? '?volumes=true' : ''}`, {
    method: 'POST',
  })
