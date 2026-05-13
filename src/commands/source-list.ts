import { loadConfig } from '../core/config.js';
import { loadAllSources } from '../core/source.js';

export async function sourceListCommand(root = process.cwd()): Promise<void> {
  const config = await loadConfig(root);

  if (config.sources.length === 0) {
    console.log('No external sources configured.');
    return;
  }

  const sources = await loadAllSources(config.sources, root);

  console.log('Sources:\n');
  for (const source of sources) {
    console.log(`${source.config.type}: ${source.config.path}`);
    console.log(`  name: ${source.manifest.name}`);
    console.log(`  version: ${source.manifest.version}`);
    if (source.manifest.description) console.log(`  description: ${source.manifest.description}`);
    if (source.assets.length > 0) {
      console.log(`  assets:`);
      for (const asset of source.assets) {
        console.log(`    - ${asset.id}`);
      }
    }
    if (source.rules.length > 0) {
      console.log(`  rules:`);
      for (const rule of source.rules) {
        console.log(`    - ${rule.id}`);
      }
    }
    console.log('');
  }
}
