import type { Scenario } from '../../types/scenario'
import { NodeState } from '../../types/raft'

export const leaderCrashScenario: Scenario = {
  id: 'leader-crash',
  title: 'Leader Crash & Re-Election',
  description: 'The leader crashes and followers detect the absence of heartbeats to elect a new leader.',
  steps: [
    {
      id: 'stable',
      title: 'Stable Cluster with Leader',
      narration: `We start with a healthy 3-node cluster that has already elected a leader.

Watch the green heartbeat messages flowing from the leader to followers. Each heartbeat resets the followers' election timeouts.`,
      engineActions: [{ type: 'reset', payload: {} }],
      advanceCondition: (snap) =>
        [...snap.nodes.values()].some(n => n.state === NodeState.LEADER),
    },
    {
      id: 'heartbeats-flowing',
      title: 'Heartbeats Keep the Peace',
      narration: `The leader sends heartbeats every 5 ticks. Followers' election timeouts are 15–30 ticks.

Since heartbeats arrive well before any timeout expires, no follower ever starts an election. This is the **steady state**.`,
      autoRunTicks: 20,
    },
    {
      id: 'crash',
      title: 'Leader Crashes!',
      narration: `The leader has crashed (shown with a red X). It stops sending heartbeats.

Followers don't know the leader is down yet — they just notice that heartbeats stop arriving. Their election timeouts continue counting down...`,
      engineActions: [{ type: 'crash_node', payload: { nodeId: '__leader__' } }],
      autoRunTicks: 5,
    },
    {
      id: 'timeout-detection',
      title: 'Timeout Detects Failure',
      narration: `Without heartbeats, a follower's election timeout expires. It becomes a candidate and starts a new election with an incremented term.

This is how Raft detects leader failure: **absence of heartbeats = leader presumed dead**.`,
      advanceCondition: (snap) =>
        [...snap.nodes.values()].some(n => n.state === NodeState.CANDIDATE),
    },
    {
      id: 'new-leader',
      title: 'New Leader Elected',
      narration: `The candidate wins the election (the crashed node can't vote, but 2 of 3 nodes is still a majority of the surviving cluster).

The new leader begins sending heartbeats. Service is restored. The crashed node can rejoin later as a follower.`,
      advanceCondition: (snap) => {
        const nodes = [...snap.nodes.values()]
        return nodes.some(n => n.state === NodeState.LEADER) &&
          nodes.some(n => n.state === NodeState.CRASHED)
      },
    },
  ],
}
