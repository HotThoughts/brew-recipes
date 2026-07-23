import { describe, expect, it } from 'vitest';
import path from 'node:path';
import {
  formatGrinderRange,
  getGrinder,
  getGrinderRangeForBrewer,
  getGrinders,
} from '../../src/lib/grinders';

const FIXTURES_DIR = path.join(import.meta.dirname, '..', 'fixtures', 'valid-grinders');

describe('grinder collection', () => {
  it('loads grinder YAML and derives its route', () => {
    const grinders = getGrinders(FIXTURES_DIR);
    expect(grinders).toHaveLength(1);
    expect(grinders[0].id).toBe('test-grinder');
    expect(grinders[0].urlPath).toBe('/grinders/test-grinder/');
  });

  it('looks up grinders and compatible brewer ranges', () => {
    const grinder = getGrinder('test-grinder', FIXTURES_DIR);
    expect(grinder).toBeDefined();
    expect(getGrinderRangeForBrewer(grinder!, 'V60')?.id).toBe('filter');
    expect(getGrinderRangeForBrewer(grinder!, 'ColdBrew')).toBeUndefined();
  });

  it('formats numeric and qualitative settings', () => {
    expect(formatGrinderRange({ id: 'filter', min_clicks: 10, max_clicks: 20 }))
      .toBe('10–20 clicks');
    expect(formatGrinderRange({ id: 'aeropress', guidance: 'recipe-dependent' }))
      .toBe('recipe dependent');
  });
});
