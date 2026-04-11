import { normalElectionScenario } from './normalElection'
import { splitVoteScenario } from './splitVote'
import { leaderCrashScenario } from './leaderCrash'
import { networkPartitionScenario } from './networkPartition'
import type { Scenario } from '../../types/scenario'

export const scenarios: Scenario[] = [
  normalElectionScenario,
  splitVoteScenario,
  leaderCrashScenario,
  networkPartitionScenario,
]

export {
  normalElectionScenario,
  splitVoteScenario,
  leaderCrashScenario,
  networkPartitionScenario,
}
