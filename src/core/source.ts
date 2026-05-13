import { readdir, readFile, access } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import YAML from 'yaml';
import { z } from 'zod';
import { AssetSchema, type Asset } from './assets.js';
import { RuleSchema, type Rule } from './rules.js';
import type { SourceConfig } from './config.js';

export const SourceManifestSchema = z.object({
  name: z.string().min(1),
  version: z.string().min(1),
  description: z.string().optional(),
  assets: z.array(z.string().min(1)).default([]),
});

export type SourceManifest = z.infer<typeof SourceManifestSchema>;

export type LoadedSource = {
  config: SourceConfig;
  manifest: SourceManifest;
  resolvedPath: string;
  assets: Asset[];
  rules: Rule[];
};

export async function loadSource(sourceConfig: SourceConfig, projectRoot: string): Promise<LoadedSource> {
  const resolvedPath = resolve(projectRoot, sourceConfig.path);

  try {
    await access(resolvedPath);
  } catch {
    throw new Error(`Local source not found: ${sourceConfig.path}`);
  }

  const manifestPath = join(resolvedPath, 'br-rules.source.json');
  let manifestRaw: string;
  try {
    manifestRaw = await readFile(manifestPath, 'utf8');
  } catch {
    throw new Error(`Missing source manifest: ${sourceConfig.path}/br-rules.source.json`);
  }

  let manifestJson: unknown;
  try {
    manifestJson = JSON.parse(manifestRaw);
  } catch {
    throw new Error(`Invalid source manifest JSON: ${sourceConfig.path}/br-rules.source.json`);
  }

  const manifest = SourceManifestSchema.parse(manifestJson);

  const assets = await loadSourceAssets(resolvedPath);
  const rules = await loadSourceRules(resolvedPath);

  return { config: sourceConfig, manifest, resolvedPath, assets, rules };
}

async function loadSourceAssets(sourcePath: string): Promise<Asset[]> {
  const assetsDir = join(sourcePath, 'assets');
  let files: string[];
  try {
    files = (await readdir(assetsDir)).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));
  } catch {
    return [];
  }

  const assets: Asset[] = [];
  for (const file of files) {
    const raw = await readFile(join(assetsDir, file), 'utf8');
    const parsed = YAML.parse(raw);
    if (!parsed.layer) parsed.layer = 'team';
    assets.push(AssetSchema.parse(parsed));
  }
  return assets;
}

async function loadSourceRules(sourcePath: string): Promise<Rule[]> {
  const rulesDir = join(sourcePath, 'rules');
  let files: string[];
  try {
    files = (await readdir(rulesDir)).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));
  } catch {
    return [];
  }

  const rules: Rule[] = [];
  for (const file of files) {
    const raw = await readFile(join(rulesDir, file), 'utf8');
    const parsed = YAML.parse(raw);
    rules.push(RuleSchema.parse(parsed));
  }
  return rules;
}

export async function loadAllSources(sources: SourceConfig[], projectRoot: string): Promise<LoadedSource[]> {
  const loaded: LoadedSource[] = [];
  for (const source of sources) {
    loaded.push(await loadSource(source, projectRoot));
  }
  return loaded;
}

export function validateSourceAssets(sources: LoadedSource[]): string[] {
  const errors: string[] = [];
  const allRuleIds = new Set<string>();
  const allAssetIds = new Set<string>();

  for (const source of sources) {
    const sourceRuleIds = new Set(source.rules.map((r) => r.id));
    for (const asset of source.assets) {
      if (allAssetIds.has(asset.id)) {
        errors.push(`Duplicate source asset id: ${asset.id}`);
      }
      allAssetIds.add(asset.id);
      for (const ruleId of asset.rules) {
        if (!sourceRuleIds.has(ruleId)) {
          errors.push(`Asset ${asset.id} references missing rule: ${ruleId}`);
        }
      }
    }
    for (const rule of source.rules) {
      if (allRuleIds.has(rule.id)) {
        errors.push(`Duplicate source rule id: ${rule.id}`);
      }
      allRuleIds.add(rule.id);
    }
  }

  return errors;
}
