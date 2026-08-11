# Page Dependency Trees

## `/control/`

Entry: `control/index.html`

Dependencies:
- `control/control.css`
- `control/main.js`
  - `control/js/config.js`
  - `control/js/auth.js`
  - `control/js/render.js`
    - `control/js/formatters.js`
  - `control/js/live-metrics.json`
- `control/manifest.webmanifest`
- `control/sw.js`

## `/control-login.html`

Entry: `control-login.html`

Dependencies:
- `control/control.css`
- `control/login.js`
  - `control/js/config.js`
  - `control/js/auth.js`

## `/`

Entry: `index.html`

Dependencies:
- `styles.css`
- `main.js`
- `assets/images/*`
