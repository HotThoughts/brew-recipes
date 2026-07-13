# Brew Recipes — Coffee Recipe Database

[![Validate Recipes](https://github.com/HotThoughts/brew-recipes/actions/workflows/validate.yaml/badge.svg)](https://github.com/HotThoughts/brew-recipes/actions/workflows/validate.yaml)

A community-curated collection of pour-over and cold-brew coffee recipes in YAML format, with a bilingual (EN/ZH) static website for easy browsing. Validated by JSON Schema and built with Astro.

**Live site:** [hotthoughts.github.io/brew-recipes](https://hotthoughts.github.io/brew-recipes)

## Table of Contents

- [Quick Start](#quick-start)
- [Recipe Format](#recipe-format)
- [Web UI](#web-ui)
- [Local Development](#local-development)
- [Deployment](#deployment)
- [Schema Reference](#schema-reference)
- [Agent Skill](#agent-skill)
- [Contributing](#contributing)
- [License](#license)

## Quick Start

Browse `recipes/<language>/<brewer>/` for recipes. Each file is a self-contained YAML document.

Example:
```yaml
# recipes/en/v60/tetsu-kasuya-4-6-method.yaml
id: tetsu-kasuya-4-6-method
name: Tetsu Kasuya 4:6 Method
brewer: V60
dose_g: 20
water_ml: 300
ratio: "1:15"
variant: 1-cup
water_temp_c: 92
grind_size: coarse
description: >
  Tetsu Kasuya's winning 2016 World Brewers Cup recipe. The first 40% of water
  controls flavor balance (sweetness vs acidity), the remaining 60% controls
  strength/body.
phases:
  - label: Bloom (40% — sweetness)
    water_g: 60
    wait_seconds: 45
    note: Smaller bloom emphasizes sweetness; larger bloom emphasizes acidity
  - label: Second Pour (40%)
    water_g: 60
    wait_seconds: 45
  # ...
source:
  name: Tetsu Kasuya
  url: https://www.youtube.com/watch?v=wmCW8xSWGZY
  competition: World Brewers Cup 2016
tags: [light-roast, sweet, multi-pour, competition, advanced]
```

## Recipe Format

Every recipe follows the schema at [`schema.yaml`](schema.yaml).

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Globally unique kebab-case identifier |
| `name` | string | Human-readable recipe name |
| `brewer` | enum | V60, Chemex, Aeropress, ColdBrew, Orea, Kalita, April, FrenchPress, StaggX, Origami, Other |
| `dose_g` | number | Coffee dose (5–120 g) |
| `water_ml` | number | Total brew water (50–1200 ml) |
| `ratio` | string | Coffee:water ratio, e.g. `"1:15"` (optional) |
| `variant` | string | Brewer-specific variant, e.g. `"1-cup"`, `"v3"`, `"155"` (optional) |
| `paper_filter` | enum | Paper filter shape: `cone` or `wave` (optional) |
| `water_temp_c` | number | Exact water temperature (80–100 °C); required unless `brew_temperature` is provided |
| `brew_temperature` | enum | `cold`, `room-temperature`, or `cold-or-room-temperature`; required unless `water_temp_c` is provided |
| `grind_size` | enum | extra-coarse, coarse, medium-coarse, medium, medium-fine, fine, extra-fine |
| `description` | string | Short paragraph about the recipe's character or origin (optional) |
| `phases` | array | Brew phases (1–10). Each has `label`, `water_g`, optional `wait_seconds` (0–86400s), `pours` (sub-pour count), and `note` |
| `source` | object | Attribution. Required: `name`. Optional: `url`, `competition` |
| `tags` | array | See [`schema.yaml`](schema.yaml) for the canonical tag list (roast level, flavor profile, pour style, difficulty, etc.) |

Translations share the same `id` across language directories — the website matches recipes by ID to link translations automatically.

## Web UI

This repo includes a static [Astro](https://astro.build) site that lets you browse the recipe database without opening raw YAML files. The live site is deployed at **[hotthoughts.github.io/brew-recipes](https://hotthoughts.github.io/brew-recipes)**.

Features:
- **Homepage** — all recipes grouped by brewer with dose, ratio, and tags at a glance
- **Detail pages** — each recipe shows phases with timing, grind size, water temperature, source attribution, and tags
- **i18n** — supports English and Chinese (简体中文); the header has a language switcher, and translations are auto-linked by recipe `id`

## Local Development

**Prerequisites**: Node.js 18+

```bash
# Install dependencies (one-time)
npm install

# Start the Astro dev server with hot-reload
npm run dev

# Type-check TypeScript sources
npm run check

# Validate all recipes — YAML syntax, JSON Schema, unique IDs
npm run validate

# Build the static site to dist/
npm run build

# Check that every recipe has a generated detail page
npm run check:site

# Full pipeline — validate, type-check, build, check-site
npm test
```

CI runs the same `npm test` command on every push and pull request.

## Deployment

The site is deployed to **GitHub Pages** on every push to `main` via [`.github/workflows/deploy.yaml`](.github/workflows/deploy.yaml). It builds with `GITHUB_PAGES=true` so the base path is set to `/brew-recipes`.

To preview a production build locally:
```bash
GITHUB_PAGES=true npm run build
npm run preview
```

## Schema Reference

All recipes must conform to [`schema.yaml`](schema.yaml) (JSON Schema draft-07). The schema defines required fields, value ranges, tag enum values, and phase structure. It is the single source of truth for the recipe format.

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidance on adding or translating recipes.

## Agent Skill

This repository includes a shared [`add-brew-recipe`](.agents/skills/add-brew-recipe/SKILL.md)
skill for compatible coding agents. Ask your agent to "add a recipe" and either
paste the recipe text or provide the details interactively. The skill extracts the
recipe fields, confirms them with you, writes schema-compatible YAML, runs the
project validation pipeline, and can optionally create a Chinese translation.

The canonical skill lives in `.agents/skills` for shared agent discovery.
`.claude/skills/add-brew-recipe` links to the same skill for Claude compatibility,
so both paths use a single maintained source.

## Contributing

Contributions are welcome! See [CONTRIBUTING.md](CONTRIBUTING.md) for:
- How to add a new recipe
- Recipe guidelines (accuracy, attribution, phases, tags)
- How to translate recipes into new languages
- Local validation instructions

All pull requests are automatically validated by CI. No CLA required — CC0 means your contribution enters the public domain.

Please note that this project has a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to abide by its terms.

## License

[CC0 1.0 Universal](LICENSE) — recipes are in the public domain. Copy, modify, distribute, and use them for any purpose, commercial or otherwise, without asking permission.
