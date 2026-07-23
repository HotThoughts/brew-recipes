#!/usr/bin/env node

// Post-build site integrity checker — CLI entry point.
// Verifies the built static site has expected pages and content.

import fs from 'node:fs';
import path from 'node:path';
import { load } from 'js-yaml';
import { assert, buildRecipeMap, checkDetailPage } from './lib/check-site.mjs';
import { walkYamlFiles } from './lib/walk.mjs';

const DIST_DIR = 'dist';

const recipeMap = buildRecipeMap();

// Root index page
assert(fs.existsSync(path.join(DIST_DIR, 'index.html')), 'Missing dist/index.html');
if (fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
  const homeHtml = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf8');
  assert(homeHtml.includes('data-brewer="cold-brew"'), 'Homepage missing Cold Brew filter');
  assert(homeHtml.includes('data-site-grinders-link'), 'Homepage missing global Grinders navigation');
  assert(!homeHtml.includes('data-home-grinder-link'), 'Homepage still contains redundant grinder guide link');
}

// Grinder directory and data-driven guide pages
const grinderIndex = path.join(DIST_DIR, 'grinders', 'index.html');
assert(fs.existsSync(grinderIndex), 'Missing grinder directory page');
const grinderFiles = [...walkYamlFiles('grinders')];
for (const file of grinderFiles) {
  const grinder = load(fs.readFileSync(file, 'utf8'));
  const output = path.join(DIST_DIR, 'grinders', grinder.id, 'index.html');
  assert(fs.existsSync(output), `Missing grinder guide for ${grinder.id}`);
  if (fs.existsSync(output)) {
    const html = fs.readFileSync(output, 'utf8');
    assert(html.includes(grinder.model), `Grinder guide for ${grinder.id} missing model`);
    for (const source of grinder.sources) {
      assert(html.includes(source.url), `Grinder guide for ${grinder.id} missing source ${source.id}`);
    }
    assert(html.includes('grind-direction-glyph--finer'), `Grinder guide for ${grinder.id} missing finer symbol`);
    assert(html.includes('grind-direction-glyph--coarser'), `Grinder guide for ${grinder.id} missing coarser symbol`);
  }
}

// Check each deduplicated detail page
for (const [id, versions] of recipeMap) {
  const output = path.join(DIST_DIR, versions[0].brewerSlug, id, 'index.html');
  assert(fs.existsSync(output), `Missing detail page for ${id}`);

  if (fs.existsSync(output)) {
    const html = fs.readFileSync(output, 'utf8');
    const { errors } = checkDetailPage(html, versions);
    for (const e of errors) {
      console.error(e);
      process.exitCode = 1;
    }
  }
}

const linkedRecipe = path.join(DIST_DIR, 'v60', 'hoffmann-1-cup-v60', 'index.html');
if (fs.existsSync(linkedRecipe)) {
  const html = fs.readFileSync(linkedRecipe, 'utf8');
  assert(html.includes('data-anchor="pour-over-filter"'), 'Compatible recipe missing grinder range link');
}

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log(`Static site check passed for ${recipeMap.size} recipe pages and ${grinderFiles.length} grinder guides.`);
