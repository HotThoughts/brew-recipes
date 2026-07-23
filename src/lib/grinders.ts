import fs from 'node:fs';
import path from 'node:path';
import { load } from 'js-yaml';
import { walkYamlFiles } from '../../scripts/lib/walk.mjs';

export type GrinderAdjustment = {
  system: string;
  unit: 'clicks';
  scale_min: number;
  scale_max: number;
  scale_step: number;
  direction: 'higher-is-coarser' | 'higher-is-finer';
  factory_setting?: number;
};

export type GrinderRange = {
  id: string;
  min_clicks?: number;
  max_clicks?: number;
  guidance?: 'recipe-dependent';
  recipe_brewers?: string[];
};

export type GrinderSource = {
  id: string;
  name: string;
  url: string;
  scope: 'click-guidance' | 'operating-guidance' | 'micron-capability';
};

export type Grinder = {
  id: string;
  manufacturer: string;
  model: string;
  adjustment: GrinderAdjustment;
  particle_range_microns?: { min: number; max: number; source_id: string };
  ranges: GrinderRange[];
  sources: GrinderSource[];
  filePath: string;
  urlPath: string;
};

const GRINDER_DIR = path.join(process.cwd(), 'grinders');

export function getGrinders(grinderDir: string = GRINDER_DIR): Grinder[] {
  return [...walkYamlFiles(grinderDir)]
    .map((filePath) => {
      const data = load(fs.readFileSync(filePath, 'utf8')) as Omit<Grinder, 'filePath' | 'urlPath'>;
      return {
        ...data,
        filePath: path.relative(grinderDir, filePath),
        urlPath: `/grinders/${data.id}/`,
      };
    })
    .sort((a, b) => `${a.manufacturer} ${a.model}`.localeCompare(`${b.manufacturer} ${b.model}`));
}

export function getGrinder(id: string, grinderDir?: string): Grinder | undefined {
  return getGrinders(grinderDir).find((grinder) => grinder.id === id);
}

export function getGrinderRangeForBrewer(
  grinder: Grinder,
  brewer: string,
): GrinderRange | undefined {
  return grinder.ranges.find((range) => range.recipe_brewers?.includes(brewer));
}

export function formatGrinderRange(range: GrinderRange): string {
  if (range.min_clicks !== undefined && range.max_clicks !== undefined) {
    return `${range.min_clicks}–${range.max_clicks} clicks`;
  }
  return 'recipe dependent';
}
