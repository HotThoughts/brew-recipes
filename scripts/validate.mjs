#!/usr/bin/env node

// brew-recipes validation suite — CLI entry point.
// Runs from repo root. Validates YAML syntax, JSON Schema conformance,
// and unique IDs per language directory. Exits 0 on success, 1 on failure.

import fs from 'node:fs';
import path from 'node:path';
import { load } from 'js-yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { walkYamlFiles, validateFile, checkUniqueIds } from './lib/validate.mjs';

const SCHEMA_PATH = 'schema.yaml';
const RECIPES_DIR = 'recipes';

// ── Load and compile schema ────────────────────────────────────────
const schema = load(fs.readFileSync(SCHEMA_PATH, 'utf8'));
const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

// ── Step 1: YAML syntax + JSON Schema validation ───────────────────
let errors = 0;

for (const file of walkYamlFiles(RECIPES_DIR)) {
  const fileErrors = validateFile(file, schema, ajv);
  if (fileErrors.length > 0) {
    console.error(`Schema error in ${file}:`);
    for (const e of fileErrors) {
      console.error(`  ${e}`);
    }
    errors += fileErrors.length;
  }
}

// ── Step 2: Unique IDs per language directory ──────────────────────
const langDirs = fs.readdirSync(RECIPES_DIR, { withFileTypes: true })
  .filter((d) => d.isDirectory())
  .map((d) => path.join(RECIPES_DIR, d.name));

for (const langDir of langDirs) {
  const dupErrors = checkUniqueIds(langDir);
  for (const e of dupErrors) {
    console.error(e);
    errors++;
  }
}

// ── Report ──────────────────────────────────────────────────────────
if (errors) {
  console.error(`\n${errors} validation error(s) found.`);
  process.exit(1);
}

const fileCount = [...walkYamlFiles(RECIPES_DIR)].length;
console.log(`All ${fileCount} recipes valid. IDs unique per language.`);
