# Contributing

## Adding a Recipe

1. Pick a unique `id` in kebab-case (e.g., `hoffmann-1-cup-v60`).
2. Create the file under `recipes/<language>/<brewer>/<id>.yaml`.
3. Fill in all required fields (see schema.yaml).
4. Run `yaml validate` locally or open a PR — CI checks format + uniqueness.

## Recipe Guidelines

- **Accuracy**: Include exact parameters from the source. Use `water_temp_c` for a stated Celsius temperature or `brew_temperature` for categorical cold-brew extraction.
- **Attribution**: Always link to the original source (video, blog post, book).
- **Phases**: Break the method into discrete steps with timing. Long cold-brew steeps are stored in seconds and may run up to 24 hours.
- **Tags**: Use existing tags where possible; new tags are fine if they add meaningful filtering categories.

## Adding a New Language

Duplicate an existing recipe directory under `recipes/<new-locale>/` and translate the text fields. Keep the `id` identical — the app matches by ID across languages.

## Validation

All PRs are checked via GitHub Actions:
- YAML syntax validity
- JSON Schema conformance (against `schema.yaml`)
- Unique `id` fields _within each language directory_ (translations share IDs across languages)
- Required fields present

Run locally:
```bash
npm install && npm test
```
