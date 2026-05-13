import { readdir, readFile, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import YAML from 'yaml';
import { z } from 'zod';
import { RuleSchema, type Rule } from './rules.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function resolveBuiltInDir(): Promise<string> {
  const sibling = join(__dirname, '..', 'built-in');
  const self = join(__dirname, 'built-in');
  try { await access(join(sibling, 'assets')); return sibling; } catch {}
  try { await access(join(self, 'assets')); return self; } catch {}
  return sibling;
}

const ASSETS_DIR_NAME = 'assets';
const RULES_DIR_NAME = 'rules';

export const AssetSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  layer: z.enum(['base', 'language', 'framework', 'middleware', 'practice', 'team']),
  version: z.string().default('0.2.0'),
  description: z.string().default(''),
  rules: z.array(z.string().min(1)).min(1),
});

export type Asset = z.infer<typeof AssetSchema>;

export const stackAssetMap: Record<string, string[]> = {
  generic: ['base.behavior-basic'],
  typescript: ['language.typescript'],
  react: ['language.typescript', 'framework.react', 'practice.testing-basic', 'practice.dependency-control', 'practice.security-basic'],
  vue: ['language.typescript', 'framework.vue', 'practice.testing-basic', 'practice.dependency-control', 'practice.security-basic'],
  java: ['language.java'],
  'spring-boot': ['language.java', 'framework.spring-boot', 'practice.api-contract', 'practice.testing-basic', 'practice.security-basic'],
  mysql: ['middleware.mysql'],
  redis: ['middleware.redis'],
  mq: ['middleware.message-queue'],
  'message-queue': ['middleware.message-queue'],
};

export function resolveStacksToAssets(stacks: string[]): string[] {
  const assetIds = new Set<string>();
  assetIds.add('base.behavior-basic');
  for (const stack of stacks) {
    const mapped = stackAssetMap[stack];
    if (!mapped) {
      console.warn(`Unknown stack: ${stack}, skipping.`);
      continue;
    }
    for (const id of mapped) assetIds.add(id);
  }
  return [...assetIds];
}

let cachedAssets: Asset[] | null = null;
let cachedRules: Rule[] | null = null;

export async function loadBuiltInAssets(): Promise<Asset[]> {
  if (cachedAssets) return cachedAssets;
  const baseDir = await resolveBuiltInDir();
  const assetsDir = join(baseDir, ASSETS_DIR_NAME);
  const files = (await readdir(assetsDir)).filter((f) => f.endsWith('.yaml'));
  const assets: Asset[] = [];
  for (const file of files) {
    const raw = await readFile(join(assetsDir, file), 'utf8');
    assets.push(AssetSchema.parse(YAML.parse(raw)));
  }
  cachedAssets = assets;
  return assets;
}

export async function loadBuiltInRules(): Promise<Rule[]> {
  if (cachedRules) return cachedRules;
  const baseDir = await resolveBuiltInDir();
  const rulesDir = join(baseDir, RULES_DIR_NAME);
  const files = (await readdir(rulesDir)).filter((f) => f.endsWith('.yaml'));
  const rules: Rule[] = [];
  for (const file of files) {
    const raw = await readFile(join(rulesDir, file), 'utf8');
    rules.push(RuleSchema.parse(YAML.parse(raw)));
  }
  cachedRules = rules;
  return rules;
}

export async function loadCustomRules(paths: string[], root: string): Promise<Rule[]> {
  const rules: Rule[] = [];
  for (const pattern of paths) {
    const dir = dirname(pattern);
    const glob = pattern.split('/').pop() ?? '*.yaml';
    const resolvedDir = join(root, dir);
    let files: string[];
    try {
      files = (await readdir(resolvedDir)).filter((f) => {
        if (glob === '*.yaml') return f.endsWith('.yaml');
        if (glob === '*.yml') return f.endsWith('.yml');
        return f.endsWith('.yaml') || f.endsWith('.yml');
      });
    } catch {
      continue;
    }
    for (const file of files) {
      const filePath = join(resolvedDir, file);
      const raw = await readFile(filePath, 'utf8');
      try {
        const parsed = RuleSchema.parse(YAML.parse(raw));
        const contentValues = Object.values(parsed.content).join('\n');
        if (/TODO|在这里写规则内容/.test(contentValues)) {
          console.warn(`Warning: Custom rule ${join(dir, file)} still contains placeholder content (TODO).`);
        }
        rules.push({ ...parsed, metadata: { ...parsed.metadata, source: 'custom' } });
      } catch (e) {
        console.warn(`Warning: Failed to parse custom rule ${join(dir, file)}: ${e instanceof Error ? e.message : e}`);
      }
    }
  }
  return rules;
}

export async function expandAssetsToRules(assetIds: string[], excludeIds: string[] = []): Promise<{ rules: Rule[]; assets: Asset[] }> {
  const allAssets = await loadBuiltInAssets();
  const allRules = await loadBuiltInRules();

  const selectedAssets = allAssets.filter((a) => assetIds.includes(a.id) && !excludeIds.includes(a.id));
  const ruleIds = new Set<string>();
  for (const asset of selectedAssets) {
    for (const ruleId of asset.rules) ruleIds.add(ruleId);
  }

  const rules = allRules.filter((r) => ruleIds.has(r.id));
  return { rules, assets: selectedAssets };
}

export function validateAssets(assets: Asset[], allRules: Rule[]): string[] {
  const errors: string[] = [];
  const ruleIds = new Set(allRules.map((r) => r.id));
  for (const asset of assets) {
    for (const ruleId of asset.rules) {
      if (!ruleIds.has(ruleId)) {
        errors.push(`Asset ${asset.id} references unknown rule: ${ruleId}`);
      }
    }
  }
  return errors;
}
