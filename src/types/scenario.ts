import type { NodeId, RpcType } from './raft'
import type { SimulationSnapshot } from './simulation'

export interface EngineAction {
  type: 'set_partition' | 'crash_node' | 'restore_node' | 'reset' | 'set_config' | 'add_node' | 'remove_node'
  payload: Record<string, unknown>
}

export interface ScenarioStep {
  id: string
  title: string
  /** Markdown supported */
  narration: string
  highlightNodes?: NodeId[]
  highlightMessages?: RpcType[]
  engineActions?: EngineAction[]
  /** When true in auto-play, advance to next step automatically */
  advanceCondition?: (snap: SimulationSnapshot) => boolean
  /** Run this many ticks before enabling Next */
  autoRunTicks?: number
}

export interface Scenario {
  id: string
  title: string
  description: string
  steps: ScenarioStep[]
}
