# Brew Recipes — Pour-Over Recipe Database

[![Validate Recipes](https://github.com/HotThoughts/brew-recipes/actions/workflows/validate.yaml/badge.svg)](https://github.com/HotThoughts/brew-recipes/actions/workflows/validate.yaml)

A collection of pour-over coffee recipes in YAML format, curated for accuracy and annotated for clarity.

## Table of Contents

- [Quick Start](#quick-start)
- [Web UI](#web-ui)
- [Recipe Format](#recipe-format)
- [Local Development](#local-development)
- [Schema Reference](#schema-reference)
- [Contributing](#contributing)
- [License](#license)

## Quick Start

Browse `recipes/<language>/<brewer>/` for recipes. Each file is a self-contained YAML document.

**Brewers**: V60 · Chemex · Aeropress · Orea · April · Kalita · FrenchPress · StaggX · Origami

## Web UI

This repo includes a static Astro site for browsing the recipe database without opening raw YAML files.

```bash
# Start the local site
npm run dev

# Build the static site into dist/
npm run build

# Build with the GitHub Pages /brew-recipes base path
GITHUB_PAGES=true npm run build

# Preview the production build
npm run preview
```

The site reads directly from `recipes/`, groups recipes by language and brewer, and renders static detail pages for every recipe. `npm test` also checks that every recipe has a generated detail page.

Example:
```yaml
# recipes/en/v60/tetsu-kasuya-4-6-method.yaml
id: tetsu-kasuya-4-6-method
name: Tetsu Kasuya 4:6 Method
brewer: V60
dose_g: 20
water_ml: 300
ratio: "1:15"
water_temp_c: 92
grind_size: coarse
phases:
  - label: Bloom (40% — sweetness)
    water_g: 60
    wait_seconds: 45
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
| `brewer` | enum | V60, Chemex, Aeropress, Orea, Kalita, April, … |
| `dose_g` | number | Coffee dose (5–60 g) |
| `water_ml` | number | Total brew water (50–1000 ml) |
| `ratio` | string | Coffee:water ratio, e.g. `"1:15"` |
| `water_temp_c` | number | Water temperature (80–100 °C) |
| `grind_size` | enum | extra-coarse … extra-fine |
| `phases` | array | Pouring phases with `water_g`, timing, and notes |
| `source` | object | Attribution (name, url, competition) |
| `tags` | array | light-roast, sweet, multi-pour, beginner-friendly, … |

Translations share the same `id` across language directories — the app matches by ID.

## Local Development

**Prerequisites**: Node.js 18+

```bash
# Install dependencies (one-time)
npm install

# Validate recipes, typecheck, and build the site
npm test
```

CI runs the same `npm test` command on every push and pull request.

## Schema Reference

All recipes must conform to [`schema.yaml`](schema.yaml) (JSON Schema draft-07). The schema defines required fields, value ranges, and tag categories. It is the single source of truth for the recipe format.

See [CONTRIBUTING.md](CONTRIBUTING.md) for detailed guidance on adding or translating recipes.

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
