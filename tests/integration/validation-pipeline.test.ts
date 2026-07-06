import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { walkYamlFiles, validateFile, checkUniqueIds } from '../../scripts/lib/validate.mjs';
import { createAjv } from '../helpers/create-ajv';

const FIXTURES_DIR = path.join(import.meta.dirname, '..', 'fixtures');

describe('Validation Pipeline (integration)', () => {
  const { schema, ajv } = createAjv();

  it('valid recipes pass full validation', () => {
    const dir = path.join(FIXTURES_DIR, 'valid-recipes');
    let errors = 0;
    for (const file of walkYamlFiles(dir)) {
      const fileErrors = validateFile(file, schema, ajv);
      errors += fileErrors.length;
    }
    expect(errors).toBe(0);
  });

  it('valid recipes have unique IDs per language', () => {
    const dir = path.join(FIXTURES_DIR, 'valid-recipes');
    const langDirs = fs.readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => path.join(dir, d.name));

    for (const langDir of langDirs) {
      const errors = checkUniqueIds(langDir);
      expect(errors).toHaveLength(0);
    }
  });

  it('detects invalid YAML syntax', () => {
    const dir = path.join(FIXTURES_DIR, 'invalid-yaml');
    let errors = 0;
    for (const file of walkYamlFiles(dir)) {
      const fileErrors = validateFile(file, schema, ajv);
      errors += fileErrors.length;
    }
    expect(errors).toBeGreaterThan(0);
  });

  it('detects every invalid-schema fixture', () => {
    const dir = path.join(FIXTURES_DIR, 'invalid-schema');
    const files = [...walkYamlFiles(dir)];
    expect(files.length).toBeGreaterThanOrEqual(3);

    for (const file of files) {
      const fileErrors = validateFile(file, schema, ajv);
      expect(fileErrors.length, `${path.basename(file)} should fail validation`).toBeGreaterThan(0);
    }
  });

  it('detects duplicate IDs within same language', () => {
    const dir = path.join(FIXTURES_DIR, 'duplicate-ids', 'en');
    const errors = checkUniqueIds(dir);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('allows same IDs across different languages', () => {
    const baseDir = path.join(FIXTURES_DIR, 'valid-recipes');
    // test-recipe-a exists in both en/ and zh/ with the same ID — that's valid
    const allErrors = [];
    const langDirs = fs.readdirSync(baseDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => path.join(baseDir, d.name));

    for (const langDir of langDirs) {
      allErrors.push(...checkUniqueIds(langDir));
    }
    expect(allErrors).toHaveLength(0);
  });

  it('valid recipes have a file count', () => {
    const dir = path.join(FIXTURES_DIR, 'valid-recipes');
    const fileCount = [...walkYamlFiles(dir)].length;
    expect(fileCount).toBe(3); // 2 en + 1 zh
  });
});
