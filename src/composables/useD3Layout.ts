import { ref, watch, onUnmounted } from 'vue'
import * as d3 from 'd3'
import type { NodeId } from '../types/raft'

export interface NodePosition {
  x: number
  y: number
}

const CHARGE_STRENGTH = -1800
const CHARGE_DISTANCE_MAX = 500
const COLLISION_RADIUS = 90
const CENTER_PULL_STRENGTH = 0.06
const ALPHA_DECAY = 0.05
const VELOCITY_DECAY = 0.55
const EDGE_PADDING = 60

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
      .force('charge', d3.forceManyBody().strength(CHARGE_STRENGTH).distanceMax(CHARGE_DISTANCE_MAX))
      .force('collide', d3.forceCollide(COLLISION_RADIUS).strength(1).iterations(2))
      .force('x', d3.forceX(w / 2).strength(CENTER_PULL_STRENGTH))
      .force('y', d3.forceY(h / 2).strength(CENTER_PULL_STRENGTH))
      .alphaDecay(ALPHA_DECAY)
      .velocityDecay(VELOCITY_DECAY)
      .on('tick', () => {
        const w = width()
        const h = height()
        const map = new Map<NodeId, NodePosition>()
        for (const node of nodes) {
          map.set(node.id, {
            x: Math.max(EDGE_PADDING, Math.min(w - EDGE_PADDING, node.x ?? w / 2)),
            y: Math.max(EDGE_PADDING, Math.min(h - EDGE_PADDING, node.y ?? h / 2)),
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
        .force('x', d3.forceX(w / 2).strength(CENTER_PULL_STRENGTH))
        .force('y', d3.forceY(h / 2).strength(CENTER_PULL_STRENGTH))
      simulation.alpha(0.3).restart()
    }
  }

  // --- Drag support ---

  let draggedNode: SimNode | null = null

  function dragStart(id: NodeId) {
    draggedNode = nodes.find(n => n.id === id) ?? null
    if (draggedNode && simulation) {
      simulation.alphaTarget(0.1).restart()
      draggedNode.fx = draggedNode.x
      draggedNode.fy = draggedNode.y
    }
  }

  function dragMove(x: number, y: number) {
    if (draggedNode) {
      draggedNode.fx = x
      draggedNode.fy = y
    }
  }

  function dragEnd() {
    if (draggedNode && simulation) {
      simulation.alphaTarget(0)
      draggedNode.fx = null
      draggedNode.fy = null
      draggedNode = null
    }
  }

  watch(nodeIds, (ids) => updateNodes(ids), { immediate: true })

  onUnmounted(() => {
    simulation?.stop()
  })

  return { positions, resize, updateNodes, dragStart, dragMove, dragEnd }
}
