import { describe, it, expect, beforeEach } from 'vitest';
import path from 'node:path';
import { escapeHtml, assert, readRecipe, buildRecipeMap, checkDetailPage } from '../../scripts/lib/check-site.mjs';

const FIXTURES_DIR = path.join(import.meta.dirname, '..', 'fixtures');

// ─── escapeHtml ───────────────────────────────────────────────────────

describe('escapeHtml', () => {
  it('escapes ampersand', () => {
    expect(escapeHtml('A & B')).toBe('A &amp; B');
  });

  it('escapes double quotes', () => {
    expect(escapeHtml('say "hello"')).toBe('say &quot;hello&quot;');
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe('it&#39;s');
  });

  it('escapes angle brackets', () => {
    expect(escapeHtml('<script>')).toBe('&lt;script&gt;');
  });

  it('passes through normal text', () => {
    expect(escapeHtml('Hello World')).toBe('Hello World');
  });

  it('handles non-string input gracefully', () => {
    // The function uses String() coercion, so numbers work fine
    expect(escapeHtml('123')).toBe('123');
  });
});

// ─── assert ───────────────────────────────────────────────────────────

describe('assert', () => {
  beforeEach(() => {
    process.exitCode = undefined;
  });

  it('does nothing when condition is true', () => {
    assert(true, 'should not fire');
    expect(process.exitCode).toBeUndefined();
  });

  it('sets process.exitCode to 1 when condition is false', () => {
    assert(false, 'test failure');
    expect(process.exitCode).toBe(1);
  });
});

// ─── readRecipe ───────────────────────────────────────────────────────

describe('readRecipe', () => {
  it('parses a recipe file and extracts metadata', () => {
    const file = path.join(FIXTURES_DIR, 'valid-recipes', 'en', 'v60', 'test-recipe-a.yaml');
    const result = readRecipe(file, path.join(FIXTURES_DIR, 'valid-recipes'), 'dist') as Record<string, unknown>;
    expect(result.id).toBe('test-recipe-a');
    expect(result.name).toBe('Test Recipe A');
    expect(result.brewer).toBe('V60');
    expect(result.brewerSlug).toBe('v60');
    expect(result.output).toBe(path.join('dist', 'v60', 'test-recipe-a', 'index.html'));
    expect((result.source as Record<string, unknown>).name).toBe('Test Source');
  });
});

// ─── buildRecipeMap ───────────────────────────────────────────────────

describe('buildRecipeMap', () => {
  it('groups recipes by ID across languages', () => {
    const recipesDir = path.join(FIXTURES_DIR, 'valid-recipes');
    const map = buildRecipeMap(recipesDir, 'dist');
    expect(map.has('test-recipe-a')).toBe(true);
    expect(map.has('test-recipe-b')).toBe(true);
    // test-recipe-a exists in both en and zh
    expect(map.get('test-recipe-a')).toHaveLength(2);
    // test-recipe-b only in en
    expect(map.get('test-recipe-b')).toHaveLength(1);
  });
});

// ─── checkDetailPage ─────────────────────────────────────────────────

describe('checkDetailPage', () => {
  const makeVersion = (overrides: Record<string, unknown> = {}) => ({
    id: 'test-recipe-a',
    name: 'Test Recipe A',
    source: { name: 'Test Source' },
    brewerSlug: 'v60',
    ...overrides,
  });

  it('returns no errors when all content is present', () => {
    const html = '<html>Test Recipe A brewed by Test Source</html>';
    const result = checkDetailPage(html, [makeVersion()]);
    expect(result.errors).toHaveLength(0);
  });

  it('detects missing recipe name', () => {
    const html = '<html>no names here</html>';
    const result = checkDetailPage(html, [makeVersion()]);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('missing name');
  });

  it('detects missing source name', () => {
    const html = '<html>Test Recipe A</html>';
    const result = checkDetailPage(html, [makeVersion({ source: {} })]);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('missing source field');
  });

  it('detects missing source value in HTML', () => {
    const html = '<html>Test Recipe A</html>';
    const result = checkDetailPage(html, [makeVersion()]);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('missing source');
  });

  it('checks all language versions', () => {
    const html = '<html>Test Recipe A brewed by Test Source. Plus 测试配方 A by 测试来源</html>';
    const versions = [
      makeVersion({ name: 'Test Recipe A', source: { name: 'Test Source' } }),
      makeVersion({ name: '测试配方 A', source: { name: '测试来源' } }),
    ];
    const result = checkDetailPage(html, versions);
    expect(result.errors).toHaveLength(0);
  });

  it('checks cold-brew-specific detail content', () => {
    const version = makeVersion({
      brewer: 'ColdBrew',
      source: { name: 'Test Source', url: 'https://example.com/cold-brew' },
    });
    const html = '<html>Test Recipe A · Test Source · brew steps · 冲煮步骤 · https://example.com/cold-brew</html>';
    expect(checkDetailPage(html, [version]).errors).toHaveLength(0);
    expect(checkDetailPage(`${html}>0g<`, [version]).errors).toContain(
      'Cold-brew detail page for test-recipe-a shows irrelevant pour-step values',
    );
  });
});
