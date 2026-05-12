import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { renderAgents } from '../adapters/agents.js';
import { renderClaude } from '../adapters/claude.js';
import { renderCursor } from '../adapters/cursor.js';
import type { RulesConfig } from './config.js';
import { builtInRules, builtInRulesets, loadCustomRule, type Rule } from './rules.js';
import { upsertManagedBlock } from './managed-block.js';

export type RenderedFile = {
  path: string;
  content: string;
  rules: string[];
};

export async function resolveRules(root: string, config: RulesConfig): Promise<Rule[]> {
  const ids = new Set<string>();
  for (const ruleset of config.rulesets) {
    const ruleIds = builtInRulesets[ruleset];
    if (!ruleIds) throw new Error(`Unknown ruleset: ${ruleset}`);
    for (const id of ruleIds) ids.add(id);
  }

  for (const disabled of config.disabledRules) ids.delete(disabled);

  const selected = builtInRules.filter((rule) => ids.has(rule.id));
  const custom = [] as Rule[];
  for (const customPath of config.customRules) {
    custom.push(await loadCustomRule(join(root, customPath)));
  }

  const all = [...selected, ...custom];
  const duplicated = all.find((rule, index) => all.findIndex((item) => item.id === rule.id) !== index);
  if (duplicated) throw new Error(`Duplicated rule id: ${duplicated.id}`);
  return all;
}

export function renderFiles(config: RulesConfig, rules: Rule[]): RenderedFile[] {
  const files: RenderedFile[] = [];
  const language = config.language;

  if (config.targets.generic) {
    files.push({ path: 'AGENTS.md', content: renderAgents(rules, language), rules: rules.map((r) => r.id) });
  }

  if (config.targets.claude) {
    files.push({ path: 'CLAUDE.md', content: renderClaude(rules, language), rules: rules.map((r) => r.id) });
  }

  if (config.targets.cursor.enabled) {
    files.push({ path: '.cursor/rules/ai-coding.mdc', content: renderCursor(rules, language), rules: rules.map((r) => r.id) });
  }

  return files;
}

export async function writeRenderedFile(root: string, rendered: RenderedFile): Promise<void> {
  const target = join(root, rendered.path);
  let existing: string | null = null;
  try {
    existing = await readFile(target, 'utf8');
  } catch {
    existing = null;
  }
  const next = upsertManagedBlock(existing, rendered.content);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, next, 'utf8');
}
