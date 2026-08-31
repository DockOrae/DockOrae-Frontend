/**
 * 卷相关类型(moby Volume 原生结构)。
 */

/** 卷列表项(moby 结构) */
export interface VolumeListItem {
  Name: string
  Driver: string
  Mountpoint: string
  CreatedAt?: string
  Labels?: Record<string, string>
}

/** 创建卷请求(后端 model.CreateVolumeReq) */
export interface CreateVolumeReq {
  name: string
  driver_opts?: Record<string, string>
  labels?: Record<string, string>
}

/** 卷 inspect(moby 结构) */
export type VolumeInspect = Record<string, unknown>

/** 卷 prune 报告 */
export interface VolumePruneReport {
  VolumesDeleted?: string[]
  SpaceReclaimed?: number
}
