/**
 * 容器 API。
 */
import { api } from './client'
import type {
  ContainerInspect,
  ContainerListItem,
  ContainerPruneReport,
  CreateContainerReq,
  CreateResponse,
  OkResponse,
} from '../types'

/** 容器列表(默认 all=true,含已停止) */
export const listContainers = () => api<ContainerListItem[]>('/containers')

/** 容器 inspect(moby 全量 JSON) */
export const inspectContainer = (id: string) => api<ContainerInspect>(`/containers/${id}`)

/** 创建容器 */
export const createContainer = (req: CreateContainerReq) =>
  api<CreateResponse>('/containers', { method: 'POST', json: req })

/** 删除容器(?force= 强制) */
export const removeContainer = (id: string, force = false, removeVolumes = false) =>
  api<OkResponse>(`/containers/${id}?force=${force}&v=${removeVolumes}`, { method: 'DELETE' })

/** 容器操作:start / stop / restart / kill / pause / unpause / recreate */
export type ContainerAction = 'start' | 'stop' | 'restart' | 'kill' | 'pause' | 'unpause' | 'recreate'

export const containerAction = (id: string, action: ContainerAction) =>
  api<OkResponse>(`/containers/${id}/${action}`, { method: 'POST' })

/** 重命名容器 */
export const renameContainer = (id: string, name: string) =>
  api<OkResponse>(`/containers/${id}/rename`, { method: 'POST', json: { name } })

/** 清理未使用的容器 */
export const pruneContainers = () => api<ContainerPruneReport>('/containers/prune', { method: 'POST' })
