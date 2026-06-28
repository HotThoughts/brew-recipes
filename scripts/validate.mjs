#!/usr/bin/env node

// brew-recipes validation suite
// Runs from repo root. Validates YAML syntax, JSON Schema conformance,
// and unique IDs per language directory. Exits 0 on success, 1 on failure.

import fs from 'node:fs';
import path from 'node:path';
import { load } from 'js-yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const SCHEMA_PATH = 'schema.yaml';
const RECIPES_DIR = 'recipes';

// ── Load and compile schema ────────────────────────────────────────
const schema = load(fs.readFileSync(SCHEMA_PATH, 'utf8'));
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// ── Helpers ─────────────────────────────────────────────────────────
function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(p);
    } else if (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml')) {
      yield p;
    }
  }
}

// ── Step 1: YAML syntax + JSON Schema validation ───────────────────
let errors = 0;

for (const file of walk(RECIPES_DIR)) {
  const raw = fs.readFileSync(file, 'utf8');
  let data;
  try {
    data = load(raw);
  } catch (e) {
    console.error(`YAML syntax error in ${file}: ${e.message}`);
    errors++;
    continue;
  }

  if (!ajv.validate(schema, data)) {
    console.error(`Schema error in ${file}:`);
    for (const e of ajv.errors) {
      console.error(`  ${e.instancePath || '/'} ${e.message}`);
    }
    errors++;
  }
}

// ── Step 2: Unique IDs per language directory ──────────────────────
const langDirs = fs.readdirSync(RECIPES_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => path.join(RECIPES_DIR, d.name));

for (const langDir of langDirs) {
  const ids = [];
  for (const f of walk(langDir)) {
    const data = load(fs.readFileSync(f, 'utf8'));
    if (data && data.id) ids.push({ id: data.id, file: f });
  }

  const seen = new Set();
  for (const { id, file } of ids) {
    if (seen.has(id)) {
      console.error(`Duplicate ID "${id}" in ${langDir}: ${file}`);
      errors++;
    }
    seen.add(id);
  }
}

// ── Report ──────────────────────────────────────────────────────────
if (errors) {
  console.error(`\n${errors} validation error(s) found.`);
  process.exit(1);
}

const fileCount = [...walk(RECIPES_DIR)].length;
console.log(`All ${fileCount} recipes valid. IDs unique per language.`);
