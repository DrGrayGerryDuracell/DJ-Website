# Control Dashboard Design System

Source of truth: `DESIGN.md`, especially section 9, plus `docs/design-skills/`.

## Product

`/control` is the private operational workspace for the Dr. Gray & Mrs. Dr. Gray website, Hermes, Jarvis, Argus, subagents, the Mac mini central server, connected Macs, Home Assistant, Vault and publishing services.

## Visual Direction

- Dark premium techno workspace, not a generic admin template.
- Gold is the core and control signal.
- Cyan identifies live data, measurement and AgentsRoom.
- Pink identifies external channels, social and actions.
- Panels resemble matte black equipment with precise illuminated edges.
- Use Poppins for interface copy and Cormorant Garamond for display headings.
- Use the eight dashboard type steps from `DESIGN.md`; use 4/8 px spacing rhythm.
- Resting surfaces remain calm. Glow is reserved for live, focus, selected and hover states.

## Information Architecture

- Overview: current state, important metrics and direct Hermes thread.
- AgentsRoom: directional agent flow, device topology, live runtime, tasks, conversations and sources.
- Website, shop, catalog, activity, technology, content, social, alerts and actions remain separate dashboard tabs.

## Routing Visualization Contract

- Agent graph is a deterministic left-to-right directed hierarchy: owner -> Hermes -> Jarvis -> subagents -> paid escalation.
- Device graph is a deterministic hub topology around the Mac mini central server.
- Direction, channel, status and freshness are visible without hover.
- Selecting a node updates an adjacent text inspector and does not move the layout.
- Desktop uses a large graph plus inspector. Mobile starts with the graph, then places the inspector below it.
- The animated edge dash represents current communication. Reduced motion freezes it without removing direction.

## Safety

- Never publish credentials, raw private conversations, Telegram identifiers, local absolute paths, process commands or full runtime state in static dashboard assets.
- Client-side dashboard authentication is presentation gating, not backend authorization.
