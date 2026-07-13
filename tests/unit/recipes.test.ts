import { describe, it, expect } from 'vitest';
import {
  isLanguageCode,
  brewerRank,
  formatBrewerName,
  formatBrewTemperature,
  slugifyBrewer,
  getBrewerGroups,
  formatSeconds,
  formatRecipeCount,
  getPourStyles,
  getTotalPhaseWater,
  getTotalWaitSeconds,
  withBase,
  type Recipe,
  type Phase,
} from '../../src/lib/recipes';

// ─── isLanguageCode ──────────────────────────────────────────────────

describe('isLanguageCode', () => {
  it('returns true for "en"', () => {
    expect(isLanguageCode('en')).toBe(true);
  });

  it('returns true for "zh"', () => {
    expect(isLanguageCode('zh')).toBe(true);
  });

  it('returns false for unsupported codes', () => {
    expect(isLanguageCode('de')).toBe(false);
    expect(isLanguageCode('fr')).toBe(false);
    expect(isLanguageCode('')).toBe(false);
  });
});

// ─── brewerRank ──────────────────────────────────────────────────────

describe('brewerRank', () => {
  it('returns 0 for V60 (first in order)', () => {
    expect(brewerRank('V60')).toBe(0);
  });

  it('returns correct index for known brewers', () => {
    expect(brewerRank('Aeropress')).toBe(2);
    expect(brewerRank('Chemex')).toBe(5);
    expect(brewerRank('Orea')).toBe(1);
  });

  it('returns BREWER_ORDER.length for unknown brewers', () => {
    expect(brewerRank('NotABrewer')).toBe(11);
  });

  it('is case-sensitive (unknown returns max)', () => {
    expect(brewerRank('v60')).toBe(11);
  });
});

describe('formatBrewerName', () => {
  it('adds the display space for ColdBrew', () => {
    expect(formatBrewerName('ColdBrew')).toBe('Cold Brew');
    expect(formatBrewerName('V60')).toBe('V60');
  });
});

// ─── slugifyBrewer ───────────────────────────────────────────────────

describe('slugifyBrewer', () => {
  it('converts CamelCase to kebab-case', () => {
    expect(slugifyBrewer('V60')).toBe('v60');
    expect(slugifyBrewer('FrenchPress')).toBe('french-press');
    expect(slugifyBrewer('StaggX')).toBe('stagg-x');
  });

  it('preserves already single-case names', () => {
    expect(slugifyBrewer('Aeropress')).toBe('aeropress');
    expect(slugifyBrewer('Origami')).toBe('origami');
  });

  it('handles edge cases', () => {
    expect(slugifyBrewer('')).toBe('');
    expect(slugifyBrewer('already-kebab')).toBe('already-kebab');
  });
});

// ─── getBrewerGroups ─────────────────────────────────────────────────

describe('getBrewerGroups', () => {
  const makeRecipe = (brewer: string, id: string): Recipe => ({
    id,
    name: id,
    brewer,
    brewerSlug: slugifyBrewer(brewer),
    language: 'en',
    filePath: `recipes/en/${slugifyBrewer(brewer)}/${id}.yaml`,
    urlPath: `/${slugifyBrewer(brewer)}/${id}/`,
    dose_g: 15,
    water_ml: 250,
    water_temp_c: 93,
    grind_size: 'medium',
    phases: [],
    source: { name: 'Test' },
  });

  it('groups recipes by brewer slug', () => {
    const recipes = [
      makeRecipe('V60', 'a'),
      makeRecipe('V60', 'b'),
      makeRecipe('Orea', 'c'),
    ];
    const groups = getBrewerGroups(recipes);
    expect(groups).toHaveLength(2);
    expect(groups[0].brewerSlug).toBe('v60');
    expect(groups[0].recipes).toHaveLength(2);
    expect(groups[1].brewerSlug).toBe('orea');
    expect(groups[1].recipes).toHaveLength(1);
  });

  it('sorts groups by brewer rank', () => {
    const recipes = [
      makeRecipe('Chemex', 'a'),
      makeRecipe('V60', 'b'),
      makeRecipe('Aeropress', 'c'),
    ];
    const groups = getBrewerGroups(recipes);
    expect(groups[0].brewer).toBe('V60');
    expect(groups[1].brewer).toBe('Aeropress');
    expect(groups[2].brewer).toBe('Chemex');
  });

  it('returns empty array for empty input', () => {
    expect(getBrewerGroups([])).toEqual([]);
  });
});

// ─── formatSeconds ───────────────────────────────────────────────────

describe('formatSeconds', () => {
  describe('English (default)', () => {
    it('returns "as needed" for undefined', () => {
      expect(formatSeconds(undefined)).toBe('as needed');
    });

    it('returns "draw down" for 0', () => {
      expect(formatSeconds(0)).toBe('draw down');
    });

    it('formats seconds only (<60s)', () => {
      expect(formatSeconds(30)).toBe('30s');
      expect(formatSeconds(45)).toBe('45s');
    });

    it('formats minutes only (exact multiple of 60)', () => {
      expect(formatSeconds(60)).toBe('1m');
      expect(formatSeconds(120)).toBe('2m');
    });

    it('formats minutes and seconds', () => {
      expect(formatSeconds(90)).toBe('1m 30s');
      expect(formatSeconds(150)).toBe('2m 30s');
    });

    it('formats long cold-brew durations', () => {
      expect(formatSeconds(28800)).toBe('8h');
      expect(formatSeconds(43200)).toBe('12h');
      expect(formatSeconds(61200)).toBe('17h');
      expect(formatSeconds(3690)).toBe('1h 1m 30s');
    });
  });

  describe('Chinese (zh)', () => {
    it('returns Chinese for undefined', () => {
      expect(formatSeconds(undefined, 'zh')).toBe('按需注水');
    });

    it('returns Chinese for 0', () => {
      expect(formatSeconds(0, 'zh')).toBe('滴滤');
    });

    it('formats the same for numeric values (same formatting)', () => {
      expect(formatSeconds(45, 'zh')).toBe('45s');
      expect(formatSeconds(90, 'zh')).toBe('1m 30s');
    });
  });
});

describe('formatBrewTemperature', () => {
  it('formats exact Celsius temperatures', () => {
    expect(formatBrewTemperature({ water_temp_c: 93 })).toBe('93°C');
  });

  it('localizes categorical temperatures', () => {
    expect(formatBrewTemperature({ brew_temperature: 'cold' }, 'en')).toBe('cold');
    expect(formatBrewTemperature({ brew_temperature: 'room-temperature' }, 'zh')).toBe('室温');
    expect(formatBrewTemperature({ brew_temperature: 'cold-or-room-temperature' }, 'zh')).toBe('冷水 / 室温');
  });
});

// ─── formatRecipeCount ────────────────────────────────────────────────

describe('formatRecipeCount', () => {
  describe('English', () => {
    it('uses singular for 1', () => {
      expect(formatRecipeCount(1)).toBe('1 method');
    });

    it('uses plural for other counts', () => {
      expect(formatRecipeCount(0)).toBe('0 methods');
      expect(formatRecipeCount(3)).toBe('3 methods');
    });
  });

  describe('Chinese', () => {
    it('formats with Chinese text', () => {
      expect(formatRecipeCount(1, 'zh')).toBe('1 个方法');
      expect(formatRecipeCount(5, 'zh')).toBe('5 个方法');
    });
  });
});

// ─── getPourStyles ────────────────────────────────────────────────────

describe('getPourStyles', () => {
  it('returns empty array for undefined note', () => {
    expect(getPourStyles(undefined)).toEqual([]);
  });

  it('returns empty array for empty note', () => {
    expect(getPourStyles('')).toEqual([]);
  });

  it('detects English keywords', () => {
    expect(getPourStyles('Spiral pour')).toEqual(['spiral']);
    expect(getPourStyles('Circular pour gently')).toEqual(['circular']);
    expect(getPourStyles('Pour in center')).toEqual(['center']);
    expect(getPourStyles('Swirl to finish')).toEqual(['swirl']);
  });

  it('detects Chinese keywords', () => {
    expect(getPourStyles('螺旋注水')).toEqual(['spiral']);
    expect(getPourStyles('绕圈注水')).toEqual(['circular']);
    expect(getPourStyles('中心注水')).toEqual(['center']);
    expect(getPourStyles('旋转注水')).toEqual(['swirl']);
  });

  it('detects multiple styles in order of appearance', () => {
    expect(getPourStyles('Spiral pour. Swirl gently')).toEqual(['spiral', 'swirl']);
    expect(getPourStyles('Swirl then spiral')).toEqual(['swirl', 'spiral']);
  });

  it('returns at most 2 styles', () => {
    const result = getPourStyles('spiral circular center swirl');
    expect(result.length).toBeLessThanOrEqual(2);
  });

  it('is case-insensitive', () => {
    expect(getPourStyles('SPIRAL')).toEqual(['spiral']);
    expect(getPourStyles('Spiral')).toEqual(['spiral']);
  });

  it('matches "concentric" as circular', () => {
    expect(getPourStyles('Concentric circles')).toEqual(['circular']);
  });
});

// ─── getTotalPhaseWater ──────────────────────────────────────────────

describe('getTotalPhaseWater', () => {
  it('returns water_g with no pours', () => {
    const phase: Phase = { label: 'Bloom', water_g: 50 };
    expect(getTotalPhaseWater(phase)).toBe(50);
  });

  it('multiplies water_g by pours', () => {
    const phase: Phase = { label: 'Main', water_g: 30, pours: 3 };
    expect(getTotalPhaseWater(phase)).toBe(90);
  });

  it('returns water_g when pours is 1', () => {
    const phase: Phase = { label: 'Bloom', water_g: 40, pours: 1 };
    expect(getTotalPhaseWater(phase)).toBe(40);
  });

  it('returns 0 for zero water_g', () => {
    const phase: Phase = { label: 'Empty', water_g: 0, pours: 5 };
    expect(getTotalPhaseWater(phase)).toBe(0);
  });
});

// ─── getTotalWaitSeconds ──────────────────────────────────────────────

describe('getTotalWaitSeconds', () => {
  const baseRecipe = (phases: Phase[]): Recipe => ({
    id: 'test',
    name: 'Test',
    brewer: 'V60',
    brewerSlug: 'v60',
    language: 'en',
    filePath: 'recipes/en/v60/test.yaml',
    urlPath: '/v60/test/',
    dose_g: 15,
    water_ml: 250,
    water_temp_c: 93,
    grind_size: 'medium',
    phases,
    source: { name: 'Test' },
  });

  it('returns 0 for empty phases', () => {
    expect(getTotalWaitSeconds(baseRecipe([]))).toBe(0);
  });

  it('sums wait_seconds across phases', () => {
    const recipe = baseRecipe([
      { label: 'Bloom', water_g: 50, wait_seconds: 45 },
      { label: 'Main', water_g: 100, wait_seconds: 10 },
      { label: 'Drawdown', water_g: 100 },
    ]);
    expect(getTotalWaitSeconds(recipe)).toBe(55);
  });

  it('returns 0 when no phases have wait_seconds', () => {
    const recipe = baseRecipe([
      { label: 'Pour', water_g: 100 },
      { label: 'Pour', water_g: 150 },
    ]);
    expect(getTotalWaitSeconds(recipe)).toBe(0);
  });
});

// ─── withBase ─────────────────────────────────────────────────────────

describe('withBase', () => {
  it('prepends the base URL', () => {
    expect(withBase('/v60/test/', '/brew-recipes')).toBe('/brew-recipes/v60/test/');
  });

  it('strips trailing slash from base', () => {
    expect(withBase('/v60/test/', '/brew-recipes/')).toBe('/brew-recipes/v60/test/');
  });

  it('returns pathname unchanged when base is "/"', () => {
    expect(withBase('/v60/test/', '/')).toBe('/v60/test/');
  });

  it('uses import.meta.env.BASE_URL when no baseUrl provided', () => {
    // In vitest's node environment, import.meta.env.BASE_URL defaults to '/'
    expect(withBase('/v60/test/')).toBe('/v60/test/');
  });
});
