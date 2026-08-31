/**
 * Agent(宿主机控制平面)类型。
 */

/** Agent 连通性(/agent/status) */
export interface AgentHealth {
  available?: boolean
  ok?: boolean
  name?: string
  version?: string
  mode?: string
  error?: string
}

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

/** 宿主机信息(/agent/host/info) */
export interface AgentHostInfo {
  hostname: string
  os: string
  distribution: string
  distro_version: string
  kernel: string
  arch: string
  cpu_model: string
  cpu_cores: number
  mem_total: number
  mem_used: number
  uptime: number
  load_avg?: number[]
  disk?: { total: number; used: number; pct: number }
  swap?: { total: number; used: number; pct: number }
  server_time: number
}
