/**
 * 宿主文件管理器类型(2026-09-02 对齐长轮询契约:resourceVersion 冲突检测 + XDG 回收站)。
 */

export type FileType = 'file' | 'directory' | 'symlink' | 'socket' | 'device' | 'fifo' | 'unknown'

/** 宿主文件条目 */
export interface HostFile {
  name: string
  path: string
  type: FileType
  size: number
  modified_at: string
  mode: number
  permissions: string
  owner: string
  group: string
  target?: string
  /** 资源版本(冲突检测) */
  resourceVersion?: string
  editable?: boolean
  previewable?: boolean
}

/** 目录列表响应 */

/** 压缩结果 */
export interface FileCompressResult {
  archive: string
  files: number
  skipped: number
  skipped_why?: string
}

/** 解压结果 */
export interface FileExtractResult {
  dest: string
  files: number
  skipped: number
  warning?: string
}

/** 搜索结果 */
export interface FileSearchResult {
  path: string
  name: string
  type: FileType
  size: number
}

export interface FileSearchResponse {
  results: FileSearchResult[]
  truncated: boolean
}

/** 回收站条目 */
export interface TrashItem {
  id: string
  name: string
  originalPath?: string
  kind: string
  sizeBytes: number
  mode: string
  owner: string
  group: string
  deletedAt: string
  resourceVersion: string
  restorable: boolean
}
