import { NodeState } from '../types/raft'
import type { EngineAction } from '../types/scenario'
import type { useSimulation } from './useSimulation'
import type { useSimulationStore } from '../stores/simulationStore'

export function applyEngineAction(
  action: EngineAction,
  sim: ReturnType<typeof useSimulation>,
  simStore: ReturnType<typeof useSimulationStore>,
): void {
  switch (action.type) {
    case 'reset':
      sim.reset(42)
      break
    case 'crash_node': {
      const nodeId = action.payload.nodeId as string
      if (nodeId === '__leader__') {
        for (const [id, node] of simStore.nodes) {
          if (node.state === NodeState.LEADER) {
            sim.crashNode(id)
            break
          }
        }
      } else {
        sim.crashNode(nodeId)
      }
      break
    }
    case 'restore_node':
      sim.restoreNode(action.payload.nodeId as string)
      break
    case 'set_partition': {
      const groupA = action.payload.groupA as string[]
      const groupB = action.payload.groupB as string[]
      if (groupA.length === 0 && groupB.length === 0) {
        sim.clearPartition()
      } else {
        sim.setPartition(groupA, groupB)
      }
      break
    }
    case 'set_config':
      break
    case 'add_node':
      sim.addNode()
      break
    case 'remove_node':
      sim.removeNode(action.payload.nodeId as string)
      break
  }
}
