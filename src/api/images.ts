/**
 * 镜像 API。
 */
import { api, pullImageStream } from './client'
import type { ImageInspect, ImageListItem, ImagePruneReport, OkResponse, PullProgressLine, TagImageReq } from '../types'

/** 镜像列表 */
export const listImages = () => api<ImageListItem[]>('/images')

/** 镜像 inspect */
export const inspectImage = (id: string) => api<ImageInspect>(`/images/${id}`)

/** 删除镜像(?force= 强制) */
export const removeImage = (id: string, force = false) =>
  api<OkResponse>(`/images/${id}?force=${force}`, { method: 'DELETE' })

/** 打标签 */
export const tagImage = (id: string, req: TagImageReq) =>
  api<OkResponse>(`/images/${id}/tag`, { method: 'POST', json: req })

/** 清理未使用的镜像 */
export const pruneImages = () => api<ImagePruneReport>('/images/prune', { method: 'POST' })

/** 拉取镜像(NDJSON 进度流) */
export const pullImage = (fromImage: string, tag: string | null, onLine: (line: PullProgressLine) => void) =>
  pullImageStream({ from_image: fromImage, tag }, onLine)
