import { describe, expect, it } from 'vitest';
import {
  convertGrinderSetting,
  defaultSetting,
  formatSetting,
  parseSetting,
  quantizeSetting,
  sharedNumericMethods,
  stepSetting,
  type ConvertibleGrinder,
} from '../../src/lib/grinder-convert';

function grinder(overrides: Partial<ConvertibleGrinder> & Pick<ConvertibleGrinder, 'ranges'>): ConvertibleGrinder {
  return {
    adjustment: {
      system: 'test',
      unit: 'clicks',
      scale_min: 0,
      scale_max: 40,
      scale_step: 5,
      setting_subdivisions: 1,
      direction: 'higher-is-coarser',
      ...overrides.adjustment,
    },
    ranges: overrides.ranges,
  };
}

const clicky = grinder({
  ranges: [
    { id: 'ibrik', min_clicks: 3, max_clicks: 8 },
    { id: 'espresso', min_clicks: 7, max_clicks: 13 },
    { id: 'pour-over-filter', min_clicks: 18, max_clicks: 35 },
    { id: 'aeropress', guidance: 'recipe-dependent' },
  ],
});

const numbered = grinder({
  adjustment: {
    system: 'ring',
    unit: 'numbers',
    scale_min: 0,
    scale_max: 8,
    scale_step: 1,
    setting_subdivisions: 2,
    direction: 'higher-is-coarser',
  },
  ranges: [
    { id: 'ibrik', min_clicks: 1, max_clicks: 2 },
    { id: 'espresso', min_clicks: 2, max_clicks: 3 },
    { id: 'pour-over-filter', min_clicks: 4, max_clicks: 5 },
  ],
});

describe('sharedNumericMethods', () => {
  it('keeps only methods both grinders publish numerically', () => {
    expect(sharedNumericMethods(clicky, numbered)).toEqual(['ibrik', 'espresso', 'pour-over-filter']);
  });

  it('ignores qualitative ranges', () => {
    const qualitative = grinder({ ranges: [{ id: 'aeropress', guidance: 'recipe-dependent' }] });
    expect(sharedNumericMethods(clicky, qualitative)).toEqual([]);
  });
});

describe('discrete settings', () => {
  it('quantizes click grinders to whole positions', () => {
    expect(quantizeSetting(11.4, clicky.adjustment)).toBe(11);
    expect(quantizeSetting(11.6, clicky.adjustment)).toBe(12);
  });

  it('uses indexed labels for each numbered grinder’s declared subdivisions', () => {
    expect(quantizeSetting(4.35, numbered.adjustment)).toBe(4.1);
    expect(quantizeSetting(4.1, numbered.adjustment)).toBe(4);
  });

  it('encodes three-position dials as .0, .1, and .2 labels', () => {
    const thirds = {
      ...numbered.adjustment,
      setting_subdivisions: 3,
    };
    expect(parseSetting(5.1, thirds)).toBeCloseTo(5 + 1 / 3);
    expect(parseSetting(5.2, thirds)).toBeCloseTo(5 + 2 / 3);
    expect(parseSetting(5.3, thirds)).toBeUndefined();
    expect(quantizeSetting(5.5, thirds)).toBe(5.2);
  });

  it('keeps ten-position dial labels aligned with decimal tenths', () => {
    const tenths = {
      ...numbered.adjustment,
      setting_subdivisions: 10,
    };
    expect(parseSetting(4.6, tenths)).toBe(4.6);
    expect(quantizeSetting(4.56, tenths)).toBe(4.6);
  });
});

describe('stepSetting', () => {
  it('carries indexed subdivisions across whole-number labels', () => {
    const thirds = {
      ...numbered.adjustment,
      setting_subdivisions: 3,
    };
    expect(stepSetting(5.1, thirds, 1)).toBe(5.2);
    expect(stepSetting(5.2, thirds, 1)).toBe(6);
    expect(stepSetting(6, thirds, -1)).toBe(5.2);
  });

  it('steps whole-click grinders and stops at the chart boundaries', () => {
    expect(stepSetting(11, clicky.adjustment, 1)).toBe(12);
    expect(stepSetting(0, clicky.adjustment, -1)).toBe(0);
    expect(stepSetting(40, clicky.adjustment, 1)).toBe(40);
  });

  it('does not step invalid or out-of-scale labels', () => {
    expect(stepSetting(4.2, numbered.adjustment, 1)).toBeUndefined();
    expect(stepSetting(41, clicky.adjustment, -1)).toBeUndefined();
  });
});

describe('convertGrinderSetting', () => {
  it('maps a setting through the single containing method range', () => {
    const result = convertGrinderSetting(clicky, numbered, 24);
    expect(result.status).toBe('ok');
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]).toMatchObject({
      methodId: 'pour-over-filter',
      sourceRange: { min: 18, max: 35 },
      targetRange: { min: 4, max: 5 },
      value: 4.1,
      extrapolated: false,
    });
  });

  it('returns one match per method whose range contains the setting', () => {
    const result = convertGrinderSetting(clicky, numbered, 8);
    expect(result.status).toBe('ok');
    expect(result.matches.map((match) => match.methodId)).toEqual(['ibrik', 'espresso']);
    expect(result.matches[0].value).toBe(2);
    expect(result.matches[1].value).toBe(2);
  });

  it('extrapolates from the nearest shared range when nothing contains the setting', () => {
    const result = convertGrinderSetting(clicky, numbered, 16);
    expect(result.status).toBe('outside-ranges');
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0].methodId).toBe('pour-over-filter');
    expect(result.matches[0].extrapolated).toBe(true);
    expect(result.matches[0].value).toBe(4);
    expect(result.matches[0].position).toBeLessThan(0);
  });

  it('preserves an outside-range position instead of pinning it to the target boundary', () => {
    const source = grinder({
      adjustment: {
        system: 'ring',
        unit: 'numbers',
        scale_min: 0,
        scale_max: 8,
        scale_step: 1,
        setting_subdivisions: 10,
        direction: 'higher-is-coarser',
      },
      ranges: [{ id: 'pour-over-filter', min_clicks: 4, max_clicks: 5 }],
    });
    const result = convertGrinderSetting(source, clicky, 3);
    expect(result.status).toBe('outside-ranges');
    expect(result.matches[0].position).toBe(-1);
    expect(result.matches[0].value).toBe(1);
  });

  it('reports when the two grinders share no numeric method', () => {
    const unrelated = grinder({ ranges: [{ id: 'cold-brew', min_clicks: 25, max_clicks: 35 }] });
    expect(convertGrinderSetting(clicky, unrelated, 24)).toEqual({
      status: 'no-shared-ranges',
      matches: [],
    });
  });

  it('rejects settings outside the source chart scale', () => {
    expect(convertGrinderSetting(clicky, numbered, 41).status).toBe('out-of-scale');
    expect(convertGrinderSetting(clicky, numbered, -1).status).toBe('out-of-scale');
  });

  it('rejects positions the source grinder cannot select', () => {
    expect(convertGrinderSetting(numbered, clicky, 4.2)).toEqual({
      status: 'invalid-setting',
      matches: [],
    });
  });

  it('inverts the position when the grinders count in opposite directions', () => {
    const inverted = grinder({
      adjustment: {
        system: 'dial',
        unit: 'clicks',
        scale_min: 0,
        scale_max: 40,
        scale_step: 5,
        setting_subdivisions: 1,
        direction: 'higher-is-finer',
      },
      ranges: [{ id: 'pour-over-filter', min_clicks: 10, max_clicks: 20 }],
    });
    const result = convertGrinderSetting(clicky, inverted, 18);
    expect(result.matches[0].position).toBe(1);
    expect(result.matches[0].value).toBe(20);
  });

  it('treats a single-point source range as position zero', () => {
    const pinned = grinder({ ranges: [{ id: 'pour-over-filter', min_clicks: 20, max_clicks: 20 }] });
    const result = convertGrinderSetting(pinned, numbered, 20);
    expect(result.status).toBe('ok');
    expect(result.matches[0].position).toBe(0);
    expect(result.matches[0].value).toBe(4);
  });

  it('clamps the converted value to the target chart scale', () => {
    const narrow = grinder({
      adjustment: {
        system: 'dial',
        unit: 'clicks',
        scale_min: 0,
        scale_max: 4,
        scale_step: 1,
        setting_subdivisions: 1,
        direction: 'higher-is-coarser',
      },
      ranges: [{ id: 'pour-over-filter', min_clicks: 2, max_clicks: 9 }],
    });
    const result = convertGrinderSetting(clicky, narrow, 35);
    expect(result.matches[0].value).toBe(4);
  });
});

describe('defaultSetting', () => {
  it('starts at the middle of the filter range when one is published', () => {
    expect(defaultSetting(clicky)).toBe(27);
    expect(defaultSetting(numbered)).toBe(4.1);
  });

  it('falls back to the first numeric range, then the factory setting, then the scale middle', () => {
    const noFilter = grinder({ ranges: [{ id: 'espresso', min_clicks: 7, max_clicks: 13 }] });
    expect(defaultSetting(noFilter)).toBe(10);

    const factory = grinder({
      adjustment: {
        system: 'dial',
        unit: 'clicks',
        scale_min: 0,
        scale_max: 40,
        scale_step: 5,
        setting_subdivisions: 1,
        direction: 'higher-is-coarser',
        factory_setting: 24,
      },
      ranges: [{ id: 'aeropress', guidance: 'recipe-dependent' }],
    });
    expect(defaultSetting(factory)).toBe(24);

    const bare = grinder({ ranges: [{ id: 'aeropress', guidance: 'recipe-dependent' }] });
    expect(defaultSetting(bare)).toBe(20);
  });
});

describe('formatSetting', () => {
  it('keeps whole settings integral and half steps to one decimal', () => {
    expect(formatSetting(11)).toBe('11');
    expect(formatSetting(4.5)).toBe('4.5');
  });
});
