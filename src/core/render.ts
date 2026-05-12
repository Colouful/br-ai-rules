import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { renderAgents } from '../adapters/agents.js';
import { renderClaude } from '../adapters/claude.js';
import { renderCursor } from '../adapters/cursor.js';
import type { RulesConfig } from './config.js';
import { expandAssetsToRules, loadCustomRules, type Asset } from './assets.js';
import { upsertManagedBlock } from './managed-block.js';
import type { Rule } from './rules.js';

export type RenderedFile = {
  path: string;
  content: string;
  rules: string[];
  assets: string[];
};

export type ResolvedContext = {
  rules: Rule[];
  assets: Asset[];
  customRules: Rule[];
};

export async function resolveRules(root: string, config: RulesConfig): Promise<ResolvedContext> {
  const { rules: builtInRules, assets } = await expandAssetsToRules(
    config.assets.include,
    config.assets.exclude,
  );

  for (const disabled of config.disabledRules) {
    const idx = builtInRules.findIndex((r) => r.id === disabled);
    if (idx >= 0) builtInRules.splice(idx, 1);
  }

  let customRules: Rule[] = [];
  const customConfig = config.customRules;
  if (customConfig && typeof customConfig === 'object' && 'autoDiscover' in customConfig && customConfig.autoDiscover) {
    customRules = await loadCustomRules(customConfig.paths, root);
  }

  const all = [...builtInRules, ...customRules];
  const seen = new Set<string>();
  for (const rule of all) {
    if (seen.has(rule.id)) throw new Error(`Duplicated rule id: ${rule.id}`);
    seen.add(rule.id);
  }

  return { rules: [...builtInRules, ...customRules], assets, customRules };
}

export function renderFiles(config: RulesConfig, ctx: ResolvedContext): RenderedFile[] {
  const files: RenderedFile[] = [];
  const language = config.language;
  const { rules, assets } = ctx;
  const assetIds = assets.map((a) => a.id);

  if (config.targets.generic) {
    files.push({ path: 'AGENTS.md', content: renderAgents(rules, language), rules: rules.map((r) => r.id), assets: assetIds });
  }

  if (config.targets.claude) {
    files.push({ path: 'CLAUDE.md', content: renderClaude(rules, language), rules: rules.map((r) => r.id), assets: assetIds });
  }

  if (config.targets.cursor.enabled) {
    files.push({ path: '.cursor/rules/ai-coding.mdc', content: renderCursor(rules, language), rules: rules.map((r) => r.id), assets: assetIds });
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
