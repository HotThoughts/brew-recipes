---
name: brew-recipes
description: A quiet, archival recipe browser that turns YAML into readable pour-over methods.
colors:
  lavender-paper: "oklch(0.925 0.027 302)"
  quiet-lavender: "oklch(0.955 0.016 302)"
  wisteria-surface: "oklch(0.895 0.034 302)"
  deep-wisteria: "oklch(0.835 0.052 301)"
  deep-violet: "oklch(0.245 0.052 299)"
  violet-gray: "oklch(0.445 0.05 300)"
  muted-violet: "oklch(0.55 0.047 300)"
  wisteria-rule: "oklch(0.765 0.058 300)"
  thistle-highlight: "oklch(0.73 0.083 298)"
  honey-gold: "oklch(0.78 0.148 75)"
  pure-white: "oklch(1 0 0)"
typography:
  display:
    fontFamily: "'Cormorant Garamond', Georgia, serif"
    fontWeight: 400
  body:
    fontFamily: "'Space Mono', 'SFMono-Regular', Consolas, monospace"
    fontWeight: 400
  label:
    fontFamily: "'Space Mono', 'SFMono-Regular', Consolas, monospace"
    fontWeight: 400
    fontSize: "0.78rem"
rounded:
  pill: "999px"
  panel: "10px"
  focus: "6px"
spacing:
  row-gap: "18px"
  section-gap: "clamp(40px, 7vw, 84px)"
  page-pad: "32px"
components:
  brewer-toggle:
    backgroundColor: transparent
    textColor: "{colors.deep-violet}"
    rounded: "{rounded.pill}"
    padding: "9px 18px"
  brewer-toggle-active:
    backgroundColor: "{colors.deep-violet}"
    textColor: "{colors.lavender-paper}"
    rounded: "{rounded.pill}"
  recipe-row:
    backgroundColor: transparent
    rounded: "0"
    padding: "20px 0"
  stat-badge:
    backgroundColor: transparent
    textColor: "{colors.violet-gray}"
    rounded: "{rounded.pill}"
    padding: "4px 8px"
---

# Design System: brew-recipes

## 1. Overview

**Creative North Star: "The Brewer's Archive"**

brew-recipes is a card catalog for pour-over methods — quiet, precise, and literate. It treats recipes as archival records rather than lifestyle content: each entry is a structured document with provenance, not a blog post with anecdotes. The interface inherits the material qualities of a library index: thin rules, dense rows, monospaced metadata, and serif headings that feel set in type.

The system grounds itself in lavender-tinted paper and deep violet ink — colors drawn from archival materials (faded library slips, carbon copies, violet typewriter ribbons) rather than coffee-shop browns or latte-art beiges. A single warm accent (Honey Gold) appears sparingly at points of interaction: the blinking cursor, focus rings, and active states. Grain texture at low opacity reinforces the paper surface without calling attention to itself.

**Key Characteristics:**
- Serif display headings (Cormorant Garamond) over monospaced body and metadata (Space Mono) — the body IS the mono face, giving every label, stat, and nav element a typeset, index-card quality.
- Thin rules (`1px solid wisteria-rule`) separate sections and rows instead of cards or shadows.
- Dense, scannable recipe rows with pill-shaped stat badges on the right; the eye moves name → stats → next row without friction.
- No cards, no shadows, no hero sections, no decorative motion — the data is the decoration.
- Honey Gold appears only as the cursor blink, focus rings, and active toggle states; its rarity is the point.

## 2. Colors: The Botanical Palette

The palette draws from pressed botanicals and archival paper: lavender, wisteria, thistle, violet. Every color is in OKLCH; lightness and chroma are tuned for WCAG AA contrast on the paper field.

### Primary
- **Deep Violet** (`oklch(0.245 0.052 299)`, `--ink`): Body text, headings, active toggle backgrounds. The darkest point in the palette. Contrast ratio ≥10:1 against Lavender Paper.
- **Honey Gold** (`oklch(0.78 0.148 75)`, `--honey`): The active accent. Focus rings (`0 0 0 3px honey-gold / 0.45`), the blinking title cursor, hover highlights on interactive elements, and `::selection` backgrounds. Used on <5% of any given screen.

### Secondary
- **Thistle Highlight** (`oklch(0.73 0.083 298)`, `--highlight`): Selection backgrounds, the radial gradient glow near the page title. Also drives the title cursor's solid fill.

### Neutral
- **Lavender Paper** (`oklch(0.925 0.027 302)`, `--paper`): The main page background. A cool lavender-white with subtle chroma toward the violet hue.
- **Quiet Lavender** (`oklch(0.955 0.016 302)`, `--paper-quiet`): The lighter end of the body gradient. Sits behind Lavender Paper in a `linear-gradient(180deg, quiet-lavender, lavender-paper)`.
- **Wisteria Surface** (`oklch(0.895 0.034 302)`, `--surface`): Reserved for surface areas that need distinction from the paper field. Currently unused in the primary layout but available for future panels or dialogs.
- **Deep Wisteria** (`oklch(0.835 0.052 301)`, `--surface-strong`): Stronger surface variant. Available for pressed/selected states.
- **Violet Gray** (`oklch(0.445 0.05 300)`, `--ink-light`): Secondary text, system lines, labels, stat badges, nav links. Contrast ratio ≥6:1 against Lavender Paper.
- **Muted Violet** (`oklch(0.55 0.047 300)`, `--muted`): Tertiary text. Reserved for the most subdued labels.
- **Wisteria Rule** (`oklch(0.765 0.058 300)`, `--rule`): All borders, dividers, and rules. Used at `1px solid` throughout.
- **Pure White** (`oklch(1 0 0)`, `--white`): Used only as a semi-transparent overlay (`oklch(1 0 0 / 0.2)`) on the archive summary, spec grid, and source panel to lift them slightly off the paper field.

### Named Rules
**The One Accent Rule.** Honey Gold appears in exactly four places: the blinking cursor, `:focus-visible` rings, `::selection` backgrounds, and the active brewer toggle. It is never used as decoration, never applied to static text, and never exceeds 5% of any screen's surface area. Its rarity is the point.

**The No-Brown Rule.** No coffee browns, no warm beiges, no latte-art creams. The palette is lavender-through-violet, chosen for archival associations rather than culinary ones. If it reads as "coffee shop," it has failed.

## 3. Typography

**Display Font:** Cormorant Garamond (400, 400 italic) with Georgia, serif fallback
**Body Font:** Space Mono (400, 700) with SFMono-Regular, Consolas, monospace fallback
**Label/Mono Font:** Space Mono — the body font IS the monospace font. Every label, nav link, stat badge, and system line uses the same face as body copy.

**Character:** A serif display over a monospaced everything-else. The pairing reads as a library catalog: headings are set in type, everything below is typed. This is the reverse of the common "mono headings + sans body" tech pattern; here the mono carries the data, and the serif provides the human voice.

### Hierarchy
- **Display** (400, `clamp(4rem, 10vw, 6rem)`, 0.93): The page title ("brew methods"). Cormorant Garamond regular, tight line-height, `text-wrap: balance`. Capped at 6rem max.
- **Heading** (400, `clamp(2.6rem, 6.5vw, 4.2rem)`, 1.05): Section and brewer group headings (h2). Cormorant Garamond regular, `-0.015em` letter-spacing for an archival, monumental feel. Always `color: deep-violet`.
- **Recipe Name** (400, `clamp(1.8rem, 4vw, 2.8rem)`, 1.0): Recipe titles in listing rows. Cormorant Garamond regular. Smaller and tighter than section headings to create clear hierarchy.
- **Body** (400, 0.95rem, 1.5): Prose paragraphs (lede, descriptions). Space Mono. Cap line length at 66ch.
- **Label** (400, 0.78rem): System lines, nav links, stat badges, phase indices, summary labels. Space Mono. The workhorse size for metadata.

### Named Rules
**The Mono Body Rule.** Body text is set in Space Mono, not a sans-serif. This is the defining typographic move: the entire interface below headings feels typed, indexed, catalogued. Never substitute a sans-serif for body copy; the mono face IS the body voice.

**The Serif Ceiling Rule.** Cormorant Garamond appears only on h1, h2, h3, recipe names, and the label italic variant. It never appears in buttons, nav, stats, or body copy. Confine the serif to headings and let the mono carry everything else.

## 4. Elevation

This is a flat system. No box-shadows, no layered cards, no z-index stacking beyond the texture overlay (z-index: 5) and site shell (z-index: 10). Depth is conveyed through:
- **Color contrast**: Pure White semi-transparent overlays (`oklch(1 0 0 / 0.2)`) on the archive summary, spec grid, and source panel lift them slightly off the paper field without shadows.
- **Rules**: `1px solid wisteria-rule` borders separate sections and rows. The rules do the work that shadows would do in a lifted system.
- **Background gradient**: The `linear-gradient(180deg, quiet-lavender, lavender-paper)` on body creates a subtle top-to-bottom lightening that anchors the page.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest. No shadows, no elevation tokens, no z-index wars. The only stacking is the texture grain overlay (decorative, pointer-events: none) and the site shell (content). If a surface needs to lift, use a semi-transparent white background, not a shadow.

## 5. Components

### Brewer Toggle Pills
- **Shape:** Fully rounded (999px radius)
- **Default:** Transparent background, `1px solid wisteria-rule` border, deep-violet text, Space Mono 0.85rem
- **Hover:** Border shifts to violet-gray, background gains `oklch(1 0 0 / 0.22)`, `translateY(-1px)`
- **Active (`aria-pressed="true"`):** Deep Violet background, Lavender Paper text, Deep Violet border
- **Active Hover:** Violet Gray background, Lavender Paper text
- **Transition:** `180ms ease-out` on border-color, background-color, color, transform
- **Min height:** 42px for touch targets

### Recipe Rows
- **Shape:** Full-width, no radius, no background at rest
- **Layout:** Two-column grid (`minmax(0, 1fr) minmax(240px, 0.52fr)`) — name + description left, stat badges right
- **Separator:** `1px solid wisteria-rule` border-top
- **Padding:** 20px 0
- **Hover:** Color shifts to violet-gray, background gains `oklch(1 0 0 / 0.16)`
- **Stat badges:** Pill-shaped (999px), `1px solid wisteria-rule`, violet-gray text, 0.72rem Space Mono, 4px 8px padding, 28px min-height
- **Description:** Max 68ch, violet-gray, 0.82rem, clamped to 2 lines (`-webkit-line-clamp: 2`)

### Recipe Detail (Spec Grid)
- **Shape:** 6-column grid (`repeat(6, minmax(0, 1fr))`), 10px radius, `1px solid wisteria-rule` border
- **Background:** `oklch(1 0 0 / 0.2)` semi-transparent overlay
- **Cells:** 16px padding, `1px solid wisteria-rule` border-right, last cell no border-right
- **Values:** 0.94rem, font-weight 400, `overflow-wrap: anywhere`
- **Responsive:** Collapses to 2 columns at ≤820px with alternating border-right removal

### Phase Timeline
- **Shape:** Numbered list, no bullets, rows separated by `1px solid wisteria-rule`
- **Layout:** 3-column grid (`58px minmax(0, 1fr) minmax(130px, auto)`) — index number, copy block, values
- **Phase index:** Violet-gray, 0.78rem Space Mono
- **Phase heading:** Cormorant Garamond, `clamp(1.5rem, 3vw, 2.1rem)`, line-height 1.05
- **Phase note:** Max 62ch, violet-gray, 0.82rem
- **Phase values:** Right-aligned, violet-gray, 0.78rem, `white-space: nowrap`
- **Responsive:** Collapses to 2 columns at ≤560px, values move below copy

### Source Attribution Panel
- **Shape:** Flex row, `1px solid wisteria-rule` border, 10px radius, 18px padding
- **Background:** `oklch(1 0 0 / 0.2)` semi-transparent overlay
- **Links:** Deep Violet with wisteria-rule underline, underline-offset 0.25em
- **Link hover:** Violet-gray, underline shifts to Deep Violet
- **Transition:** `180ms ease-out` on color and text-decoration-color

### Title Cursor
- **Element:** Inline block, 0.22em wide × 0.78em tall, Thistle Highlight background
- **Animation:** `blink` keyframes (1.2s infinite, opacity 1 → 0 → 1)
- **Position:** Appended to the page title h1, `vertical-align: -0.08em`, `margin-left: 0.08em`
- **Reduced motion:** `prefers-reduced-motion: reduce` collapses animation to 0.001ms, single iteration

### Focus Ring
- **Shape:** 6px border-radius, 3px spread, no blur, no offset
- **Color:** `oklch(0.78 0.148 75 / 0.45)` (Honey Gold at 45% opacity)
- **Outline:** 2px solid transparent, outline-offset 3px
- **Selector:** `:focus-visible` only — no focus ring on mouse clicks

## 6. Do's and Don'ts

### Do:
- **Do** use Cormorant Garamond only for headings (h1–h3) and recipe names — never for body, labels, or UI chrome.
- **Do** use Space Mono for all body text, labels, nav, stats, and system lines. The mono face IS the body voice.
- **Do** separate sections with `1px solid wisteria-rule` borders — rules over cards, always.
- **Do** use the semi-transparent white overlay (`oklch(1 0 0 / 0.2)`) to lift information-dense panels (archive summary, spec grid, source panel) without shadows.
- **Do** keep Honey Gold to ≤5% of any screen. The cursor, focus rings, selection, and active toggle — nothing else.
- **Do** respect `prefers-reduced-motion: reduce` by collapsing all animation/transition durations to 0.001ms.
- **Do** keep recipe rows dense and scannable — monospaced stats on the right, serif names on the left, thin rule between each.
- **Do** use the 6-column spec grid for recipe parameters; collapse to 2 columns at ≤820px.
- **Do** cap body prose at 66ch with `text-wrap: pretty`; use `text-wrap: balance` on headings.
- **Do** preserve the multilingual structure: dual-language names in recipe rows, lang-switch in the header, EN/ZH visibility via CSS class toggling.

### Don't:
- **Don't** use coffee browns, warm beiges, latte-art creams, or any culinary brown. The palette is lavender-through-violet, period.
- **Don't** use cards to contain content. Rows separated by rules, never rectangles with rounded corners and padding.
- **Don't** use box-shadows for elevation. The system is flat; semi-transparent overlays and rules convey depth.
- **Don't** add hero sections, marketing copy, or decorative prose. The data is the decoration.
- **Don't** use `border-left` or `border-right` greater than 1px as a colored accent stripe on any element.
- **Don't** use a sans-serif for body copy. Space Mono is the body font; substituting a sans-serif breaks the archival, typed aesthetic.
- **Don't** exceed 6rem for any heading. Above that the page is shouting, not archiving.
- **Don't** use letter-spacing tighter than `-0.04em` on display headings — letters touch, and the typeset quality dissolves.
- **Don't** hide recipe data behind prose. Brew parameters (ratio, dose, water, temp, grind, time) are first-class content, not buried in paragraphs.
- **Don't** use Honey Gold as a static text color or decorative fill. It is an interaction signal, not a palette color.
