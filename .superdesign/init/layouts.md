# Shared Layouts

## Control Shell

Source: `control/index.html`.

```html
<div class="control-layout">
  <aside class="control-sidebar" aria-label="Dashboard Navigation">
    <div class="control-brand">
      <strong>Kontrollzentrum</strong>
      <span>Dr. Gray &amp; Mrs. Dr. Gray</span>
    </div>
    <nav class="control-nav" data-control-nav></nav>
    <div class="control-side-footer">
      <a href="/index.html">Website</a>
      <a href="/shop.html">Shop Seite</a>
    </div>
  </aside>
  <main class="control-main">
    <header class="control-topbar">...</header>
    <section id="overview" class="control-section">...</section>
    <section id="agentsroom" class="control-section">...</section>
    <section id="website" class="control-section">...</section>
    <section id="shop" class="control-section">...</section>
    <section id="catalog-upload" class="control-section">...</section>
    <section id="live-activity" class="control-section">...</section>
    <section id="performance" class="control-section">...</section>
    <section id="content" class="control-section">...</section>
    <section id="social" class="control-section">...</section>
    <section id="alerts" class="control-section">...</section>
    <section id="settings" class="control-section">...</section>
  </main>
</div>
```

The sidebar is persistent above 920 px and becomes an off-canvas navigation below it. Only the hash-selected dashboard section is visible.
