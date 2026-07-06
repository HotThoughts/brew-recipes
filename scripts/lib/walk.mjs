// Shared YAML file walker — used by validate and check-site libs.

import fs from 'node:fs';
import path from 'node:path';

/**
 * Walk a directory recursively, yielding paths to .yaml / .yml files.
 * @param {string} dir - directory to walk
 * @returns {Generator<string>}
 */
export function* walkYamlFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const entryPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkYamlFiles(entryPath);
    } else if (entry.name.endsWith('.yaml') || entry.name.endsWith('.yml')) {
      yield entryPath;
    }
  }
}
