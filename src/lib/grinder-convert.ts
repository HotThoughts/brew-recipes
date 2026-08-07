import type { Grinder, GrinderAdjustment, GrinderRange } from './grinders';

export type ConvertibleGrinder = Pick<Grinder, 'adjustment' | 'ranges'>;

export type ConversionMatch = {
  methodId: string;
  sourceRange: { min: number; max: number };
  targetRange: { min: number; max: number };
  value: number;
  position: number;
  extrapolated: boolean;
};

export type ConversionStatus =
  | 'ok'
  | 'outside-ranges'
  | 'no-shared-ranges'
  | 'out-of-scale'
  | 'invalid-setting';

export type ConversionResult = {
  status: ConversionStatus;
  matches: ConversionMatch[];
};

type NumericRange = { min: number; max: number };

function numericRanges(grinder: ConvertibleGrinder): Map<string, NumericRange> {
  const ranges = new Map<string, NumericRange>();
  for (const range of grinder.ranges) {
    if (isNumeric(range)) ranges.set(range.id, { min: range.min_clicks!, max: range.max_clicks! });
  }
  return ranges;
}

function isNumeric(range: GrinderRange): boolean {
  return range.min_clicks !== undefined && range.max_clicks !== undefined;
}

export function sharedNumericMethods(from: ConvertibleGrinder, to: ConvertibleGrinder): string[] {
  const target = numericRanges(to);
  return from.ranges.filter((range) => isNumeric(range) && target.has(range.id)).map((range) => range.id);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function subdivisionFactor(adjustment: GrinderAdjustment): number {
  if (adjustment.setting_subdivisions === 1) return 1;
  return 10 ** String(adjustment.setting_subdivisions - 1).length;
}

export function parseSetting(value: number, adjustment: GrinderAdjustment): number | undefined {
  if (!Number.isFinite(value)) return undefined;
  const whole = Math.floor(value);
  const factor = subdivisionFactor(adjustment);
  const rawSubdivision = (value - whole) * factor;
  const subdivision = Math.round(rawSubdivision);
  if (
    Math.abs(rawSubdivision - subdivision) > 1e-7 ||
    subdivision >= adjustment.setting_subdivisions
  ) {
    return undefined;
  }
  return whole + subdivision / adjustment.setting_subdivisions;
}

export function stepSetting(
  value: number,
  adjustment: GrinderAdjustment,
  direction: -1 | 1,
): number | undefined {
  if (value < adjustment.scale_min || value > adjustment.scale_max) return undefined;
  const continuous = parseSetting(value, adjustment);
  if (continuous === undefined) return undefined;

  const subdivisions = adjustment.setting_subdivisions;
  const currentIndex = Math.round((continuous - adjustment.scale_min) * subdivisions);
  const maxIndex = (adjustment.scale_max - adjustment.scale_min) * subdivisions;
  const nextIndex = clamp(currentIndex + direction, 0, maxIndex);
  const whole = adjustment.scale_min + Math.floor(nextIndex / subdivisions);
  const subdivision = nextIndex % subdivisions;
  return whole + subdivision / subdivisionFactor(adjustment);
}

export function quantizeSetting(value: number, adjustment: GrinderAdjustment): number {
  const bounded = clamp(value, adjustment.scale_min, adjustment.scale_max);
  let whole = Math.floor(bounded);
  let subdivision = Math.round((bounded - whole) * adjustment.setting_subdivisions);
  if (subdivision === adjustment.setting_subdivisions) {
    whole += 1;
    subdivision = 0;
  }
  if (whole >= adjustment.scale_max) return adjustment.scale_max;
  return whole + subdivision / subdivisionFactor(adjustment);
}

function distanceToRange(setting: number, range: NumericRange): number {
  if (setting < range.min) return range.min - setting;
  if (setting > range.max) return setting - range.max;
  return 0;
}

export function convertGrinderSetting(from: ConvertibleGrinder, to: ConvertibleGrinder, setting: number): ConversionResult {
  if (setting < from.adjustment.scale_min || setting > from.adjustment.scale_max) {
    return { status: 'out-of-scale', matches: [] };
  }
  const continuousSetting = parseSetting(setting, from.adjustment);
  if (continuousSetting === undefined) return { status: 'invalid-setting', matches: [] };

  const sharedIds = sharedNumericMethods(from, to);
  if (sharedIds.length === 0) return { status: 'no-shared-ranges', matches: [] };

  const sourceRanges = numericRanges(from);
  const targetRanges = numericRanges(to);
  const inverted = from.adjustment.direction !== to.adjustment.direction;

  const build = (methodId: string, extrapolated: boolean): ConversionMatch => {
    const sourceRange = sourceRanges.get(methodId)!;
    const targetRange = targetRanges.get(methodId)!;
    const span = sourceRange.max - sourceRange.min;
    const raw = span === 0 ? 0 : (continuousSetting - sourceRange.min) / span;
    const position = inverted ? 1 - raw : raw;
    const value = quantizeSetting(
      targetRange.min + position * (targetRange.max - targetRange.min),
      to.adjustment,
    );
    return { methodId, sourceRange, targetRange, value, position, extrapolated };
  };

  const containing = sharedIds.filter((id) => distanceToRange(continuousSetting, sourceRanges.get(id)!) === 0);
  if (containing.length > 0) {
    return { status: 'ok', matches: containing.map((id) => build(id, false)) };
  }

  const nearest = sharedIds.reduce((closest, id) =>
    distanceToRange(continuousSetting, sourceRanges.get(id)!) <
    distanceToRange(continuousSetting, sourceRanges.get(closest)!)
      ? id
      : closest,
  );
  return { status: 'outside-ranges', matches: [build(nearest, true)] };
}

export function defaultSetting(grinder: ConvertibleGrinder): number {
  const anchor =
    grinder.ranges.find((range) => range.id === 'pour-over-filter' && isNumeric(range)) ??
    grinder.ranges.find(isNumeric);
  if (anchor) {
    return quantizeSetting((anchor.min_clicks! + anchor.max_clicks!) / 2, grinder.adjustment);
  }
  if (grinder.adjustment.factory_setting !== undefined) return grinder.adjustment.factory_setting;
  const { scale_min: min, scale_max: max } = grinder.adjustment;
  return quantizeSetting((min + max) / 2, grinder.adjustment);
}

export function formatSetting(value: number): string {
  return String(Number(value.toFixed(6)));
}
