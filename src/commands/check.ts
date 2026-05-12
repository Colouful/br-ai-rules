import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadConfig } from '../core/config.js';
import { extractManagedBlock } from '../core/managed-block.js';
import { renderFiles, resolveRules } from '../core/render.js';
import { loadBuiltInAssets, loadBuiltInRules, validateAssets } from '../core/assets.js';

export async function checkCommand(root = process.cwd()): Promise<void> {
  const errors: string[] = [];

  let config;
  try {
    config = await loadConfig(root);
  } catch (e) {
    console.error(`✗ Invalid config: ${e instanceof Error ? e.message : e}`);
    process.exitCode = 1;
    return;
  }

  try {
    const allAssets = await loadBuiltInAssets();
    const allRules = await loadBuiltInRules();

    const assetErrors = validateAssets(allAssets, allRules);
    errors.push(...assetErrors);

    for (const assetId of config.assets.include) {
      if (!allAssets.find((a) => a.id === assetId)) {
        errors.push(`Unknown asset in config: ${assetId}`);
      }
    }

    for (const ruleId of config.disabledRules) {
      if (!allRules.find((r) => r.id === ruleId)) {
        errors.push(`Unknown disabled rule: ${ruleId}`);
      }
    }
  } catch (e) {
    errors.push(`Failed to load built-in assets: ${e instanceof Error ? e.message : e}`);
  }

  let ctx;
  try {
    ctx = await resolveRules(root, config);
  } catch (e) {
    errors.push(`Failed to resolve rules: ${e instanceof Error ? e.message : e}`);
    for (const err of errors) console.error(`✗ ${err}`);
    process.exitCode = 1;
    return;
  }

  const files = renderFiles(config, ctx);
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
