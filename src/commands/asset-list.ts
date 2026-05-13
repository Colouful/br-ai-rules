import { loadConfig } from '../core/config.js';
import { loadBuiltInAssets } from '../core/assets.js';
import { loadAllSources } from '../core/source.js';

export async function assetListCommand(root = process.cwd()): Promise<void> {
  const config = await loadConfig(root);
  const builtInAssets = await loadBuiltInAssets();

  console.log('Built-in assets:');
  for (const asset of builtInAssets) {
    const included = config.assets.include.includes(asset.id);
    const marker = included ? '●' : '○';
    console.log(`  ${marker} ${asset.id} (${asset.layer}) — ${asset.name} [${asset.rules.length} rules]`);
  }

  if (config.sources.length > 0) {
    const sources = await loadAllSources(config.sources, root);
    const allSourceAssets = sources.flatMap((s) => s.assets);
    if (allSourceAssets.length > 0) {
      console.log('\nSource assets:');
      for (const asset of allSourceAssets) {
        const included = config.assets.include.includes(asset.id);
        const marker = included ? '●' : '○';
        console.log(`  ${marker} ${asset.id} (${asset.layer}) — ${asset.name} [${asset.rules.length} rules]`);
      }
    }
  }
}
