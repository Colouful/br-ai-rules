import { defaultConfig, writeConfig } from '../core/config.js';
import { syncCommand } from './sync.js';

export async function initCommand(options: { sync?: boolean; language?: string; targets?: string; rulesets?: string }, root = process.cwd()): Promise<void> {
  const config = defaultConfig();
  if (options.language) config.language = options.language;
  if (options.rulesets) config.rulesets = options.rulesets.split(',').map((item) => item.trim()).filter(Boolean);
  if (options.targets) {
    const targets = new Set(options.targets.split(',').map((item) => item.trim()).filter(Boolean));
    config.targets.generic = targets.has('generic');
    config.targets.claude = targets.has('claude');
    config.targets.cursor.enabled = targets.has('cursor');
  }
  await writeConfig(root, config);
  console.log('Created .ai-rules/config.json');
  if (options.sync !== false) await syncCommand(root);
}
