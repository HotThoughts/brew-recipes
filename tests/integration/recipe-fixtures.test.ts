import { describe, it, expect } from 'vitest';
import path from 'node:path';
import { getRecipes, getRecipeCollection } from '../../src/lib/recipes';

const FIXTURES_DIR = path.join(import.meta.dirname, '..', 'fixtures', 'valid-recipes');

describe('Recipe loading (integration with fixtures)', () => {
  it('getRecipes loads and sorts recipes from fixture dir', () => {
    const recipes = getRecipes(FIXTURES_DIR);
    expect(recipes.length).toBe(3); // test-recipe-a (en), test-recipe-b (en), test-recipe-a (zh)

    // Recipes are sorted by language first, then brewer rank, then name
    // 'en' < 'zh' alphabetically
    expect(recipes[0].language).toBe('en');
    expect(recipes[2].language).toBe('zh');
  });

  it('getRecipes includes computed fields', () => {
    const recipes = getRecipes(FIXTURES_DIR);
    for (const r of recipes) {
      expect(r).toHaveProperty('language');
      expect(r).toHaveProperty('brewerSlug');
      expect(r).toHaveProperty('filePath');
      expect(r).toHaveProperty('urlPath');
      expect(r).toHaveProperty('phases');
      expect(r).toHaveProperty('source');
    }
  });

  it('getRecipes computes urlPath correctly', () => {
    const recipes = getRecipes(FIXTURES_DIR);
    const v60Recipe = recipes.find((r) => r.id === 'test-recipe-a' && r.language === 'en');
    expect(v60Recipe).toBeDefined();
    expect(v60Recipe!.urlPath).toBe('/v60/test-recipe-a/');
  });

  it('getRecipeCollection groups by language', () => {
    const collection = getRecipeCollection(FIXTURES_DIR);
    expect(collection.languages).toContain('en');
    expect(collection.languages).toContain('zh');
    expect(collection.byLanguage.get('en')).toHaveLength(2);
    expect(collection.byLanguage.get('zh')).toHaveLength(1);
  });

  it('getRecipeCollection sorts languages alphabetically', () => {
    const collection = getRecipeCollection(FIXTURES_DIR);
    expect(collection.languages[0]).toBe('en');
    expect(collection.languages[1]).toBe('zh');
  });

  it('loads a full recipe with all optional fields', () => {
    const recipes = getRecipes(FIXTURES_DIR);
    const full = recipes.find((r) => r.id === 'test-recipe-b');
    expect(full).toBeDefined();
    expect(full!.description).toBeDefined();
    expect(full!.ratio).toBe('1:16.7');
    expect(full!.variant).toBe('1-cup');
    expect(full!.tags).toContain('light-roast');
    expect(full!.tags).toContain('sweet');
    expect(full!.tags).toContain('competition');
    expect(full!.source.url).toBe('https://example.com/recipe');
    expect(full!.source.competition).toBe('Test Cup 2024');
    expect(full!.phases).toHaveLength(2);
    expect(full!.phases[0].note).toBe('Spiral pour');
    expect(full!.phases[0].pours).toBe(1);
    expect(full!.phases[1].pours).toBe(3);
  });
});
