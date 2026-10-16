# design.md

**Technical Editorial × Retro Digital × Paper Brutalism**

Version 1.0. This file is the primary visual reference for the website. It defines the visual system, the design tokens, and the reusable interface patterns. It does not define pages, features, copy, or business logic.

- Framework-agnostic: plain CSS custom properties and semantic HTML. Examples are vanilla HTML/CSS and adapt to any framework.
- Normative words: **MUST** and **MUST NOT** are mandatory. **SHOULD** is the default unless there is a documented reason. **MAY** is optional.

## Contents

1. Design System Overview
2. Design Philosophy
3. Core Visual Principles
4. Color System
5. Typography
6. Layout and Grid
7. Spacing System
8. Borders, Geometry, and Shadows
9. Design Tokens
10. Component Library
11. Editorial and Technical Elements
12. Interaction and Motion
13. Responsive Design
14. Accessibility
15. Content and Information Hierarchy
16. CSS Implementation Guidelines
17. Component Implementation Examples
18. Do and Don't
19. Project Adaptation Guidelines
20. Design Quality Checklist

---

## 1. Design System Overview

### 1.1 Purpose

The system gives every interface the character of a printed technical publication: warm paper, near-black ink, ruled structure, and precise metadata, with the working behavior of a modern, accessible web application. It exists so that designers and AI coding agents can build new screens without inventing visual decisions.

### 1.2 How to use this file (rules for developers and AI coding agents)

1. Load the tokens in Section 9 first. Every color, size, space, border, radius, shadow, duration, and z-index in component CSS MUST come from a token. Raw hex values, raw pixel spacing, and ad-hoc font stacks are not allowed in component code. The only exception is the SVG data-URI caret in 17.7, which cannot read CSS variables.
2. Build screens by composing the components in Section 10. Do not invent new component styles when an existing one fits.
3. If a situation is not covered, derive the answer from Section 3 (principles) and Section 15 (hierarchy), then choose the nearest existing token.
4. Priority order when rules conflict: **Accessibility (14) > Usability > Identity (3) > Decoration (11)**.
5. Use neutral placeholder copy such as "Page title", "Record ID", or "Status". Do not invent business content, pages, or features.
6. Match the **expression level** of the project (Section 19) before adding any decorative element.

### 1.3 Quick reference

| Topic | Rule |
|---|---|
| Page background | `--color-bg-page` (warm paper, `#EFEBDA`), optional understated grid |
| Panel background | `--color-bg-raised` (`#FAF7EC`), always with a border; solid fill hides the grid |
| Text and structure | `--color-text-primary` / `--color-border-default` (warm near-black, `#1C1B17`) |
| Green | Selected, positive, and primary-action highlight. Never decorative |
| Orange | Annotation, emphasis, warning. Never a primary action |
| Borders | 2px default, 3px for page-level divisions, 1px hairline dividers inside panels |
| Corners | Square by default. 2px on controls. 4px is the maximum. Full radius only for radios |
| Shadows | Hard offset only (no blur). Only for pressable or floating elements |
| Fonts | Archivo (headings), IBM Plex Sans (content), IBM Plex Mono (technical data) |
| Spacing | 4px base unit, tokens `--space-1` to `--space-32` |
| Touch targets | 44px recommended (`--control-height`), 24px absolute minimum |
| Motion | Short and stepped (80 to 220ms), always disabled under `prefers-reduced-motion` |

### 1.4 Recommended file layout

```
styles/
  tokens.css        /* Section 9: the only place raw values live */
  base.css          /* reset, body, typography elements, focus, reduced motion */
  layout.css        /* container, grid, stack, cluster, sections */
  components/       /* one file per component: button.css, panel.css, table.css ... */
  utilities.css     /* few, single-purpose helpers */
```

---

## 2. Design Philosophy

### 2.1 Three influences and what each contributes

| Influence | What it contributes | Where it shows up |
|---|---|---|
| Technical editorial | Hierarchy, measure, rules, structured metadata, title blocks | Headings, hero, panel headers, definition lists, footers |
| Retro digital | Monospace data, terminal surfaces, stepped motion, hard shadows | Metadata, logs, code, loading indicators, pressable elements |
| Paper brutalism | Thick honest borders, flat warm surfaces, visible structure, no gloss | Panels, tables, inputs, dividers, dialogs |

### 2.2 Signature element: the title block

Technical drawings carry a **title block**, a ruled box in the corner that says what the sheet is and how to identify it. This system adopts it as its one memorable device: every panel header is a two-cell strip with the title on the left and an identifier or status cell on the right, separated by a rule.

- Spend boldness here. Everything around the title block stays quiet and disciplined.
- Use the title block on panels, dialogs, drawers, and the hero index card.
- Omit the identifier cell when there is no real identifier. Never fill it with decorative text.

### 2.3 Guiding statements

1. **Structure is information.** Borders, rules, numbers, and labels exist because they tell the reader where they are or what a thing is. If a device carries no information, remove it.
2. **Paper, not glass.** Surfaces are flat, opaque, and warm. No gradients as identity, no blur, no translucency, no soft shadows.
3. **Honest affordances.** Things you can press look pressable (border, hard shadow, clear label). Things you cannot press do not mimic buttons.
4. **Density with legibility.** Technical content may be compact, but never below the minimum text size or target size.
5. **One loud thing per view.** One primary action, one accent fill region, one annotation cluster. The rest is ink on paper.
6. **Words earn their place.** Interface text is design content. It is specific, plain, and in sentence case.

### 2.4 How the feel maps to rules

| The interface should feel | Concrete rule |
|---|---|
| Structured and intentional | Everything aligns to the grid; borders use only three thicknesses |
| Warm and tactile | Cream surfaces, ink-colored (never pure black) text and lines |
| Bold and distinctive | 2 to 3px borders, hard offset shadows, large Archivo headings |
| Technical and digital | Monospace for IDs, timestamps, numbers, terminal panels |
| Modern and usable | 44px controls, visible focus, familiar form patterns, mobile-first layouts |

---

## 3. Core Visual Principles

Each principle has a practical test. If a design fails the test, revise it.

| # | Principle | In practice | Test |
|---|---|---|---|
| 1 | Warm paper foundation | Page uses `--color-bg-page`; panels use `--color-bg-raised`; never pure white or pure black | Is there any `#fff` or `#000` in the CSS? |
| 2 | Ink structure | Text and borders share one near-black. Division is made with borders, not shadows or fills | Can you remove all shadows and still see the structure? |
| 3 | Rectangular geometry | Square corners on containers, 2px on controls | Is any container rounded more than 4px? |
| 4 | Three-voice typography | Archivo speaks, Plex Sans explains, Plex Mono annotates | Is each text element in the role its content demands? |
| 5 | Purposeful accent | Green = selected/positive/primary highlight. Orange = annotation/warning | Can you name the job of each colored element? |
| 6 | Hard depth only | Offset shadows with zero blur on pressable or floating elements only | Is any shadow blurred, or on a static element? |
| 7 | Grid alignment | Content aligns to the 4/8/12-column grid and the 4px spacing scale | Do edges line up across sections? |
| 8 | Hierarchy before decoration | Typography, spacing, and borders create scan order first | Is the page understandable with decorative elements removed? |
| 9 | Mobile is a redesign | Layouts stack, collapse, or scroll deliberately | Does mobile use a different arrangement, not a shrunken desktop? |
| 10 | Accessible by construction | Contrast, focus, labels, and targets meet WCAG 2.2 AA | Does the keyboard-only path work end to end? |

### 3.1 Identity invariants

These MUST remain in every adaptation of the system, in every project category:

1. Paper-toned surfaces with a near-black ink for text and borders.
2. Borders from the three-width scale (2px, 3px, 1px hairline), square-leaning geometry.
3. The three-font system and the rule that monospace is for technical data.
4. Hard offset shadows only, on pressable or floating elements only.
5. Green and orange keep their defined roles.
6. The 4px spacing scale and the token names.

---

## 4. Color System

### 4.1 Raw palette

Palette tokens are raw values. They are referenced only by semantic tokens in Section 9, never by components.

**Paper (surfaces)**

| Token | Hex | Role |
|---|---|---|
| `--palette-paper-50` | `#FAF7EC` | Elevated and highlighted surfaces, inputs, panel bodies |
| `--palette-paper-100` | `#EFEBDA` | Page background |
| `--palette-paper-200` | `#E6E1CE` | Secondary surface: table headers, sidebars, footers |
| `--palette-paper-300` | `#D9D3BC` | Muted surface: disabled fills, inactive tracks |
| `--palette-paper-400` | `#BDB7A0` | Subtle borders and hairline dividers |
| `--palette-paper-500` | `#A8A38C` | Secondary text on dark surfaces only |
| `--palette-paper-grid-1` | `#DCD7C2` | Minor grid lines |
| `--palette-paper-grid-2` | `#CFC9B1` | Major grid lines |

**Ink (text, structure, dark surfaces)**

| Token | Hex | Role |
|---|---|---|
| `--palette-ink-900` | `#1C1B17` | Primary text, borders, hard shadows, inverse surface |
| `--palette-ink-800` | `#2B2A25` | Raised area on dark surfaces |
| `--palette-ink-700` | `#3F3D34` | Dividers on dark surfaces, neutral badge text |
| `--palette-ink-500` | `#5E5A47` | Secondary text on paper |
| `--palette-ink-400` | `#8A8670` | Disabled text (exempt from contrast, still legible) |

**Accents and status**

| Family | Tokens (hex) | Notes |
|---|---|---|
| Green | 100 `#D8EBD4`, 400 `#62DB8B`, 600 `#1B7F45`, 700 `#14663A`, 800 `#0F4F2D` | 100 = selected tint. 400 = on dark surfaces. 600 = graphics, bars, shadows. 700 = text and fills that carry text. 800 = hover and pressed |
| Orange | 100 `#FBE0CB`, 400 `#FF9A55`, 500 `#F26A1B`, 800 `#9A3C00` | 100 = warning tint. 400 = on dark. 500 = marker and annotation fill (carries ink text). 800 = text on paper |
| Red | 100 `#F6D5D0`, 300 `#FF8C82`, 700 `#B42318`, 800 `#8A1C13` | Error and destructive. 300 on dark. 800 = destructive hover |
| Blue | 100 `#D4E1F0`, 300 `#8DB8F0`, 700 `#1D4E89` | Informational and focus ring. 300 on dark |

### 4.2 Semantic roles

Components use only these names (full declarations in Section 9).

| Group | Tokens |
|---|---|
| Surfaces | `--color-bg-page`, `--color-bg-surface`, `--color-bg-raised`, `--color-bg-muted`, `--color-bg-hover`, `--color-bg-selected`, `--color-bg-inverse`, `--color-bg-inverse-raised`, `--color-overlay` |
| Text | `--color-text-primary`, `--color-text-secondary`, `--color-text-disabled`, `--color-text-inverse`, `--color-text-inverse-secondary`, `--color-text-link`, `--color-text-link-hover` |
| Borders | `--color-border-default`, `--color-border-subtle`, `--color-border-inverse-subtle` |
| Grid | `--color-grid-minor`, `--color-grid-major` |
| Accent | `--color-accent`, `--color-accent-hover`, `--color-accent-graphic`, `--color-text-on-accent`, `--color-annotation`, `--color-annotation-text`, `--color-bg-annotation` |
| Status | `--color-{success,warning,error,info}-{text,bg,border}`, plus `--color-error-solid` and `--color-error-solid-hover` for destructive fills |
| Focus | `--color-focus` |

### 4.3 Roles of the accents

| Color | Use for | Never use for |
|---|---|---|
| **Green** | Selected tab, nav item, row, option; positive status; primary-action hover and pressed; accent shadow on the primary button; focus of attention such as a checked control | Decorative backgrounds, large fills, section banners, warnings |
| **Orange** | Editorial annotation markers, callout flags, text selection color, warnings, "needs attention" emphasis | Primary buttons, selected states, success, long text |
| **Red** | Errors, destructive actions, failed states | Emphasis, decoration |
| **Blue** | Informational notices, keyboard focus ring | Links (links are green), decoration |
| **Neutral ink tones** | Everything else | n/a |

### 4.4 Accent frequency rules

1. Accent area budget: green fills no more than about 10% of a viewport, orange no more than about 5%.
2. At most **one** green-filled call to attention and **one** orange annotation cluster per screen region.
3. Green and orange fills MUST NOT touch each other. Separate them with ink, paper, or a border.
4. A new accent hue MUST NOT be introduced. Charts and illustrations use the existing families.
5. Use a tint (`100` level) for large areas and a solid (`600`, `700`) only for small, high-signal elements.

### 4.5 Status mapping

| Status | Text | Background | Border or bar | Symbol |
|---|---|---|---|---|
| Success | `--color-success-text` | `--color-success-bg` | `--color-success-border` | ✓ |
| Warning | `--color-warning-text` | `--color-warning-bg` | `--color-warning-border` | ! |
| Error | `--color-error-text` | `--color-error-bg` | `--color-error-border` | ✕ |
| Info | `--color-info-text` | `--color-info-bg` | `--color-info-border` | i |
| Neutral | `--color-text-secondary` | `--color-bg-surface` | `--color-border-subtle` | – |
| Active selection | `--color-text-inverse` | `--color-accent` | `--color-border-default` | ■ |

Status is **never** conveyed by color alone. Every status has a text label and a symbol (see 10.7).

### 4.6 Contrast targets (WCAG 2.2 AA)

Ratios are approximate; verify with a contrast tool in CI.

| Foreground on background | Ratio | Allowed use |
|---|---|---|
| Ink-900 on paper-100 | about 14:1 | All text |
| Ink-900 on paper-50 | about 16:1 | All text |
| Ink-500 on paper-100 | about 5.8:1 | Secondary text |
| Ink-500 on paper-300 | about 4.6:1 | Secondary text (minimum case) |
| Green-700 on paper-100 | about 5.9:1 | Links, accent text |
| Paper-50 on green-700 | about 6.5:1 | Text on green fills |
| Orange-800 on paper-100 | about 5.8:1 | Warning text |
| Ink-900 on orange-500 | about 5.6:1 | Text on orange fills |
| Red-700 on paper-100 | about 5.5:1 | Error text |
| Blue-700 on paper-100 | about 7:1 | Info text and focus ring |
| Paper-100 on ink-900 | about 14:1 | Text on dark surfaces |
| Green-400 on ink-900 | about 10:1 | Accent text on dark surfaces |

Hard rules:

- Green-600 and orange-500 are **not** used as text color on paper (they fall below 4.5:1). They are for graphics and fills only.
- Orange-500 never carries paper-colored text; it carries ink text.
- Non-text UI (control borders, focus rings, selected indicators) must reach 3:1 against adjacent colors. The 2px ink border satisfies this.
- Hairline `--color-border-subtle` is decorative only and never the sole boundary of an interactive control.

### 4.7 Dark and inverse surfaces

Dark surfaces use `--color-bg-inverse` (ink-900). They are for terminals, code blocks, footers (optional), and highlighted callouts. They are **not** a full dark theme. Apply the `.ds-inverse` class and the semantic tokens rebind automatically (see Section 9), so components inside need no special CSS.

### 4.8 Data visualization

- Series order: ink-900, green-600, orange-500, blue-700, ink-400.
- Differentiate series with direct labels, line styles (solid, dashed, dotted), and marker shapes in addition to color.
- Gridlines use `--color-grid-minor`. Axes and baselines use `--color-border-default`.
- Value labels and tick numbers use the monospace role.

---

## 5. Typography

### 5.1 Font families and roles

| Role | Family | Fallback stack | Used for |
|---|---|---|---|
| Editorial sans | **Archivo** (600, 700, 800) | `"Helvetica Neue", Helvetica, Arial, sans-serif` | Headings, navigation, buttons, tabs, important labels |
| Readable sans | **IBM Plex Sans** (400, 500, 600, 700) | `"Segoe UI", system-ui, -apple-system, Roboto, sans-serif` | Paragraphs, form labels, descriptions, general content |
| Monospace | **IBM Plex Mono** (400, 500, 600) | `ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace` | IDs, timestamps, code, terminal, compact labels, numbers |

All three are free on Google Fonts and open-licensed, so they can also be self-hosted. Load only the weights listed, with `font-display: swap`.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet"
  href="https://fonts.googleapis.com/css2?family=Archivo:wght@600;700;800&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap">
```

### 5.2 Type scale and tokens

Sizes use `clamp()` so type scales smoothly between a 360px phone and a 1280px desktop. Composite tokens (`--type-*`) bundle weight, size, line height, and family; letter spacing is applied separately via `--tracking-*`.

| Token | Family | Size (mobile to desktop) | Weight | Line height | Letter spacing | Intended usage |
|---|---|---|---|---|---|---|
| `--type-display` | Archivo | 40px to 84px | 800 | 0.95 | `--tracking-display` (-0.03em) | Hero and cover headlines only. One per page |
| `--type-title` | Archivo | 32px to 56px | 800 | 1.05 | `--tracking-heading` (-0.02em) | Page title (`h1`) when there is no hero |
| `--type-section` | Archivo | 24px to 36px | 700 | 1.05 | `--tracking-heading` (-0.02em) | Section headings (`h2`) |
| `--type-subsection` | Archivo | 20px to 24px | 700 | 1.2 | `--tracking-subheading` (-0.01em) | Subsection headings (`h3`), panel titles |
| `--type-heading-4` | Archivo | 18px | 600 | 1.2 | 0 | Minor headings (`h4`), card titles in dense layouts |
| `--type-body-lg` | Plex Sans | 18px | 400 | 1.6 | 0 | Lead paragraph under a hero or title |
| `--type-body` | Plex Sans | 16px | 400 | 1.6 | 0 | Default body text |
| `--type-small` | Plex Sans | 14px | 400 | 1.5 | 0 | Helper text, captions, secondary descriptions |
| `--type-label-ui` | Plex Sans | 14px | 600 | 1.2 | 0 | Form field labels, table cell labels, sentence case |
| `--type-label-tech` | Plex Mono | 12px | 500 | 1.2 | `--tracking-label` (0.06em) | Compact technical labels, table headers, badges. Uppercase allowed |
| `--type-meta` | Plex Mono | 13px | 400 | 1.4 | `--tracking-meta` (0.01em) | Timestamps, IDs, version strings, file names |
| `--type-button` | Archivo | 15px | 700 | 1 | `--tracking-button` (0.01em) | Buttons, tabs, navigation links. Sentence case |
| `--type-numeric` | Plex Mono | 16px | 500 | 1.2 | 0 | Inline numbers in tables and lists (tabular figures) |
| `--type-numeric-lg` | Plex Mono | 24px to 36px | 500 | 1.05 | `--tracking-subheading` (-0.01em) | Large figures and counters |

### 5.3 Typography rules

1. **Hierarchy.** Large Archivo headings set the editorial voice, Plex Sans carries ordinary interface text, and mono microcopy is small and secondary. Never set body paragraphs in mono.
2. **Uppercase is selective.** Uppercase is allowed only for `--type-label-tech` (table headers, badges, short metadata labels of three words or fewer). Buttons, navigation, headings, and body text MUST stay in sentence case. Do not put an uppercase eyebrow above every heading.
3. **Monospace is for data.** Use it for identifiers, timestamps, numbers that align in columns, code, terminal output, version strings, and compact labels. Do not use it for headings, buttons, navigation, or paragraphs.
4. **Measure.** Body paragraphs max 68 characters per line (`--measure-body`). Lead paragraphs max 56 characters (`--measure-lead`). Display and title headings max about 20 characters per line (`max-inline-size: 20ch`) so they break like a printed headline.
5. **Alignment.** Left-aligned, ragged-right text everywhere. Do not justify, and do not center body text. Short single-line elements (empty-state message, dialog title on mobile) may be centered only when they are standalone.
6. **Wrapping.** Headings use `text-wrap: balance`. Paragraphs use `text-wrap: pretty`.
7. **Numerals.** Any numeric column or live-updating number uses `font-variant-numeric: tabular-nums` with the mono role. Right-align numeric columns.
8. **Emphasis.** Use weight (600) for inline emphasis. Do not color a single word in a headline, and do not italicize for emphasis in headings.
9. **Language.** Always set `lang` on `<html>` (and on foreign-language fragments) so hyphenation, quotes, and screen readers behave.
10. **Spacing between text and rules.** Headings are separated from the preceding block by at least `--space-8` and from the following block by `--space-3`.

### 5.4 Prose elements

| Element | Style |
|---|---|
| Links in text | `--color-text-link`, 2px underline with `text-underline-offset: 0.2em`. Hover adds `--color-bg-selected` background |
| Inline code | Mono at 0.9em, `--color-bg-surface` fill, 1px `--color-border-subtle` border, `--radius-sm`, padding `0.1em 0.35em` |
| Keyboard key (`kbd`) | Inline code style plus a 2px bottom border in `--color-border-default` |
| Blockquote | 3px left border in `--color-border-default`, `--space-4` left padding, body text, no italics required |
| Lists | `--space-2` between items, mono markers are not used |
| Code block | Terminal style on `--color-bg-inverse` (see 10.11) |
| Horizontal rule | 2px `--color-border-default`, margin `--space-8` vertical |

### 5.5 Responsive typography

- Mobile body text MUST NOT go below 16px (inputs below 16px trigger zoom on iOS).
- Mono labels never go below 12px.
- Display and title tokens already scale through `clamp()`; do not add breakpoint overrides for font size.
- On mobile, reduce line length naturally by container padding; do not reduce body size.
- Letter spacing on headings tightens as size grows (see table); never apply negative tracking to text under 20px.

---

## 6. Layout and Grid

### 6.1 Containers

| Token | Value | Use |
|---|---|---|
| `--container-narrow` | 44rem (704px) | Narrow editorial content: articles, forms, documentation text |
| `--container-wide` | 80rem (1280px) | Default page container for landing pages and general layouts |
| `--container-data` | 100rem (1600px) | Data-dense administrative layouts and wide tables |

Containers include their side padding (`box-sizing: border-box`), are centered with `margin-inline: auto`, and use `padding-inline: var(--page-margin)`.

### 6.2 Page margins

| Viewport | `--page-margin` |
|---|---|
| Mobile (below 768px) | 16px |
| Tablet (768px and up) | 32px |
| Desktop (1024px and up) | 48px |
| Wide (1280px and up) | 64px |

### 6.3 Grid structure

| Viewport | Columns | Gap (`--grid-gap`) |
|---|---|---|
| Mobile | 4 | 16px |
| Tablet | 8 | 24px |
| Desktop | 12 | 24px |
| Wide | 12 | 32px |

- Children MUST declare `min-width: 0` so wide content (tables, code) scrolls inside its own container instead of breaking the grid.
- Columns are assigned with `--span`, `--span-md`, and `--span-lg` custom properties (see 17.2).

### 6.4 Section and component spacing

| Purpose | Token | Mobile to desktop |
|---|---|---|
| Between page sections | `--section-space` | 48px, 64px, 96px |
| Between blocks inside a section | `--space-8` to `--space-12` | 32px to 48px |
| Between related elements (heading and body) | `--space-3` to `--space-4` | 12px to 16px |
| Inside panels (comfortable) | `--space-5` to `--space-6` | 20px to 24px |
| Dense data (compact) | `--space-2` to `--space-3` | 8px to 12px |

### 6.5 Vertical rhythm

- The rhythm unit is 8px. Block spacing uses multiples of 8px (`--space-2`, `--space-4`, `--space-6`, `--space-8`, ...). The 4px steps (`--space-1`, `--space-3`, `--space-5`) are for fine adjustment inside components.
- Body line height is 1.6, so text blocks do not sit on a strict baseline grid. Rhythm is maintained by consistent spacing between blocks, not by baseline snapping.
- Use the stack pattern (`.ds-stack`, 17.2) so spacing is owned by the container, not by margins on individual children.

### 6.6 Layout patterns and when to use them

| Pattern | Use when | Avoid when |
|---|---|---|
| **Full-width band** (border-top and border-bottom, 3px) | Separating major page regions: hero, feature area, footer | The band would only decorate; every band needs a reason (content change) |
| **Multi-column (equal)** | Parallel items of the same kind: feature lists, link groups | Items have different importance (use asymmetry) |
| **Narrow editorial column** | Long-form text, documentation, forms | Data tables or dashboards |
| **Dense technical panel** | Metrics, logs, tables, filters | Marketing content; first-time users |
| **Asymmetric composition** (8 + 4 columns) | Hero with index card, article with side metadata | When the narrow column would hold primary content on mobile (it stacks below the main column) |
| **Divided sections with explicit borders** | Grouping related panels with shared edges | More than two levels of nesting |

Asymmetry MUST degrade to a single column on mobile with the main content first.

### 6.7 Reference compositions

**Editorial hero (desktop, 12 columns)**

```
+---------------------------------------------+------------------+
| Display headline (span 8)                   | Index card       |
| Lead paragraph (max 56ch)                   | (span 4, title   |
| [ Primary action ] [ Secondary action ]     |  block + data)   |
+---------------------------------------------+------------------+
```

**Administrative shell (desktop)**

```
+--------------------------------------------------------------+
| Header (3px bottom rule)                                     |
+-----------+--------------------------------------------------+
| Side nav  | Page title row + primary action                  |
| (3 cols,  | Toolbar (filters, search)                        |
| surface   | Table or panels (fluid, up to --container-data)  |
| fill)     |                                                  |
+-----------+--------------------------------------------------+
```

**Documentation (desktop)**

```
+--------------------------------------------------------------+
| Header                                                       |
+---------+-----------------------------------+----------------+
| Section | Narrow content column (max 68ch)  | On this page   |
| nav     | with title blocks for code/notes  | (metadata)     |
+---------+-----------------------------------+----------------+
```

---

## 7. Spacing System

### 7.1 Scale

Base unit 4px. Tokens are declared in `rem` (1rem = 16px) so spacing respects user font settings.

| Token | rem | px | Typical use |
|---|---|---|---|
| `--space-0` | 0 | 0 | Collapsed, shared borders |
| `--space-1` | 0.25 | 4 | Icon to text in badges, tight inline gaps |
| `--space-2` | 0.5 | 8 | Dense cells, gap between small controls |
| `--space-3` | 0.75 | 12 | Heading to body, compact padding |
| `--space-4` | 1 | 16 | Default gap, mobile page margin, input padding |
| `--space-5` | 1.25 | 20 | Button horizontal padding |
| `--space-6` | 1.5 | 24 | Panel padding, grid gap |
| `--space-8` | 2 | 32 | Between blocks in a section |
| `--space-10` | 2.5 | 40 | Large component gaps |
| `--space-12` | 3 | 48 | Mobile section spacing, desktop page margin |
| `--space-16` | 4 | 64 | Tablet section spacing |
| `--space-20` | 5 | 80 | Large separations |
| `--space-24` | 6 | 96 | Desktop section spacing |
| `--space-32` | 8 | 128 | Hero vertical breathing room (desktop only) |

Only these values are valid. Do not use arbitrary values such as 10px, 14px, or 18px for spacing.

### 7.2 Density modes

`data-density="compact"` on a container rebinds control and cell sizing for data-heavy views.

| Token | Comfortable (default) | Compact |
|---|---|---|
| `--control-height` | 2.75rem (44px) | 2rem (32px), but 2.75rem on coarse pointers |
| `--cell-padding-y` | `--space-3` | `--space-2` |
| `--cell-padding-x` | `--space-4` | `--space-3` |
| `--panel-padding` | `--space-6` | `--space-4` |

Compact density MUST NOT be applied on mobile touch layouts (the `pointer: coarse` rule restores 44px targets).

### 7.3 Spacing usage rules

1. Space between unrelated groups is at least twice the space between related items inside a group.
2. Padding inside a bordered container is equal on both axes unless the container is a control (buttons and inputs use less vertical than horizontal padding).
3. Never combine a border with a margin-collapse trick to hide a missing gap. Use a gap.
4. Shared edges between adjacent panels use a single border (see 8.5).

---

## 8. Borders, Geometry, and Shadows

### 8.1 Border widths

| Token | Width | Use |
|---|---|---|
| `--border-hairline` | 1px | Dividers inside panels, row separators in tables, subtle structure |
| `--border-default` | 2px | Panels, inputs, buttons, tables, dialogs, cards. The default border |
| `--border-strong` | 3px | Page-level divisions (under the header, above the footer, around hero), dialogs and drawers |
| `--border-heavy` | 4px | Accent bars (selected tab top bar, nav active bar, selected row bar). Never an outline |

**Border colors:** structure uses `--color-border-default` (ink-900). Subtle dividers use `--color-border-subtle`. Status borders use the status border tokens. Disabled elements use a dashed `--color-border-subtle`.

### 8.2 Corner radius

| Token | Value | Use |
|---|---|---|
| `--radius-none` | 0 | Panels, tables, dialogs, drawers, tabs, toasts, headers, footers |
| `--radius-sm` | 2px | Buttons, inputs, selects, badges, checkboxes, inline code |
| `--radius-md` | 4px | Reserved for small floating items such as tooltips. The maximum for any rectangle |
| `--radius-full` | 9999px | Radio buttons only |

Rule: **containers are square, controls are barely softened.** If a component needs a radius larger than 4px, it does not belong in this system.

### 8.3 Shadows

Shadows are hard-edged offsets in ink with zero blur. They mean one of two things: "this can be pressed" or "this floats above the page."

| Token | Value | Permitted on |
|---|---|---|
| `--shadow-hard-sm` | `2px 2px 0 var(--color-border-default)` | Tooltips, popovers, dropdown menus |
| `--shadow-hard-md` | `4px 4px 0 var(--color-border-default)` | Toasts, interactive panel hover |
| `--shadow-hard-lg` | `8px 8px 0 var(--color-border-default)` | Dialogs, drawers |
| `--shadow-accent` | `3px 3px 0 var(--color-accent-graphic)` | The primary button at rest; the selected interactive panel |

Shadow tokens resolve to ink at the root, so hard shadows are not used inside `.ds-inverse` surfaces.

Shadows are **not** permitted on: static panels, tables, inputs, badges, the header, the footer, or inline alerts. Borders alone provide separation there.

### 8.4 Pressed behavior

An element with a hard shadow moves toward its shadow when pressed: `transform: translate(Xpx, Ypx)` equal to the offset, and the shadow goes to none. This reads as a physical key press and requires no extra animation.

### 8.5 Nested and shared borders

- Never double adjacent borders. When two bordered boxes touch, use a negative margin of one border width (`margin-inline-start: calc(var(--border-default) * -1)`) or draw the border on one side only.
- A panel inside a panel uses `--border-hairline` for the inner box, not another 2px rule.
- Maximum two levels of bordered nesting.

---

## 9. Design Tokens

This is the **single source of truth**. Components reference semantic tokens (`--color-*`, `--type-*`, `--space-*`), never palette tokens. Media queries cannot read custom properties, so breakpoints are documented as literals below and used as literals in `@media` rules.

**Breakpoints (literal values for `@media`):**

| Name | min-width | Layout meaning |
|---|---|---|
| (base) | 0 | Single column, 4-column grid, compact navigation |
| `sm` | 30rem (480px) | Two-up groups of small items, wider form layouts |
| `md` | 48rem (768px) | 8-column grid, inline navigation, side-by-side panels |
| `lg` | 64rem (1024px) | 12-column grid, side navigation, asymmetric compositions |
| `xl` | 80rem (1280px) | Wider margins and gaps, content max-width reached |

```css
/* tokens.css */
:root {
  /* ==== 1. PALETTE (raw values; referenced only from this file) ==== */
  --palette-paper-50:  #FAF7EC;
  --palette-paper-100: #EFEBDA;
  --palette-paper-200: #E6E1CE;
  --palette-paper-300: #D9D3BC;
  --palette-paper-400: #BDB7A0;
  --palette-paper-500: #A8A38C;
  --palette-paper-grid-1: #DCD7C2;
  --palette-paper-grid-2: #CFC9B1;

  --palette-ink-900: #1C1B17;
  --palette-ink-800: #2B2A25;
  --palette-ink-700: #3F3D34;
  --palette-ink-500: #5E5A47;
  --palette-ink-400: #8A8670;

  --palette-green-100: #D8EBD4;
  --palette-green-400: #62DB8B;
  --palette-green-600: #1B7F45;
  --palette-green-700: #14663A;
  --palette-green-800: #0F4F2D;

  --palette-orange-100: #FBE0CB;
  --palette-orange-400: #FF9A55;
  --palette-orange-500: #F26A1B;
  --palette-orange-800: #9A3C00;

  --palette-red-100: #F6D5D0;
  --palette-red-300: #FF8C82;
  --palette-red-700: #B42318;
  --palette-red-800: #8A1C13;

  --palette-blue-100: #D4E1F0;
  --palette-blue-300: #8DB8F0;
  --palette-blue-700: #1D4E89;

  /* ==== 2. SEMANTIC COLOR ==== */
  /* surfaces */
  --color-bg-page:           var(--palette-paper-100);
  --color-bg-surface:        var(--palette-paper-200);
  --color-bg-raised:         var(--palette-paper-50);
  --color-bg-muted:          var(--palette-paper-300);
  --color-bg-hover:          var(--palette-paper-100);
  --color-bg-selected:       var(--palette-green-100);
  --color-bg-inverse:        var(--palette-ink-900);
  --color-bg-inverse-raised: var(--palette-ink-800);
  --color-overlay:           rgb(28 27 23 / 0.64);

  /* text */
  --color-text-primary:           var(--palette-ink-900);
  --color-text-secondary:         var(--palette-ink-500);
  --color-text-disabled:          var(--palette-ink-400);
  --color-text-inverse:           var(--palette-paper-50);
  --color-text-inverse-secondary: var(--palette-paper-500);
  --color-text-link:              var(--palette-green-700);
  --color-text-link-hover:        var(--palette-green-800);

  /* borders */
  --color-border-default:        var(--palette-ink-900);
  --color-border-subtle:         var(--palette-paper-400);
  --color-border-inverse-subtle: var(--palette-ink-700);

  /* grid */
  --color-grid-minor: var(--palette-paper-grid-1);
  --color-grid-major: var(--palette-paper-grid-2);

  /* accents */
  --color-accent:            var(--palette-green-700);
  --color-accent-hover:      var(--palette-green-800);
  --color-accent-graphic:    var(--palette-green-600);
  --color-text-on-accent:    var(--palette-paper-50);
  --color-annotation:        var(--palette-orange-500);
  --color-annotation-text:   var(--palette-orange-800);
  --color-bg-annotation:     var(--palette-orange-100);

  /* status */
  --color-success-text:   var(--palette-green-700);
  --color-success-bg:     var(--palette-green-100);
  --color-success-border: var(--palette-green-600);
  --color-warning-text:   var(--palette-orange-800);
  --color-warning-bg:     var(--palette-orange-100);
  --color-warning-border: var(--palette-orange-500);
  --color-error-text:     var(--palette-red-700);
  --color-error-bg:       var(--palette-red-100);
  --color-error-border:   var(--palette-red-700);
  --color-error-solid:    var(--palette-red-700);
  --color-error-solid-hover: var(--palette-red-800);
  --color-info-text:      var(--palette-blue-700);
  --color-info-bg:        var(--palette-blue-100);
  --color-info-border:    var(--palette-blue-700);

  --color-focus: var(--palette-blue-700);

  /* ==== 3. TYPOGRAPHY ==== */
  --font-display: "Archivo", "Helvetica Neue", Helvetica, Arial, sans-serif;
  --font-body: "IBM Plex Sans", "Segoe UI", system-ui, -apple-system, Roboto, sans-serif;
  --font-mono: "IBM Plex Mono", ui-monospace, "SFMono-Regular", Menlo, Consolas, monospace;

  --text-display:    clamp(2.5rem, 1.6rem + 4.2vw, 5.25rem);
  --text-title:      clamp(2rem, 1.5rem + 2.6vw, 3.5rem);
  --text-section:    clamp(1.5rem, 1.25rem + 1.2vw, 2.25rem);
  --text-subsection: clamp(1.25rem, 1.1rem + 0.6vw, 1.5rem);
  --text-h4:         1.125rem;
  --text-body-lg:    1.125rem;
  --text-body:       1rem;
  --text-small:      0.875rem;
  --text-meta:       0.8125rem;
  --text-micro:      0.75rem;
  --text-button:     0.9375rem;
  --text-numeric-lg: clamp(1.5rem, 1.2rem + 1.2vw, 2.25rem);

  --font-weight-regular:   400;
  --font-weight-medium:    500;
  --font-weight-semibold:  600;
  --font-weight-bold:      700;
  --font-weight-extrabold: 800;

  --leading-none:    0.95;
  --leading-tight:   1.05;
  --leading-snug:    1.2;
  --leading-normal:  1.5;
  --leading-relaxed: 1.6;

  --tracking-display:    -0.03em;
  --tracking-heading:    -0.02em;
  --tracking-subheading: -0.01em;
  --tracking-normal:     0;
  --tracking-button:     0.01em;
  --tracking-meta:       0.01em;
  --tracking-label:      0.06em;

  /* composite type tokens: weight size/line-height family */
  --type-display:    var(--font-weight-extrabold) var(--text-display)/var(--leading-none) var(--font-display);
  --type-title:      var(--font-weight-extrabold) var(--text-title)/var(--leading-tight) var(--font-display);
  --type-section:    var(--font-weight-bold) var(--text-section)/var(--leading-tight) var(--font-display);
  --type-subsection: var(--font-weight-bold) var(--text-subsection)/var(--leading-snug) var(--font-display);
  --type-heading-4:  var(--font-weight-semibold) var(--text-h4)/var(--leading-snug) var(--font-display);
  --type-body-lg:    var(--font-weight-regular) var(--text-body-lg)/var(--leading-relaxed) var(--font-body);
  --type-body:       var(--font-weight-regular) var(--text-body)/var(--leading-relaxed) var(--font-body);
  --type-small:      var(--font-weight-regular) var(--text-small)/var(--leading-normal) var(--font-body);
  --type-label-ui:   var(--font-weight-semibold) var(--text-small)/var(--leading-snug) var(--font-body);
  --type-label-tech: var(--font-weight-medium) var(--text-micro)/var(--leading-snug) var(--font-mono);
  --type-meta:       var(--font-weight-regular) var(--text-meta)/1.4 var(--font-mono);
  --type-button:     var(--font-weight-bold) var(--text-button)/1 var(--font-display);
  --type-numeric:    var(--font-weight-medium) var(--text-body)/var(--leading-snug) var(--font-mono);
  --type-numeric-lg: var(--font-weight-medium) var(--text-numeric-lg)/var(--leading-tight) var(--font-mono);

  --measure-body: 68ch;
  --measure-lead: 56ch;

  /* ==== 4. SPACING (4px base unit) ==== */
  --space-0: 0;
  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.25rem;
  --space-6: 1.5rem;
  --space-8: 2rem;
  --space-10: 2.5rem;
  --space-12: 3rem;
  --space-16: 4rem;
  --space-20: 5rem;
  --space-24: 6rem;
  --space-32: 8rem;

  /* ==== 5. LAYOUT (mobile-first defaults; overridden below) ==== */
  --container-narrow: 44rem;
  --container-wide:   80rem;
  --container-data:   100rem;

  --page-margin:   1rem;   /* 16px */
  --grid-columns:  4;
  --grid-gap:      1rem;   /* 16px */
  --section-space: 3rem;   /* 48px */

  --control-height:  2.75rem; /* 44px */
  --cell-padding-y:  var(--space-3);
  --cell-padding-x:  var(--space-4);
  --panel-padding:   var(--space-6);

  --grid-size-minor: 24px;
  --grid-size-major: 120px;

  /* ==== 6. BORDERS, RADII, SHADOWS ==== */
  --border-hairline: 1px;
  --border-default:  2px;
  --border-strong:   3px;
  --border-heavy:    4px;

  --radius-none: 0;
  --radius-sm:   2px;
  --radius-md:   4px;
  --radius-full: 9999px;

  --shadow-hard-sm: 2px 2px 0 var(--color-border-default);
  --shadow-hard-md: 4px 4px 0 var(--color-border-default);
  --shadow-hard-lg: 8px 8px 0 var(--color-border-default);
  --shadow-accent:  3px 3px 0 var(--color-accent-graphic);

  --focus-ring-width:  3px;
  --focus-ring-offset: 2px;

  /* ==== 7. Z-INDEX ==== */
  --z-base: 0;
  --z-raised: 10;
  --z-sticky: 100;
  --z-dropdown: 200;
  --z-drawer: 300;
  --z-modal: 400;
  --z-toast: 500;
  --z-tooltip: 600;

  /* ==== 8. MOTION ==== */
  --duration-instant: 80ms;
  --duration-fast:    140ms;
  --duration-base:    220ms;
  --duration-slow:    360ms;
  --duration-blink:   1000ms;
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --ease-in:       cubic-bezier(0.4, 0, 1, 1);
  --ease-out:      cubic-bezier(0, 0, 0.2, 1);
  --ease-step:     steps(4, end);
}

/* ---- Responsive layout tokens (literal breakpoints) ---- */
@media (min-width: 48rem) {   /* md */
  :root { --page-margin: 2rem; --grid-columns: 8; --grid-gap: 1.5rem; --section-space: 4rem; }
}
@media (min-width: 64rem) {   /* lg */
  :root { --page-margin: 3rem; --grid-columns: 12; --section-space: 6rem; }
}
@media (min-width: 80rem) {   /* xl */
  :root { --page-margin: 4rem; --grid-gap: 2rem; }
}

/* ---- Density: compact data views ---- */
[data-density="compact"] {
  --control-height: 2rem;
  --cell-padding-y: var(--space-2);
  --cell-padding-x: var(--space-3);
  --panel-padding:  var(--space-4);
}
@media (pointer: coarse) {
  [data-density="compact"] { --control-height: 2.75rem; }
}

/* ---- Inverse (dark) surfaces: semantic tokens rebind, components need no changes ---- */
.ds-inverse,
.ds-terminal {
  --color-bg-page:           var(--palette-ink-900);
  --color-bg-surface:        var(--palette-ink-800);
  --color-bg-raised:         var(--palette-ink-800);
  --color-bg-hover:          var(--palette-ink-700);
  --color-bg-selected:       var(--palette-ink-700);
  --color-text-primary:      var(--palette-paper-50);
  --color-text-secondary:    var(--palette-paper-500);
  --color-text-link:         var(--palette-green-400);
  --color-text-link-hover:   var(--palette-paper-50);
  --color-border-default:    var(--palette-paper-100);
  --color-border-subtle:     var(--palette-ink-700);
  --color-accent:            var(--palette-green-400);
  --color-accent-hover:      var(--palette-green-400);
  --color-accent-graphic:    var(--palette-green-400);
  --color-text-on-accent:    var(--palette-ink-900);
  --color-annotation-text:   var(--palette-orange-400);
  --color-success-text:      var(--palette-green-400);
  --color-warning-text:      var(--palette-orange-400);
  --color-error-text:        var(--palette-red-300);
  --color-info-text:         var(--palette-blue-300);
  --color-success-bg:        var(--palette-ink-800);
  --color-warning-bg:        var(--palette-ink-800);
  --color-error-bg:          var(--palette-ink-800);
  --color-info-bg:           var(--palette-ink-800);
  --color-focus:             var(--palette-paper-50);
  background-color: var(--palette-ink-900);
  color: var(--palette-paper-50);
}
```

Token rules:

1. One purpose, one token. If two tokens hold the same value for the same purpose, delete one.
2. Components consume semantic tokens. Adding a new color requires a palette token first, then a semantic token with a role.
3. A component-scoped custom property (for example `--btn-bg`) MAY exist for variants, but it MUST be assigned from semantic tokens.

---

## 10. Component Library

Components are specified here by anatomy, variants, and states. Reference CSS for representative components is in Section 17. All components obey the tokens in Section 9.

### 10.1 Header and navigation

| Aspect | Specification |
|---|---|
| Container | `<header>` with `--color-bg-page`, `--border-strong` bottom border, min height 3.5rem. Sticky is optional (`--z-sticky`); use it for application UIs and long documents |
| Logo | Left edge. A 36px square mark (ink fill, paper-colored mono letter or glyph) followed by the product name in `--type-button` at 18px, weight 800. The mark is decorative (`aria-hidden`); the name is the link text. Links to the home page |
| Links | `--type-button`, sentence case, 44px tall, `--space-4` inline padding, no underline |
| Hover | Background `--color-bg-selected` |
| Active (current page) | `aria-current="page"`, weight 700, and a 4px bottom bar in `--color-accent-graphic`. The bar plus weight make it visible without color |
| Focus | Standard focus ring drawn **inside** the link (`outline-offset: -3px`) so the sticky header does not clip it |
| Technical metadata (optional) | Right-aligned, `--type-meta`, `--color-text-secondary`: environment name, version, or build identifier. Only for technical tools. Hidden below `lg` |
| Skip link | First focusable element. Visible on focus as a title-block strip ("Skip to main content") |

**Responsive behavior**

- Below `md`: brand on the left and a **"Menu"** button on the right (visible text label plus a three-line glyph, 44px tall, `aria-expanded`, `aria-controls`). The menu opens as a full-width panel directly under the header with stacked 48px rows separated by hairlines and a 3px bottom border. It closes on Escape, on link selection, and on outside tap. Focus moves to the first link on open and returns to the button on close.
- If the product has one primary action (for example a sign-in or create action), keep it visible beside the Menu button, or place it first inside the menu. Important actions MUST NOT disappear.
- `md` and up: inline links when there are five or fewer; otherwise switch at `lg`.
- Administrative layouts use a side navigation from `lg` (surface fill, 3px right border, 44px rows, same active treatment with the bar on the left edge).

### 10.2 Editorial hero section

The hero is the opening page of a technical publication, not a marketing banner.

| Region | Specification |
|---|---|
| Layout | Desktop: 12 columns, headline block `--span-lg: 8`, index card `--span-lg: 4`. Tablet and mobile: stacked, headline first |
| Frame | 3px top and bottom rules (`--border-strong`); vertical padding `--section-space` |
| Headline | `--type-display`, tracking `--tracking-display`, `max-inline-size: 20ch`, `text-wrap: balance`. One per page. No gradient text, no single-word color accents |
| Supporting description | `--type-body-lg`, max 56 characters, `--color-text-secondary` only if contrast is met, otherwise primary |
| Actions | One primary button and one secondary button, aligned left with `--space-4` gap. Stack full-width on mobile |
| Index card (optional) | A panel with a title block and a definition list of real metadata (version, updated date, status, owner). Omit it when there is no real metadata |
| Index label (optional) | One short mono label (such as a document type or revision) above the headline. Use only when it carries real information |
| Technical annotation (optional) | At most one: a dimension line, corner registration mark, or callout flag in `--color-annotation`. Must point at something real |
| Background | May sit on the subtle grid (`.ds-gridded`). The index card and any text container keep a solid raised fill |

### 10.3 Panels and cards

Anatomy: **header** (title block: title cell and optional identifier cell), **body**, optional **footer** (actions or metadata). A panel always has a 2px border and square corners. Cards and panels are the same component; do not create a second "card" style.

| Variant | Appearance | Use |
|---|---|---|
| Default | `--color-bg-raised`, 2px border, header on `--color-bg-surface` with a 2px bottom rule | General grouping of related content |
| Highlighted | Default plus `--shadow-accent` and header fill `--color-bg-selected` | The one selected or recommended panel in a set. Max one per group |
| Technical information | Default, body is a `<dl>` with mono values and hairline row separators; identifier cell shows an ID or version | Specifications, record details, metadata |
| Interactive | Default plus stretched link on the title. Hover: `translate(-2px, -2px)` and `--shadow-hard-md`. Pressed: back to rest | Navigable item or selectable option |
| Warning | Header fill `--color-warning-bg`, 8px left bar in `--color-warning-border`, "!" symbol and the word "Warning" in the identifier cell | Cautions the reader must read before acting |
| Empty state | Transparent fill, 2px **dashed** border, short heading saying what is empty, one sentence on why or what to do, one primary or secondary action | No data yet, no results |

Rules: no illustrations or icons are required in empty states. State the next action in plain words. Do not put shadows on non-interactive panels.

### 10.4 Buttons

| Variant | Appearance | Use |
|---|---|---|
| Primary | Ink fill, paper-colored text, 2px ink border, `--shadow-accent` | The single most important action in a view. Max one per region |
| Secondary | `--color-bg-raised` fill, ink text, 2px ink border, no shadow | Alternative and supporting actions |
| Tertiary (text) | Transparent, underlined label, no border until hover | Low-emphasis actions, cancel, "Learn more" |
| Destructive | `--color-error-solid` fill with paper-colored text. In a list, use secondary with red text and red border; reserve the solid red button for the confirm step in a dialog | Deleting or irreversible actions |
| Icon | Square, 44px, secondary style, requires `aria-label` and a tooltip or visible adjacent label for non-obvious icons | Toolbars and repeated row actions |

Sizing: height `--control-height`, horizontal padding `--space-5`, `--type-button`, `--radius-sm`. Labels are sentence case and start with a verb ("Save changes", "Create record"). Do not append arrow glyphs to every label.

| State | Primary | Secondary | Tertiary | Destructive |
|---|---|---|---|---|
| Rest | Ink fill, green accent shadow | Raised fill | Transparent | `--color-error-solid` fill |
| Hover | Fill `--color-accent` (green-700) | Fill `--color-bg-selected` | Fill `--color-bg-selected` | Fill `--color-error-solid-hover` |
| Focus-visible | 3px `--color-focus` outline, 2px offset | same | same | same |
| Active / pressed | Fill `--color-accent-hover`, `translate(3px, 3px)`, shadow none | Fill `--color-bg-muted` | Fill `--color-bg-muted` | Fill `--color-error-solid-hover` |
| Disabled | Fill `--color-bg-muted`, text `--color-text-disabled`, **dashed** border, no shadow, `cursor: not-allowed` | same | Text `--color-text-disabled`, no underline | same |
| Loading | `aria-busy="true"`, label changes to a progress verb ("Saving"), blinking square indicator, pointer events off. Width stays constant | same | same | same |

Use `disabled` for actions that are not available. Use `aria-disabled="true"` (keeps focus) only when the control must explain why it is unavailable. Pressed behavior must not depend on hover, and hover styles are wrapped so they do not stick on touch devices (`@media (hover: hover)` is optional enhancement; the base styles must work without it).

### 10.5 Form elements

General: visible labels above fields, never placeholder-only. Single-column forms by default. Field width reflects expected input length.

| Element | Specification |
|---|---|
| Field label | `--type-label-ui`, `--space-2` above the control. Optional marker is the word "Optional" in `--type-small`, not an asterisk |
| Text input and textarea | Min height `--control-height`, 2px ink border, `--radius-sm`, `--color-bg-raised` fill, `--space-3` vertical and `--space-4` horizontal padding, 16px text. Textarea min height 6rem, vertical resize |
| Select | Same as input with a CSS caret and right padding of `--space-10`. Native `<select>` is used for behavior and accessibility |
| Checkbox | 24px square (visual), 2px border, `--radius-sm`; checked = `--color-accent` fill with paper-colored check. Whole row (label) is the click target, min height 44px |
| Radio | 24px circle (`--radius-full`), checked = `--color-accent` fill with paper-colored dot. Use `<fieldset>` and `<legend>` for groups |
| Switch | 48px by 28px track with a square thumb, `role="switch"`. On = accent fill with thumb at the right. Always paired with a visible label; state text ("On", "Off") is shown when the meaning is not obvious |
| Helper text | `--type-small`, `--color-text-secondary`, below the control, linked by `aria-describedby` |
| Validation message | `--type-small`, `--color-error-text`, "✕" symbol, states what is wrong and how to fix it. Linked by `aria-describedby`; the control gets `aria-invalid="true"` |

| State | Visual |
|---|---|
| Hover | Border appears 3px thick (1px inset shadow in the same ink) |
| Focus-visible | 3px `--color-focus` outline, 2px offset. Border stays ink |
| Filled | No change. Do not color valid fields green |
| Error | Border `--color-error-border` with 1px inset shadow, error message with "✕", no color-only signal |
| Disabled | `--color-bg-muted` fill, `--color-text-disabled` text, dashed border, `cursor: not-allowed` |
| Read-only | `--color-bg-surface` fill, solid border, remains focusable |

### 10.6 Data tables

| Aspect | Specification |
|---|---|
| Structure | Semantic `<table>` with `<caption>` (or `aria-labelledby`), `<thead>`, `<tbody>`, `<th scope="col">`; row headers use `<th scope="row">` |
| Wrapper | `overflow-x: auto`, 2px border, `--color-bg-raised` fill, keyboard-focusable with `tabindex="0"` and an accessible name when it scrolls |
| Header row | `--color-bg-surface` fill, `--type-label-tech` (uppercase permitted when labels are short), 2px bottom border, optionally sticky |
| Cells | Padding `--cell-padding-y` by `--cell-padding-x`, `--type-body` or `--type-small`, 1px `--color-border-subtle` row separators, vertical align top |
| Numeric and identifier cells | Mono (`--type-numeric` or `--type-meta`), `tabular-nums`, numeric columns right-aligned with the header aligned the same way |
| Hover | Row fill `--color-bg-hover` |
| Selected | Row fill `--color-bg-selected`, 4px left bar in `--color-accent-graphic`, and a checked row checkbox. `aria-selected="true"` (or `aria-checked` on the checkbox) |
| Empty | A single full-width row with the empty-panel pattern: plain statement and one next action |
| Overflow | Horizontal scroll inside the wrapper with a sticky first column for tables of more than four columns. The page itself never scrolls sideways |
| Mobile adaptation | Choose per table: (a) horizontal scroll with sticky first column, for dense comparison; (b) stacked rows below `md`, each cell showing its column name from `data-label`, for tables of five columns or fewer. Restore table roles with ARIA when using (b) |
| Sorting | Sortable headers are buttons inside `<th>` with `aria-sort` and a visible ▲ or ▼ symbol |

### 10.7 Badges and status indicators

A badge is a small mono label with a symbol, a text, and a border. Meaning comes from text and symbol first, color second.

| Badge | Symbol | Text color | Fill | Example text |
|---|---|---|---|---|
| Success | ✓ | `--color-success-text` | `--color-success-bg` | "✓ Complete" |
| Warning | ! | `--color-warning-text` | `--color-warning-bg` | "! Needs review" |
| Error | ✕ | `--color-error-text` | `--color-error-bg` | "✕ Failed" |
| Information | i | `--color-info-text` | `--color-info-bg` | "i Draft" |
| Neutral | – | `--color-text-secondary` | `--color-bg-surface` | "– Archived" |
| Active selection | ■ | `--color-text-inverse` | `--color-accent` | "■ Selected" |

Specification: `--type-label-tech`, `--radius-sm`, 1px border in the text color, padding `0.125rem var(--space-2)`. Never use a bare colored dot as the only indicator.

### 10.8 Tabs and segmented controls

**Tabs** (switching between views of the same content)

| Aspect | Specification |
|---|---|
| Structure | `role="tablist"` with `role="tab"` buttons and `role="tabpanel"` regions; `aria-selected`, `aria-controls`, `aria-labelledby` |
| Inactive tab | `--color-bg-surface` fill, 2px border (no bottom border), `--type-button` |
| Active tab | `--color-bg-raised` fill, 4px top bar in `--color-accent-graphic`, weight 700 |
| Hover | Fill `--color-bg-selected` |
| Keyboard | Roving `tabindex` (only the active tab is in the tab order). Left and Right arrows move between tabs, Home and End jump to first and last. Activation follows focus for light content; use Enter or Space for heavy content |
| Responsive | The tab list scrolls horizontally on small screens with `scroll-snap-type`. With more than five tabs, or labels too long, below `md` replace with a `<select>` |

**Segmented control** (switching a mode or filter with two to four short options)

Implemented as a radio group (`<fieldset>`, visually hidden native radios, visible labels). Selected segment = `--color-accent` fill with paper-colored text. Segments share a 2px outer border and 2px inner dividers. Full width on mobile when it has three or more options.

### 10.9 Dialogs and drawers

| Aspect | Dialog | Drawer |
|---|---|---|
| Element | Native `<dialog>` opened with `showModal()` | `<dialog>` positioned at the inline end |
| Surface | `--color-bg-raised`, 3px border, `--shadow-hard-lg`, no radius | `--color-bg-raised`, 3px border on the inner edge only, no shadow (flush with the viewport edge) |
| Width | `min(36rem, 100vw - 2 * --page-margin)` | `min(28rem, 100vw)` |
| Header | Title block: title left, **"Close"** button (text plus ✕ glyph) right | Same |
| Body | `--panel-padding`; scrolls if content is long, header and footer stay fixed | Same |
| Footer | Actions right-aligned: secondary, then primary last. Destructive confirm uses the destructive button and never default focus | Same |
| Overlay | `--color-overlay`, flat (no blur) | Same |
| Dismissal | Escape key, Close button, and cancel button. Backdrop click dismisses only non-destructive dialogs with no unsaved input | Same |
| Focus | Focus moves inside on open (to the first field or the least destructive button), is trapped by the modal dialog, and returns to the trigger on close. The background is `inert` | Same |
| Mobile | Below `md`: dialog becomes a full-width sheet anchored to the bottom (`max-block-size: 100dvh`), footer buttons stack full-width with the primary on top | Full-screen |

### 10.10 Notifications and feedback

| Type | Pattern | Behavior |
|---|---|---|
| Toast | 2px border, `--shadow-hard-md`, 8px left status bar, symbol, short message, optional action and Close. Region at the bottom end (desktop) or bottom full-width above the safe area (mobile) | Success and info: `role="status"`, auto-dismiss after 6 seconds, pause on hover and focus. Errors: `role="alert"`, never auto-dismiss. A toast with an action does not auto-dismiss |
| Inline alert | Bordered block in the status colors with symbol, bold first sentence, optional action. No shadow | Placed next to the content it concerns. Use `role="alert"` only when it appears in response to an action |
| Confirmation message | One line in the page or panel ("Saved at 14:32" with the time in mono) | Replaces the progress label in place. Uses the same verb as the action (Save, Saved) |
| Loading feedback | Block-style indicator: a row of square cells filling in steps (`steps()` easing), or a blinking square on a button. Text label required ("Loading records") | `aria-busy="true"` on the region and a polite live region announcement. Prefer layout-matching placeholders for content over spinners |
| Error notification | What happened, why if known, how to fix it, and a mono reference code if support is needed. No apologies, no vague text | Focus is managed for form errors (moves to the error summary) |

### 10.11 Terminal and code-inspired elements

Optional. Use for logs, command samples, API examples, build output, and status feeds. Do not use for ordinary forms, navigation, or marketing text.

| Aspect | Specification |
|---|---|
| Surface | `.ds-terminal`: `--color-bg-inverse`, `--type-meta` at 0.875rem with 1.6 line height, 2px border in `--color-border-subtle` |
| Bar | A strip with a file or command label on the left and a status label on the right, 1px bottom divider in `--color-border-subtle` |
| Prompt | `$` in `--color-accent` (green-400 on dark); command text in `--color-text-primary` |
| Output levels | Prefix with a text tag: `[ OK ]` success, `[WARN]` warning, `[FAIL]` error, `[INFO]` info, each colored but readable without color |
| Cursor | A solid block that blinks with `steps(1, end)`. Static under reduced motion |
| Overflow | Horizontal scroll, `white-space: pre`, focusable (`tabindex="0"`) with an accessible name |
| Copy | An optional "Copy" button in the bar with confirmation text ("Copied") announced via a live region |

### 10.12 Footer

| Aspect | Specification |
|---|---|
| Container | `--color-bg-surface` fill, `--border-strong` top border, `--section-space` top padding, `--space-8` bottom padding. Or `.ds-inverse` for a dark footer on landing pages |
| Structure | Brand block and short description, link groups with `<h2>`-level headings (sized as `--type-heading-4`), then a bottom bar |
| Bottom bar | 1px top rule, `--type-meta` metadata: copyright, version or build, legal links |
| Desktop | 12 columns: brand `--span-lg: 4`, up to three link groups of `--span-lg: 2`, optional metadata `--span-lg: 2` |
| Tablet | Brand full width, link groups in two columns |
| Mobile | Single column. Link groups stacked, each heading followed by a list with 44px row targets |
| Links | Underlined by default, same link styles as body text |

---

## 11. Editorial and Technical Elements

### 11.1 Vocabulary

Decorative and technical elements are a closed vocabulary. If an element is not listed here, it is not part of the system.

| Element | Appearance | Use when | Omit when |
|---|---|---|---|
| Index numbers | `--type-label-tech`, e.g. "01", "02" | The content is an actual ordered sequence (steps, a numbered list of records, a table of contents) | The items are not ordered or order is not meaningful |
| Section identifiers | Mono token such as "§ 3.2" before a heading | Long documentation where readers cite or cross-reference sections | Marketing pages, short pages |
| Numbered section headings | Mono number cell next to the heading text | The page is a structured document with a table of contents | Application screens |
| Technical annotations | Orange-500 marker, a short mono note, and a thin leader line | Explaining something specific in a diagram or screenshot | Anywhere with nothing to point at |
| Compact metadata labels | `--type-meta`, secondary color | Real data attached to an item: timestamps, IDs, owners, versions | Placeholder or invented data |
| Thin dividing rules | 1px `--color-border-subtle` | Separating items inside a panel or list | Between sections (use 2px or 3px borders) |
| Grid-aligned markers | Small registration crosses at the corners of the hero or a title block | One hero or cover composition per page | Dense data screens, forms |
| Coordinate-like labels | Mono pair such as "A3" or "x:12 y:04" | The content is truly positional: grid cells, charts, maps, layout tools | Content with no spatial meaning |
| Small geometric symbols | ■ ▲ ● ✓ ✕ ! i in text or badges | Status, legends, list bullets in technical lists | As decoration |
| Structured information blocks | `<dl>` with mono values, hairline separators, two columns | Specifications, record details, metadata summaries | Narrative content |

### 11.2 Rules

1. **Information test:** before adding any element, answer "what does this tell the reader?" If there is no answer, do not add it.
2. **Budget:** at most two decorative device types per section. Admin and data screens use none beyond status symbols and real metadata.
3. **Reality:** labels and numbers must be real data or real structure. Never invent codes, timestamps, or coordinates for atmosphere.
4. **Mobile first removal:** on small screens, drop annotations, registration marks, and optional metadata before dropping content.
5. **No eyebrow habit:** do not place a small uppercase label above every heading. Use one only where it names a real category.
6. **Typography only:** devices are built from type, borders, and simple shapes. Do not use illustrations, textures, or noise.
7. **Accessibility:** decorative marks are `aria-hidden="true"`; meaningful annotations have text equivalents.

---

## 12. Interaction and Motion

### 12.1 State matrix for all interactive elements

| State | Treatment | Notes |
|---|---|---|
| Hover | Fill changes to `--color-bg-selected` (or `--color-bg-hover` on raised rows); never the only way to reveal a function | Wrapped so touch devices do not get stuck hover |
| Focus-visible | 3px `--color-focus` outline, 2px offset (`:focus-visible`) | Never removed. Inside clipped containers use a negative offset |
| Active / pressed | Fill darkens (`--color-accent-hover` or `--color-bg-muted`); hard-shadow elements translate by their offset | Immediate (`--duration-instant`) |
| Disabled | Muted fill, disabled text, dashed border, no shadow | Not hidden; explains why when helpful |
| Loading | `aria-busy="true"`, stepped indicator, label with progress verb | Layout does not shift |
| Validation | Error border plus symbol plus message; success is silent unless the action completed | Message linked via `aria-describedby` |
| Selected | `--color-bg-selected` fill, or accent fill for controls; 4px accent bar for list items; plus a non-color signal | Same pattern in tabs, nav, rows, options |
| Success feedback | Toast or inline "Saved at 14:32" | Same verb as the triggering action |
| Error feedback | Inline alert or error toast; persists until dismissed | States what happened and how to fix it |

### 12.2 Motion scale

| Token | Duration | Use |
|---|---|---|
| `--duration-instant` | 80ms | Press and release, checkbox mark, switch thumb |
| `--duration-fast` | 140ms | Hover fills, tab changes, button color |
| `--duration-base` | 220ms | Dialog and drawer entry, accordion open, toast entry |
| `--duration-slow` | 360ms | Reserved for page-level changes. Rarely used |
| `--duration-blink` | 1000ms | Terminal cursor and loading indicator |

| Easing | Value | Use |
|---|---|---|
| `--ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | Default for hover, press, movement |
| `--ease-out` | `cubic-bezier(0, 0, 0.2, 1)` | Elements entering (dialogs, drawers, toasts) |
| `--ease-in` | `cubic-bezier(0.4, 0, 1, 1)` | Elements leaving |
| `--ease-step` | `steps(4, end)` | Retro progress and loading fills |

### 12.3 Motion rules

1. Motion answers a user action (open, close, press, confirm). Do not add ambient or entrance animations to sections or cards.
2. At most one orchestrated moment per page (for example the page-load reveal of the hero). It is optional and short.
3. Animate only `opacity`, `transform`, `background-color`, and `box-shadow`. Do not animate layout properties.
4. `prefers-reduced-motion: reduce` MUST remove all non-essential animation and transitions (base layer, 17.1). The state still changes; it just does so without movement.
5. Nothing essential depends on hover. Every hover affordance has a keyboard and touch equivalent.
6. Parallax, auto-playing carousels, and looping decorative animations are not part of this system.

### 12.4 Touch and keyboard parity

- Every interactive element is reachable and operable with a keyboard and with touch.
- Tooltips appear on focus as well as hover and never contain essential information or controls.
- Hover-only menus are not allowed; menus open on click or tap and Enter or Space.
- Drag interactions always have a button or keyboard alternative.

---

## 13. Responsive Design

### 13.1 Strategy

Mobile-first: base CSS is the mobile layout; `min-width` media queries add structure. Breakpoints (Section 9) mark layout changes: `md` introduces the 8-column grid and inline nav, `lg` introduces 12 columns and side navigation, `xl` increases margins. Desktop is not "mobile scaled up", and mobile is not "desktop shrunk": each viewport has its own arrangement.

### 13.2 By viewport

**Mobile (below 768px)**

- Single column. 4-column grid used only for small paired items (for example two badges or two metrics).
- Compact navigation with a labeled "Menu" button; primary action remains accessible.
- Controls are 44px tall, with at least 8px between adjacent targets. Buttons in an action group stack full-width.
- Body text 16px minimum. Reduce decorative density: drop annotations, registration marks, grid background on text-heavy regions, and optional metadata.
- Form fields are single column with labels above and 24px between fields.
- Tables use a sticky first column with horizontal scroll or the stacked-row pattern. Complex panels collapse into accordions or stacked sections.
- Dialogs become bottom sheets; drawers become full screen.
- Honor safe areas: `padding-inline` and `padding-bottom` with `env(safe-area-inset-*)` on fixed bars.

**Tablet (768px to 1023px)**

- 8-column grid. Two-column layouts for panels (4 + 4) and forms (label column optional).
- Inline navigation if five or fewer links; otherwise still the Menu pattern.
- Page margin 32px; section space 64px.
- Hero index card moves beside the headline only when there is room for a 28ch headline; otherwise stays below.
- Data tables show more columns before needing scroll; side filters collapse into a toolbar row.

**Desktop (1024px and up)**

- 12-column grid. Asymmetric compositions (8 + 4, 3 + 9) and multi-column editorial layouts.
- Side navigation for application layouts, technical panels at full width, wider tables.
- Content max width 1280px (`--container-wide`) or 1600px for data (`--container-data`); body text stays within 68 characters.
- Optional header metadata, hero annotations, and registration marks appear here.

### 13.3 Component behavior by viewport

| Component | Mobile | Tablet | Desktop |
|---|---|---|---|
| Header navigation | Collapses to Menu button and sheet | Inline (up to five links) or Menu | Inline plus optional metadata |
| Hero | Stacked; index card below; actions full width | Stacked or 8 + 4 if space allows | 8 + 4 with index card and annotations |
| Panels | One per row | Two per row | Three or four per row |
| Tables | Scroll with sticky first column, or stacked rows | Scroll if over six columns | Full width; sticky header optional |
| Forms | Single column, 44px controls | One or two columns | One or two columns with grouped fieldsets |
| Tabs | Horizontal scroll or `<select>` | Horizontal list | Horizontal list |
| Dialogs | Bottom sheet, buttons stacked | Centered dialog | Centered dialog |
| Drawers | Full screen | 28rem at the inline end | 28rem at the inline end |
| Toasts | Full width at bottom, above safe area | 24rem at the bottom end | 24rem at the bottom end |
| Footer | Single column | Brand plus two-column groups | 12-column layout |
| Terminal panels | Horizontal scroll; font 0.8125rem | Same | Full width |

### 13.4 Horizontal overflow rules

1. The page body MUST NOT scroll horizontally at any width from 320px up.
2. Wide content (tables, code, terminal output, wide figures) scrolls inside its own container, which is keyboard-focusable and visibly bordered.
3. Long identifiers (hashes, URLs) use `overflow-wrap: anywhere` in text, and scroll inside code blocks.
4. Test at 320px, 375px, 768px, 1024px, 1280px, and 1600px, plus 200% browser zoom.

---

## 14. Accessibility

The visual identity MUST NOT compromise accessibility. The target is **WCAG 2.2 level AA**.

| Area | Requirement |
|---|---|
| Contrast | Body and UI text 4.5:1 (large text, 24px or 18.66px bold, 3:1). Non-text UI (control borders, focus rings, selected indicators, chart marks) 3:1. Approved color pairs are listed in 4.6 |
| Semantic HTML | Use `<header>`, `<nav>`, `<main>`, `<section>` with headings, `<footer>`, `<button>`, `<a>`, `<table>`, `<dialog>`, `<fieldset>`. One `<h1>` per page and no skipped heading levels. Style headings by token, not by choosing a different level |
| Landmarks | One `<main>`; label repeated landmarks (`aria-label="Primary"`, `aria-label="Footer"`). Skip link as first focusable element |
| Keyboard | All functions work with the keyboard. Logical tab order matches visual order. Custom widgets follow ARIA Authoring Practices keys (tabs: arrows, Home, End; dialogs: Escape; menus: arrows and Escape) |
| Focus indicators | `:focus-visible` shows a 3px outline in `--color-focus` with a 2px offset, never removed. Focus is never obscured by sticky headers (use `scroll-padding-top` and inset outlines) |
| Forms | Every control has a programmatically associated `<label>`. Group related controls with `<fieldset>` and `<legend>`. Placeholders are hints, never labels. Mark optional fields with the word "Optional". Use `autocomplete` for common fields. Do not ask users to re-enter information already provided |
| ARIA | Use native elements first. Add ARIA only to express state or relationships: `aria-current`, `aria-expanded`, `aria-controls`, `aria-selected`, `aria-invalid`, `aria-describedby`, `aria-busy`, `aria-sort`. Do not add `role="button"` to links or the reverse |
| Screen-reader feedback | Toasts and confirmations use `role="status"` (polite). Errors that require attention use `role="alert"`. Form submission errors are collected in a summary that receives focus and links to each field |
| Reduced motion | Respect `prefers-reduced-motion: reduce` globally (17.1). No content depends on animation to be understood |
| Touch targets | Interactive targets are at least 24 by 24 CSS pixels (WCAG 2.5.8) with no overlap; this system uses 44px as the standard. Compact density only on fine pointers |
| Link and button labels | Names are meaningful out of context ("Download invoice PDF", not "Click here"). Icon-only buttons have `aria-label`. External links say so in text or an `aria-label` |
| Error identification and recovery | Errors name the field, say what is wrong, and say how to fix it. Prevent errors on destructive or financial actions with confirmation. Preserve user input after an error |
| Color independence | Status, selection, and validation always include text or a symbol and a shape change (bar, border, weight), not only color |
| Zoom and reflow | Content reflows at 320px and 400% zoom without two-dimensional scrolling, except for data tables, code, and terminals |
| Text spacing | Layouts tolerate user text-spacing overrides (line height 1.5, paragraph spacing 2em, letter spacing 0.12em) without loss of content |
| Time | No auto-dismissing message contains required information or an action; users can pause, extend, or dismiss timed messages |
| Dragging and pointer gestures | Provide single-pointer alternatives (buttons) for any drag, swipe, or multi-finger gesture |
| Language | `lang` set on `<html>`; changes in language are marked |

---

## 15. Content and Information Hierarchy

### 15.1 Levels of information

| Level | What it is | Styling |
|---|---|---|
| Primary | The thing the person came for: page title, the main data, the key value | Archivo headings or `--type-numeric-lg`; `--color-text-primary`; most space around it |
| Secondary | Explanations and supporting content | `--type-body`, `--color-text-primary` or `--color-text-secondary` where contrast permits |
| Supporting metadata | Timestamps, owners, counts, units | `--type-meta` or `--type-small`, `--color-text-secondary`, placed after or beside the primary |
| Technical details | IDs, versions, hashes, paths, code | Mono, smaller, grouped in a `<dl>` or a terminal block |
| Warnings and errors | Things that block or risk the task | Status tokens with symbol, border, and a first sentence in semibold. Placed next to the thing they affect |
| Primary action | The next step | Primary button. One per region. Right of or below the content it acts on |
| Secondary action | Alternatives | Secondary or tertiary buttons grouped with the primary, lower emphasis |

### 15.2 How the tools combine

- **Typography** sets order: size and weight establish levels; mono sets data apart from prose.
- **Spacing** sets grouping: related items are close, unrelated items are far.
- **Borders** set structure: 3px for regions, 2px for containers, 1px for items.
- **Alignment** sets scan paths: left-aligned text, numbers right-aligned in columns, labels aligned with their controls.
- **Accents** mark exceptions: green for the selected or positive item, orange for the annotated item. If everything is colored, nothing is.

### 15.3 Scan test

The page passes when a reader can, in five seconds, (1) tell what the page is, (2) find the main content, (3) identify the primary action, and (4) see any warning, **without reading body text**. Squint test: blur the page; the hierarchy should still be visible as shapes of dark headings, boxed regions, and one accent.

### 15.4 Writing rules for interface text

1. Sentence case everywhere. Plain verbs. No filler.
2. Buttons: specific verb plus object ("Save changes", "Create record"). The same action keeps the same name in the button, the toast ("Saved"), and the log.
3. Labels name things by what users understand, not by how the system is built.
4. Errors say what happened and how to fix it; they do not apologize or blame. Empty states say what is empty and what to do next.
5. Numbers, dates, and times use a consistent format in mono wherever they are data; units are always shown.

---

## 16. CSS Implementation Guidelines

### 16.1 Architecture

Use cascade layers so that order, not specificity, decides conflicts.

```css
@layer tokens, base, layout, components, utilities;
@import url("tokens.css") layer(tokens);
```

| Layer | Contents |
|---|---|
| `tokens` | Section 9 only. No selectors other than `:root`, `[data-density]`, `.ds-inverse` |
| `base` | Reset, element defaults (headings, links, forms), focus ring, reduced motion, keyframes |
| `layout` | Container, grid, stack, cluster, section, gridded background |
| `components` | One block per component. Components do not set their own outer margins |
| `utilities` | A small, fixed set of single-purpose helpers (visually hidden, responsive visibility) |

If layers are not available in the target environment, keep the same order of files and keep selectors at single-class specificity.

### 16.2 Naming conventions

- Prefix: `ds-`. Block: `.ds-panel`. Element: `.ds-panel__header`. Modifier: `.ds-panel--highlight`.
- **State is expressed with attributes, not classes**: `[aria-current="page"]`, `[aria-selected="true"]`, `[aria-invalid="true"]`, `[aria-busy="true"]`, `[aria-expanded]`, `[disabled]`, `[data-open]`. This keeps styling and accessibility from drifting apart.
- Component-scoped custom properties use a short component prefix: `--btn-bg`, `--badge-fg`, `--alert-border`, `--toast-status`. They are assigned from semantic tokens and consumed inside the component only.
- Layout helpers are named by pattern, not by appearance: `.ds-stack`, `.ds-cluster`, `.ds-grid`.

### 16.3 Token usage

1. Use semantic tokens in components (`--color-text-secondary`, never `--palette-ink-500`).
2. Use composite type tokens with the `font` shorthand: `font: var(--type-body);`. Add `letter-spacing` separately.
3. Use logical properties (`padding-inline`, `margin-block`, `inset-inline-start`, `border-inline-start`, `inline-size`) so layouts adapt to right-to-left languages.
4. Do not use raw values for color, spacing, border width, radius, shadow, duration, or z-index.
5. Allowed literals: `0`, `100%`, `auto`, `-1` multipliers in `calc()`, `env()` safe-area insets, breakpoint lengths inside `@media`, transform offsets that mirror a hard-shadow offset (`translate(3px, 3px)` for a 3px shadow), the `1px` sizing of the visually-hidden helper, and component-intrinsic dimensions (checkbox, switch, icon, and mark sizes in `rem`).

### 16.4 Component composition

- **Layout owns the space between components; components own the space inside.** Use `.ds-stack` or `.ds-grid` gaps rather than margins on component roots.
- Compose, do not clone. A "card with an action" is a `.ds-panel` with a `.ds-panel__footer`, not a new `.ds-card-action` class.
- Variants change custom properties (`--btn-bg`) or add a single modifier class. A modifier never redefines the whole component.
- Slot structure is fixed: header, body, footer. Components should not depend on the DOM order of unrelated siblings.

### 16.5 Responsive styling

- Mobile-first: base rules are the smallest layout; use `@media (min-width: ...)` to add. The only `max-width` queries are for "below `md`" component variants (stacked tables, bottom-sheet dialogs), written with `47.99rem`.
- Grid children set `min-width: 0`. Scrolling containers have their own overflow.
- Use `dvh` (not `vh`) for full-height layouts and `env(safe-area-inset-*)` on fixed bars.
- Use `clamp()` for type (already in tokens); do not add font-size overrides in breakpoints.

### 16.6 Focus and interaction

- A single global `:focus-visible` rule (17.1) styles focus. Components only adjust the offset when clipping would hide the ring.
- Never write `outline: none` without a visible replacement. The one allowed pattern is an interactive panel that moves its ring to the container with `:has(:focus-visible)`.
- Hover rules must not hide functionality and must have an equivalent for keyboard and touch.

### 16.7 Reduced motion

A global rule in the `base` layer (17.1) shortens all animations and transitions to effectively zero and stops loops. Do not add per-component reduced-motion rules unless a component needs a different static fallback.

### 16.8 Inverse surfaces

Apply `.ds-inverse` (or `.ds-terminal`) to a container. Semantic tokens rebind inside it, so buttons, badges, tables, and forms work without extra CSS. Do not hard-code light-on-dark colors in components.

### 16.9 Avoiding duplicated styles and drift

- One definition per pattern. If a style appears in three components, promote it to a shared block or token.
- Border widths: only the four tokens. Radii: only the four tokens.
- Review gate: run these checks in CI or before merge. Each should return no results.

```bash
# raw hex outside tokens.css
grep -rEn "#[0-9a-fA-F]{3,8}\b" styles --include=*.css --exclude=tokens.css
# blurred shadows (any shadow with a blur value)
grep -rEn "box-shadow:[^;]*[0-9]px [0-9]+px [1-9][0-9]*px" styles --include=*.css
# focus outline removal
grep -rEn "outline:\s*(none|0)" styles --include=*.css
# !important outside reduced motion
grep -rEn "!important" styles --include=*.css
```

---

## 17. Component Implementation Examples

The examples are consistent with one another and use only tokens from Section 9. They show the visual language; they are not a complete site. Placeholder text is deliberately neutral.

### 17.1 Base layer: reset, element defaults, focus, reduced motion

Tokens are defined once in Section 9 (`tokens.css`).

```css
@layer base {
  *, *::before, *::after { box-sizing: border-box; }

  html {
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
    scroll-padding-top: 4.5rem; /* clears the sticky header */
  }

  body {
    margin: 0;
    min-block-size: 100dvh;
    background-color: var(--color-bg-page);
    color: var(--color-text-primary);
    font: var(--type-body);
    -webkit-font-smoothing: antialiased;
  }

  h1, h2, h3, h4, p, ul, ol, dl, dd, figure { margin: 0; }
  h1, h2, h3, h4 { text-wrap: balance; }
  p { max-inline-size: var(--measure-body); text-wrap: pretty; }

  /* Headings map to type tokens; the .ds-type-* classes apply the same look to any element */
  .ds-type-display { font: var(--type-display); letter-spacing: var(--tracking-display); max-inline-size: 20ch; }
  h1, .ds-type-title { font: var(--type-title); letter-spacing: var(--tracking-heading); }
  h2, .ds-type-section { font: var(--type-section); letter-spacing: var(--tracking-heading); }
  h3, .ds-type-subsection { font: var(--type-subsection); letter-spacing: var(--tracking-subheading); }
  h4 { font: var(--type-heading-4); }

  .ds-lead { font: var(--type-body-lg); max-inline-size: var(--measure-lead); }
  .ds-small { font: var(--type-small); }
  .ds-meta { font: var(--type-meta); letter-spacing: var(--tracking-meta); color: var(--color-text-secondary); }
  .ds-label {
    font: var(--type-label-tech);
    letter-spacing: var(--tracking-label);
    text-transform: uppercase;
    color: var(--color-text-secondary);
  }
  .ds-numeric { font: var(--type-numeric); font-variant-numeric: tabular-nums; }

  a {
    color: var(--color-text-link);
    text-decoration-thickness: var(--border-default);
    text-underline-offset: 0.2em;
  }
  a:hover { color: var(--color-text-link-hover); background-color: var(--color-bg-selected); }

  code, kbd, samp { font-family: var(--font-mono); font-size: 0.9em; }
  :not(pre) > code, kbd {
    padding: 0.1em 0.35em;
    background-color: var(--color-bg-surface);
    border: var(--border-hairline) solid var(--color-border-subtle);
    border-radius: var(--radius-sm);
  }
  kbd { border-block-end-width: var(--border-default); border-block-end-color: var(--color-border-default); }

  hr { margin-block: var(--space-8); border: 0; border-block-start: var(--border-default) solid var(--color-border-default); }
  blockquote { margin: 0; padding-inline-start: var(--space-4); border-inline-start: var(--border-strong) solid var(--color-border-default); }

  img, svg, video { display: block; max-inline-size: 100%; block-size: auto; }
  button, input, select, textarea { font: inherit; color: inherit; }

  :focus-visible {
    outline: var(--focus-ring-width) solid var(--color-focus);
    outline-offset: var(--focus-ring-offset);
  }
  ::selection { background-color: var(--color-annotation); color: var(--color-text-primary); }

  @keyframes ds-blink { 50% { opacity: 0; } }

  /* Reduced motion: state changes remain, movement and loops stop */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
}

@layer utilities {
  .ds-visually-hidden {
    position: absolute; inline-size: 1px; block-size: 1px; margin: -1px; padding: 0;
    overflow: hidden; clip-path: inset(50%); white-space: nowrap; border: 0;
  }
  .ds-only-lg { display: none; }
  @media (min-width: 64rem) { .ds-only-lg { display: revert; } }
}
```

### 17.2 Page container, grid, stack, section

```css
@layer layout {
  .ds-container {
    inline-size: 100%;
    max-inline-size: var(--container-wide);
    margin-inline: auto;
    padding-inline: var(--page-margin);
  }
  .ds-container--narrow { max-inline-size: var(--container-narrow); }
  .ds-container--data   { max-inline-size: var(--container-data); }

  .ds-section { padding-block: var(--section-space); }
  .ds-section + .ds-section { border-block-start: var(--border-strong) solid var(--color-border-default); }

  /* Grid: children are full width by default; set spans per breakpoint with custom properties.
     Mobile = 4 columns, tablet = 8, desktop = 12. */
  .ds-grid {
    display: grid;
    grid-template-columns: repeat(var(--grid-columns), minmax(0, 1fr));
    gap: var(--space-6) var(--grid-gap);
  }
  .ds-grid > * { grid-column: span var(--span, var(--grid-columns)); min-inline-size: 0; }
  @media (min-width: 48rem) {
    .ds-grid > * { grid-column: span var(--span-md, var(--span, var(--grid-columns))); }
  }
  @media (min-width: 64rem) {
    .ds-grid > * { grid-column: span var(--span-lg, var(--span-md, var(--span, var(--grid-columns)))); }
  }

  .ds-stack   { display: flex; flex-direction: column; gap: var(--stack-space, var(--space-4)); }
  .ds-cluster { display: flex; flex-wrap: wrap; align-items: center; gap: var(--cluster-space, var(--space-3)); }

  /* Understated technical-paper grid. These are hairline rules, not a color gradient.
     Put it on page or hero backgrounds only. Panels and inputs keep a solid fill that hides it. */
  .ds-gridded {
    background-color: var(--color-bg-page);
    background-image:
      linear-gradient(var(--color-grid-major) var(--border-hairline), transparent var(--border-hairline)),
      linear-gradient(90deg, var(--color-grid-major) var(--border-hairline), transparent var(--border-hairline)),
      linear-gradient(var(--color-grid-minor) var(--border-hairline), transparent var(--border-hairline)),
      linear-gradient(90deg, var(--color-grid-minor) var(--border-hairline), transparent var(--border-hairline));
    background-size:
      var(--grid-size-major) var(--grid-size-major),
      var(--grid-size-major) var(--grid-size-major),
      var(--grid-size-minor) var(--grid-size-minor),
      var(--grid-size-minor) var(--grid-size-minor);
  }
}
```

Usage: `<div class="ds-grid"><section style="--span-md: 4; --span-lg: 4">…</section></div>` gives one panel per row on mobile, two per row on tablet (4 of 8 columns), three per row on desktop (4 of 12). Set a span at each breakpoint where it should change; unset breakpoints inherit the previous one.

### 17.3 Header and navigation

```html
<a class="ds-skip-link" href="#main">Skip to main content</a>
<header class="ds-header" data-open="false">
  <div class="ds-container ds-header__inner">
    <a class="ds-header__brand" href="/">
      <span class="ds-header__mark" aria-hidden="true">P</span>
      <span>Project name</span>
    </a>
    <button class="ds-header__toggle" type="button" aria-expanded="false" aria-controls="primary-nav">Menu</button>
    <nav class="ds-nav" id="primary-nav" aria-label="Primary">
      <a class="ds-nav__link" href="/overview" aria-current="page">Overview</a>
      <a class="ds-nav__link" href="/records">Records</a>
      <a class="ds-nav__link" href="/reference">Reference</a>
    </nav>
    <p class="ds-header__meta ds-meta">v1.0.0</p>
  </div>
</header>
```

```css
@layer components {
  .ds-skip-link {
    position: absolute; z-index: var(--z-tooltip);
    inset-inline-start: var(--space-4); inset-block-start: var(--space-2);
    padding: var(--space-3) var(--space-4);
    background-color: var(--color-bg-raised); color: var(--color-text-primary);
    border: var(--border-default) solid var(--color-border-default);
    font: var(--type-button);
    transform: translateY(-200%);
  }
  .ds-skip-link:focus-visible { transform: none; }

  .ds-header {
    position: sticky; inset-block-start: 0; z-index: var(--z-sticky);
    padding-block-start: env(safe-area-inset-top, 0px);
    background-color: var(--color-bg-page);
    border-block-end: var(--border-strong) solid var(--color-border-default);
  }
  .ds-header__inner { display: flex; align-items: stretch; justify-content: space-between; gap: var(--space-4); min-block-size: 3.5rem; }

  .ds-header__brand {
    display: flex; align-items: center; gap: var(--space-3);
    color: var(--color-text-primary); text-decoration: none;
    font: var(--font-weight-extrabold) 1.125rem/1 var(--font-display);
    letter-spacing: var(--tracking-subheading);
  }
  .ds-header__brand:hover { background-color: transparent; color: var(--color-text-primary); }
  .ds-header__mark {
    display: grid; place-items: center; inline-size: 2.25rem; block-size: 2.25rem;
    background-color: var(--color-bg-inverse); color: var(--color-text-inverse);
    font: var(--type-meta); font-weight: var(--font-weight-semibold);
  }

  .ds-header__toggle {
    align-self: center; min-block-size: var(--control-height); padding-inline: var(--space-4);
    background-color: var(--color-bg-raised);
    border: var(--border-default) solid var(--color-border-default); border-radius: var(--radius-sm);
    font: var(--type-button); cursor: pointer;
  }
  .ds-header__toggle::before { content: "≡" / ""; margin-inline-end: var(--space-2); }
  .ds-header__toggle:hover, .ds-header__toggle[aria-expanded="true"] { background-color: var(--color-bg-selected); }

  /* Mobile: nav is a sheet directly under the header */
  .ds-nav {
    display: none; position: absolute; inset-inline: 0; inset-block-start: 100%;
    background-color: var(--color-bg-page);
    border-block-end: var(--border-strong) solid var(--color-border-default);
  }
  .ds-header[data-open="true"] .ds-nav { display: block; }
  .ds-nav__link {
    display: flex; align-items: center; min-block-size: 3rem; padding-inline: var(--page-margin);
    color: var(--color-text-primary); text-decoration: none;
    font: var(--type-button); letter-spacing: var(--tracking-button);
    border-block-start: var(--border-hairline) solid var(--color-border-subtle);
  }
  .ds-nav__link:hover { background-color: var(--color-bg-selected); color: var(--color-text-primary); }
  .ds-nav__link[aria-current="page"] {
    font-weight: var(--font-weight-extrabold);
    box-shadow: inset var(--border-heavy) 0 0 var(--color-accent-graphic); /* bar on the left edge */
  }
  .ds-nav__link:focus-visible { outline-offset: calc(var(--focus-ring-width) * -1); }
  .ds-header__meta { display: none; align-self: center; }
}

@media (min-width: 48rem) {
  .ds-header__toggle { display: none; }
  .ds-nav { display: flex; position: static; flex: 1; margin-inline-start: var(--space-6); background-color: transparent; border: 0; }
  .ds-nav__link { min-block-size: 0; padding-inline: var(--space-4); border: 0; }
  .ds-nav__link[aria-current="page"] {
    box-shadow: inset 0 calc(var(--border-heavy) * -1) 0 var(--color-accent-graphic); /* bar on the bottom edge */
  }
}
@media (min-width: 64rem) {
  .ds-header__meta { display: block; margin-inline-start: auto; }
}
```

```js
const header = document.querySelector('.ds-header');
const toggle = header.querySelector('.ds-header__toggle');
const setOpen = (open) => {
  header.dataset.open = String(open);
  toggle.setAttribute('aria-expanded', String(open));
};
toggle.addEventListener('click', () => setOpen(toggle.getAttribute('aria-expanded') !== 'true'));
header.addEventListener('keydown', (e) => { if (e.key === 'Escape') { setOpen(false); toggle.focus(); } });
header.querySelectorAll('.ds-nav__link').forEach((a) => a.addEventListener('click', () => setOpen(false)));
```

### 17.4 Editorial heading section (hero)

```html
<section class="ds-hero ds-gridded" aria-labelledby="hero-title">
  <div class="ds-container ds-grid">
    <div class="ds-stack" style="--span-lg: 8; --stack-space: var(--space-6)">
      <p class="ds-label">Reference, revision 2.1</p>
      <h1 id="hero-title" class="ds-type-display">Page title that states the subject</h1>
      <p class="ds-lead">One or two sentences that explain what this page or product is for.</p>
      <div class="ds-actions">
        <a class="ds-btn ds-btn--primary" href="#start">Get started</a>
        <a class="ds-btn" href="#guide">Read the guide</a>
      </div>
    </div>

    <aside class="ds-panel ds-hero__index" style="--span-lg: 4" aria-labelledby="index-title">
      <header class="ds-panel__header">
        <h2 id="index-title" class="ds-panel__title">Index</h2>
        <span class="ds-panel__id">Rev 2.1</span>
      </header>
      <dl class="ds-spec ds-panel__body">
        <div class="ds-spec__row"><dt>Status</dt><dd>Stable</dd></div>
        <div class="ds-spec__row"><dt>Updated</dt><dd>2026-10-14</dd></div>
        <div class="ds-spec__row"><dt>Sections</dt><dd>12</dd></div>
      </dl>
    </aside>
  </div>
</section>
```

```css
@layer components {
  .ds-hero {
    padding-block: var(--section-space);
    border-block: var(--border-strong) solid var(--color-border-default);
  }
  .ds-hero .ds-grid > * { align-self: start; }

  /* Definition list used in index cards and technical panels */
  .ds-spec { display: grid; }
  .ds-spec__row {
    display: flex; justify-content: space-between; gap: var(--space-4);
    padding-block: var(--space-2);
    border-block-end: var(--border-hairline) solid var(--color-border-subtle);
  }
  .ds-spec__row:last-child { border-block-end: 0; }
  .ds-spec dt { font: var(--type-small); color: var(--color-text-secondary); }
  .ds-spec dd { margin: 0; font: var(--type-meta); text-align: end; }
}
```

### 17.5 Technical panel (title block) and variants

```html
<section class="ds-panel" aria-labelledby="panel-1">
  <header class="ds-panel__header">
    <h2 id="panel-1" class="ds-panel__title">Panel title</h2>
    <span class="ds-panel__id">Record 0412</span>
  </header>
  <div class="ds-panel__body ds-stack">
    <p>Content that belongs to the panel's subject.</p>
  </div>
  <footer class="ds-panel__footer">
    <a class="ds-btn" href="#details">View details</a>
  </footer>
</section>
```

```css
@layer components {
  .ds-panel {
    position: relative;
    background-color: var(--color-bg-raised);
    border: var(--border-default) solid var(--color-border-default);
    border-radius: var(--radius-none);
  }
  .ds-panel__header {
    display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: stretch;
    background-color: var(--color-bg-surface);
    border-block-end: var(--border-default) solid var(--color-border-default);
  }
  .ds-panel__title { padding: var(--space-3) var(--space-4); font: var(--type-heading-4); }
  .ds-panel__id {
    display: flex; align-items: center; padding-inline: var(--space-4);
    border-inline-start: var(--border-default) solid var(--color-border-default);
    font: var(--type-label-tech); letter-spacing: var(--tracking-label);
    text-transform: uppercase; color: var(--color-text-secondary); white-space: nowrap;
  }
  .ds-panel__body { padding: var(--panel-padding); }
  .ds-panel__footer {
    display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-3);
    padding: var(--space-3) var(--panel-padding);
    border-block-start: var(--border-hairline) solid var(--color-border-subtle);
  }

  /* Highlighted: the one selected or recommended panel in a group */
  .ds-panel--highlight { box-shadow: var(--shadow-accent); }
  .ds-panel--highlight > .ds-panel__header { background-color: var(--color-bg-selected); }

  /* Warning: left bar, tinted header, label in the id cell ("! Warning") */
  .ds-panel--warning { border-inline-start: calc(var(--border-heavy) * 2) solid var(--color-warning-border); }
  .ds-panel--warning > .ds-panel__header { background-color: var(--color-warning-bg); }
  .ds-panel--warning .ds-panel__id { color: var(--color-warning-text); }

  /* Interactive: the title link is stretched over the whole panel */
  .ds-panel--interactive {
    transition: transform var(--duration-fast) var(--ease-standard), box-shadow var(--duration-fast) var(--ease-standard);
  }
  .ds-panel--interactive:hover { transform: translate(-2px, -2px); box-shadow: var(--shadow-hard-md); }
  .ds-panel--interactive:active { transform: none; box-shadow: none; }
  .ds-panel__link { color: inherit; text-decoration: none; }
  .ds-panel__link:hover { background-color: transparent; color: inherit; }
  .ds-panel__link::after { content: ""; position: absolute; inset: 0; }
  .ds-panel__link:focus-visible { outline: none; } /* ring is drawn on the panel instead */
  .ds-panel--interactive:has(.ds-panel__link:focus-visible) {
    outline: var(--focus-ring-width) solid var(--color-focus);
    outline-offset: var(--focus-ring-offset);
  }

  /* Empty state: dashed border, solid page-colored fill */
  .ds-panel--empty { background-color: var(--color-bg-page); border-style: dashed; }
  .ds-panel--empty .ds-panel__body { display: grid; gap: var(--space-3); justify-items: start; }
}
```

### 17.6 Buttons

```html
<div class="ds-actions">
  <button class="ds-btn ds-btn--primary" type="button">Save changes</button>
  <button class="ds-btn" type="button">Cancel</button>
  <button class="ds-btn ds-btn--text" type="button">Learn more</button>
  <button class="ds-btn ds-btn--danger" type="button">Delete record</button>
  <button class="ds-btn ds-btn--primary" type="button" aria-busy="true">Saving</button>
  <button class="ds-btn" type="button" disabled>Unavailable</button>
</div>
```

```css
@layer components {
  .ds-btn {
    --btn-bg: var(--color-bg-raised);
    --btn-fg: var(--color-text-primary);
    --btn-fg-hover: var(--btn-fg);
    --btn-border: var(--color-border-default);
    --btn-shadow: none;
    --btn-bg-hover: var(--color-bg-selected);
    --btn-bg-active: var(--color-bg-muted);

    display: inline-flex; align-items: center; justify-content: center; gap: var(--space-2);
    min-block-size: var(--control-height);
    padding-inline: var(--space-5);
    background-color: var(--btn-bg); color: var(--btn-fg);
    border: var(--border-default) solid var(--btn-border);
    border-radius: var(--radius-sm);
    box-shadow: var(--btn-shadow);
    font: var(--type-button); letter-spacing: var(--tracking-button);
    text-align: center; text-decoration: none; cursor: pointer;
    transition:
      background-color var(--duration-fast) var(--ease-standard),
      transform var(--duration-instant) var(--ease-standard),
      box-shadow var(--duration-instant) var(--ease-standard);
  }
  .ds-btn:hover  { background-color: var(--btn-bg-hover); color: var(--btn-fg-hover); }
  .ds-btn:active { background-color: var(--btn-bg-active); color: var(--btn-fg-hover); }

  .ds-btn--primary {
    --btn-bg: var(--color-bg-inverse);
    --btn-fg: var(--color-text-inverse);
    --btn-fg-hover: var(--color-text-on-accent);
    --btn-shadow: var(--shadow-accent);
    --btn-bg-hover: var(--color-accent);
    --btn-bg-active: var(--color-accent-hover);
  }
  .ds-btn--primary:active { transform: translate(3px, 3px); box-shadow: none; }

  .ds-btn--danger {
    --btn-bg: var(--color-error-solid);
    --btn-fg: var(--color-text-inverse);
    --btn-bg-hover: var(--color-error-solid-hover);
    --btn-bg-active: var(--color-error-solid-hover);
  }

  .ds-btn--text {
    --btn-bg: transparent; --btn-border: transparent;
    padding-inline: var(--space-3);
    text-decoration: underline; text-decoration-thickness: var(--border-default); text-underline-offset: 0.2em;
  }

  .ds-btn--icon { padding-inline: 0; inline-size: var(--control-height); }
  .ds-btn--icon svg { inline-size: 1.25rem; block-size: 1.25rem; }

  /* Disabled (after variants so it wins at equal specificity) */
  .ds-btn:disabled, .ds-btn[aria-disabled="true"] {
    --btn-bg: var(--color-bg-muted); --btn-fg: var(--color-text-disabled); --btn-border: var(--color-border-subtle);
    --btn-shadow: none; --btn-bg-hover: var(--color-bg-muted); --btn-bg-active: var(--color-bg-muted);
    border-style: dashed; cursor: not-allowed; transform: none; text-decoration: none;
  }
  .ds-btn--text:disabled, .ds-btn--text[aria-disabled="true"] {
    --btn-bg: transparent; --btn-bg-hover: transparent; --btn-bg-active: transparent; --btn-border: transparent;
  }

  /* Loading: constant width, blinking square, no pointer events. Change the label to a progress verb. */
  .ds-btn[aria-busy="true"] { pointer-events: none; }
  .ds-btn[aria-busy="true"]::after {
    content: ""; inline-size: 0.75em; block-size: 0.75em; background-color: currentColor;
    animation: ds-blink var(--duration-blink) steps(1, end) infinite;
  }

  /* Button groups: stacked and full width on mobile, inline from 30rem */
  .ds-actions { display: grid; gap: var(--space-3); }
  .ds-actions > .ds-btn { inline-size: 100%; }
}
@media (min-width: 30rem) {
  .ds-actions { display: flex; flex-wrap: wrap; }
  .ds-actions > .ds-btn { inline-size: auto; }
}
```

### 17.7 Form field, select, checkbox, switch

```html
<div class="ds-field">
  <label class="ds-field__label" for="f-name">Display name <span class="ds-field__hint">Optional</span></label>
  <input class="ds-input" id="f-name" name="name" type="text" autocomplete="name"
         aria-describedby="f-name-help f-name-error" aria-invalid="true">
  <p class="ds-field__help" id="f-name-help">Shown on your records. Use 3 to 30 characters.</p>
  <p class="ds-field__error" id="f-name-error">Enter at least 3 characters.</p>
</div>

<label class="ds-choice"><input class="ds-check" type="checkbox" name="notify"> Send me a summary</label>
<label class="ds-choice"><input class="ds-switch" type="checkbox" role="switch" name="sync"> Sync automatically</label>
```

```css
@layer components {
  .ds-field { display: grid; gap: var(--space-2); max-inline-size: 36rem; }
  .ds-field__label { font: var(--type-label-ui); }
  .ds-field__hint { margin-inline-start: var(--space-2); font: var(--type-small); color: var(--color-text-secondary); }
  .ds-field__help { font: var(--type-small); color: var(--color-text-secondary); }
  .ds-field__error { font: var(--type-small); font-weight: var(--font-weight-semibold); color: var(--color-error-text); }
  .ds-field__error::before { content: "✕ " / ""; } /* symbol is decorative; the message carries the meaning */

  .ds-input, .ds-select, .ds-textarea {
    inline-size: 100%; min-block-size: var(--control-height);
    padding: var(--space-2) var(--space-4);
    background-color: var(--color-bg-raised); color: var(--color-text-primary);
    border: var(--border-default) solid var(--color-border-default); border-radius: var(--radius-sm);
    font: var(--type-body);
    transition: box-shadow var(--duration-fast) var(--ease-standard);
  }
  .ds-textarea { min-block-size: 6rem; resize: vertical; }
  .ds-input::placeholder, .ds-textarea::placeholder { color: var(--color-text-secondary); opacity: 1; }
  .ds-input:hover, .ds-select:hover, .ds-textarea:hover {
    box-shadow: inset 0 0 0 var(--border-hairline) var(--color-border-default); /* border reads 3px */
  }
  .ds-input[readonly], .ds-textarea[readonly] { background-color: var(--color-bg-surface); }
  .ds-input[aria-invalid="true"], .ds-select[aria-invalid="true"], .ds-textarea[aria-invalid="true"] {
    border-color: var(--color-error-border);
    box-shadow: inset 0 0 0 var(--border-hairline) var(--color-error-border);
  }
  .ds-input:disabled, .ds-select:disabled, .ds-textarea:disabled {
    background-color: var(--color-bg-muted); color: var(--color-text-disabled);
    border-style: dashed; border-color: var(--color-border-subtle); box-shadow: none; cursor: not-allowed;
  }

  /* Select caret. The only raw color in the system: SVG data URIs cannot read CSS variables (%231C1B17 = ink-900). */
  .ds-select {
    appearance: none; padding-inline-end: var(--space-10);
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' fill='none' stroke='%231C1B17' stroke-width='2'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right var(--space-4) center; background-size: 0.75rem 0.5rem;
  }

  /* Choice rows: the whole row is the 44px target */
  .ds-choice { display: flex; align-items: center; gap: var(--space-3); min-block-size: var(--control-height); font: var(--type-body); cursor: pointer; }
  .ds-check, .ds-radio {
    appearance: none; flex: none; display: inline-grid; place-content: center;
    inline-size: 1.5rem; block-size: 1.5rem; margin: 0;
    background-color: var(--color-bg-raised);
    border: var(--border-default) solid var(--color-border-default); border-radius: var(--radius-sm);
    cursor: pointer;
  }
  .ds-radio { border-radius: var(--radius-full); }
  .ds-check::before, .ds-radio::before {
    content: ""; inline-size: 0.75rem; block-size: 0.75rem;
    background-color: var(--color-bg-page);
    transform: scale(0); transition: transform var(--duration-instant) var(--ease-standard);
  }
  .ds-check::before { clip-path: polygon(14% 44%, 0 65%, 50% 100%, 100% 16%, 80% 0%, 43% 62%); }
  .ds-radio::before { border-radius: var(--radius-full); }
  .ds-check:checked, .ds-radio:checked { background-color: var(--color-accent); }
  .ds-check:checked::before, .ds-radio:checked::before { transform: scale(1); }
  .ds-check:indeterminate { background-color: var(--color-accent); }
  .ds-check:indeterminate::before { clip-path: none; block-size: var(--border-default); transform: scale(1); }
  .ds-check:disabled, .ds-radio:disabled, .ds-switch:disabled {
    background-color: var(--color-bg-muted); border-style: dashed; border-color: var(--color-border-subtle); cursor: not-allowed;
  }

  /* Switch: 48 x 28 track, square thumb. Pair with a visible label. */
  .ds-switch {
    appearance: none; flex: none; position: relative; inline-size: 3rem; block-size: 1.75rem; margin: 0;
    background-color: var(--color-bg-muted);
    border: var(--border-default) solid var(--color-border-default); border-radius: var(--radius-sm);
    cursor: pointer; transition: background-color var(--duration-fast) var(--ease-standard);
  }
  .ds-switch::before {
    content: ""; position: absolute; inset-block: var(--border-default); inset-inline-start: var(--border-default);
    inline-size: 1.125rem; background-color: var(--color-border-default);
    transition: transform var(--duration-fast) var(--ease-standard);
  }
  .ds-switch:checked { background-color: var(--color-accent); }
  .ds-switch:checked::before { background-color: var(--color-text-on-accent); transform: translateX(1.375rem); }
}
```

### 17.8 Data table

```html
<div class="ds-table-wrap" role="region" aria-labelledby="t1-caption" tabindex="0">
  <table class="ds-table ds-table--stack">
    <caption id="t1-caption" class="ds-table__caption">Records <span class="ds-meta">3 rows</span></caption>
    <thead>
      <tr>
        <th scope="col">ID</th>
        <th scope="col">Name</th>
        <th scope="col">Status</th>
        <th scope="col" class="ds-table__num">Amount</th>
        <th scope="col">Updated</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <th scope="row">REC-0412</th>
        <td data-label="Name">Sample item</td>
        <td data-label="Status"><span class="ds-badge ds-badge--success">Complete</span></td>
        <td data-label="Amount" class="ds-table__num">1,250.00</td>
        <td data-label="Updated" class="ds-table__id">2026-10-14 09:30</td>
      </tr>
      <tr aria-selected="true">
        <th scope="row">REC-0413</th>
        <td data-label="Name">Another item</td>
        <td data-label="Status"><span class="ds-badge ds-badge--warning">Needs review</span></td>
        <td data-label="Amount" class="ds-table__num">86.50</td>
        <td data-label="Updated" class="ds-table__id">2026-10-14 11:05</td>
      </tr>
    </tbody>
  </table>
</div>
```

```css
@layer components {
  .ds-table-wrap {
    overflow-x: auto;
    background-color: var(--color-bg-raised);
    border: var(--border-default) solid var(--color-border-default);
    scrollbar-color: var(--color-border-default) var(--color-bg-surface);
  }
  .ds-table { inline-size: 100%; min-inline-size: 40rem; border-collapse: collapse; font: var(--type-body); }
  [data-density="compact"] .ds-table { font: var(--type-small); }

  .ds-table__caption {
    padding: var(--space-3) var(--cell-padding-x); text-align: start; font: var(--type-heading-4);
    border-block-end: var(--border-default) solid var(--color-border-default);
  }
  .ds-table :where(th, td) {
    padding: var(--cell-padding-y) var(--cell-padding-x);
    text-align: start; vertical-align: top;
    border-block-end: var(--border-hairline) solid var(--color-border-subtle);
  }
  .ds-table tbody tr:last-child :where(th, td) { border-block-end: 0; }

  /* Header: technical label style. For a sticky header, give the wrapper a max-block-size so it scrolls. */
  .ds-table thead th {
    position: sticky; inset-block-start: 0;
    background-color: var(--color-bg-surface);
    font: var(--type-label-tech); letter-spacing: var(--tracking-label); text-transform: uppercase;
    white-space: nowrap;
    border-block-end: var(--border-default) solid var(--color-border-default);
  }
  .ds-table tbody th { font: var(--type-meta); font-weight: var(--font-weight-medium); white-space: nowrap; }

  /* Modifiers come after the generic cell rules */
  .ds-table__num { text-align: end; font: var(--type-numeric); font-variant-numeric: tabular-nums; white-space: nowrap; }
  .ds-table__id  { font: var(--type-meta); white-space: nowrap; }

  .ds-table tbody tr:hover { background-color: var(--color-bg-hover); }
  .ds-table tbody tr[aria-selected="true"] {
    background-color: var(--color-bg-selected);
    box-shadow: inset var(--border-heavy) 0 0 var(--color-accent-graphic);
  }

  /* Sticky first column for wide tables that scroll */
  .ds-table--sticky-col tbody th:first-child {
    position: sticky; inset-inline-start: 0;
    background-color: var(--color-bg-raised);
    border-inline-end: var(--border-default) solid var(--color-border-default);
  }
}

/* Below md: stacked rows. Each cell shows its column name from data-label.
   When table display values are changed, restore semantics with role="table|row|cell|columnheader|rowheader". */
@media (max-width: 47.99rem) {
  .ds-table--stack { min-inline-size: 0; }
  .ds-table--stack thead {
    position: absolute; inline-size: 1px; block-size: 1px; overflow: hidden; clip-path: inset(50%);
  }
  .ds-table--stack tbody tr { display: block; border-block-end: var(--border-default) solid var(--color-border-default); }
  .ds-table--stack tbody th { display: block; background-color: var(--color-bg-surface); }
  .ds-table--stack td { display: grid; grid-template-columns: 7rem minmax(0, 1fr); gap: var(--space-3); border-block-end: 0; }
  .ds-table--stack td::before {
    content: attr(data-label);
    font: var(--type-label-tech); letter-spacing: var(--tracking-label); text-transform: uppercase;
    color: var(--color-text-secondary);
  }
  .ds-table--stack .ds-table__num { text-align: start; }
}
```

### 17.9 Status badges

```html
<span class="ds-badge ds-badge--success">Complete</span>
<span class="ds-badge ds-badge--warning">Needs review</span>
<span class="ds-badge ds-badge--error">Failed</span>
<span class="ds-badge ds-badge--info">Draft</span>
<span class="ds-badge">Archived</span>
<span class="ds-badge ds-badge--active">Selected</span>
```

```css
@layer components {
  .ds-badge {
    --badge-fg: var(--color-text-secondary);
    --badge-bg: var(--color-bg-surface);
    display: inline-flex; align-items: center; gap: var(--space-1);
    padding: calc(var(--space-1) / 2) var(--space-2);
    background-color: var(--badge-bg); color: var(--badge-fg);
    border: var(--border-hairline) solid currentColor; border-radius: var(--radius-sm);
    font: var(--type-label-tech); letter-spacing: var(--tracking-label);
    text-transform: uppercase; white-space: nowrap;
  }
  /* The symbol is decorative (empty alt text); the visible word carries the meaning. */
  .ds-badge::before { content: "–" / ""; }

  .ds-badge--success { --badge-fg: var(--color-success-text); --badge-bg: var(--color-success-bg); }
  .ds-badge--success::before { content: "✓" / ""; }
  .ds-badge--warning { --badge-fg: var(--color-warning-text); --badge-bg: var(--color-warning-bg); }
  .ds-badge--warning::before { content: "!" / ""; }
  .ds-badge--error   { --badge-fg: var(--color-error-text);   --badge-bg: var(--color-error-bg); }
  .ds-badge--error::before { content: "✕" / ""; }
  .ds-badge--info    { --badge-fg: var(--color-info-text);    --badge-bg: var(--color-info-bg); }
  .ds-badge--info::before { content: "i" / ""; }
  .ds-badge--active  { --badge-fg: var(--color-text-on-accent); --badge-bg: var(--color-accent); }
  .ds-badge--active::before { content: "■" / ""; }
}
```

### 17.10 Responsive adjustments

Consolidated behavior that is not already covered by the component examples. All rules are mobile-first.

```css
@layer layout {
  /* Two-column forms from tablet up; fields marked --full span both columns */
  .ds-form-grid { display: grid; gap: var(--space-6); }
  @media (min-width: 48rem) {
    .ds-form-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: var(--grid-gap); }
    .ds-form-grid > .ds-field--full { grid-column: 1 / -1; }
  }

  /* Wide content scrolls inside its own bordered, focusable container */
  .ds-scroll {
    overflow-x: auto;
    border: var(--border-default) solid var(--color-border-default);
    scrollbar-color: var(--color-border-default) var(--color-bg-surface);
  }

  /* Fixed bars respect device safe areas */
  .ds-safe-bottom { padding-block-end: calc(var(--space-4) + env(safe-area-inset-bottom, 0px)); }
}

/* Reduce decorative density on small screens: optional annotations carry .ds-only-lg (17.1). */

/* Touch: compact density never shrinks targets on coarse pointers (declared in tokens). */

/* Large screens: keep line length bounded even inside wide containers */
@media (min-width: 80rem) {
  .ds-container--data .ds-prose { max-inline-size: var(--measure-body); }
}
```

Panels, hero, tables, dialogs, footer, and navigation already carry their breakpoint behavior inside their own examples (17.3, 17.4, 17.8, 17.12, 17.15). The rules for stacking, collapsing, and scrolling are summarized in 13.3.

### 17.11 Tabs and segmented control

```html
<div class="ds-tabs">
  <div class="ds-tabs__list" role="tablist" aria-label="Record views">
    <button class="ds-tab" role="tab" id="tab-a" aria-selected="true"  aria-controls="panel-a" tabindex="0">Summary</button>
    <button class="ds-tab" role="tab" id="tab-b" aria-selected="false" aria-controls="panel-b" tabindex="-1">History</button>
  </div>
  <div class="ds-tabs__panel" role="tabpanel" id="panel-a" aria-labelledby="tab-a" tabindex="0">…</div>
  <div class="ds-tabs__panel" role="tabpanel" id="panel-b" aria-labelledby="tab-b" tabindex="0" hidden>…</div>
</div>

<fieldset class="ds-segmented-field">
  <legend class="ds-field__label">View</legend>
  <div class="ds-segmented">
    <input type="radio" name="view" id="v-list" checked><label for="v-list">List</label>
    <input type="radio" name="view" id="v-grid"><label for="v-grid">Grid</label>
  </div>
</fieldset>
```

```css
@layer components {
  .ds-tabs__list {
    display: flex; overflow-x: auto; scroll-snap-type: x proximity;
    border-block-end: var(--border-default) solid var(--color-border-default);
  }
  .ds-tab {
    flex: none; scroll-snap-align: start; min-block-size: var(--control-height);
    padding-inline: var(--space-5); margin-inline-end: calc(var(--border-default) * -1);
    background-color: var(--color-bg-surface); color: var(--color-text-primary);
    border: var(--border-default) solid var(--color-border-default); border-block-end: 0;
    font: var(--type-button); cursor: pointer;
  }
  .ds-tab:hover { background-color: var(--color-bg-selected); }
  .ds-tab[aria-selected="true"] {
    background-color: var(--color-bg-raised);
    font-weight: var(--font-weight-extrabold);
    box-shadow: inset 0 var(--border-heavy) 0 var(--color-accent-graphic); /* top bar */
  }
  .ds-tab:focus-visible { outline-offset: calc(var(--focus-ring-width) * -1); }
  .ds-tabs__panel { padding-block: var(--space-6); }

  .ds-segmented-field { margin: 0; padding: 0; border: 0; display: grid; gap: var(--space-2); }
  .ds-segmented {
    position: relative; display: inline-flex;
    background-color: var(--color-bg-raised);
    border: var(--border-default) solid var(--color-border-default); border-radius: var(--radius-sm);
  }
  .ds-segmented > input { position: absolute; opacity: 0; inline-size: 1px; block-size: 1px; }
  .ds-segmented > label {
    display: inline-flex; align-items: center; min-block-size: var(--control-height);
    padding-inline: var(--space-4); font: var(--type-button); cursor: pointer;
  }
  .ds-segmented > label + input + label { border-inline-start: var(--border-default) solid var(--color-border-default); }
  .ds-segmented > label:hover { background-color: var(--color-bg-selected); }
  .ds-segmented > input:checked + label { background-color: var(--color-accent); color: var(--color-text-on-accent); }
  .ds-segmented > input:focus-visible + label { outline: var(--focus-ring-width) solid var(--color-focus); outline-offset: calc(var(--focus-ring-width) * -1); }
}
@media (max-width: 29.99rem) {
  .ds-segmented { display: flex; }
  .ds-segmented > label { flex: 1; justify-content: center; }
}
```

```js
const tabs = [...document.querySelectorAll('[role="tab"]')];
function select(tab) {
  tabs.forEach((t) => {
    const on = t === tab;
    t.setAttribute('aria-selected', String(on));
    t.tabIndex = on ? 0 : -1;
    document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
  });
  tab.focus();
}
tabs.forEach((tab, i) => {
  tab.addEventListener('click', () => select(tab));
  tab.addEventListener('keydown', (e) => {
    const target = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 }[e.key];
    if (target === undefined) return;
    e.preventDefault();
    select(tabs[(target + tabs.length) % tabs.length]);
  });
});
```

### 17.12 Dialog and drawer

```html
<dialog class="ds-dialog" id="confirm" aria-labelledby="confirm-title">
  <form method="dialog">
    <header class="ds-panel__header">
      <h2 id="confirm-title" class="ds-panel__title">Dialog title</h2>
      <button class="ds-btn ds-btn--text ds-dialog__close" value="cancel">Close <span aria-hidden="true">✕</span></button>
    </header>
    <div class="ds-panel__body ds-stack">
      <p>One or two sentences that say what will happen and what can be undone.</p>
    </div>
    <footer class="ds-dialog__footer">
      <button class="ds-btn" value="cancel">Cancel</button>
      <button class="ds-btn ds-btn--primary" value="confirm">Save changes</button>
    </footer>
  </form>
</dialog>
```

Open with `dialog.showModal()`; the browser traps focus, makes the page inert, handles Escape, and returns focus to the trigger on close. For a drawer, add `ds-dialog--drawer`.

```css
@layer components {
  .ds-dialog {
    inline-size: min(36rem, calc(100vw - 2 * var(--page-margin)));
    max-block-size: calc(100dvh - 2 * var(--page-margin));
    padding: 0; overflow: auto;
    background-color: var(--color-bg-raised); color: var(--color-text-primary);
    border: var(--border-strong) solid var(--color-border-default); border-radius: var(--radius-none);
    box-shadow: var(--shadow-hard-lg);
  }
  .ds-dialog::backdrop { background-color: var(--color-overlay); } /* flat, no blur */
  .ds-dialog[open] { animation: ds-dialog-in var(--duration-base) var(--ease-out); }
  @keyframes ds-dialog-in { from { opacity: 0; transform: translateY(var(--space-2)); } }

  .ds-dialog__close { align-self: stretch; border-radius: var(--radius-none); border-inline-start-color: var(--color-border-default); }
  .ds-dialog__footer {
    display: flex; flex-wrap: wrap; justify-content: flex-end; gap: var(--space-3);
    padding: var(--space-4) var(--panel-padding);
    background-color: var(--color-bg-surface);
    border-block-start: var(--border-default) solid var(--color-border-default);
  }

  /* Drawer: flush with the inline end, full height, no shadow */
  .ds-dialog--drawer {
    inline-size: min(28rem, 100vw); block-size: 100dvh; max-block-size: none;
    margin-block: 0; margin-inline: auto 0;
    border-block-width: 0; border-inline-end-width: 0; box-shadow: none;
  }
}

/* Mobile: dialog becomes a bottom sheet, drawer fills the screen, actions stack with primary on top */
@media (max-width: 47.99rem) {
  .ds-dialog:not(.ds-dialog--drawer) {
    inline-size: 100vw; max-inline-size: 100vw; max-block-size: 100dvh;
    margin-block: auto 0; margin-inline: 0;
    border-inline-width: 0; border-block-end-width: 0; box-shadow: none;
  }
  .ds-dialog--drawer { inline-size: 100vw; border-inline-start-width: 0; }
  .ds-dialog__footer { flex-direction: column-reverse; padding-block-end: calc(var(--space-4) + env(safe-area-inset-bottom, 0px)); }
  .ds-dialog__footer > .ds-btn { inline-size: 100%; }
}
```

### 17.13 Toast, inline alert, progress

```html
<div class="ds-toast-region" role="region" aria-label="Notifications">
  <div class="ds-toast ds-toast--success" role="status">
    <span class="ds-toast__symbol" aria-hidden="true">✓</span>
    <p>Saved at <span class="ds-meta">14:32</span></p>
    <button class="ds-btn ds-btn--text" type="button">Dismiss</button>
  </div>
</div>

<div class="ds-alert ds-alert--error" role="alert">
  <span class="ds-alert__symbol" aria-hidden="true">✕</span>
  <div>
    <p class="ds-alert__title">The record could not be saved.</p>
    <p>Check your connection and try again. Reference: <span class="ds-meta">ERR-4021</span></p>
  </div>
</div>

<div class="ds-progress" role="progressbar" aria-label="Loading records" aria-valuemin="0" aria-valuemax="4" aria-valuenow="2">
  <span data-filled="true"></span><span data-filled="true"></span><span></span><span></span>
</div>
```

```css
@layer components {
  .ds-toast-region {
    position: fixed; z-index: var(--z-toast); display: grid; gap: var(--space-3); pointer-events: none;
    inset-inline: var(--space-4);
    inset-block-end: calc(var(--space-4) + env(safe-area-inset-bottom, 0px));
  }
  .ds-toast {
    --toast-status: var(--color-info-border);
    --toast-fg: var(--color-info-text);
    pointer-events: auto;
    display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: start; gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background-color: var(--color-bg-raised);
    border: var(--border-default) solid var(--color-border-default);
    border-inline-start: calc(var(--border-heavy) * 2) solid var(--toast-status);
    box-shadow: var(--shadow-hard-md);
    font: var(--type-small);
  }
  .ds-toast__symbol { color: var(--toast-fg); font: var(--type-label-tech); font-weight: var(--font-weight-semibold); }
  .ds-toast--success { --toast-status: var(--color-success-border); --toast-fg: var(--color-success-text); }
  .ds-toast--warning { --toast-status: var(--color-warning-border); --toast-fg: var(--color-warning-text); }
  .ds-toast--error   { --toast-status: var(--color-error-border);   --toast-fg: var(--color-error-text); }

  .ds-alert {
    --alert-bg: var(--color-info-bg); --alert-fg: var(--color-info-text); --alert-border: var(--color-info-border);
    display: grid; grid-template-columns: auto minmax(0, 1fr); gap: var(--space-3);
    padding: var(--space-3) var(--space-4);
    background-color: var(--alert-bg); color: var(--color-text-primary);
    border: var(--border-default) solid var(--alert-border);
    font: var(--type-small);
  }
  .ds-alert__symbol { color: var(--alert-fg); font: var(--type-label-tech); font-weight: var(--font-weight-semibold); }
  .ds-alert__title { color: var(--alert-fg); font-weight: var(--font-weight-semibold); }
  .ds-alert--success { --alert-bg: var(--color-success-bg); --alert-fg: var(--color-success-text); --alert-border: var(--color-success-border); }
  .ds-alert--warning { --alert-bg: var(--color-warning-bg); --alert-fg: var(--color-warning-text); --alert-border: var(--color-warning-border); }
  .ds-alert--error   { --alert-bg: var(--color-error-bg);   --alert-fg: var(--color-error-text);   --alert-border: var(--color-error-border); }

  /* Stepped, determinate progress: filled cells use the accent graphic color */
  .ds-progress { display: flex; gap: var(--space-1); }
  .ds-progress > span { inline-size: 1.25rem; block-size: 1rem; border: var(--border-default) solid var(--color-border-default); }
  .ds-progress > span[data-filled="true"] { background-color: var(--color-accent-graphic); }
}
@media (min-width: 48rem) {
  .ds-toast-region { inset-inline-start: auto; inline-size: 24rem; }
}
```

### 17.14 Terminal element

```html
<div class="ds-terminal">
  <div class="ds-terminal__bar"><span>build.log</span><span>Finished</span></div>
<pre class="ds-terminal__body" tabindex="0" role="region" aria-label="Build output"><code><span class="ds-terminal__prompt">$</span>npm run build
<span class="ds-log ds-log--ok">Compiled 42 modules</span>
<span class="ds-log ds-log--warn">1 deprecated option found</span>
<span class="ds-terminal__cursor" aria-hidden="true"></span></code></pre>
</div>
```

```css
@layer components {
  .ds-terminal {
    margin: 0;
    background-color: var(--color-bg-inverse); color: var(--color-text-primary);
    border: var(--border-default) solid var(--color-border-subtle);
    font: var(--type-meta); font-size: var(--text-small); line-height: 1.6;
  }
  .ds-terminal__bar {
    display: flex; justify-content: space-between; gap: var(--space-4);
    padding: var(--space-2) var(--space-4); color: var(--color-text-secondary);
    border-block-end: var(--border-hairline) solid var(--color-border-subtle);
  }
  .ds-terminal__body { margin: 0; padding: var(--space-4); overflow-x: auto; white-space: pre; font: inherit; }
  .ds-terminal__prompt { margin-inline-end: var(--space-2); color: var(--color-accent); user-select: none; }

  /* Level tags are text, so meaning survives without color */
  .ds-log::before { margin-inline-end: var(--space-2); }
  .ds-log--ok::before   { content: "[ OK ]"; color: var(--color-success-text); }
  .ds-log--warn::before { content: "[WARN]"; color: var(--color-warning-text); }
  .ds-log--fail::before { content: "[FAIL]"; color: var(--color-error-text); }
  .ds-log--info::before { content: "[INFO]"; color: var(--color-info-text); }

  .ds-terminal__cursor {
    display: inline-block; inline-size: 0.6em; block-size: 1.1em; vertical-align: text-bottom;
    background-color: currentColor;
    animation: ds-blink var(--duration-blink) steps(1, end) infinite;
  }
}
```

### 17.15 Footer

```html
<footer class="ds-footer">
  <div class="ds-container ds-grid">
    <div class="ds-stack" style="--span-md: 8; --span-lg: 4">
      <p class="ds-type-subsection">Project name</p>
      <p class="ds-small">A short description of what the project is and who maintains it.</p>
    </div>
    <nav aria-labelledby="fg-1" style="--span-md: 4; --span-lg: 2">
      <h2 id="fg-1" class="ds-footer__heading">Product</h2>
      <ul class="ds-footer__list"><li><a href="#">Overview</a></li><li><a href="#">Reference</a></li></ul>
    </nav>
    <nav aria-labelledby="fg-2" style="--span-md: 4; --span-lg: 2">
      <h2 id="fg-2" class="ds-footer__heading">Company</h2>
      <ul class="ds-footer__list"><li><a href="#">About</a></li><li><a href="#">Contact</a></li></ul>
    </nav>
  </div>
  <div class="ds-container">
    <div class="ds-footer__bar ds-meta"><span>© 2026 Project name</span><span>Build 1.0.0</span></div>
  </div>
</footer>
```

```css
@layer components {
  .ds-footer {
    margin-block-start: var(--section-space);
    padding-block: var(--section-space) var(--space-8);
    background-color: var(--color-bg-surface);
    border-block-start: var(--border-strong) solid var(--color-border-default);
  }
  .ds-footer__heading { margin-block-end: var(--space-3); font: var(--type-heading-4); }
  .ds-footer__list { display: grid; margin: 0; padding: 0; list-style: none; }
  .ds-footer__list a { display: flex; align-items: center; min-block-size: var(--control-height); }
  .ds-footer__bar {
    display: flex; flex-wrap: wrap; justify-content: space-between; gap: var(--space-3);
    margin-block-start: var(--space-10); padding-block-start: var(--space-4);
    border-block-start: var(--border-hairline) solid var(--color-border-subtle);
  }
}
```

---

## 18. Do and Don't

### 18.1 Do

| Do | Concrete example |
|---|---|
| Use warm paper-inspired surfaces | Page `--color-bg-page`, panels `--color-bg-raised`. A table sits in a raised wrapper so the grid never shows behind data |
| Maintain strong alignment and clear borders | Panel edges align to grid columns; adjacent panels share one 2px border using a negative margin |
| Apply typography consistently | Every section title is `--type-section`; every ID is `--type-meta`; never a one-off `font-size: 19px` |
| Use accent colors purposefully | One selected tab with a green top bar; one orange annotation next to a diagram element. Not both on the same row |
| Make metadata compact and readable | `2026-10-14 09:30` in `--type-meta`, secondary color, 13px, right of the title |
| Use technical annotations when they provide context | An orange callout flag labeled "A" that matches a numbered note below an actual diagram |
| Preserve a clear hierarchy | One display heading, one primary button, supporting text in secondary color, warnings next to what they affect |
| Adapt layouts intentionally for mobile | The 8 + 4 hero becomes headline, lead, actions, then the index card |
| Reuse established design tokens | `padding: var(--space-4)` and `border: var(--border-default) solid var(--color-border-default)` |
| Keep interactive states consistent | Selected is always a green tint or fill plus a bar or weight change, in tabs, nav, rows, and segments |
| Keep hard shadows meaningful | Only the primary button, toasts, dialogs, and interactive panel hover |
| Write specific labels | "Save changes", "Delete record", errors that say how to fix the problem |
| Test the keyboard path | Tab through the page: every control reachable, the focus ring visible, nothing trapped |

### 18.2 Don't

| Don't | Why and what to do instead |
|---|---|
| Use generic SaaS dashboard styling unmodified | Identical rounded white cards with soft shadows erase the identity. Use bordered, square panels with title blocks |
| Apply excessive rounded corners | Maximum 4px on any rectangle; containers stay square. Never make pill buttons |
| Use gradients as the primary visual identity | The only gradient-like construct is the hairline grid (a pattern, not a color wash) |
| Add arbitrary decorative labels | A made-up "SYS-0042" label adds noise. Show real IDs or nothing |
| Overuse monospace text | Paragraphs, headings, buttons, and navigation are not mono. Mono is for data |
| Make every component visually loud | One loud thing per view. The rest is quiet ink on paper |
| Use accent colors without a clear purpose | No green headings "for brand feel"; no orange backgrounds for banners |
| Sacrifice readability for visual novelty | No light-gray body text on paper; no text over the grid; no tight tracking under 20px |
| Hide important actions on mobile | Primary action stays in the header or first in the menu; never remove it for space |
| Introduce inconsistent spacing or border treatments | No 10px, 14px, or 18px gaps; no 1.5px or 5px borders |
| Depend on hover for essential functionality | Row actions are visible buttons, not hover-revealed; menus open on click or tap |
| Use blurred or soft shadows | `box-shadow: 0 8px 24px rgba(0,0,0,.1)` is never allowed. Use a hard offset or no shadow |
| Use glassmorphism or translucent surfaces | Surfaces are opaque. Dialog overlay is flat with no blur |
| Use pure black or pure white | Use ink-900 and paper-50 so the palette stays warm |
| Put an uppercase eyebrow above every heading | Use one only where it names a real category |
| Color one word of a headline | Headlines are one color; emphasis is weight, not hue |
| Communicate status by color alone | Always include a word and a symbol (✓ ! ✕ i) |
| Animate for decoration | No entrance fades on every card; no looping effects except the terminal cursor and loading indicators |

---

## 19. Project Adaptation Guidelines

### 19.1 Three tiers

| Tier | What it covers | Rule |
|---|---|---|
| **Core** (fixed) | The identity invariants in 3.1: paper and ink palette, border widths, radius scale, three-font system, hard shadows only, accent roles, 4px spacing scale, token names, accessibility rules | Never changes between projects |
| **Optional components** | Hero index card, terminal panels, grid background, registration marks, annotations, numbered section headings, side navigation, drawers | Include only when the project needs them |
| **Context adaptations** | Density, expression level, container width, navigation pattern, number of decorative devices | Adjust within the rules below; document the choice |

### 19.2 Expression levels

Choose one level per project and apply it consistently. The levels change how much decoration appears, not the underlying system.

| Level | Name | Decoration | Typical use |
|---|---|---|---|
| 0 | Utilitarian | No grid background, no annotations, no hero. Status symbols and real metadata only | Administrative interfaces, internal tools, dense data apps |
| 1 | Balanced (default) | Grid background on hero or page header only, title blocks on panels, real metadata | Productivity tools, dashboards with some editorial framing |
| 2 | Editorial | Hero with index card, section identifiers where content is a real document, one annotation type, terminal examples | Landing pages, technical documentation |
| 3 | Expressive | Registration marks, larger display type, one annotation cluster per hero, asymmetric compositions | Campaign or cover pages. Still bound by accent budget and accessibility |

### 19.3 By project category

| Category | Layout | Components to emphasize | Adaptations |
|---|---|---|---|
| **Landing pages** | `--container-wide`, full-width bands with 3px rules, asymmetric hero | Hero, panels, buttons, footer, optional terminal sample | Level 2 or 3. One primary action repeated at most twice. Generous `--section-space` |
| **Administrative interfaces** | Header plus side navigation, `--container-data`, fluid content | Tables, filters (inputs, selects, segmented), badges, dialogs, drawers, toasts | Level 0. `data-density="compact"` on fine pointers only. Page title row with the primary action. Tables take priority; no hero |
| **Technical documentation** | `--container-narrow` content with section nav and an "on this page" column | Title-block panels for notes and warnings, code and terminal blocks, definition lists, tabs for language variants | Level 2. Section identifiers (e.g., "§ 3.2") and numbered headings allowed when sections are actually cross-referenced |
| **Data-oriented applications** | Dense panel grids, `--container-data`, sticky headers and columns | Tables, numeric type, stat panels (`--type-numeric-lg`), charts with direct labels and patterns, status badges | Level 0 or 1. Monospace tabular numerals everywhere data aligns. Reduce borders inside tables to hairlines |
| **Productivity tools** | Single focus area with a toolbar and optional side panel | Forms, switches, segmented controls, keyboard shortcuts (`kbd`), toasts, drawers for detail | Level 1. Fast feedback with stepped motion; keyboard-first interactions |
| **Internal business applications** | Same as administrative with simpler navigation | Forms with validation, tables, dialogs for confirmation, inline alerts | Level 0 or 1. Prefer plain labels and predictable patterns over expression |

### 19.4 Adaptation rules

1. A data-heavy interface prioritizes legibility and efficient workflows; it keeps the same color, border, typography, and spacing language, and drops optional decoration first.
2. Never solve a project-specific need with a new color. Use an existing status or accent role.
3. A new component is built from existing parts (panel, title block, badge, button) and tokens. Document it in the project, with its states and responsive behavior.
4. Do not remove focus styles, contrast, labels, or touch targets to achieve a denser look. Compact density is limited to 32px controls on fine pointers.
5. If a project requires a brand color, add it as a new accent family only when it replaces green or orange in its role. Do not add it alongside them.

---

## 20. Design Quality Checklist

Run this before merging any screen or component. Every item should be answerable with "yes".

### Tokens and CSS
- [ ] All colors, spacing, borders, radii, shadows, durations, and z-indexes come from tokens. The grep checks in 16.9 return nothing.
- [ ] Components reference semantic tokens only (no `--palette-*`).
- [ ] State is expressed with ARIA or data attributes, and the same state looks the same everywhere.
- [ ] No selector uses IDs, and `!important` appears only in the reduced-motion rule.

### Color and contrast
- [ ] Text meets 4.5:1 (large text 3:1) and UI boundaries meet 3:1.
- [ ] Green is used only for selected, positive, or primary-action highlight; orange only for annotation or warning.
- [ ] Accent budget respected: one green call to attention, one orange annotation cluster per region.
- [ ] Status is shown with text and a symbol, not color alone.

### Typography
- [ ] Headings use Archivo tokens; body uses Plex Sans; data uses Plex Mono.
- [ ] Uppercase appears only on short technical labels and badges.
- [ ] Body line length is 68 characters or fewer; display and title headings are balanced.
- [ ] No text below 12px; no body text below 16px on mobile.

### Layout and spacing
- [ ] Content aligns to the grid and uses the spacing scale only.
- [ ] Page margins, section spacing, and container widths follow Section 6.
- [ ] No horizontal page scroll from 320px to 1600px; wide content scrolls inside its own container.

### Geometry and depth
- [ ] Borders are 1px, 2px, 3px, or 4px (accent bars) only.
- [ ] No radius above 4px (radios excepted).
- [ ] Shadows are hard offsets and appear only on pressable or floating elements.

### Components and interaction
- [ ] Each component has hover, focus-visible, active, disabled, loading, and error states where relevant.
- [ ] One primary button per region; labels are specific verbs in sentence case.
- [ ] Forms have visible labels, helper text, and error messages linked with `aria-describedby`.
- [ ] Nothing essential depends on hover.

### Responsive
- [ ] Mobile uses an intentional layout (stacked, collapsed, or scrolling), not a shrunken desktop.
- [ ] Important actions remain visible on mobile; the menu has a visible "Menu" label.
- [ ] Tables, dialogs, and drawers use their mobile patterns.

### Accessibility
- [ ] Keyboard-only walkthrough succeeds: logical order, visible focus, no traps, Escape closes overlays.
- [ ] Screen-reader pass: landmarks, headings, labels, live regions for toasts and errors.
- [ ] `prefers-reduced-motion` tested; no information lost.
- [ ] Touch targets are at least 44px (24px absolute minimum).
- [ ] Zoom to 200% and 400%: content reflows.

### Identity
- [ ] Squint test: blurred, the page still shows dark headings, boxed regions, and one accent.
- [ ] Every decorative or technical element passes the information test in 11.2.
- [ ] The page would not be mistaken for a generic SaaS template.
