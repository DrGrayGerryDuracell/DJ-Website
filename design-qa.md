# Control Dashboard Design QA

## Scope

- Existing static control dashboard at `/control/`
- Overview, Hermes chat, AgentsRoom, agent routing, device routing and all navigation sections
- Desktop viewport: 1440 x 900
- Mobile viewport: 390 x 844

## Visual Sources

- `artifacts/qa/reference-dashboard-1.jpg`: user reference for routing density and topology
- `artifacts/qa/reference-dashboard-4.jpg`: user reference for colorful system metrics
- `DJ-Website-design-v2/DESIGN.md` and `DJ-Website-design-v2/docs/design-skills/*`: local design system and handoff rules

## Implementation Captures

- `artifacts/qa/control-overview-1440.png`
- `artifacts/qa/control-agentsroom-1440-final.jpg`
- `artifacts/qa/control-devices-1440.png`
- `artifacts/qa/control-overview-390.jpg`
- `artifacts/qa/control-agentsroom-390-final.jpg`
- `artifacts/qa/control-devices-390-final.jpg`
- `artifacts/qa/control-comparison.jpg`: references and implementation in one comparison input

## Checks

- Overview hierarchy, spacing, KPI ring, live source labels and Hermes chat: passed
- Agent and device tabs, selected node state and adjacent inspector: passed
- Directional route edges, status colors, route cards and horizontal mobile exploration: passed
- Mobile navigation open/close and section navigation: passed
- All 11 dashboard sections render content and mark the active navigation item: passed
- Desktop and mobile browser console warnings/errors: none
- Live TikTok main account, TikTok backup account and SoundCloud targets: verified by live metrics
- Website core routes: 8/8 reachable in the network-backed run
- Shirtee targets after dead-link fallback correction: 4/4 stored checks at HTTP 200
- Runtime privacy validation: no raw messages, task payloads, chat IDs, commands, credentials or absolute user paths in public metrics

## Iterations

1. The first AgentsRoom layout placed the routing map too far below the fold.
2. The duplicate section heading was removed and the hero metrics were compacted.
3. Mobile metrics were changed to two columns so routing appears sooner.
4. The large sticky mobile header was made static because it obscured the graph while scrolling.
5. Raw Hermes delegation content was replaced with status, ID and character-count metadata.
6. A dead Shirtee product target was redirected to the verified main store, and the finish script now refreshes live link data before checking it.
7. TikTok channel labels were corrected to the main and backup account names.
8. Status colors were changed to a semantic green, cyan, yellow, orange and red scale with visible explanations.
9. Agent routing gained separate forward and feedback paths; muted routes remain readable.
10. AgentsRoom data panels were widened and a dedicated Home Assistant workspace was added.

## Current Verification Run

- Date: 2026-08-06
- Source visual truth: user screenshots in `/tmp/codex-remote-attachments/019fd2d1-8721-7c41-aacc-bb6fd7dd2f79/0EBC413A-2DA2-475E-98E6-F97E1345850C/`
- Intended implementation capture: `/control/#agentsroom` and `/control/#home-assistant` at 1440 x 1000 CSS px, density 1
- Implementation screenshot: unavailable in this run
- State: local preview available on port 4173; browser access to the local URL was denied by automatic security review
- Full-view comparison evidence: blocked because no current browser-rendered implementation capture could be accepted
- Focused region comparison evidence: blocked for the same reason
- Primary interactions checked statically: 12 navigation targets, routing mode controls, route reset, route diagnostic copy and HA diagnostic copy
- Console errors checked: blocked without browser access
- Automated checks: JavaScript syntax, build safety, navigation-to-section invariant, HA renderer output and regenerated live metrics passed

### Remaining Blocker

- P1: The current semantic color, feedback-edge, full-width AgentsRoom and Home Assistant changes have not been visually compared with the supplied screenshots at desktop and mobile sizes. A browser-rendered capture is required before visual acceptance.

## Tooling

- Local design-v2 skills, Product Design image-to-code guidance, visualization guidance and browser QA were applied.
- Superdesign project context was generated locally. The optional external Superdesign canvas was not available because browser authentication timed out; no design or implementation step depends on it.

## Final Result

final result: blocked
