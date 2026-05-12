import { builtInRules, builtInRulesets } from '../core/rules.js';

export function listCommand(): void {
  console.log('Built-in rulesets:');
  for (const [id, rules] of Object.entries(builtInRulesets)) {
    console.log(`- ${id} (${rules.length} rules)`);
  }
  console.log('\nBuilt-in rules:');
  for (const rule of builtInRules) {
    console.log(`- ${rule.id}: ${rule.name}`);
  }
}
