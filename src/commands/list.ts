import { loadConfig } from '../core/config.js';
import { loadBuiltInAssets, loadBuiltInRules, loadCustomRules } from '../core/assets.js';
import { expandAssetsToRules } from '../core/assets.js';
import type { Rule } from '../core/rules.js';

export async function listCommand(options: { assets?: boolean; custom?: boolean; enabled?: boolean; disabled?: boolean; all?: boolean } = {}, root = process.cwd()): Promise<void> {
  const config = await loadConfig(root);
  const allAssets = await loadBuiltInAssets();
  const allRules = await loadBuiltInRules();

  const showAll = options.all || (!options.assets && !options.custom && !options.enabled && !options.disabled);

  if (options.assets || showAll) {
    console.log('Built-in assets:');
    for (const asset of allAssets) {
      const included = config.assets.include.includes(asset.id);
      const marker = included ? '●' : '○';
      console.log(`  ${marker} ${asset.id} (${asset.layer}) — ${asset.name} [${asset.rules.length} rules]`);
    }
    console.log('');
  }

  if (options.enabled || showAll) {
    const { rules: enabledRules, assets } = await expandAssetsToRules(config.assets.include, config.assets.exclude);
    console.log(`Enabled rules (${enabledRules.length}):`);
    for (const rule of enabledRules) {
      console.log(`  - ${rule.id}: ${rule.name} [${rule.severity}]`);
    }
    console.log('');
  }

  if (options.disabled) {
    if (config.disabledRules.length === 0) {
      console.log('No disabled rules.');
    } else {
      console.log(`Disabled rules (${config.disabledRules.length}):`);
      for (const id of config.disabledRules) {
        const rule = allRules.find((r) => r.id === id);
        console.log(`  - ${id}${rule ? `: ${rule.name}` : ' (not found)'}`);
      }
    }
    console.log('');
  }

  if (options.custom || showAll) {
    const customConfig = config.customRules;
    if (customConfig && typeof customConfig === 'object' && 'autoDiscover' in customConfig && customConfig.autoDiscover) {
      const customRules = await loadCustomRules(customConfig.paths, root);
      if (customRules.length === 0) {
        console.log('No custom rules found.');
      } else {
        console.log(`Custom rules (${customRules.length}):`);
        for (const rule of customRules) {
          console.log(`  - ${rule.id}: ${rule.name} [${rule.severity}]`);
        }
      }
    } else {
      console.log('Custom rule auto-discovery is disabled.');
    }
  }
}
