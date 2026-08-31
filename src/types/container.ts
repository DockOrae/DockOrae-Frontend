/**
 * 容器相关类型。
 * 列表结构 = 后端 internal/model/container.go 的 ContainerListItem(精简版,moby 子集);
 * Inspect = moby 全量 inspect JSON(moby/api/types/container 结构)。
 */

/** 容器状态(展示用;后端为字符串,未知状态原样显示) */
export type ContainerState =
  | 'running'
  | 'exited'
  | 'stopped'
  | 'created'
  | 'restarting'
  | 'paused'
  | 'dead'
  | 'removing'
  | string

/** 容器列表项(后端精简结构) */
export interface ContainerListItem {
  Id: string
  Names: string[]
  Image: string
  State: string
  Ports: PortSummary[]
  Created: number
  Mounts: ContainerMountItem[]
  Labels?: Record<string, string>
}

export interface ContainerMountItem {
  Type: string
  Name: string
}

/** moby PortSummary 子集 */
export interface PortSummary {
  IP?: string
  PrivatePort?: number
  PublicPort?: number
  Type?: string
}

/** 创建容器请求(后端 model.CreateContainerReq) */
export interface PortMap {
  container: string
  host: number | null
  host_ip?: string
}

export interface VolumeMap {
  host?: string | null
  volume?: string | null
  container: string
  mode?: string
}

export interface CreateContainerReq {
  name?: string | null
  image: string
  cmd?: string[] | null
  env?: string[]
  ports?: PortMap[]
  volumes?: VolumeMap[]
  network?: string | null
  restart_policy?: string
  tty?: boolean | null
  privileged?: boolean | null
}

/** 重命名容器请求 */
export interface RenameContainerReq {
  name: string
}

/** 容器 prune 报告(moby 结构) */
export interface ContainerPruneReport {
  ContainersDeleted?: string[]
  SpaceReclaimed?: number
}

/** moby 容器 inspect(仅前端实际使用的字段;其余为 moby 原生结构) */
export interface ContainerInspect {
  Id: string
  Name?: string
  Created?: string
  RestartCount?: number
  State?: {
    Status?: string
    Running?: boolean
    Paused?: boolean
    Restarting?: boolean
    OOMKilled?: boolean
    Dead?: boolean
    ExitCode?: number
    Error?: string
    StartedAt?: string
    FinishedAt?: string
  }
  Config?: {
    Hostname?: string
    Image?: string
    Cmd?: string[]
    Entrypoint?: string[]
    Env?: string[]
    WorkingDir?: string
    User?: string
    Labels?: Record<string, string>
  }
  HostConfig?: {
    NetworkMode?: string
    RestartPolicy?: { Name?: string; MaximumRetryCount?: number }
    PortBindings?: Record<string, unknown>
  }
  NetworkSettings?: {
    Ports?: Record<string, Array<{ HostIp?: string; HostPort?: string }> | null>
    Networks?: Record<string, unknown>
  }
  Mounts?: Array<{
    Type?: string
    Name?: string
    Source?: string
    Destination?: string
    Mode?: string
    RW?: boolean
  }>
}
