import { defaultConfig, writeConfig } from '../core/config.js';
import { resolveStacksToAssets } from '../core/assets.js';
import { syncCommand } from './sync.js';

export async function initCommand(options: { sync?: boolean; language?: string; targets?: string; stack?: string }, root = process.cwd()): Promise<void> {
  const config = defaultConfig();
  if (options.language) config.language = options.language;
  if (options.targets) {
    const targets = new Set(options.targets.split(',').map((item) => item.trim()).filter(Boolean));
    config.targets.generic = targets.has('generic');
    config.targets.claude = targets.has('claude');
    config.targets.cursor.enabled = targets.has('cursor');
  }
  if (options.stack) {
    const stacks = options.stack.split(',').map((s) => s.trim()).filter(Boolean);
    config.assets.include = resolveStacksToAssets(stacks);
  }
  await writeConfig(root, config);
  console.log('Created .ai-rules/config.json');
  if (options.sync !== false) await syncCommand(root);
}
