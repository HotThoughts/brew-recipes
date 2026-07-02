import fs from 'node:fs';
import path from 'node:path';
import { load } from 'js-yaml';

export type LanguageCode = 'en' | 'zh';

export type Phase = {
  label: string;
  water_g: number;
  wait_seconds?: number;
  pours?: number;
  note?: string;
};

export type RecipeSource = {
  name: string;
  url?: string;
  competition?: string;
};

export type Recipe = {
  id: string;
  name: string;
  brewer: string;
  brewerSlug: string;
  language: LanguageCode;
  filePath: string;
  urlPath: string;
  dose_g: number;
  water_ml: number;
  ratio?: string;
  variant?: string;
  water_temp_c: number;
  grind_size: string;
  description?: string;
  phases: Phase[];
  source: RecipeSource;
  tags?: string[];
};

export type BrewerGroup = {
  brewer: string;
  brewerSlug: string;
  recipes: Recipe[];
};

export type RecipeCollection = {
  recipes: Recipe[];
  languages: LanguageCode[];
  byLanguage: Map<LanguageCode, Recipe[]>;
};

const BREWER_ORDER = [
  'V60',
  'Orea',
  'Aeropress',
  'April',
  'Chemex',
  'Kalita',
  'FrenchPress',
  'StaggX',
  'Origami',
  'Other',
];

const RECIPE_DIR = path.join(process.cwd(), 'recipes');

function isLanguageCode(value: string): value is LanguageCode {
  return value === 'en' || value === 'zh';
}

function* walkYamlFiles(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      yield* walkYamlFiles(entryPath);
    } else if (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml')) {
      yield entryPath;
    }
  }
}

function brewerRank(brewer: string): number {
  const index = BREWER_ORDER.indexOf(brewer);
  return index === -1 ? BREWER_ORDER.length : index;
}

function slugifyBrewer(brewer: string): string {
  return brewer
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeRecipe(filePath: string): Recipe {
  const relativePath = path.relative(RECIPE_DIR, filePath);
  const [language, brewerSlug] = relativePath.split(path.sep);

  if (!isLanguageCode(language)) {
    throw new Error(`Unsupported language directory in ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const data = load(raw) as Omit<Recipe, 'language' | 'filePath' | 'urlPath' | 'brewerSlug'>;
  const normalizedBrewerSlug = brewerSlug || slugifyBrewer(data.brewer);

  return {
    ...data,
    language,
    brewerSlug: normalizedBrewerSlug,
    filePath: relativePath,
    urlPath: `/${normalizedBrewerSlug}/${data.id}/`,
  };
}

export function getRecipes(): Recipe[] {
  const recipes = [...walkYamlFiles(RECIPE_DIR)].map(normalizeRecipe);

  return recipes.sort((a, b) => {
    const lang = a.language.localeCompare(b.language);
    if (lang !== 0) return lang;

    const brewer = brewerRank(a.brewer) - brewerRank(b.brewer);
    if (brewer !== 0) return brewer;

    return a.name.localeCompare(b.name);
  });
}

export function getRecipeCollection(): RecipeCollection {
  const recipes = getRecipes();
  const languages = [...new Set(recipes.map((recipe) => recipe.language))].sort() as LanguageCode[];
  const byLanguage = new Map<LanguageCode, Recipe[]>();

  for (const recipe of recipes) {
    byLanguage.set(recipe.language, [...(byLanguage.get(recipe.language) ?? []), recipe]);
  }

  return {
    recipes,
    languages,
    byLanguage,
  };
}

export function getBrewerGroups(recipes: Recipe[]): BrewerGroup[] {
  const groups = new Map<string, BrewerGroup>();

  for (const recipe of recipes) {
    const key = recipe.brewerSlug;
    const group = groups.get(key) ?? {
      brewer: recipe.brewer,
      brewerSlug: recipe.brewerSlug,
      recipes: [],
    };

    group.recipes.push(recipe);
    groups.set(key, group);
  }

  return [...groups.values()].sort((a, b) => {
    const brewer = brewerRank(a.brewer) - brewerRank(b.brewer);
    if (brewer !== 0) return brewer;
    return a.brewer.localeCompare(b.brewer);
  });
}

export function formatSeconds(totalSeconds?: number, language: LanguageCode = 'en'): string {
  if (totalSeconds === undefined) return language === 'zh' ? '按需注水' : 'as needed';
  if (totalSeconds === 0) return language === 'zh' ? '滴滤' : 'draw down';

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) return `${seconds}s`;
  if (seconds === 0) return `${minutes}m`;
  return `${minutes}m ${seconds}s`;
}

export function formatRecipeCount(count: number, language: LanguageCode = 'en'): string {
  if (language === 'zh') return `${count} 个手冲方法`;
  return `${count} ${count === 1 ? 'method' : 'methods'}`;
}

export function getTotalPhaseWater(phase: Phase): number {
  return phase.water_g * (phase.pours ?? 1);
}

export function getTotalWaitSeconds(recipe: Recipe): number {
  return recipe.phases.reduce((total, phase) => total + (phase.wait_seconds ?? 0), 0);
}

export function withBase(pathname: string): string {
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return `${base}${pathname}`;
}
