import { describe, expect, it } from 'vitest';
import { getRecipeCollection, getTotalPhaseWater, getTotalWaitSeconds } from '../../src/lib/recipes';

const COLD_BREW_IDS = [
  'roeststaette-classic-cold-brew',
  'hario-filter-in-bottle-cold-brew',
  'the-barn-mizudashi-cold-brew',
  'hoffmann-decant-cold-brew',
];

describe('cold-brew recipe data integrity', () => {
  const collection = getRecipeCollection();
  const coldBrews = collection.recipes.filter((recipe) => recipe.brewer === 'ColdBrew');

  it('contains four methods in both language datasets', () => {
    expect(coldBrews).toHaveLength(8);
    for (const id of COLD_BREW_IDS) {
      expect(collection.byLanguage.get('en')?.some((recipe) => recipe.id === id)).toBe(true);
      expect(collection.byLanguage.get('zh')?.some((recipe) => recipe.id === id)).toBe(true);
    }
  });

  it('keeps phase water equal to recipe water and records long steep times', () => {
    for (const recipe of coldBrews) {
      const phaseWater = recipe.phases.reduce((total, phase) => total + getTotalPhaseWater(phase), 0);
      expect(phaseWater).toBe(recipe.water_ml);
      expect(getTotalWaitSeconds(recipe)).toBeGreaterThanOrEqual(28800);
      expect(recipe.tags).toContain('cold-brew');
      expect(recipe.tags).toContain('immersion');
    }
  });
});
