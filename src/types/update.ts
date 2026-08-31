/**
 * 在线更新类型(后端 internal/model/update.go)。
 */

/** GitHub Release 资产 */
export interface ReleaseAsset {
  name: string
  size: number
  browser_download_url: string
}

export interface UpdateRelease {
  tag_name: string
  name: string
  body: string
  published_at: string
  html_url: string
  prerelease: boolean
  draft: boolean
  assets: ReleaseAsset[]
}

/** Release Notes 分类段 */
export type ReleaseNoteType = 'features' | 'bug_fixes' | 'improvements' | 'security' | 'breaking_changes'

export interface ReleaseNoteSection {
  type: ReleaseNoteType
  items: string[]
}

/** 更新检查结果(/update/check) */
export interface UpdateInfo {
  current: string
  latest: string
  has_update: boolean
  release?: UpdateRelease | null
  install_type: string
  installable: boolean
  not_installable_reason?: string
  notes?: ReleaseNoteSection[]
  notes_raw: boolean
  error?: string
}

/** 更新阶段 */
export type UpdatePhase =
  | 'idle'
  | 'downloading'
  | 'verifying'
  | 'backing_up'
  | 'installing'
  | 'restarting'
  | 'done'
  | 'failed'
  | string

/** 更新进度(/update/status) */
export interface UpdateStatus {
  running: boolean
  phase: UpdatePhase
  percent: number
  error: string
  started_at: string
  finished_at: string
}

/** 启动更新响应 */
export interface UpdateApplyResponse {
  ok: boolean
  message: string
}
