/**
 * 镜像相关类型(后端 internal/model/image.go 精简结构 + moby pull 流)。
 */

/** 镜像列表项 */
export interface ImageListItem {
  Id: string
  RepoTags: string[]
  Size: number
  Created: number
}

/** 拉取镜像请求(后端 model.PullImageReq) */
export interface PullImageReq {
  from_image: string
  tag?: string | null
}

/** 打标签请求 */
export interface TagImageReq {
  repo: string
  tag: string
}

/** 拉取镜像 NDJSON 流的一行(moby pull progress) */
export interface PullProgressLine {
  id?: string
  status?: string
  progress?: string
  progressDetail?: { current?: number; total?: number }
  error?: string
}

/** 镜像 prune 报告(moby 结构) */
export interface ImagePruneReport {
  ImagesDeleted?: Array<{ Untagged?: string; Deleted?: string }>
  SpaceReclaimed?: number
}

/** 镜像 inspect(moby 原生结构,前端仅 JSON 展示) */
export type ImageInspect = Record<string, unknown>
