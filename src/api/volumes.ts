/**
 * 卷 API。
 */
import { api } from './client'
import type { CreateResponse, CreateVolumeReq, OkResponse, VolumeInspect, VolumeListItem, VolumePruneReport } from '../types'

/** 卷列表 */
export const listVolumes = () => api<VolumeListItem[]>('/volumes')

/** 卷 inspect */
export const inspectVolume = (name: string) => api<VolumeInspect>(`/volumes/${name}`)

/** 创建卷 */
export const createVolume = (req: CreateVolumeReq) => api<CreateResponse>('/volumes', { method: 'POST', json: req })

/** 删除卷 */
export const removeVolume = (name: string) => api<OkResponse>(`/volumes/${name}`, { method: 'DELETE' })

/** 清理未使用的卷 */
export const pruneVolumes = () => api<VolumePruneReport>('/volumes/prune', { method: 'POST' })
