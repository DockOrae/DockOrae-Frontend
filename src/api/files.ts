/**
 * 宿主文件管理器 API(面板 → Agent → 宿主)。
 */
import { api, entrancePath, getToken, wsUrl } from './client'
import type { HostFile, FileListResponse, FileCompressResult, FileExtractResult, FileSearchResponse, TrashStatus, TrashItem } from '../types'

/** 目录列表(showHidden 控制隐藏文件) */
export const listFiles = (path: string, showHidden = false) =>
  api<FileListResponse>(`/files/list?path=${encodeURIComponent(path)}&show_hidden=${showHidden}`)

/** 目录大小 */
export const dirSize = (path: string) => api<{ size: number }>(`/files/dirsize?path=${encodeURIComponent(path)}`)

/** 修改所有者/用户组 */
export const chownFile = (path: string, owner: string, group: string) =>
  api<{ ok: boolean }>('/files/chown', { method: 'POST', json: { path, owner, group } })

/** 单条目属性 */
export const statFile = (path: string) => api<HostFile>(`/files/stat?path=${encodeURIComponent(path)}`)

/** 新建空文件 */
export const touchFile = (path: string) => api<{ ok: boolean }>('/files/touch', { method: 'POST', json: { path } })

/** 新建目录 */
export const mkdirFile = (path: string) => api<{ ok: boolean }>('/files/mkdir', { method: 'POST', json: { path } })

/** 重命名 */
export const renameFile = (oldPath: string, newPath: string) =>
  api<{ ok: boolean }>('/files/rename', { method: 'POST', json: { old_path: oldPath, new_path: newPath } })

/** 复制 */
export const copyFile = (src: string, dst: string) =>
  api<{ ok: boolean }>('/files/copy', { method: 'POST', json: { src, dst } })

/** 移动 */
export const moveFile = (src: string, dst: string) =>
  api<{ ok: boolean }>('/files/move', { method: 'POST', json: { src, dst } })

/** 删除(危险;Agent 强制 confirm + 目录 recursive;force=true 永久删除,否则回收站开启时进回收站) */
export const removeFiles = (paths: string[], recursive: boolean, force = false) =>
  api<{ ok: boolean; trashed: boolean }>('/files/remove', { method: 'POST', json: { paths, recursive, force } })

/** 回收站状态 */
export const trashStatus = () => api<TrashStatus>('/files/trash/status')

/** 回收站开关 */
export const trashSetEnabled = (enabled: boolean) =>
  api<{ ok: boolean }>('/files/trash/enable', { method: 'POST', json: { enabled } })

/** 回收站列表 */
export const trashList = () => api<{ items: TrashItem[] }>('/files/trash/list')

/** 恢复回收站条目 */
export const trashRestore = (names: string[]) =>
  api<{ ok: boolean }>('/files/trash/restore', { method: 'POST', json: { names } })

/** 彻底删除回收站条目 */
export const trashDelete = (names: string[]) =>
  api<{ ok: boolean }>('/files/trash/delete', { method: 'POST', json: { names } })

/** 清空回收站 */
export const trashEmpty = () => api<{ ok: boolean }>('/files/trash/empty', { method: 'POST', json: {} })

/** 修改权限(mode 为八进制数,如 0o755) */
export const chmodFile = (path: string, mode: number) =>
  api<{ ok: boolean }>('/files/chmod', { method: 'POST', json: { path, mode } })

/** 覆盖写入(编辑器保存) */
export const writeFile = (path: string, content: string) =>
  api<{ ok: boolean }>('/files/write', { method: 'POST', json: { path, content } })

/** 压缩(tar.gz/zip) */
export const compressFiles = (dir: string, archive: string, format: 'tar.gz' | 'zip', names: string[]) =>
  api<FileCompressResult>('/files/compress', { method: 'POST', json: { dir, archive, format, names } })

/** 解压 */
export const extractFile = (archive: string, dest: string) =>
  api<FileExtractResult>('/files/extract', { method: 'POST', json: { archive, dest } })

/** 递归搜索 */
export const searchFiles = (path: string, q: string, limit = 200) =>
  api<FileSearchResponse>(`/files/search?path=${encodeURIComponent(path)}&q=${encodeURIComponent(q)}&limit=${limit}`)

/** 下载 URL(带 token query 认证,浏览器原生下载) */
export function fileDownloadUrl(path: string): string {
  return entrancePath(`/api/files/download?path=${encodeURIComponent(path)}&token=${encodeURIComponent(getToken() || '')}`)
}

/** 图片预览 URL(带 token query 认证,<img> 直接引用) */
export const filePreviewUrl = fileDownloadUrl

/** 上传(带进度;multipart → 面板 → Agent 流式) */
export function uploadFile(dir: string, file: File, onProgress?: (pct: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', entrancePath(`/api/files/upload?dir=${encodeURIComponent(dir)}`))
    const token = getToken()
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else {
        let msg = 'err.requestFailed'
        try {
          msg = (JSON.parse(xhr.responseText) as { error?: string }).error || msg
        } catch {
          /* ignore */
        }
        reject(new Error(msg))
      }
    }
    xhr.onerror = () => reject(new Error('err.networkError'))
    const fd = new FormData()
    fd.append('file', file)
    xhr.send(fd)
  })
}

/** 宿主终端 WS 地址 */
export function hostTerminalWsUrl(cwd: string, cols: number, rows: number): string {
  const q = [`cwd=${encodeURIComponent(cwd)}`, `cols=${cols}`, `rows=${rows}`].join('&')
  return wsUrl(`/files/terminal?${q}`)
}
