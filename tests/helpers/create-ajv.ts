import fs from 'node:fs';
import path from 'node:path';
import { load } from 'js-yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const SCHEMA_PATH = path.join(import.meta.dirname, '..', '..', 'schema.yaml');

/**
 * Create a configured Ajv instance with the project's JSON Schema loaded.
 * Shared helper for validation unit and integration tests.
 */
export function createAjv(): { schema: object; ajv: Ajv } {
  const schema = load(fs.readFileSync(SCHEMA_PATH, 'utf8')) as object;
  const ajv = new Ajv({ allErrors: true });
  addFormats(ajv);
  return { schema, ajv };
}
