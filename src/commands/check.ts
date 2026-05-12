import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadConfig } from '../core/config.js';
import { extractManagedBlock } from '../core/managed-block.js';
import { renderFiles, resolveRules } from '../core/render.js';

export async function checkCommand(root = process.cwd()): Promise<void> {
  const config = await loadConfig(root);
  const rules = await resolveRules(root, config);
  const files = renderFiles(config, rules);
  const errors: string[] = [];
  for (const file of files) {
    const target = join(root, file.path);
    let existing = '';
    try { existing = await readFile(target, 'utf8'); } catch { errors.push(`Missing file: ${file.path}`); continue; }
    const managed = extractManagedBlock(existing);
    if (managed === null) {
      errors.push(`Missing managed block: ${file.path}`);
      continue;
    }
    if (managed.trim() !== file.content.trim()) {
      errors.push(`Managed block drift: ${file.path}`);
    }
  }
  if (errors.length > 0) {
    for (const error of errors) console.error(`✗ ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log('All generated rule files are up to date.');
}
