# DJ Website Design System

## 1. Atmosphere & Identity

Dark, premium, techno, and intimate. The site feels like a black stage with controlled neon-gold edges: minimal noise, strong contrast, and a constant sense of motion underneath the surface. The signature is the unified black-gold FLX background system across all pages.

## 2. Color

### Palette

| Role | Token | Light | Dark | Usage |
|---|---|---:|---:|---|
| Surface/base | `--bg` | `#060606` | `#060606` | Page base and deep surfaces |
| Surface/soft | `--bg-soft` | `#111111` | `#111111` | Secondary panels |
| Surface/panel | `--bg-panel` | `rgba(14, 14, 14, 0.84)` | `rgba(14, 14, 14, 0.84)` | Glass cards and hero overlays |
| Text/primary | `--text` | `#F3EFE7` | `#F3EFE7` | Main copy |
| Text/soft | `--text-soft` | `#C8C1B2` | `#C8C1B2` | Secondary copy |
| Border | `--line` | `rgba(255, 215, 0, 0.22)` | `rgba(255, 215, 0, 0.22)` | Dividers and outlines |
| Accent/gold | `--gold` | `#F5C84C` | `#F5C84C` | Primary accent, links, media glow |
| Accent/gold-strong | `--gold-strong` | `#FFD86D` | `#FFD86D` | CTA highlights and active states |
| Accent/pink | `--accent-pink` | `#FF4FD8` | `#FF4FD8` | Secondary energy accent for motion and highlights |
| Accent/cyan | `--accent-cyan` | `#34E4FF` | `#34E4FF` | Secondary energy accent for motion and highlights |
| Glow | `--glow` | `rgba(245, 200, 76, 0.24)` | `rgba(245, 200, 76, 0.24)` | Ambient lighting |
| Status/warn | `--red` | `#D64B3F` | `#D64B3F` | Live dot and rare warning accents |
| Shadow | `--shadow` | `0 20px 60px rgba(0, 0, 0, 0.45)` | `0 20px 60px rgba(0, 0, 0, 0.45)` | Card depth |
| Shadow/soft | `--shadow-soft` | `0 14px 40px rgba(0, 0, 0, 0.34)` | `0 14px 40px rgba(0, 0, 0, 0.34)` | Hover elevation |

### Rules

- Gold is the primary accent family.
- Pink and cyan are secondary energy accents used sparingly in gradients, motion, and media highlights.
- Black and near-black surfaces carry the structure; gold carries the signal and pink/cyan add the pulse.
- All pages use the DJ FLX black-gold background image as the persistent backdrop.
- No magenta or cyan should dominate the UI; they are support accents only.
- The shared header uses the same dual-logo lockup everywhere, with a subtle blink treatment on the leading logo.

## 3. Typography

### Scale

| Level | Size | Weight | Line Height | Tracking | Usage |
|---|---|---:|---:|---:|---|
| Display | clamp(3.4rem, 7vw, 6.6rem) | 700 | 0.95 | 0 | Hero titles |
| H1 | clamp(2.4rem, 5vw, 4rem) | 700 | 0.98 | 0 | Section titles |
| H2 | 2rem | 600 | 1.05 | 0 | Card titles |
| Body | 1rem | 400 | 1.62 | 0 | Default copy |
| Body/sm | 0.86rem | 500 | 1.58 | 0 | Pills, labels, metadata |
| Caption | 0.72rem | 600 | 1.3 | 0.18em | Uppercase micro labels |

### Font Stack

- Primary: `Poppins, sans-serif`
- Display: `Cormorant Garamond, serif`

### Rules

- The display face is reserved for headings, labels, and expressive emphasis.
- Body copy stays in Poppins for clarity.
- No emoji-only labels as a core part of the system.

## 4. Spacing & Layout

### Base Unit

All spacing derives from an 8px visual rhythm with 4px micro-adjustments where needed.

| Token | Value | Usage |
|---|---|---|
| `--space-1` | 4px | Tight icon spacing |
| `--space-2` | 8px | Pill gaps and inline spacing |
| `--space-3` | 12px | Compact padding |
| `--space-4` | 16px | Standard interior padding |
| `--space-5` | 20px | Comfortable copy spacing |
| `--space-6` | 24px | Card padding default |
| `--space-8` | 32px | Section gaps |
| `--space-10` | 40px | Major section breathing room |
| `--space-12` | 48px | Hero and section separation |
| `--space-16` | 64px | Wide layout rhythm |
| `--space-20` | 80px | Hero staging |
| `--space-24` | 96px | Largest separation |

### Grid

- Max content width: `1240px`
- Column system: responsive 2/3/4-column grids with 1.25rem gaps
- Breakpoints: 480px, 768px, 1024px, 1280px

### Rules

- Keep the layout breathable but dense enough for techno/editorial energy.
- Use fixed hero staging and content shells instead of full-width chaos.
- Keep non-Home sections slightly tighter than the Home page so the visual rhythm stays consistent across pages.
- Preserve scrollability on every page.

## 5. Components

### Site Header
- **Structure**: logo pair, title lockup, nav links, mobile toggle
- **Variants**: sticky desktop, collapsed mobile
- **Spacing**: `--space-4` to `--space-6`
- **States**: default, hover, active, focus, hidden-on-scroll, menu-open
- **Accessibility**: skip link, aria labels, keyboard-close with Escape
- **Motion**: header hides on downward scroll; the leading logo can carry a subtle blink accent; menu transitions use opacity/transform only

### Live Banner
- **Structure**: live dot, ticker text, linked handle
- **Variants**: announcement strip, hover-paused track
- **Spacing**: `--space-2` to `--space-4`
- **States**: default, hover, focus, active link
- **Accessibility**: complementary region, readable contrast, no motion dependence
- **Motion**: gold shimmer, slow drift, pulsing live dot

### Hero
- **Structure**: background media layer, gradient overlay, eyebrow, title, lead, CTA row
- **Variants**: image-backed section hero
- **Variants**: image-backed hero section
- **Spacing**: `--space-12` to `--space-20`
- **States**: default, reduced motion fallback
- **Accessibility**: content always readable over media layers
- **Motion**: all heroes remain static with subtle ambient overlays

### Card
- **Structure**: image/media, title, copy, optional pills, CTA
- **Variants**: feature card, info panel, merch card, video card, contact card
- **Spacing**: `--space-4` to `--space-6`
- **States**: default, hover, focus-within
- **Accessibility**: consistent text contrast and visible focus rings
- **Motion**: translateY and border-color only

### Button
- **Structure**: inline-flex text + optional icon
- **Variants**: primary, secondary, ghost
- **Spacing**: `--space-2` to `--space-4`
- **States**: default, hover, active, focus, disabled
- **Accessibility**: 48px minimum hit area, strong focus outline
- **Motion**: slight lift on hover, no layout shift

### Media Stage
- **Structure**: video or image frame with poster, overlay, rounded container
- **Variants**: reel preview, image panel
- **Spacing**: `--space-4`
- **States**: default, hover, loading poster fallback
- **Accessibility**: media must remain readable if image assets fail to load
- **Motion**: subtle scale or brightness modulation only

## 6. Motion & Interaction

### Timing

| Type | Duration | Easing | Usage |
|---|---|---|---|
| Micro | 120-180ms | ease-out | Buttons, links, icon states |
| Standard | 220-320ms | ease-in-out | Cards and menus |
| Emphasis | 400-600ms | cubic-bezier(0.16, 1, 0.3, 1) | Hero reveal and ambient effects |

### Rules

- Animate only `transform`, `opacity`, and safe visual filters.
- Every interactive element has hover, active, and focus states.
- Reduced motion should remove non-essential drifting and reveal effects.

## 7. Depth & Surface

### Strategy

Mixed depth: fixed media backdrop, tonal-shift surfaces, and soft shadows.

| Level | Value | Usage |
|---|---|---|
| Card default | `var(--bg-panel)` + `var(--line)` | Panels and cards |
| Card hover | `var(--shadow-soft)` | Interactive lift |
| Hero overlay | layered gradient + media | Keep copy readable |

### Rules

- The background carries atmosphere, not content.
- Panels should read as lit glass or matte black metal, never flat white boxes.
- Gold glows are controlled accents, not decoration.
