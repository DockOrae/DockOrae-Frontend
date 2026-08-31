/**
 * Agent(宿主机控制平面)类型。
 */

/** Swap 设备条目 */
export interface SwapDevice {
  path: string
  type: string
  /** 字节 */
  size: number
  /** 字节 */
  used: number
  priority: string
}

/** Swap 状态(/agent/swap) */
export interface SwapStatus {
  enabled: boolean
  /** 字节 */
  total: number
  /** 字节 */
  used: number
  pct: number
  devices: SwapDevice[]
}
