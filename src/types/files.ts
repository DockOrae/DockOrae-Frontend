/**
 * 宿主文件管理器类型(与 Agent files.Entry 一一对应,禁止前端自行假设结构)。
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
}

/** 目录列表响应 */
export interface FileListResponse {
  path: string
  entries: HostFile[]
}

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

/** 回收站状态 */
export interface TrashStatus {
  enabled: boolean
  trashDir: string
}

/** 回收站条目 */
export interface TrashItem {
  name: string
  source_path: string
  size: number
  delete_time: string
  is_dir: boolean
}
