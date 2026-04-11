import type { Scenario } from '../../types/scenario'
import { NodeState } from '../../types/raft'

export const networkPartitionScenario: Scenario = {
  id: 'network-partition',
  title: 'Network Partition',
  description: 'A network split isolates the leader in a minority partition, forcing a new election in the majority.',
  steps: [
    {
      id: 'stable-5',
      title: 'Five-Node Cluster with Leader',
      narration: `We start with a healthy 5-node cluster. A majority requires **3 votes**.

The leader is sending heartbeats to all 4 followers. Everything is stable.`,
      engineActions: [
        { type: 'set_config', payload: { nodeCount: 5 } },
        { type: 'reset', payload: {} },
      ],
      advanceCondition: (snap) =>
        [...snap.nodes.values()].some(n => n.state === NodeState.LEADER),
    },
    {
      id: 'pre-partition',
      title: 'Before the Split',
      narration: `Let's let the cluster run for a moment in its stable state. Notice all nodes are followers except the leader, and heartbeats flow freely.

In the next step, we'll split the network.`,
      autoRunTicks: 15,
    },
    {
      id: 'partition',
      title: 'Network Partition!',
      narration: `The network is now split! The leader is isolated with only 1 other node (minority partition). The other 3 nodes form the majority partition.

Messages cannot cross the partition boundary (shown as dashed red lines). The leader's heartbeats can't reach the majority.`,
      engineActions: [{ type: 'set_partition', payload: { groupA: ['N1', 'N2'], groupB: ['N3', 'N4', 'N5'] } }],
      autoRunTicks: 5,
    },
    {
      id: 'majority-elects',
      title: 'Majority Partition Elects New Leader',
      narration: `The majority partition (3 nodes) stops receiving heartbeats. A timeout fires and a new election begins.

Since 3 nodes can form a majority (3/5), they successfully elect a new leader. The old leader in the minority **cannot** get enough votes (only 2/5).`,
      advanceCondition: (snap) => {
        const nodes = [...snap.nodes.values()]
        const leaders = nodes.filter(n => n.state === NodeState.LEADER)
        return leaders.length >= 1
      },
    },
    {
      id: 'two-leaders',
      title: 'Temporary "Split Brain"',
      narration: `Briefly, the old leader in the minority may still think it's leader (it hasn't seen a higher term yet). But it **cannot commit new entries** because it can't reach a majority.

This is safe: Raft's majority rule ensures only the majority partition can make progress.`,
      autoRunTicks: 20,
    },
    {
      id: 'heal',
      title: 'Partition Heals',
      narration: `The network partition is healed. The old leader in the minority receives a message with a **higher term** from the new leader.

It immediately steps down to follower. The cluster converges to a single leader — the one elected by the majority.`,
      engineActions: [{ type: 'set_partition', payload: { groupA: [], groupB: [] } }],
      autoRunTicks: 25,
    },
  ],
}
