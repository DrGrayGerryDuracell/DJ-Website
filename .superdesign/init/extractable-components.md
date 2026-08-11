# Extractable Components

## ControlSidebar
- Source: `control/index.html`, `control/js/render.js`, `control/control.css`
- Category: layout
- Description: Persistent dashboard navigation with active hash state.
- Extractable props: `activeItem`, `items`.
- Hardcoded: Brand lockup and public-site footer links.

## StatusPill
- Source: `control/js/render.js`, `control/control.css`
- Category: basic
- Description: Redundant text-and-color runtime state marker.
- Extractable props: `status`, `label`.
- Hardcoded: Semantic class mapping.

## MetricCard
- Source: `control/js/render.js`, `control/control.css`
- Category: basic
- Description: KPI value, label and trend delta.
- Extractable props: `label`, `value`, `unit`, `trend`.
- Hardcoded: Typography and panel treatment.

## RoutingGraph
- Source: `control/js/render.js`, `control/control.css`
- Category: basic
- Description: Directed agent or device topology with selection inspector.
- Extractable props: `mode`, `nodes`, `edges`, `selectedId`, `updatedAt`.
- Hardcoded: Brand color ledger and deterministic graph layouts.

## HermesChat
- Source: `control/js/render.js`, `control/main.js`, `control/control.css`
- Category: basic
- Description: Local Hermes thread preview, composer and spool export.
- Extractable props: `session`, `messages`, `gatewayState`.
- Hardcoded: Queue storage key and spool workflow.
