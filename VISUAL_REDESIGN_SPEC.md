# VISUAL REDESIGN SPEC — Lemnisca Scale-Up Risk Assessment Tool

> **For Claude Code**: Read this file AND the `/frontend-design` skill before making any changes.
> This document describes exactly what to change in the existing codebase to elevate the UI from prototype to production-grade.

---

## DIAGNOSIS: What's Wrong With The Current UI

After analyzing every page (landing, form step 1, form step 4, and both results pages), here are the specific problems:

### 1. Flat Depth Model
The entire app uses a single shade of dark gray (~#131518) everywhere. Cards, backgrounds, sidebars, and the page canvas are nearly the same color. There's no layered surface system. This makes everything bleed together and feel like a wireframe, not a built product.

### 2. Weak Typography
The heading font on the landing page has character (serif/mixed), but the rest of the app falls back to generic sans-serif with no hierarchy distinction. Body text, labels, headings, and data values all feel the same weight. Section labels like "PEAK BIOMASS" and "ORGANISM CLASS" use all-caps amber text which fights with actual content for attention.

### 3. The Orange Problem
Orange/amber is used for EVERYTHING: section labels ("PRIMARY BOTTLENECK"), confidence indicators ("Directional"), risk accents, form section subtitles, the assessment confidence bar, step numbers, error states. When one color means everything, it means nothing. There's no semantic distinction.

### 4. Invisible Inputs
Form fields are dark rectangles on a dark background with barely-visible borders. They have almost no visual affordance. A user scanning the page can't immediately tell where to click. The unit toggles (g/L CDW / OD600) don't clearly show which is active.

### 5. Generic Controls
Buttons, pills, and toggles look like unstyled default components. The "Continue >" button is small and plain. The organism selection pills ("B Bacteria", "Y Yeast") are tiny and don't feel interactive. The DO setpoint slider is a basic HTML range input with a green dot.

### 6. Risk Severity Is Invisible
On the results page, a "Critical" risk card looks almost identical to a "Low" risk card. Same border, same background, same size. The only difference is a small text label and a tiny colored dot. The most important information on the page — which risks are dangerous — requires reading small text instead of being visually obvious.

### 7. The Gauge Looks Dated
The semicircular gauge with a gradient arc and needle is a 2015-era dashboard widget aesthetic. It works functionally but doesn't match the quality level of tools like Linear, Vercel, or modern Framer templates.

### 8. No Data Visualizations
The results page is entirely text and numbers. No charts, no comparisons, no visual representation of how parameters change across scales. Scientists and engineers expect data visualization.

### 9. Warning Banners Are Weak
The warning bars in the results page have a faint left-border accent but otherwise blend into the background. Critical warnings don't feel critical.

### 10. Empty Space Without Purpose
The landing page and form step 1 have large areas of empty dark background that feel like missing content rather than intentional breathing room. There's no texture, gradient, or subtle visual element creating atmosphere.

---

## THE NEW DESIGN SYSTEM

### Philosophy
**"Instrument-grade dark."** Think: the precision of a Keysight oscilloscope UI meets the polish of Linear/Vercel. Deep blacks with carefully layered surfaces. Color is earned — it only appears where it carries meaning (risk status, active states, data). Everything else is grayscale with meticulous contrast ratios.

The aesthetic reference points:
- **Linear app**: layered dark surfaces, subtle borders, crisp typography, restrained color
- **Vercel dashboard**: clean data presentation, monospace numbers, surface elevation via subtle brightness shifts
- **Apple Pro apps (Logic Pro, Final Cut)**: dark, dense, but never cluttered; every pixel earns its place
- **Bloomberg Terminal modernized**: data-dense but beautifully typeset

---

### COLOR SYSTEM

#### Surface Layers (the foundation — get this right and everything improves)
```css
--bg-base:       #09090B;   /* deepest background, page canvas */
--bg-surface-1:  #111113;   /* primary cards, form areas, sidebar */
--bg-surface-2:  #18181B;   /* elevated cards, hover states, nested elements */
--bg-surface-3:  #1F1F23;   /* active states, selected items, input fields */
--bg-overlay:    #27272A;   /* dropdowns, tooltips, popovers */
```
**Key rule**: Each surface layer is a distinct step. The eye can clearly see card-on-background-on-canvas. This creates depth without drop shadows.

#### Borders (subtle but present — this is what separates prototype from production)
```css
--border-subtle:   #1F1F23;   /* default card borders — barely visible but present */
--border-default:  #27272A;   /* input field borders, dividers */
--border-hover:    #3F3F46;   /* hover states on interactive elements */
--border-active:   #52525B;   /* focused inputs, active cards */
```

#### Text (four levels of hierarchy, no more)
```css
--text-primary:    #FAFAFA;   /* headings, important values, primary content */
--text-secondary:  #A1A1AA;   /* body text, descriptions, secondary info */
--text-tertiary:   #71717A;   /* labels, captions, helper text, timestamps */
--text-muted:      #52525B;   /* disabled text, placeholder text */
```

#### Accent — Teal/Cyan (interactive elements ONLY)
```css
--accent:          #06B6D4;   /* primary buttons, active tab indicators, links */
--accent-hover:    #22D3EE;   /* hover on accent elements */
--accent-muted:    #083344;   /* accent backgrounds (e.g., active step bg) */
--accent-subtle:   #06B6D41A; /* very faint accent tint (10% opacity) */
```
**Rule**: Accent is ONLY for interactive/navigational elements: buttons, active steps, links, focus rings. Never for labels, never for section headers.

#### Semantic — Risk Status (the only saturated colors in the UI)
```css
/* Low — muted green */
--risk-low:        #22C55E;
--risk-low-bg:     #22C55E14;  /* 8% opacity, for card backgrounds */
--risk-low-border: #22C55E33;  /* 20% opacity, for card borders */

/* Moderate — amber */
--risk-moderate:        #F59E0B;
--risk-moderate-bg:     #F59E0B14;
--risk-moderate-border: #F59E0B33;

/* High — orange-red */
--risk-high:        #F97316;
--risk-high-bg:     #F9731614;
--risk-high-border: #F9731633;

/* Critical — red with emphasis */
--risk-critical:        #EF4444;
--risk-critical-bg:     #EF444414;
--risk-critical-border: #EF444433;
```
**Key rule**: Risk colors ONLY appear on risk-related elements (risk cards, gauges, severity labels, warning banners). They never appear on form labels, section headers, or navigation. This makes them pop instantly when they do appear.

#### Semantic — Feedback
```css
--success:    #22C55E;   /* form validation success */
--error:      #EF4444;   /* validation errors */
--warning:    #F59E0B;   /* non-risk warnings */
--info:       #06B6D4;   /* informational notes */
```

---

### TYPOGRAPHY

#### Font Stack
```css
/* Display/Headings — distinctive, editorial, scientific character */
@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&display=swap');
/* OR */
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600&display=swap');

/* Body/UI — clean, technical, excellent readability */
@import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&display=swap');
/* Fallback if Geist unavailable: */
@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&display=swap');

/* Monospace — for ALL numbers, metrics, engineering values */
@import url('https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500;600&display=swap');
/* Fallback: */
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&display=swap');
```

#### Type Scale
```css
--text-display:    3.5rem / 1.1;   /* landing page hero only */
--text-h1:         1.875rem / 1.3; /* page titles: "Scale-Up Risk Assessment" */
--text-h2:         1.375rem / 1.35;/* section titles: "Your process at peak demand" */
--text-h3:         1.125rem / 1.4; /* card titles, subsection heads */
--text-body:       0.9375rem / 1.6;/* 15px — primary body text */
--text-small:      0.8125rem / 1.5;/* 13px — helper text, descriptions */
--text-caption:    0.75rem / 1.5;  /* 12px — labels, badges, metadata */
--text-mono-data:  0.875rem / 1.4; /* 14px — monospace numbers/values */
```

#### Typography Rules
1. **Landing hero heading**: `Instrument Serif` or `Fraunces` at display size, `--text-primary` color, letter-spacing: -0.02em. This is the one place you get editorial flair.
2. **All other headings**: `Geist` (or Plus Jakarta Sans) semibold, `--text-primary`, tight letter-spacing.
3. **Section labels**: `Geist` medium, `--text-tertiary`, font-size `--text-caption`, letter-spacing: 0.05em, uppercase. **NOT orange/amber.** These should be quiet, not loud.
4. **Body text**: `Geist` regular, `--text-secondary`.
5. **ALL numbers, metrics, values**: `Geist Mono` (or JetBrains Mono). kLa values, RPM, temperatures, DO setpoints, risk scores — every single number in the app is monospace. This is non-negotiable for a scientific tool.
6. **Engineering units** (h⁻¹, mmol/L/h, VVM, cP): same monospace font as their numbers, in `--text-tertiary` color.

---

### SPACING & LAYOUT

```css
--space-1:  4px;
--space-2:  8px;
--space-3:  12px;
--space-4:  16px;
--space-5:  20px;
--space-6:  24px;
--space-8:  32px;
--space-10: 40px;
--space-12: 48px;
--space-16: 64px;

--radius-sm:  6px;   /* small elements: badges, pills */
--radius-md:  8px;   /* buttons, inputs */
--radius-lg:  12px;  /* cards */
--radius-xl:  16px;  /* major containers, modals */
```

---

### SHADOWS & ELEVATION (use sparingly)
```css
--shadow-sm:  0 1px 2px rgba(0,0,0,0.3);
--shadow-md:  0 4px 12px rgba(0,0,0,0.4);
--shadow-lg:  0 8px 24px rgba(0,0,0,0.5);
--shadow-glow-accent:   0 0 20px rgba(6,182,212,0.15);   /* accent glow for primary buttons */
--shadow-glow-critical: 0 0 20px rgba(239,68,68,0.2);    /* critical risk glow */
```

---

## PAGE-BY-PAGE REDESIGN INSTRUCTIONS

---

### LANDING PAGE

**Current problems**: Empty dark void, generic button, no atmosphere, five feature cards feel disconnected.

**Redesign**:

1. **Background atmosphere**: Add a very subtle radial gradient from the center: `radial-gradient(ellipse at 50% 30%, rgba(6,182,212,0.04) 0%, transparent 60%)`. This creates the barest hint of light behind the hero, like the glow from a reactor vessel. Don't make it obvious — it should be felt, not seen.

2. **Optionally add a very faint grid pattern overlay on the full page** (1px lines at ~80px intervals, opacity 0.03). This subtly references engineering graph paper / technical drawings. CSS-only: `background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px); background-size: 80px 80px;`

3. **Hero heading**: Use `Instrument Serif` or `Fraunces`. Current heading copy is good. Color: `--text-primary` with a very slight warm tint — `#F0EDE6` (like aged paper, subtle). The heading should be the warmest element; everything else is cool/neutral.

4. **Subtitle text**: `Geist` regular, `--text-secondary`, max-width 540px centered.

5. **Primary CTA button**: Full accent background (`--accent`), `--bg-base` text color. Larger: `padding: 16px 40px`, `border-radius: --radius-md`. On hover: slight glow (`--shadow-glow-accent`), background shifts to `--accent-hover`. This button should feel substantial — not a thin outline.

6. **Secondary link** ("See an example assessment"): `--text-tertiary` with `--accent` color on hover. No underline by default, underline on hover.

7. **Five risk domain cards**: Arrange in a row. Background: `--bg-surface-1`. Border: `--border-subtle`. On hover: border becomes `--border-hover`, background shifts to `--bg-surface-2`, card lifts with `--shadow-md`. Icons should be `--text-tertiary` and shift to `--accent` on hover. Add a subtle top-border accent line (2px, `--border-subtle`) that shifts to the appropriate risk color on hover (green for O₂ transfer, amber for mixing, etc.).

8. **Navbar**: Truly minimal. Logo left, a single ghost-style "Sign in" button or theme toggle right. Background: transparent at top of page, becomes `--bg-base` with `border-bottom: 1px solid var(--border-subtle)` on scroll.

9. **Footer trust line**: Keep but restyle. `--text-muted`, `--text-caption` size. Add a small lock icon (lucide-react `Shield` or `Lock` icon) before the text.

---

### FORM / ASSESSMENT PAGES

**Current problems**: Flat form card, invisible inputs, section labels fighting for attention in orange, step navigator looks basic, pills don't feel interactive, live risk sidebar is functional but feels disconnected.

#### Step Navigator (top)

**Rethink as a horizontal stepper with more visual weight:**
- Background strip: `--bg-surface-1` with `border-bottom: 1px solid var(--border-subtle)`
- Each step is a horizontal cell containing: step number circle (small, 24px), step name
- **Inactive steps**: number circle is `--bg-surface-2` with `--border-default` border, text is `--text-tertiary`
- **Active step**: number circle filled with `--accent`, step name is `--text-primary`, a bottom indicator line in `--accent` (3px, rounded) sits under the active step — animated slide on step change
- **Completed steps**: number circle filled `--bg-surface-3` with a white checkmark icon inside, step name is `--text-secondary`
- Step names should be single-line where possible. If two lines are needed, cap at that.
- Add `transition: all 200ms ease` on all state changes
- The progress line (blue line in current UI) should connect the step circles as a track. Completed portion: `--accent`, remaining: `--border-default`

#### Form Content Area

**Card container**:
- Background: `--bg-surface-1`
- Border: `1px solid var(--border-subtle)`
- Border-radius: `--radius-xl` (16px)
- Padding: `--space-10` (40px) on desktop, `--space-6` (24px) on mobile
- **No visible border on the top edge** — instead, use a 1px gradient border that's slightly brighter on top (simulates light from above)

**Section titles** (e.g., "What are you scaling?"):
- `Geist` semibold, `--text-h2` size, `--text-primary` color
- Subtitle below: `Geist` regular, `--text-small` size, `--text-tertiary` — NOT orange/amber

**Field labels** (e.g., "ORGANISM CLASS", "PEAK BIOMASS"):
- `Geist` medium, `--text-caption` size, `--text-tertiary`, uppercase, letter-spacing: 0.06em
- **NOT orange.** Quiet gray. They're labels, not headings.

**Selection pills/cards** (Bacteria, Yeast, Batch, Fed-batch):
- Make these significantly larger and more tactile
- Size: min-width 120px, padding `14px 20px`
- Default state: `--bg-surface-2` background, `1px solid var(--border-default)` border, `--text-secondary` text
- Hover: `--bg-surface-3` background, `--border-hover` border
- Selected: `--accent-muted` background (#083344), `1px solid var(--accent)` border at ~40% opacity, `--text-primary` text, small `--accent` dot or left-edge indicator
- Each pill should have a subtle `transition: all 150ms ease`
- For organism type with icons: icon sits above text inside the pill, rendered in `--text-tertiary` default, `--accent` when selected

**Input fields**:
- Background: `--bg-surface-3` (noticeably lighter than card background — THIS IS KEY)
- Border: `1px solid var(--border-default)`
- Border on focus: `1px solid var(--accent)` with `box-shadow: 0 0 0 3px var(--accent-subtle)`
- Text: `Geist Mono` for numeric values, `--text-primary`
- Placeholder: `--text-muted`
- Unit selector (e.g., "g/L CDW | OD600"): pill-shaped toggle sitting inside the input on the right. Active unit: `--bg-surface-2` mini-pill with `--text-primary`. Inactive: just text in `--text-muted`.
- Height: 44px (comfortable click target)
- Border-radius: `--radius-md`

**Slider (DO Setpoint)**:
- Track: 4px height, `--bg-surface-3` background, rounded
- Filled portion: `--accent` gradient (slightly lighter at the thumb end)
- Thumb: 18px circle, `--accent` fill, `2px solid --bg-base` border (creates an inset look), on hover: scale to 22px with `--shadow-glow-accent`
- Show value label above thumb that follows it, rendered in `Geist Mono`, `--text-primary`, inside a small `--bg-overlay` pill
- Range annotations ("0%", "20-40% optimal", "100%") in `--text-muted`, `--text-caption` size

**Radio options** (for OUR input method):
- Style as full-width selection cards, not default radio circles
- Default: `--bg-surface-2` background, `--border-subtle` left border (3px), `--text-secondary` text
- Hover: `--bg-surface-3`, `--border-hover` left border
- Selected: `--bg-surface-3`, `--accent` left border (3px), subtle `--accent-subtle` background tint
- The radio circle: custom styled, 18px, `--border-default` ring → selected: `--accent` fill
- Expanded content (for "estimate from biomass"): slides down with 200ms ease, has a left-border continuation from the selected indicator

**Validation errors**:
- Small `AlertCircle` icon (lucide-react) in `--error` color + error text in `--error` color, `--text-small` size
- Input border shifts to `--error` with `box-shadow: 0 0 0 3px rgba(239,68,68,0.1)`

**Form footer** (Back / Continue):
- Separate from card, sits below with `--space-6` gap
- "Back" button: ghost style, `--text-tertiary`, left arrow icon
- "Continue" button: solid `--accent` background, `--bg-base` text, `padding: 12px 32px`, `--radius-md`, right arrow icon. On hover: `--accent-hover` with `--shadow-glow-accent`
- Between them: progress text ("6/14 params") in `Geist Mono`, `--text-tertiary` — NOT orange

#### Live Risk Sidebar (right)

**This sidebar should feel like an instrument panel gradually coming online:**

- Background: `--bg-surface-1`
- Separated from main content by `1px solid var(--border-subtle)` vertical line
- Header: "Live Risk Preview" in `Geist` medium, `--text-secondary`, with a status badge:
  - "Awaiting data": `--bg-surface-3` badge, `--text-muted` text
  - "Building...": `--accent-muted` badge with `--accent` text, subtle pulse animation
  - "Complete": `--risk-low-bg` badge with `--risk-low` text

**Assessment Confidence card**:
- Remove the orange-on-dark look
- Background: `--bg-surface-2`, `--border-subtle` border
- Label: `--text-tertiary`, progress bar track: `--bg-surface-3`
- Progress bar fill: gradient from `--risk-moderate` (left) to `--risk-low` (right) as confidence increases
- Confidence label ("Directional"): `--text-secondary`, NOT orange

**Core Parameters counter**:
- "6/7" rendered in `Geist Mono`, `--text-primary` for filled count, `--text-muted` for total
- A thin segmented progress bar below (7 segments, filled ones in `--accent`, unfilled in `--bg-surface-3`)

**Risk domain rows** (Oxygen Transfer, Mixing, etc.):
- Each row: `padding: 12px 16px`, `border-bottom: 1px solid var(--border-subtle)`
- Icon on left in `--text-muted` (shifts to risk color when data arrives)
- Domain name: `--text-secondary`
- Right side:
  - Before data: two dashes `——` in `--text-muted`
  - After data populates: risk severity pill with background tint matching risk level, e.g., "Critical" in `--risk-critical` text on `--risk-critical-bg` background
  - **Animate the transition**: value fades in with a scale-up micro-animation (200ms)

**Scale visualization** (the 10L → 1,000L vessel diagram):
- This is a good element — keep it but elevate the rendering
- Use cleaner vessel illustrations (pure stroke, no fills except a subtle liquid level tint in `--accent-subtle`)
- The "100×" label should be in `Geist Mono` bold, `--accent` color
- Arrow between vessels: subtle dashed line in `--border-default`

---

### RESULTS PAGE

**Current problems**: Dated gauge, risk cards don't differentiate severity, no charts, warnings are weak, too much dead space below.

#### Risk Score Section (top hero area)

**Replace the semicircular gauge with a modern score presentation:**

Option A — **Large number with arc indicator** (cleaner, more modern):
- Very large score number: `Geist Mono` bold, 80px, `--text-primary`
- Directly below: risk severity label ("High Risk") in the corresponding risk color, `--text-h3` size
- Behind the number: a subtle circular progress ring (200px diameter, 6px stroke). The ring fills clockwise proportional to the score. Ring color = risk severity color. Unfilled portion: `--bg-surface-3`. Add a very faint glow in the risk color behind the ring.
- Below the ring: "Composite across 5 risk domains" in `--text-tertiary`

Option B — **Horizontal risk bar** (more original):
- Full-width horizontal bar (8px tall, rounded) spanning the score card
- Gradient: green (left) → amber → red (right)
- A marker/indicator on the bar showing where the score falls
- Large score number to the left of the bar
- This is simpler and potentially more modern than any gauge

**Regardless of which option**: The score area should have its own card with `--bg-surface-1` background and a subtle top-border glow in the risk color: `border-top: 2px solid var(--risk-[level])` with `box-shadow: 0 -4px 20px var(--risk-[level]-bg)`.

**Process info strip**: "E. coli | Fed-batch | 10 L → 1,000 L | Scale ratio: 100×" — keep this but restyle. Use `--text-secondary`, pipe dividers in `--text-muted`, the scale ratio number in `Geist Mono` bold.

#### Primary Bottleneck Section

- Remove the "PRIMARY BOTTLENECK" orange label
- Instead: a card with `--bg-surface-1`, subtle left-border in the relevant risk color (4px)
- Inside: a concise heading like "Critical Constraint" in `--text-h3` + the bottleneck explanation in `--text-body`
- The "What would change this?" section: collapsible, with the answer in `--text-secondary`

#### Risk Domain Cards

**This is the highest-impact visual improvement:**

Each card should VISUALLY ENCODE its severity:

- **Card background**: Use the risk-level background tint. A "Critical" card has `background: var(--risk-critical-bg)` — a very faint red tint. "Low" has `var(--risk-low-bg)` — faint green. This immediately differentiates severity at a glance.
- **Card border**: `1px solid var(--risk-[level]-border)`. The border carries the risk color at 20% opacity.
- **Top edge accent**: A 2px solid line across the top of the card in the full risk color. This is the strongest visual signal.
- **Icon**: Colored with the risk color, not muted
- **Severity label**: Rendered as a small pill/badge: text in risk color on risk-bg background
- **Key metric**: `Geist Mono`, `--text-primary`, prominent size
- **Confidence indicator**: small dot + label at bottom in `--text-muted`

**Hover state**: border becomes fully opaque risk color, slight lift with `--shadow-md`, cursor pointer to indicate expandability

**Expanded state** (on click): card expands downward to reveal:
- Full calculation chain
- Input values used (in a mini two-column layout)
- Correlation method used
- All in `--text-secondary`, numbers in `Geist Mono`

**Card grid**: 3 columns on desktop (the 5 cards split as 3+2 with the bottom row centered, or 5 equal columns if space allows). Gap: `--space-4`.

#### ADD: Scale Comparison Chart (NEW — does not exist in current UI)

Below the risk domain cards, add a chart section:

**Radar/spider chart** showing current scale vs. target scale:
- 5 axes (one per risk domain)
- Current scale polygon: `--accent` at 30% opacity fill, `--accent` stroke
- Target scale polygon: risk color stroke (the color matching the WORST risk in that dimension), risk color at 15% fill
- Axis labels: `Geist` small, `--text-tertiary`
- Background: `--bg-surface-1` card, concentric reference rings in `--border-subtle`
- Use Recharts RadarChart component

**Alternative or addition: grouped bar chart** showing key metrics side by side:
- Pairs of bars (current vs. target) for: kLa, P/V, tip speed, mixing time, heat ratio
- Current scale bars: `--accent`
- Target scale bars: colored by risk level for that metric
- "Acceptable range" band overlay in `--risk-low-bg`
- Axis: `Geist Mono` for values, `Geist` for labels

#### Warnings Section

**Current**: faint left-border bars, all look similar.
**Redesign**:

- Each warning is a full card, not just a text bar
- Amber warnings: `background: var(--risk-moderate-bg)`, `border-left: 3px solid var(--risk-moderate)`, `padding: 16px 20px`
- Red warnings: `background: var(--risk-critical-bg)`, `border-left: 3px solid var(--risk-critical)`
- Warning icon (lucide `AlertTriangle`) in the corresponding color before the text
- Tag prefix like "[OTR]" or "[MIXING]": rendered as a small monospace badge in `--bg-surface-3`

#### Recommendations Section (NEW or expanded)

- Below warnings, add a "Recommendations" section
- Each recommendation is a card with:
  - Priority badge: "High" (red pill), "Medium" (amber pill), "Low" (green pill)
  - Action title: `--text-h3`, `--text-primary`
  - Explanation: `--text-body`, `--text-secondary`
  - Connected to risk domain: small tag showing which domain it addresses

#### Detailed Metrics Table (inside Scale-Up Projections accordion)

When "Scale-Up Projections" is expanded:
- Table with columns: Metric | Lab Scale | Target Scale | Status
- Alternating row backgrounds: `--bg-surface-1` / `--bg-surface-2`
- Numbers: `Geist Mono`, right-aligned
- Status column: colored pill (Low/Moderate/High/Critical with corresponding colors)
- Table header: `--text-tertiary`, uppercase, `--text-caption` size

#### Sticky Footer Bar

- Background: `--bg-surface-1` with `border-top: 1px solid var(--border-subtle)`
- Add subtle backdrop blur: `backdrop-filter: blur(12px); background: rgba(17,17,19,0.85);`
- Left: process summary in `--text-secondary`, risk level colored pill
- Right: "Generate PDF Report" button — solid style, `--bg-surface-3` background, `--text-primary`, on hover lift. Give it a document icon (lucide `FileText`)

---

## GLOBAL COMPONENT REFINEMENTS

### Buttons
```
Primary:   bg: --accent, text: --bg-base, hover: --accent-hover + glow
Secondary: bg: --bg-surface-2, border: --border-default, text: --text-secondary, hover: --border-hover + --bg-surface-3
Ghost:     bg: transparent, text: --text-tertiary, hover: --bg-surface-2 + --text-secondary
Danger:    bg: --risk-critical-bg, text: --risk-critical, border: --risk-critical-border
```
All buttons: `border-radius: --radius-md`, `padding: 10px 20px`, `font-weight: 500`, `transition: all 150ms ease`

### Badges/Pills
```
Neutral:   bg: --bg-surface-3, text: --text-secondary
Accent:    bg: --accent-muted, text: --accent
Risk:      bg: --risk-[level]-bg, text: --risk-[level], border: --risk-[level]-border
```
All pills: `border-radius: 9999px` (full round), `padding: 4px 12px`, `font-size: --text-caption`, `font-weight: 500`

### Cards
```
Default:   bg: --bg-surface-1, border: 1px solid --border-subtle, radius: --radius-lg
Elevated:  bg: --bg-surface-2, border: 1px solid --border-default, radius: --radius-lg, shadow: --shadow-sm
Risk card: bg: --risk-[level]-bg, border: 1px solid --risk-[level]-border, border-top: 2px solid --risk-[level]
```

### Transitions
- All interactive elements: `transition: all 150ms ease`
- Color changes: `transition: color 150ms, background-color 150ms, border-color 150ms`
- Layout animations (expand/collapse): `transition: height 200ms ease-out, opacity 200ms ease-out`
- Step transitions: content `opacity + transform` with 200ms duration, slide direction matching navigation direction

---

## IMPLEMENTATION PRIORITY

When implementing these changes, follow this order:

1. **CSS Variables & Font Imports** — Set up the entire token system first. Replace every hardcoded color.
2. **Surface layers** — Fix the background depth model. This alone will make the biggest difference.
3. **Typography** — Import fonts, apply the type scale, make all numbers monospace.
4. **Input fields** — Make them visible with `--bg-surface-3` backgrounds.
5. **Selection controls** — Restyle pills, radios, toggles to be larger and more tactile.
6. **Risk domain cards** — Add severity-based color coding (backgrounds, borders, top accents).
7. **Score presentation** — Replace or modernize the gauge.
8. **Warning banners** — Add visual weight with backgrounds and icons.
9. **Add radar chart** — Introduce data visualization to results page.
10. **Animations & polish** — Transitions, hover states, micro-interactions.

---

## FINAL CHECKLIST

Before shipping, verify:
- [ ] Every number in the app uses monospace font
- [ ] Every unit is displayed next to its value
- [ ] No orange/amber appears on non-risk, non-warning elements
- [ ] Risk cards are visually distinguishable by color at a glance
- [ ] Form inputs are clearly visible (lighter than their card background)
- [ ] The accent color (teal/cyan) appears ONLY on interactive elements
- [ ] There are at least 4 distinct surface layers visible when looking at the form page
- [ ] The step navigator shows clear active/completed/upcoming states
- [ ] The landing page has subtle atmospheric depth (gradient, optional grid)
- [ ] Section labels are quiet gray, not orange
- [ ] The results page has at least one data visualization (radar chart or bar chart)
- [ ] All transitions are smooth (150-200ms ease)
- [ ] Mobile: inputs are at least 44px tap targets
- [ ] The PDF button is prominent and easy to find
