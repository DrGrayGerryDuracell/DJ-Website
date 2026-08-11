# Shared UI Primitives

The project uses framework-free HTML, CSS and JavaScript. Shared visual primitives are CSS classes rendered by `control/js/render.js`.

## Status Pill

Source: `control/control.css` and `control/js/render.js`.

```js
function statusClass(status) {
  if (status === "live") return "is-live";
  if (status === "connected") return "is-connected";
  if (status === "support") return "is-support";
  if (status === "ready") return "is-ready";
  if (status === "active") return "is-active";
  if (status === "sync") return "is-sync";
  return "is-info";
}
```

## Panel

Source: `control/control.css`.

```css
.panel {
  padding: 1rem;
  border: 1px solid rgba(255, 216, 109, 0.18);
  border-radius: var(--radius);
  background: var(--panel);
  box-shadow: var(--shadow);
}
```

## Action Button

Source: `control/control.css`.

```css
.action-btn,
.range-btn {
  min-height: 44px;
  border-radius: 12px;
  border: 1px solid var(--line);
  font: inherit;
}
```
