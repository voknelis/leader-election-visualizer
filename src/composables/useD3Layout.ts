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
  let currentIdSet = ''

  function createSimulation() {
    const w = width()
    const h = height()

    simulation = d3.forceSimulation<SimNode>(nodes)
      .force('center', d3.forceCenter(w / 2, h / 2))
      .force('charge', d3.forceManyBody().strength(-1800).distanceMax(500))
      .force('collide', d3.forceCollide(90).strength(1).iterations(2))
      .force('x', d3.forceX(w / 2).strength(0.06))
      .force('y', d3.forceY(h / 2).strength(0.06))
      .alphaDecay(0.05)
      .velocityDecay(0.55)
      .on('tick', () => {
        const w = width()
        const h = height()
        const pad = 60
        const map = new Map<NodeId, NodePosition>()
        for (const node of nodes) {
          map.set(node.id, {
            x: Math.max(pad, Math.min(w - pad, node.x ?? w / 2)),
            y: Math.max(pad, Math.min(h - pad, node.y ?? h / 2)),
          })
        }
        positions.value = map
      })
  }

  function updateNodes(ids: NodeId[]) {
    // Only restart D3 when the actual set of IDs changes, not on every store update
    const newIdSet = ids.join(',')
    if (newIdSet === currentIdSet && simulation) return
    currentIdSet = newIdSet

    const existing = new Map(nodes.map(n => [n.id, n]))
    const w = width()
    const h = height()

    // Place new nodes in a circle around center
    const totalCount = ids.length
    let newIdx = 0

    nodes = ids.map((id, i) => {
      if (existing.has(id)) return existing.get(id)!
      const angle = (2 * Math.PI * i) / totalCount - Math.PI / 2
      const spreadRadius = Math.min(w, h) * 0.3
      newIdx++
      return {
        id,
        x: w / 2 + spreadRadius * Math.cos(angle),
        y: h / 2 + spreadRadius * Math.sin(angle),
      }
    })

    if (simulation) {
      simulation.nodes(nodes)
      simulation.alpha(0.8).restart()
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
        .force('x', d3.forceX(w / 2).strength(0.06))
        .force('y', d3.forceY(h / 2).strength(0.06))
      simulation.alpha(0.3).restart()
    }
  }

  watch(nodeIds, (ids) => updateNodes(ids), { immediate: true })

  onUnmounted(() => {
    simulation?.stop()
  })

  return { positions, resize, updateNodes }
}
