import type { Scenario } from '../../types/scenario'
import { NodeState } from '../../types/raft'

export const splitVoteScenario: Scenario = {
  id: 'split-vote',
  title: 'Split Vote',
  description: 'Two nodes timeout simultaneously, split the vote, and must re-elect.',
  steps: [
    {
      id: 'intro',
      title: 'Five-Node Cluster',
      narration: `We have 5 nodes. In this scenario, two nodes will have their election timeouts expire at nearly the same time, causing a **split vote**.

A majority in a 5-node cluster requires **3 votes**.`,
      engineActions: [
        { type: 'set_config', payload: { nodeCount: 5 } },
        { type: 'reset', payload: {} },
      ],
      autoRunTicks: 3,
    },
    {
      id: 'two-candidates',
      title: 'Two Candidates Emerge',
      narration: `Two nodes become candidates almost simultaneously. Each votes for itself and sends RequestVote to the other 3 nodes.

The remaining nodes will vote for **whichever request arrives first** — they can only vote once per term.`,
      advanceCondition: (snap) =>
        [...snap.nodes.values()].filter(n => n.state === NodeState.CANDIDATE).length >= 1,
    },
    {
      id: 'votes-split',
      title: 'Votes Are Split',
      narration: `If votes split evenly (e.g., each candidate gets 2 votes + their self-vote = 2 each), **neither reaches the majority of 3**.

Both candidates' election timeouts will fire again with new random values. The randomization makes it very unlikely to split again.`,
      autoRunTicks: 15,
    },
    {
      id: 'reelection',
      title: 'Re-Election Succeeds',
      narration: `One candidate's timeout fires first in the new term. It starts a fresh election with an incremented term number.

Since the other candidate reverts to follower on seeing the higher term, votes are no longer split. A leader emerges.`,
      advanceCondition: (snap) =>
        [...snap.nodes.values()].some(n => n.state === NodeState.LEADER),
    },
    {
      id: 'resolution',
      title: 'Stable Leadership',
      narration: `The new leader sends heartbeats. All other nodes are followers.

**Key insight:** Randomized timeouts make split votes rare and self-resolving. The probability of repeated splits decreases exponentially.`,
      autoRunTicks: 15,
    },
  ],
}
