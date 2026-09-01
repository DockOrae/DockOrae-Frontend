/**
 * 宿主文件管理器 API(2026-09-02 重构:端点契约长轮询架构)。
 * 端点:
 *   GET  /v1/files                    → 目录列表(path/limit/offset/search,服务端分页)
 *   GET  /v1/files/entry              → 单条目属性(path)
 *   POST /v1/files/entries            → 批量属性(paths)
 *   GET  /v1/files/trash              → 回收站列表
 *   GET  /v1/files/content            → 读文件/下载(path/disposition)
 *   PUT  /v1/files/content            → 写文件(path, JSON {content, expectedResourceVersion})
 *   GET  /v1/files/text               → 文本读取(≤64KiB)
 *   GET  /v1/files/tail               → 文本尾部(≤64KiB)
 *   GET  /v1/files/archive            → 压缩下载(selection JSON + name)
 *   POST /v1/files/upload             → 上传(path/name/overwrite, octet-stream)
 *   POST /v1/files/actions            → 批量操作(mkdir/rename/copy/move/trash/chmod/compress/extract/trash_*)
 */
import { api, entrancePath, getToken } from './client'
import type { HostFile, TrashItem } from '../types'

// ---------- 条目适配:Agent FileEntry ↔ HostFile ----------
interface RawFileEntry {
  name: string
  path: string
  kind: string
  mime?: string
  sizeBytes: number
  mode: string
  owner: string
  group: string
  modifiedAt: string
  resourceVersion: string
  editable: boolean
  previewable: boolean
}

interface RawDirectory {
  path: string
  entries: RawFileEntry[]
  offset: number
  nextOffset?: number
  total?: number
  totalKnown?: boolean
  truncated: boolean
  scanTruncated?: boolean
  readAt: string
}

/** "-rwxr-xr-x" / "drwxr-xr-x" → 八进制 bits */
function modeStrToBits(s: string): number {
  if (!s || s.length < 10) return 0
  let bits = 0
  const segs = [s.slice(1, 4), s.slice(4, 7), s.slice(7, 10)]
  segs.forEach((seg, i) => {
    const shift = (2 - i) * 3
    if (seg[0] === 'r') bits |= 4 << shift
    if (seg[1] === 'w') bits |= 2 << shift
    if (seg[2] === 'x' || seg[2] === 's' || seg[2] === 't') bits |= 1 << shift
    if (seg[2] === 's' || seg[2] === 'S') bits |= 0o4000 >> (i * 3)
    if (seg[2] === 't' || seg[2] === 'T') bits |= 0o1000
  })
  return bits
}

function toHostFile(e: RawFileEntry): HostFile {
  return {
    name: e.name,
    path: e.path,
    type: (e.kind === 'special' ? 'file' : e.kind) as HostFile['type'],
    size: e.sizeBytes,
    modified_at: e.modifiedAt,
    mode: modeStrToBits(e.mode),
    permissions: e.mode,
    owner: e.owner,
    group: e.group,
    // 扩展字段(冲突检测等)
    resourceVersion: e.resourceVersion,
    editable: e.editable,
    previewable: e.previewable,
  }
}

/** 目录列表(服务端分页 limit 100 + nextOffset 游标;search 当前目录过滤) */
export const listFiles = async (
  path: string,
  options?: { offset?: number; search?: string },
  signal?: AbortSignal,
): Promise<{ path: string; entries: HostFile[]; nextOffset?: number; total?: number }> => {
  const q = [`path=${encodeURIComponent(path)}`, 'limit=100']
  if (options?.offset) q.push(`offset=${options.offset}`)
  if (options?.search) q.push(`search=${encodeURIComponent(options.search)}`)
  const res = await api<RawDirectory>(`/v1/files?${q.join('&')}`, { signal })
  return {
    path: res.path,
    entries: res.entries.map(toHostFile),
    nextOffset: res.nextOffset,
    total: res.totalKnown && res.total ? res.total : undefined,
  }
}

/** 单条目属性 */
export const statFile = async (path: string): Promise<HostFile> => {
  const e = await api<RawFileEntry>(`/v1/files/entry?path=${encodeURIComponent(path)}`)
  return toHostFile(e)
}

/** 批量属性 */
export const statFiles = (paths: string[]) =>
  api<{ entries: RawFileEntry[]; unavailable: string[] }>('/v1/files/entries', {
    method: 'POST',
    json: { paths },
  })

/** 新建空文件(写入空内容) */
export const touchFile = (path: string) =>
  api<{ entry: RawFileEntry }>(`/v1/files/content?path=${encodeURIComponent(path)}`, {
    method: 'PUT',
    json: { content: '', expectedResourceVersion: '' },
  })

/** 新建目录 */
export const mkdirFile = (path: string, name: string) =>
  api<{ action: string; succeeded: unknown[]; failed: unknown[] }>('/v1/files/actions', {
    method: 'POST',
    json: { action: 'mkdir', target: path, name },
  })

/** 重命名 */
export const renameFile = (oldPath: string, newPath: string, resourceVersion = '') =>
  api<{ action: string; succeeded: unknown[]; failed: unknown[] }>('/v1/files/actions', {
    method: 'POST',
    json: { action: 'rename', sources: [oldPath], target: newPath, expectedResourceVersion: resourceVersion },
  })

/** 复制(批量;目标冲突自动加后缀) */
export const copyFile = (sources: string[], target: string, versions: Record<string, string> = {}) =>
  api<{ action: string; succeeded: unknown[]; failed: unknown[] }>('/v1/files/actions', {
    method: 'POST',
    json: { action: 'copy', sources, target, expectedResourceVersions: versions },
  })

/** 移动(批量) */
export const moveFile = (sources: string[], target: string, versions: Record<string, string> = {}) =>
  api<{ action: string; succeeded: unknown[]; failed: unknown[] }>('/v1/files/actions', {
    method: 'POST',
    json: { action: 'move', sources, target, expectedResourceVersions: versions },
  })

/** 删除(移入回收站;危险目录保护在 Agent 侧强制) */
export const removeFiles = (paths: string[], versions: Record<string, string> = {}) =>
  api<{ action: string; succeeded: unknown[]; failed: unknown[] }>('/v1/files/actions', {
    method: 'POST',
    json: { action: 'trash', sources: paths, expectedResourceVersions: versions },
  })

/** 修改权限(mode 为八进制字符串如 "0755") */
export const chmodFile = (path: string, mode: string) =>
  api<{ action: string; succeeded: unknown[]; failed: unknown[] }>('/v1/files/actions', {
    method: 'POST',
    json: { action: 'chmod', sources: [path], mode },
  })

/** 覆盖写入(编辑器保存;expectedResourceVersion 冲突检测) */
export const writeFile = (path: string, content: string, expectedResourceVersion = '') =>
  api<{ entry: RawFileEntry }>(`/v1/files/content?path=${encodeURIComponent(path)}`, {
    method: 'PUT',
    json: { content, expectedResourceVersion },
  })

/** 文本读取(≤64KiB,编辑器/预览) */
export const readFileText = (path: string) =>
  api<{ path: string; content: string; sizeBytes: number; resourceVersion: string }>(
    `/v1/files/text?path=${encodeURIComponent(path)}`,
  )

/** 文本尾部(日志预览) */
export const tailFileText = (path: string, maxBytes = 32768) =>
  api<{ path: string; content: string; sizeBytes: number; resourceVersion: string; truncated: boolean }>(
    `/v1/files/tail?path=${encodeURIComponent(path)}&maxBytes=${maxBytes}`,
  )

/** 压缩(批量 action) */
export const compressFiles = (
  sources: string[],
  target: string,
  name: string,
  format: 'tar.gz' | 'zip',
  versions: Record<string, string> = {},
) =>
  api<{ action: string; succeeded: unknown[]; failed: unknown[] }>('/v1/files/actions', {
    method: 'POST',
    json: { action: 'compress', sources, target, name, format, expectedResourceVersions: versions },
  })

/** 解压 */
export const extractFile = (path: string, target: string, name: string, format: string, resourceVersion = '') =>
  api<{ action: string; succeeded: unknown[]; failed: unknown[] }>('/v1/files/actions', {
    method: 'POST',
    json: { action: 'extract', sources: [path], target, name, format, expectedResourceVersion: resourceVersion },
  })

/** 内容 URL(下载/内联预览;<img>/<a> 直接引用,带 token) */
export function fileDownloadUrl(path: string, disposition: 'inline' | 'attachment' = 'attachment'): string {
  return entrancePath(
    `/api/v1/files/content?path=${encodeURIComponent(path)}&disposition=${disposition}&token=${encodeURIComponent(getToken() || '')}`,
  )
}

/** 图片预览 URL */
export const filePreviewUrl = (path: string) => fileDownloadUrl(path, 'inline')

/** 回收站列表(固定 XDG 回收站,无开关) */
export const trashList = () =>
  api<{ entries: TrashItem[]; total: number; truncated: boolean; readAt: string }>('/v1/files/trash')

/** 回收站:恢复 */
export const trashRestore = (trashIds: string[]) =>
  api<{ action: string; succeeded: unknown[]; failed: unknown[] }>('/v1/files/actions', {
    method: 'POST',
    json: { action: 'trash_restore', trashIds },
  })

/** 回收站:彻底删除 */
export const trashDelete = (trashIds: string[]) =>
  api<{ action: string; succeeded: unknown[]; failed: unknown[] }>('/v1/files/actions', {
    method: 'POST',
    json: { action: 'trash_delete', trashIds },
  })

/** 回收站:清空 */
export const trashEmpty = () =>
  api<{ action: string; succeeded: unknown[]; failed: unknown[] }>('/v1/files/actions', {
    method: 'POST',
    json: { action: 'trash_empty' },
  })

/** 上传(octet-stream 直传,带进度) */
export function uploadFile(
  path: string,
  name: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', entrancePath(`/api/v1/files/upload?path=${encodeURIComponent(path)}&name=${encodeURIComponent(name)}`))
    const token = getToken()
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.setRequestHeader('Content-Type', 'application/octet-stream')
    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else {
        let msg = 'err.requestFailed'
        try {
          const j = JSON.parse(xhr.responseText) as { title?: string; message?: string }
          msg = j.title || j.message || msg
        } catch {
          /* ignore */
        }
        reject(new Error(msg))
      }
    }
    xhr.onerror = () => reject(new Error('err.networkError'))
    xhr.send(file)
  })
}
