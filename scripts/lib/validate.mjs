// Validation helpers for brew-recipes recipe YAML files.
// Extracted from scripts/validate.mjs so they can be imported and unit-tested.

import fs from 'node:fs';
import { load } from 'js-yaml';
import { walkYamlFiles } from './walk.mjs';

/**
 * Validate YAML syntax and JSON Schema for a single recipe file.
 * Returns an array of error strings (empty on success).
 * @param {string} filePath - path to the YAML file
 * @param {object} schema - compiled JSON Schema
 * @param {import('ajv').Ajv} ajv - configured Ajv instance
 * @returns {string[]} array of error messages (empty = valid)
 */
export function validateFile(filePath, schema, ajv) {
  const errors = [];
  const raw = fs.readFileSync(filePath, 'utf8');
  let data;
  try {
    data = load(raw);
  } catch (e) {
    errors.push(`YAML syntax error in ${filePath}: ${e.message}`);
    return errors;
  }

  if (!ajv.validate(schema, data)) {
    for (const e of ajv.errors) {
      errors.push(`${e.instancePath || '/'} ${e.message}`);
    }
  }

  return errors;
}

/**
 * Check for duplicate recipe IDs within a single language directory.
 * Returns an array of error strings (empty = no duplicates found).
 * @param {string} langDir - path to a language subdirectory (e.g. recipes/en/)
 * @returns {string[]} array of error messages (empty = valid)
 */
export function checkUniqueIds(langDir) {
  const errors = [];
  const ids = [];
  for (const f of walkYamlFiles(langDir)) {
    const raw = fs.readFileSync(f, 'utf8');
    let data;
    try {
      data = load(raw);
    } catch {
      // Syntax errors are caught by validateFile, skip here
      continue;
    }
    if (data && data.id) ids.push({ id: data.id, file: f });
  }

  const seen = new Set();
  for (const { id, file } of ids) {
    if (seen.has(id)) {
      errors.push(`Duplicate ID "${id}" in ${langDir}: ${file}`);
    }
    seen.add(id);
  }

  return errors;
}

export { walkYamlFiles };
