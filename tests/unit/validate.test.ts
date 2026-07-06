import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { walkYamlFiles, validateFile, checkUniqueIds } from '../../scripts/lib/validate.mjs';
import { createAjv } from '../helpers/create-ajv';

const FIXTURES_DIR = path.join(import.meta.dirname, '..', 'fixtures');

// ─── walkYamlFiles ────────────────────────────────────────────────────

describe('walkYamlFiles', () => {
  it('yields all .yaml files in a directory tree', () => {
    const dir = path.join(FIXTURES_DIR, 'valid-recipes');
    const files = [...walkYamlFiles(dir)];
    expect(files.length).toBe(3); // 2 en + 1 zh
    expect(files.every((f) => f.endsWith('.yaml') || f.endsWith('.yml'))).toBe(true);
  });

  it('yields nothing for empty or non-existent directory', () => {
    const dir = path.join(FIXTURES_DIR, 'empty-dir');
    // Create an empty dir if it doesn't exist
    fs.mkdirSync(dir, { recursive: true });
    const files = [...walkYamlFiles(dir)];
    expect(files).toHaveLength(0);
    fs.rmdirSync(dir);
  });
});

// ─── validateFile ─────────────────────────────────────────────────────

describe('validateFile', () => {
  const { schema, ajv } = createAjv();

  it('returns no errors for a valid recipe', () => {
    const file = path.join(FIXTURES_DIR, 'valid-recipes', 'en', 'v60', 'test-recipe-a.yaml');
    const errors = validateFile(file, schema, ajv);
    expect(errors).toHaveLength(0);
  });

  it('detects YAML syntax errors', () => {
    const file = path.join(FIXTURES_DIR, 'invalid-yaml', 'bad-syntax.yaml');
    const errors = validateFile(file, schema, ajv);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('YAML syntax error');
  });

  it('detects missing required field (id)', () => {
    const file = path.join(FIXTURES_DIR, 'invalid-schema', 'missing-id.yaml');
    const errors = validateFile(file, schema, ajv);
    expect(errors.length).toBeGreaterThan(0);
    const msg = errors.join(' ');
    expect(msg).toMatch(/required|missing|must/);
  });

  it('detects bad enum value (brewer)', () => {
    const file = path.join(FIXTURES_DIR, 'invalid-schema', 'bad-brewer.yaml');
    const errors = validateFile(file, schema, ajv);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('detects pattern violation (uppercase id)', () => {
    const file = path.join(FIXTURES_DIR, 'invalid-schema', 'bad-pattern.yaml');
    const errors = validateFile(file, schema, ajv);
    expect(errors.length).toBeGreaterThan(0);
    const msg = errors.join(' ');
    expect(msg).toMatch(/pattern/);
  });
});

// ─── checkUniqueIds ──────────────────────────────────────────────────

describe('checkUniqueIds', () => {
  it('returns no errors for unique IDs within a language', () => {
    const dir = path.join(FIXTURES_DIR, 'valid-recipes', 'en');
    const errors = checkUniqueIds(dir);
    expect(errors).toHaveLength(0);
  });

  it('detects duplicate IDs in same language directory', () => {
    const dir = path.join(FIXTURES_DIR, 'duplicate-ids', 'en');
    const errors = checkUniqueIds(dir);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('Duplicate ID');
    expect(errors[0]).toContain('dup');
  });

  it('no cross-language duplicate check is performed', () => {
    // The function only checks within one directory at a time.
    // Same ID in different languages is fine — we test each lang dir individually.
    const enDir = path.join(FIXTURES_DIR, 'valid-recipes', 'en');
    const zhDir = path.join(FIXTURES_DIR, 'valid-recipes', 'zh');
    expect(checkUniqueIds(enDir)).toHaveLength(0);
    expect(checkUniqueIds(zhDir)).toHaveLength(0);
    // Both share test-recipe-a ID across languages, but checkUniqueIds
    // is per-directory, so each passes independently.
  });
});
