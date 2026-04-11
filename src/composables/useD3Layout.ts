import { ref, watch, onUnmounted } from 'vue'
import * as d3 from 'd3'
import type { NodeId } from '../types/raft'

export interface NodePosition {
  x: number
  y: number
}

export function useD3Layout(
  nodeIds: () => NodeId[],
  width: () => number,
  height: () => number,
) {
  const positions = ref<Map<NodeId, NodePosition>>(new Map())

  interface SimNode extends d3.SimulationNodeDatum {
    id: NodeId
  }

  let simulation: d3.Simulation<SimNode, never> | null = null
  let nodes: SimNode[] = []

  function createSimulation() {
    const w = width()
    const h = height()

    simulation = d3.forceSimulation<SimNode>(nodes)
      .force('center', d3.forceCenter(w / 2, h / 2))
      .force('charge', d3.forceManyBody().strength(-800))
      .force('collide', d3.forceCollide(60))
      .force('x', d3.forceX(w / 2).strength(0.05))
      .force('y', d3.forceY(h / 2).strength(0.05))
      .alphaDecay(0.02)
      .on('tick', () => {
        const map = new Map<NodeId, NodePosition>()
        for (const node of nodes) {
          map.set(node.id, {
            x: Math.max(50, Math.min(w - 50, node.x ?? w / 2)),
            y: Math.max(50, Math.min(h - 50, node.y ?? h / 2)),
          })
        }
        positions.value = map
      })
  }

  function updateNodes(ids: NodeId[]) {
    const existing = new Map(nodes.map(n => [n.id, n]))
    const w = width()
    const h = height()

    nodes = ids.map(id => {
      if (existing.has(id)) return existing.get(id)!
      // Place new nodes slightly offset from center
      return {
        id,
        x: w / 2 + (Math.random() - 0.5) * 100,
        y: h / 2 + (Math.random() - 0.5) * 100,
      }
    })

    if (simulation) {
      simulation.nodes(nodes)
      simulation.alpha(0.6).restart()
    } else {
      createSimulation()
    }
  }

  function resize() {
    if (simulation) {
      const w = width()
      const h = height()
      simulation
        .force('center', d3.forceCenter(w / 2, h / 2))
        .force('x', d3.forceX(w / 2).strength(0.05))
        .force('y', d3.forceY(h / 2).strength(0.05))
      simulation.alpha(0.3).restart()
    }
  }

  watch(nodeIds, (ids) => updateNodes(ids), { immediate: true })

  onUnmounted(() => {
    simulation?.stop()
  })

  return { positions, resize, updateNodes }
}
