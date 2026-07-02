#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { load } from 'js-yaml';

const RECIPES_DIR = 'recipes';
const DIST_DIR = 'dist';

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      yield* walk(entryPath);
    } else if (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml')) {
      yield entryPath;
    }
  }
}

function readRecipe(file) {
  const [, , brewerSlug] = file.match(/^recipes\/([^/]+)\/([^/]+)\//) ?? [];
  const data = load(fs.readFileSync(file, 'utf8'));

  return {
    ...data,
    brewerSlug,
    // Detail pages are language-independent: /:brewer/:id/
    output: path.join(DIST_DIR, brewerSlug, data.id, 'index.html'),
  };
}

function assert(condition, message) {
  if (!condition) {
    console.error(message);
    process.exitCode = 1;
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

const allRecipes = [...walk(RECIPES_DIR)].sort().map(readRecipe);

// Group by id — each unique id produces one detail page with both lang versions
const recipeMap = new Map();
for (const r of allRecipes) {
  if (!recipeMap.has(r.id)) recipeMap.set(r.id, []);
  recipeMap.get(r.id).push(r);
}

// Root index page
assert(fs.existsSync(path.join(DIST_DIR, 'index.html')), 'Missing dist/index.html');

// Check each deduplicated detail page
for (const [id, versions] of recipeMap) {
  const output = path.join(DIST_DIR, versions[0].brewerSlug, id, 'index.html');
  assert(fs.existsSync(output), `Missing detail page for ${id}`);

  if (fs.existsSync(output)) {
    const html = fs.readFileSync(output, 'utf8');
    // Each language version's name and source should appear in the page
    for (const v of versions) {
      assert(html.includes(escapeHtml(v.name)), `Detail page for ${id} missing name "${v.name}"`);
      assert(v.source?.name, `Detail page for ${id} missing source field`);
      assert(html.includes(escapeHtml(v.source.name)), `Detail page for ${id} missing source "${v.source.name}"`);
    }
  }
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log(`Static site check passed for ${recipeMap.size} recipe pages.`);
