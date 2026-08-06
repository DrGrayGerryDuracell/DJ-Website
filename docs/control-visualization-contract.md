# Control Visualization Contract

| Layer | Story job | Data | Owner | Encoding | Interaction / fallback | QA |
| --- | --- | --- | --- | --- | --- | --- |
| Agent flow | Show who receives, verifies, delegates and escalates work | `agentsRoom.routing`, agents, runtime status | Node-link layout | Deterministic left-to-right hierarchy, direct labels, arrow markers | Select node for details; reduced motion freezes dashes; text route list remains available | Desktop/mobile screenshot, keyboard node selection, edge/node count invariant |
| Device topology | Show Mac mini as central server and all machine/service links | devices plus inferred SMB, HA, repo and vault routes | Node-link layout | Hub layout around Mac mini, labeled channel and state | Select device for role and connections; mobile focuses Mac mini first | Desktop/mobile screenshot, no overlap at 1440/390 px |
| Overview pulse | Show current situation before controls | website, shop, social and Hermes runtime metrics | Real-time dashboard | One dominant command strip plus three evidence panels | Last known data remains visible with freshness and source state | Empty/stale/live fixture checks and console check |
| Live conversations | Show delegation activity without publishing private raw content | redacted runtime metadata and safe summaries | Real-time dashboard | Compact chronological cards with source and status | Static list is the non-visual fallback | Secret/path scan and content-length limits |

Color ledger: neutral surfaces for context, gold for owner/control, cyan for live/measurement, pink for external/escalation, green for connected, amber for warning. Status is always repeated in text.
