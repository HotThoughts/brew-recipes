// Post-build site integrity check helpers.
// Extracted from scripts/check-site.mjs so they can be imported and unit-tested.

import fs from 'node:fs';
import path from 'node:path';
import { load } from 'js-yaml';
import { walkYamlFiles } from './walk.mjs';

const RECIPES_DIR = 'recipes';
const DIST_DIR = 'dist';
const ZERO_GRAM_TEXT_PATTERN = />\s*0\s*g\s*</iu;
const AS_NEEDED_TEXT_PATTERN = />\s*as(?:\s|&nbsp;|&#160;|&#x0*a0;)+needed\s*</iu;
const ZH_AS_NEEDED_TEXT_PATTERN = />\s*按需注水\s*</u;

/**
 * Parse a recipe YAML file and extract its metadata for site verification.
 * @param {string} file - path to the recipe YAML file
 * @param {string} [recipesDir='recipes'] - base recipes directory
 * @param {string} [distDir='dist'] - base dist directory
 * @returns {{ id: string, name: string, source: { name: string }, brewerSlug: string, output: string }}
 */
export function readRecipe(file, recipesDir, distDir) {
  const rDir = recipesDir ?? RECIPES_DIR;
  const dDir = distDir ?? DIST_DIR;
  // Extract brewerSlug from path: recipes/en/v60/foo.yaml -> parts[1] = 'v60'
  const relativePath = path.relative(rDir, file);
  const parts = relativePath.split(path.sep);
  const brewerSlug = parts[1];
  const data = load(fs.readFileSync(file, 'utf8'));

  return {
    ...data,
    brewerSlug,
    // Detail pages are language-independent: /:brewer/:id/
    output: path.join(dDir, brewerSlug, data.id, 'index.html'),
  };
}

/**
 * Assert a condition; sets process.exitCode = 1 on failure.
 * @param {boolean} condition
 * @param {string} message
 */
export function assert(condition, message) {
  if (!condition) {
    console.error(message);
    process.exitCode = 1;
  }
}

/**
 * Escape special HTML characters in a string.
 * @param {string} value
 * @returns {string}
 */
export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

/**
 * Build a recipe map from all recipe files, grouped by ID.
 * Each ID maps to an array of language versions.
 * @param {string} [recipesDir='recipes']
 * @param {string} [distDir='dist']
 * @returns {Map<string, Array>}
 */
export function buildRecipeMap(recipesDir, distDir) {
  const allRecipes = [...walkYamlFiles(recipesDir ?? RECIPES_DIR)].sort().map((f) => readRecipe(f, recipesDir, distDir));
  const recipeMap = new Map();
  for (const r of allRecipes) {
    if (!recipeMap.has(r.id)) recipeMap.set(r.id, []);
    recipeMap.get(r.id).push(r);
  }
  return recipeMap;
}

/**
 * Check a recipe detail page for expected content.
 * @param {string} html - page HTML content
 * @param {Array} versions - array of recipe objects (one per language)
 * @returns {{ errors: string[] }}
 */
export function checkDetailPage(html, versions) {
  const errors = [];
  for (const v of versions) {
    const escapedName = escapeHtml(v.name);
    if (!html.includes(escapedName)) {
      errors.push(`Detail page for ${v.id} missing name "${v.name}"`);
    }
    if (!v.source?.name) {
      errors.push(`Detail page for ${v.id} missing source field`);
    } else if (!html.includes(escapeHtml(v.source.name))) {
      errors.push(`Detail page for ${v.id} missing source "${v.source.name}"`);
    }
    if (v.brewer === 'ColdBrew') {
      if (!html.includes('brew steps') || !html.includes('冲煮步骤')) {
        errors.push(`Cold-brew detail page for ${v.id} missing localized brew-step headings`);
      }
      if (v.source?.url && !html.includes(escapeHtml(v.source.url))) {
        errors.push(`Cold-brew detail page for ${v.id} missing source URL`);
      }
      if (
        ZERO_GRAM_TEXT_PATTERN.test(html)
        || AS_NEEDED_TEXT_PATTERN.test(html)
        || ZH_AS_NEEDED_TEXT_PATTERN.test(html)
      ) {
        errors.push(`Cold-brew detail page for ${v.id} shows irrelevant pour-step values`);
      }
    }
  }
  return { errors };
}
