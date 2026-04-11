import type { Scenario } from '../../types/scenario'
import { NodeState } from '../../types/raft'

export const normalElectionScenario: Scenario = {
  id: 'normal-election',
  title: 'Normal Election',
  description: 'A healthy cluster elects a leader through randomized timeouts and majority voting.',
  steps: [
    {
      id: 'intro',
      title: 'All Nodes Start as Followers',
      narration: `All nodes begin in the **Follower** state with term 0. Each has a randomized election timeout — the arc around each node shows time remaining.

No leader exists yet. The first node whose timeout expires will start an election.`,
      highlightNodes: ['N1', 'N2', 'N3'],
      engineActions: [{ type: 'reset', payload: {} }],
      autoRunTicks: 5,
    },
    {
      id: 'timeout-fires',
      title: 'Election Timeout Fires',
      narration: `One node's timeout expires first (randomization prevents simultaneous triggers). It:

1. Increments its **term** to 1
2. Transitions to **Candidate** state
3. Votes for itself
4. Sends **RequestVote** RPCs to all peers

Watch the blue dots fly — those are vote requests.`,
      advanceCondition: (snap) =>
        [...snap.nodes.values()].some(n => n.state === NodeState.CANDIDATE),
    },
    {
      id: 'votes-granted',
      title: 'Peers Grant Votes',
      narration: `Each follower receives the RequestVote. Since they haven't voted this term and the candidate's log is up-to-date, they **grant their vote**.

The lighter blue dots returning are vote replies. A node only votes once per term — this is how Raft prevents split-brain.`,
      autoRunTicks: 8,
    },
    {
      id: 'leader-elected',
      title: 'Candidate Becomes Leader',
      narration: `The candidate received votes from a **majority** (2 out of 3 nodes, including its self-vote). It transitions to **Leader** state.

The leader immediately begins sending **heartbeats** (empty AppendEntries RPCs) to maintain authority and prevent other elections.`,
      advanceCondition: (snap) =>
        [...snap.nodes.values()].some(n => n.state === NodeState.LEADER),
    },
    {
      id: 'heartbeats',
      title: 'Heartbeats Maintain Leadership',
      narration: `The green dots are heartbeat messages. Each follower resets its election timeout when it receives one, preventing new elections.

As long as the leader keeps sending heartbeats, the cluster remains stable. This is the steady state of a healthy Raft cluster.`,
      autoRunTicks: 20,
    },
  ],
}
