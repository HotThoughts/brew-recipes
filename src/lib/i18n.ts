import { load } from 'js-yaml';
import fs from 'fs';
import path from 'path';

const I18N_DIR = path.join(process.cwd(), 'src', 'i18n');

function loadLang(code: string): Record<string, any> {
  const filePath = path.join(I18N_DIR, `${code}.yaml`);
  return load(fs.readFileSync(filePath, 'utf8')) as Record<string, any>;
}

export const t = {
  en: loadLang('en'),
  zh: loadLang('zh'),
} as const;
