/**
 * 网络 API。
 */
import { api } from './client'
import type { CreateNetworkReq, CreateResponse, NetworkListItem, NetworkPruneReport, OkResponse } from '../types'

/** 网络列表 */
export const listNetworks = () => api<NetworkListItem[]>('/networks')

/** 网络 inspect */
export const inspectNetwork = (id: string) => api<NetworkListItem>(`/networks/${id}`)

/** 创建网络 */
export const createNetwork = (req: CreateNetworkReq) => api<CreateResponse>('/networks', { method: 'POST', json: req })

/** 删除网络 */
export const removeNetwork = (id: string) => api<OkResponse>(`/networks/${id}`, { method: 'DELETE' })

/** 清理未使用的网络 */
export const pruneNetworks = () => api<NetworkPruneReport>('/networks/prune', { method: 'POST' })
