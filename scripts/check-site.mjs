#!/usr/bin/env node

// Post-build site integrity checker — CLI entry point.
// Verifies the built static site has expected pages and content.

import fs from 'node:fs';
import path from 'node:path';
import { assert, buildRecipeMap, checkDetailPage } from './lib/check-site.mjs';

const DIST_DIR = 'dist';

const recipeMap = buildRecipeMap();

// Root index page
assert(fs.existsSync(path.join(DIST_DIR, 'index.html')), 'Missing dist/index.html');
if (fs.existsSync(path.join(DIST_DIR, 'index.html'))) {
  const homeHtml = fs.readFileSync(path.join(DIST_DIR, 'index.html'), 'utf8');
  assert(homeHtml.includes('data-brewer="cold-brew"'), 'Homepage missing Cold Brew filter');
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

if (process.exitCode) {
  process.exit(process.exitCode);
}

console.log(`Static site check passed for ${recipeMap.size} recipe pages.`);
