# Raft Leader Election Visualizer

Interactive, tick-based visualizer for the [Raft consensus algorithm](https://raft.github.io/), focused on the leader election protocol. Built with Vue 3, TypeScript, Pinia, and D3.

The simulation engine is deterministic (seeded PRNG, no real timers in the protocol layer). The visualization layer reads engine snapshots each rAF frame and interpolates between them.

![](./assets/demo.gif)

## Features

- **Live simulation**: variable cluster size, message delay range, message loss probability, election timeout range, heartbeat interval, speed multiplier.
- **Interventions**: crash / restore nodes, add / remove nodes, partition the cluster into two groups, clear partitions.
- **Inspector panel**: per-node Raft state (term, role, log, votes), in-flight messages, accumulated event log, term timeline.
- **Step-by-step mode**: guided scenarios (Normal Election, Leader Crash, Network Partition, Split Vote) with markdown narration, per-step engine actions, and `autoRunTicks` / `advanceCondition` gating.
  - **Auto-advance toggle**: when off, drive the sim one animated tick at a time (`T` hotkey or "Tick once" button) — useful for examining a single RPC exchange.
  - **Replay** (`R`) and **jump-to-step** for visited steps.
  - Persistent status strip showing run state ("Running", "Done", "Manual", "Waiting", "Condition met") + completed/total tick count.

## How it ticks

1. `RaftEngine.tick()` advances every node's state machine by one logical tick, drains the message bus, and returns a `SimulationSnapshot`.
2. `useSimulation` runs a `requestAnimationFrame` loop that calls `tick()` at a rate of `msPerTick / speedMultiplier`. Between ticks it updates `frameFraction` (0–1) so the renderer can interpolate message positions smoothly.
3. `simulationStore.updateFromSnapshot()` mirrors the latest snapshot reactively.
4. Components read straight from the store; no engine references leak into the view layer.

In step-by-step mode, the same engine is driven by `useScenarioRunner`, which seeds `autoRunTicksRemaining` from each step and either lets the auto-loop drain it or waits for manual `playOneTick` calls.

## Keyboard shortcuts

| Key      | Action                                       |
|----------|----------------------------------------------|
| `Space`  | Pause / resume the simulation                |
| `T`      | Tick once (step-by-step mode, manual tick)   |
| `R`      | Replay current step (step-by-step mode)      |
| `←` / `→`| Prev / Next step (step-by-step mode)         |
