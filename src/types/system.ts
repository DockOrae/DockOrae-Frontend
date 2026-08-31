/**
 * 系统监控类型(后端 internal/service/monitor.go HostInfo / MonitorSnapshot)。
 */

/** 宿主机信息(/system/host) */
export interface HostInfo {
  hostname: string
  os: string
  kernel: string
  arch: string
  cpu_model: string
  cpu_cores: number
  /** 字节 */
  mem_total: number
  /** 秒 */
  uptime: number
  docker_version: string
  /** Unix 秒 */
  server_time: number
}

/** 内存/交换/磁盘用量 */
export interface UsageSlice {
  total: number
  used: number
  pct: number
}

/** 面板自身进程 */
export interface PanelUsage {
  mem: number
  threads: number
}

/** 公网 IP */
export interface PublicIPInfo {
  ipv4: string
  ipv6: string
}

/** 容器网络速率/累计(后端 8 秒采样差分,B/s) */
export interface NetStats {
  rx_rate: number
  tx_rate: number
  rx_total: number
  tx_total: number
}

/** 容器磁盘 IO 速率/累计 */
export interface IOStats {
  read_rate: number
  write_rate: number
  read_total: number
  write_total: number
}

/** 监控快照(/system/monitor) */
export interface MonitorSnapshot {
  cpu_pct: number
  mem?: UsageSlice | null
  /** 1/5/15 分钟负载(可能为 null) */
  load?: [number, number, number] | null
  swap?: UsageSlice | null
  disk?: UsageSlice | null
  panel?: PanelUsage | null
  publicIP?: PublicIPInfo | null
  net?: NetStats | null
  io?: IOStats | null
}

/** 面板日志(/system/logs) */
export interface PanelLogsResponse {
  logs: string[]
}

/** 系统事件(DB 事件流) */
export interface SystemEvent {
  id?: number
  type?: string
  username?: string
  message?: string
  ip?: string
  time?: string
}

/** 面板事件列表响应 */
export interface PanelEventsResponse {
  events: SystemEvent[]
}
