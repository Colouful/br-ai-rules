import { loadConfig, CONFIG_PATH } from '../core/config.js';
import { auditSourcePath } from '../core/source.js';

export async function sourceCheckCommand(pathArg: string | undefined, root = process.cwd()): Promise<void> {
  const trimmed = pathArg?.trim();

  if (trimmed) {
    const result = await auditSourcePath(root, trimmed);
    for (const w of result.warnings) console.warn(`⚠ ${w}`);
    for (const e of result.errors) console.error(`✗ ${e}`);
    if (result.errors.length === 0) {
      console.log(`Source OK: ${trimmed}`);
    } else {
      process.exitCode = 1;
    }
    return;
  }

  let config;
  try {
    config = await loadConfig(root);
  } catch (e) {
    console.error(`✗ Cannot load ${CONFIG_PATH}: ${e instanceof Error ? e.message : e}`);
    console.error('Hint: run from project root, or pass a path: br-rules source check ./team-rules-source');
    process.exitCode = 1;
    return;
  }

  if (config.sources.length === 0) {
    console.log(`No local sources in ${CONFIG_PATH}.`);
    console.log('Example: br-rules source check ./team-rules-source');
    return;
  }

  let failed = false;
  for (const src of config.sources) {
    const result = await auditSourcePath(root, src.path);
    for (const w of result.warnings) console.warn(`⚠ ${w}`);
    for (const e of result.errors) console.error(`✗ ${e}`);
    if (result.errors.length > 0) failed = true;
    else console.log(`Source OK: ${src.path}`);
  }

  if (failed) process.exitCode = 1;
  else console.log('All configured sources passed validation.');
}
