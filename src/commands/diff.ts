import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadConfig } from '../core/config.js';
import { createManagedBlock } from '../core/managed-block.js';
import { renderFiles, resolveRules } from '../core/render.js';

export async function diffCommand(root = process.cwd()): Promise<void> {
  const config = await loadConfig(root);
  const ctx = await resolveRules(root, config);
  const files = renderFiles(config, ctx);
  let changed = false;
  for (const file of files) {
    const target = join(root, file.path);
    const expected = createManagedBlock(file.content).trim();
    let existing = '';
    try { existing = await readFile(target, 'utf8'); } catch { existing = ''; }
    if (!existing.includes(expected)) {
      changed = true;
      console.log(`\n--- ${file.path}`);
      console.log(`+++ ${file.path}`);
      console.log(expected);
    }
  }
  if (!changed) console.log('No changes.');
}
