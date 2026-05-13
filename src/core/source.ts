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

const PLACEHOLDER_RE = /TODO|在这里写规则内容/;

/** Warnings for rule bodies that still look like unfinished templates. */
export function collectPlaceholderWarningsForRules(rules: Rule[]): string[] {
  const warnings: string[] = [];
  for (const rule of rules) {
    const body = Object.values(rule.content).join('\n');
    if (PLACEHOLDER_RE.test(body)) {
      warnings.push(`Rule "${rule.id}" contains TODO or placeholder text (在这里写规则内容) in content`);
    }
  }
  return warnings;
}

export type SourceAuditResult = {
  loaded: LoadedSource | null;
  errors: string[];
  warnings: string[];
};

/**
 * Validate a local rule source directory (manifest, YAML assets/rules, ids, placeholders).
 * On success returns `loaded` for the tree; on failure `loaded` is null and `errors` is non-empty.
 */
export async function auditSourcePath(projectRoot: string, pathRelativeToProject: string): Promise<SourceAuditResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const sourceConfig: SourceConfig = { type: 'local', path: pathRelativeToProject };
  const resolvedPath = resolve(projectRoot, pathRelativeToProject);
  const rel = pathRelativeToProject;

  try {
    await access(resolvedPath);
  } catch {
    return { loaded: null, errors: [`Source path not found: ${rel}`], warnings };
  }

  const manifestPath = join(resolvedPath, 'br-rules.source.json');
  let manifestRaw: string;
  try {
    manifestRaw = await readFile(manifestPath, 'utf8');
  } catch {
    return { loaded: null, errors: [`Missing manifest: ${rel}/br-rules.source.json`], warnings };
  }

  let manifestJson: unknown;
  try {
    manifestJson = JSON.parse(manifestRaw);
  } catch (e) {
    return {
      loaded: null,
      errors: [`Invalid JSON in ${rel}/br-rules.source.json: ${e instanceof Error ? e.message : String(e)}`],
      warnings,
    };
  }

  const manifestParsed = SourceManifestSchema.safeParse(manifestJson);
  if (!manifestParsed.success) {
    const msgs = manifestParsed.error.errors.map((er) => `${er.path.join('.') || 'manifest'}: ${er.message}`);
    return { loaded: null, errors: msgs.map((m) => `Manifest: ${m}`), warnings };
  }
  const manifest = manifestParsed.data;

  const assetsDir = join(resolvedPath, 'assets');
  const rulesDir = join(resolvedPath, 'rules');
  const assets: Asset[] = [];
  const rules: Rule[] = [];

  let assetFiles: string[] = [];
  try {
    assetFiles = (await readdir(assetsDir)).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));
  } catch {
    /* no assets dir */
  }

  for (const file of assetFiles) {
    const fp = join(assetsDir, file);
    try {
      const raw = await readFile(fp, 'utf8');
      const parsed = YAML.parse(raw) as Record<string, unknown>;
      if (parsed && typeof parsed === 'object' && parsed.layer === undefined) parsed.layer = 'team';
      assets.push(AssetSchema.parse(parsed));
    } catch (e) {
      errors.push(`assets/${file}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  let ruleFiles: string[] = [];
  try {
    ruleFiles = (await readdir(rulesDir)).filter((f) => f.endsWith('.yaml') || f.endsWith('.yml'));
  } catch {
    /* no rules dir */
  }

  for (const file of ruleFiles) {
    const fp = join(rulesDir, file);
    try {
      const raw = await readFile(fp, 'utf8');
      rules.push(RuleSchema.parse(YAML.parse(raw)));
    } catch (e) {
      errors.push(`rules/${file}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  if (errors.length > 0) {
    return { loaded: null, errors: errors.map((msg) => `[${rel}] ${msg}`), warnings };
  }

  const loaded: LoadedSource = { config: sourceConfig, manifest, resolvedPath, assets, rules };
  const structural = validateSourceAssets([loaded]).map((msg) => `[${rel}] ${msg}`);
  errors.push(...structural);

  warnings.push(...collectPlaceholderWarningsForRules(rules).map((w) => `[${rel}] ${w}`));

  const idsOnDisk = new Set(assets.map((a) => a.id));
  if (manifest.assets.length > 0) {
    for (const id of manifest.assets) {
      if (!idsOnDisk.has(id)) {
        warnings.push(`[${rel}] Manifest lists asset "${id}" but no asset YAML with that id was loaded`);
      }
    }
    for (const asset of assets) {
      if (!manifest.assets.includes(asset.id)) {
        warnings.push(`[${rel}] Asset "${asset.id}" is not listed in manifest "assets"`);
      }
    }
  }

  if (errors.length > 0) {
    return { loaded: null, errors, warnings };
  }

  return { loaded, errors: [], warnings };
}
