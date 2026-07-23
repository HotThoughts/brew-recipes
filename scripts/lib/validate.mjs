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

/**
 * Validate cross-field grinder invariants that draft-07 JSON Schema cannot express.
 * @param {object} grinder
 * @returns {string[]}
 */
export function validateGrinderData(grinder) {
  const errors = [];
  const { adjustment, ranges = [], sources = [], particle_range_microns: microns } = grinder ?? {};
  if (!adjustment) return errors;

  if (adjustment.scale_min >= adjustment.scale_max) {
    errors.push('/adjustment scale_min must be less than scale_max');
  }
  if (adjustment.factory_setting !== undefined
    && (adjustment.factory_setting < adjustment.scale_min
      || adjustment.factory_setting > adjustment.scale_max)) {
    errors.push('/adjustment/factory_setting must be within the chart scale');
  }

  const rangeIds = new Set();
  for (const range of ranges) {
    if (rangeIds.has(range.id)) errors.push(`/ranges duplicate id "${range.id}"`);
    rangeIds.add(range.id);
    if (range.min_clicks !== undefined && range.max_clicks !== undefined) {
      if (range.min_clicks > range.max_clicks) {
        errors.push(`/ranges/${range.id} min_clicks must not exceed max_clicks`);
      }
      if (range.min_clicks < adjustment.scale_min || range.max_clicks > adjustment.scale_max) {
        errors.push(`/ranges/${range.id} click range must be within the chart scale`);
      }
    }
  }

  const sourceIds = new Set();
  for (const source of sources) {
    if (sourceIds.has(source.id)) errors.push(`/sources duplicate id "${source.id}"`);
    sourceIds.add(source.id);
  }
  if (microns) {
    if (microns.min >= microns.max) errors.push('/particle_range_microns min must be less than max');
    if (!sourceIds.has(microns.source_id)) {
      errors.push('/particle_range_microns source_id must reference a declared source');
    }
  }

  return errors;
}

export { walkYamlFiles };
