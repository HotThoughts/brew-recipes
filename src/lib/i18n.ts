import { load } from 'js-yaml';
import fs from 'fs';
import path from 'path';

const I18N_DIR = path.join(process.cwd(), 'src', 'i18n');

export function loadLang(code: string, dir?: string): Record<string, any> {
  const i18nDir = dir ?? I18N_DIR;
  const filePath = path.join(i18nDir, `${code}.yaml`);
  return load(fs.readFileSync(filePath, 'utf8')) as Record<string, any>;
}

export const t = {
  en: loadLang('en'),
  zh: loadLang('zh'),
} as const;
