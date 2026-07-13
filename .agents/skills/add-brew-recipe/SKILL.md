---
name: add-brew-recipe
description: >
  Add a new pour-over or cold-brew coffee recipe to the brew-recipes YAML database. Accepts
  pasted recipe text (from YouTube descriptions, blogs, coffee apps) and
  auto-extracts structured fields — or falls back to interactive collection for
  manual entry. Triggered by "add a recipe", "new recipe for...", pasted coffee
  recipe text, or any mention of contributing a brew recipe.
---

# Add Brew Recipe

You are adding a new coffee recipe to the brew-recipes YAML database.
This skill has two modes:

- **Auto-detect mode**: The user pastes semi-structured recipe text (from a YouTube
  description, blog, coffee app, or anywhere). You extract the fields, present a
  summary, and confirm before writing.
- **Interactive mode**: The user says "add a recipe" or names a brewer without
  details. You collect the information conversationally.

In both modes, the result is a valid YAML file — validated, prepared for review,
and optionally translated.

## Schema Reference

The authoritative schema is `schema.yaml` in the project root.

**Required fields**: `id`, `name`, `brewer`, `dose_g`, `water_ml`, `grind_size`,
`phases`, `source`, plus either `water_temp_c` or `brew_temperature`

**Brewer enum** (11 values):
V60 · Chemex · Aeropress · ColdBrew · Kalita · Orea · FrenchPress · StaggX · Origami · April · Other

**Brewer → directory slug** (lowercase, split CamelCase with hyphen):
V60 → `v60`, Chemex → `chemex`, Aeropress → `aeropress`, Kalita → `kalita`,
Orea → `orea`, ColdBrew → `cold-brew`, FrenchPress → `french-press`, StaggX → `stagg-x`,
Origami → `origami`, April → `april`, Other → `other`

**Grind sizes**: extra-coarse · coarse · medium-coarse · medium · medium-fine ·
fine · extra-fine

**Tag vocabulary**:
`light-roast` · `medium-roast` · `dark-roast` · `omni-roast` ·
`sweet` · `acidic` · `balanced` ·
`multi-pour` · `single-pour` · `continuous-pour` · `immersion` ·
`bypass` · `cold-brew` · `competition` · `beginner-friendly` · `advanced`

**Phase fields**: `label` (required) · `water_g` (required) · `wait_seconds`
(optional, 0–86400) · `pours` (optional, integer 1–10, makes `water_g` the
per-sub-pour amount) · `note` (optional)

**Ranges**: dose 5–120 g · water 50–1200 ml · temp 80–100 °C · ratio `"1:N"`
(one decimal) · 1–10 phases

**Source object**: `name` (required) · `url` (optional, URI) ·
`competition` (optional, e.g. "World Brewers Cup 2016")

Existing recipes live under `recipes/<language>/<brewer-slug>/<id>.yaml`.

---

## Step 1: Determine Mode

Read the user's message. If it contains 3+ lines with numbers + units
(g/ml/°C/temperature) or recognizable phase descriptions, go to
**Step 2: Parse**. Otherwise go to **Step 3: Collect Interactively**.

---

## Step 2: Parse Pasted Text

Extract as many fields as possible from the user's text. Build a structured
object as you go. After extraction, auto-derive tags and ratio. Then go to
**Step 4: Confirm**.

### 2.1 Extract Brewer

Scan every line (case-insensitive) for the 10 brewer enum values:

- **Structured match**: `Brewer: V60`, `Brew Method: Aeropress`, `Kalita Wave`
- **Prose match**: "using a Chemex", "with Origami (S)", "in a V60"
- If multiple brewers appear, prefer the one with a structured match or the
  one most central to the recipe description
- If no clear match, leave blank (user will fill in during confirmation)

### 2.2 Extract Dose and Water

In priority order:

1. **Key:value pairs**: `Dose: 15g`, `Coffee: 20g`, `Water: 250ml`
2. **Slash notation**: `20g coffee / 300g water`, `15g : 250g`
3. **Prose**: "15 grams of coffee", "250 ml of water"
4. **From ratio + one known**: if ratio (e.g. 1:15) and dose are known,
   water = dose × ratio denominator
5. **From phase totals**: if phases were parsed, sum all phase water

1 g water = 1 ml water. Convert ounces: oz × 28.35 = ml.

### 2.3 Extract Temperature

| Pattern | Example | Action |
|---------|---------|--------|
| `<num>°C`, `<num>° C`, `<num>℃` | `93°C` | Use directly |
| `<num>°F`, `<num>° F`, `<num>℉` | `200°F` | Convert: round((F − 32) × 5 ÷ 9) |
| `Temp: <num>`, `at <num>`, `@ <num>` | `at 93` | Assume °C |
| Just a number near "temperature" | `temperature 93` | Assume °C |

Flag values outside 80–100 °C for user verification.

For cold brew without an exact temperature, set `brew_temperature` to `cold`,
`room-temperature`, or `cold-or-room-temperature` instead of inventing a Celsius value.

### 2.4 Extract Grind Size

Match against the 7-value enum, handling variants:

- **Exact**: `medium-fine` ✓
- **Spaced**: `medium fine` → `medium-fine`
- **Case**: `Medium-Fine` → `medium-fine`
- **Abbreviations**: `med-fine` → `medium-fine`, `med-coarse` → `medium-coarse`

Colloquial descriptions ("setting 12 on Comandante", "9 clicks on Timemore") →
record in the description but ask the user for the closest enum value.

### 2.5 Extract Ratio

- **Direct**: `1:16.7` → use as-is
- **Coffee:water pair**: `15:250` → compute `1:16.7` (250÷15 rounded to 1dp)
- **Always compute** from dose+water when both are known (water ÷ dose, rounded
  to 1dp), overriding any text ratio if they differ significantly

### 2.6 Extract Phases

Recognize these common formats:

**Format A — Timestamped lines** (YouTube, blogs):
```
0:00 - Bloom with 50g
0:45 - Pour to 150g (circular)
1:45 - Pour to 300g (center)
```
- Line starts with `M:SS` or `M:S`
- Label: text between `- ` and ` with`/` to`/end
- `water_g`: number before `g`
- `note`: parenthetical text after water amount
- `wait_seconds`: difference to next timestamp (last phase → 0, or note
  "draw down")

**Format B — Structured key:value** (recipe cards, apps):
```
Bloom: 50g, swirl, wait 45s
Second pour: 50g spiral pour, wait 10s
```
- Label: text before `:`
- `water_g`: number before `g`
- `wait_seconds`: `wait Xs`, `X sec`, `X seconds`, `for Xs`
- `note`: everything between water_g and the wait clause

**Format C — Bullet with parenthetical timing**:
```
- Bloom 50g (45s)
- Pour to 150g (30s)
- Pour to 300g (draw down)
```
- Label: text after `- ` up to the first number+g
- `water_g`: number before `g`
- `wait_seconds`: `(Ns)` → N, `(draw down)` → 0

**Format D — Multi-pour notation**:
```
Pulse Pours: 50g (×3 pours, every 30s)
```
- Same extraction as other formats, but if `×N pours` or `N pours` appears,
  set `pours: N` and `water_g` becomes the per-sub-pour amount
- Note should describe the pattern clearly

**Format E — Prose paragraph** (low confidence):
```
Start with a bloom of 50g for 45 seconds. Then pour 100g in a circle...
```
- Extract each sentence with a water amount as a phase
- Label from the action word
- **Always flag for user verification** — prose parsing is unreliable

**Post-extraction checks**:
- Sum all phase water (accounting for `pours` multiplier: `water_g × pours`)
  should be within ~10% of `water_ml`. If not, flag it.
- Max 10 phases.
- Phase order follows text order (assumed chronological).

### 2.7 Extract Source Attribution

In priority order:

1. Explicit line: `Source: ...`, `Recipe by: ...`, `By: ...`, `Author: ...`
2. YouTube URL: `youtube.com/watch?v=...` — extract from the line; the
   uploader name is often nearby
3. Competition mention: `World Brewers Cup 20XX`, `WBC`, `WBrC` — capture
   person, competition name, and year
4. First proper name in the text: "James Hoffmann's 1-Cup V60" → source name
5. Any recognizable URL in the text

Build: `{ name: "<name>", url: "<url>", competition: "<optional>" }`.
At minimum, `name` is required. If nothing found, use "TBD" and ask.

### 2.8 Extract Name

- First non-empty line of the text is usually the recipe name
- Strip trailing URLs, dates, or metadata
- If ambiguous, construct from source name + brewer
- Show for confirmation

### 2.9 Extract Variant

- Look for parenthetical or standalone mentions: `1-cup`, `standard`, `S`,
  `v3`, `v4`, `Big Boy`, `Air S`
- Common in Origami recipes (size S/M/L) and Orea recipes (v3/v4/Z1/O1)

### 2.10 Auto-Derive Tags

After all parsing is done:

| Condition | Tag(s) |
|-----------|--------|
| 1 phase | `single-pour` |
| 2–6 phases | `multi-pour` |
| 7+ phases | `continuous-pour` |
| Single phase with wait ≥ 60s, all water at once | `immersion` |
| Aeropress brewer (almost always immersion) | `immersion` |
| Text has "light roast" / "light-roast" | `light-roast` |
| Text has "medium roast" / "medium-roast" | `medium-roast` |
| Text has "dark roast" / "dark-roast" | `dark-roast` |
| Text has "omni roast" | `omni-roast` |
| Text has "sweet", "juicy", "fruity", "honey" | `sweet` |
| Text has "acidic", "bright", "crisp", "acidity" | `acidic` |
| Text has "balanced", "clean", "rounded" | `balanced` |
| Source has `competition` field | `competition` |
| ≤ 3 phases or text says "easy"/"simple"/"beginner" | `beginner-friendly` |
| Text says "advanced"/"complex"/"technical" or 4:6 method | `advanced` |
| Phase note mentions "bypass" | `bypass` |
| Name or text mentions "cold", "iced" | `cold-brew` |

---

## Step 3: Collect Interactively (Fallback)

If the user didn't paste recipe text or essential fields are still missing,
collect what's needed. Don't overwhelm — ask one field at a time, or ask:

> "Tell me about the recipe — name, brewer, coffee dose, water amount,
> temperature, grind size, and the pouring steps?"

Also offer: "If you have the recipe text from a video or blog, paste it and
I'll try to parse it automatically."

---

## Step 4: Confirm Extraction

Present a compact summary **before writing any files**:

```
Recipe:  Hoffmann 1-Cup V60
Brewer:  V60              [auto-detected]
Dose:    15g
Water:   250ml
Temp:    100°C
Grind:   medium-fine
Ratio:   1:16.7            [computed from dose+water]
Variant: 1-cup             [auto-detected]
ID:      hoffmann-1-cup-v60
Path:    recipes/en/v60/hoffmann-1-cup-v60.yaml

Phases:
  1. Bloom       — 50g, wait 45s, spiral pour. swirl at 0:10-0:15
  2. Second Pour — 50g, wait 10s, spiral pour
  3. Third Pour  — 50g, wait 10s, spiral pour
  4. Fourth Pour — 50g, wait 10s, spiral pour
  5. Final Pour  — 50g, draw down, spiral pour + swirl to flatten

Source: James Hoffmann  |  https://youtube.com/watch?v=...
Tags:   [light-roast, beginner-friendly, multi-pour, balanced]  [auto-derived]
```

Label each field: `[auto-detected]`, `[computed]`, `[from user]`, or blank
(needs user input).

Ask: **"Does this look right? You can say 'looks good', change any field
('change temp to 93'), add missing info, or start over."**

Loop until the user confirms.

---

## Step 5: Generate and Verify ID

From the confirmed data, generate a kebab-case ID using these patterns
(in priority order):

| Pattern | Example | When to use |
|---------|---------|-------------|
| `<author>-<descriptor>-<brewer>` | `hoffmann-1-cup-v60` | Author + distinguishing descriptor + brewer |
| `<author>-<method>` | `tetsu-kasuya-4-6-method` | Author + named method |
| `<author>-<brewer>` | `hoffmann-aeropress` | Author + brewer, no other descriptor |
| `<shop>-<brewer>-<variant>` | `origami-coffeeshop-vol2` | Shop/roaster + brewer + edition |
| `<brewer>-<descriptor>` | `osmotic-flow-v60` | Brewer + method name |

**Author extraction**: from `source.name`, take the shortest recognizable form:
"James Hoffmann" → `hoffmann`, "Tetsu Kasuya" → `tetsu-kasuya`,
"THE COFFEESHOP (Daichi Hagiwara)" → `origami-coffeeshop` (prefer brand).

**Conversion to kebab-case**:
- Lowercase
- Replace runs of non-alphanumeric chars with `-`
- Strip leading/trailing hyphens
- Known mappings: `4:6` → `4-6`, `v3` → `v3`, `1-cup` → `1-cup`

**Check for collisions**:
```bash
grep -r "^id: <candidate>" recipes/ 2>/dev/null
```
Also list existing IDs for the same brewer:
```bash
find recipes -path "*/<brewer-slug>/*" -name "*.yaml" -exec grep "^id:" {} \; | sort | uniq
```

**If collision**: try appending a variant or descriptor, or `-2`, `-3`.
Present alternatives and let the user choose.

**Always let the user override** the proposed ID.

---

## Step 6: Determine Language and Path

- Default: `recipes/en/<brewer-slug>/<id>.yaml`
- If the user explicitly writes in Chinese: `recipes/zh/<brewer-slug>/<id>.yaml`
- Create the brewer directory if needed: `mkdir -p recipes/<lang>/<brewer-slug>`

---

## Step 7: Write the Recipe File

Follow the exact YAML conventions from existing recipes in this project:

```yaml
id: <id>
name: <name>
brewer: <brewer>
dose_g: <dose>
water_ml: <water>
ratio: "<ratio>"
variant: <variant>           # omit if not applicable
water_temp_c: <temp>
brew_temperature: <category>  # cold brew only; use instead of water_temp_c
grind_size: <grind>
description: >
  <1-3 sentence description, folded block scalar with 2-space indent>
phases:
  - label: <label>
    water_g: <water_g>
    wait_seconds: <N>         # omit if 0
    pours: <N>                # omit if 1
    note: <note>              # omit if empty
  - label: ...
source:
  name: <source_name>
  url: <source_url>           # omit if no URL
  competition: <competition>  # omit if not a competition recipe
tags: [<tag1>, <tag2>, ...]
```

**Formatting rules** (verified against existing recipes):
- Two-space indentation throughout
- Top-level key order: `id`, `name`, `brewer`, `dose_g`, `water_ml`, `ratio`,
  `variant` (if present), temperature field, `grind_size`, `description`, `phases`,
  `source`, `tags`
- Phase key order: `label`, `water_g`, `wait_seconds` (if non-zero), `pours`
  (if >1), `note` (if present)
- Multi-line descriptions use `>` (folded block scalar) with 2-space continuation
  indent
- Tags use `[tag1, tag2]` inline flow sequence
- Phase notes use plain strings unless multi-line (then use `>`)
- Omit optional keys entirely when not used (don't write `wait_seconds: 0` or
  `pours: 1` or `note: ""`)
- Ratio is always a quoted string: `"1:16.7"`

For a style reference, read an existing recipe from the same brewer:
```bash
ls recipes/en/<brewer-slug>/*.yaml | head -1 | xargs cat
```

---

## Step 8: Validate

```bash
npm test
```

This runs: YAML validation → JSON Schema check → unique ID check → TypeScript
type check → Astro build → post-build site integrity check.

If it fails:
1. Read the error — it tells you the instance path and the problem
2. Fix the file
3. Re-run `npm test` until all passes

**Common failures**:
- `id` doesn't match kebab-case regex `^[a-z0-9]+(-[a-z0-9]+)*$`
- Required field missing
- Value out of range (dose 5–120, water 50–1200, temp 80–100, wait_seconds ≤ 86400)
- Source object missing `name`

---

## Step 9: Prepare for Review

Use the repository's active version-control system:

```bash
# Jujutsu (files are tracked automatically unless ignored)
jj status

# Git
git add recipes/<lang>/<brewer-slug>/<id>.yaml
```

If the recipe path is ignored in a Jujutsu repository, explicitly track it with
`jj file track --include-ignored <path>`.

**Do not commit.** Let the user review and commit themselves.

---

## Step 10: Offer Translation

After a successful English recipe is prepared for review, ask:

> "Want me to create a Chinese translation at `recipes/zh/<brewer-slug>/<id>.yaml`?
> I'll keep the same `id` and numeric values, and translate the text fields."

If they accept:
1. Translate `name`, `description`, phase `label`/`note` to Chinese
2. Write to `recipes/zh/<brewer-slug>/<id>.yaml`
3. Validate: `npm test`
4. Prepare the translated file for review using the active version-control system

The app matches recipes by `id` across language directories — they must be
identical.

---

## Pre-Handoff Checklist

Before handoff, always verify:
1. Total phase water (sum of `water_g × pours` across all phases) matches
   `water_ml` within ~10%
2. ID is unique across `recipes/` (Step 5)
3. Source has at least a `name`
4. All tags are from the approved vocabulary (schema reference)
5. Description is meaningful — not just repeating the name
6. Phase count is 1–10
