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
      .force('charge', d3.forceManyBody().strength(-2000).distanceMax(500))
      .force('collide', d3.forceCollide(90).strength(1))
      .force('x', d3.forceX(w / 2).strength(0.04))
      .force('y', d3.forceY(h / 2).strength(0.04))
      .alphaDecay(0.015)
      .velocityDecay(0.3)
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
    const existing = new Map(nodes.map(n => [n.id, n]))
    const w = width()
    const h = height()

    // Place new nodes in a circle around center for good initial spread
    const newCount = ids.filter(id => !existing.has(id)).length
    let newIdx = 0

    nodes = ids.map(id => {
      if (existing.has(id)) return existing.get(id)!
      const angle = (2 * Math.PI * newIdx) / Math.max(newCount, ids.length)
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
        .force('x', d3.forceX(w / 2).strength(0.04))
        .force('y', d3.forceY(h / 2).strength(0.04))
      simulation.alpha(0.3).restart()
    }
  }

  watch(nodeIds, (ids) => updateNodes(ids), { immediate: true })

  onUnmounted(() => {
    simulation?.stop()
  })

  return { positions, resize, updateNodes }
}
