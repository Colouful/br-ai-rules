import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { z } from 'zod';

export const CONFIG_PATH = '.ai-rules/config.json';
export const GENERATED_PATH = '.ai-rules/generated.json';

export const ConfigSchema = z.object({
  version: z.string().default('0.2.0'),
  language: z.string().default('zh-CN'),
  targets: z.object({
    generic: z.boolean().default(true),
    claude: z.boolean().default(true),
    cursor: z.object({
      enabled: z.boolean().default(true),
      mode: z.enum(['single', 'grouped']).default('single'),
    }).default({ enabled: true, mode: 'single' }),
  }).default({ generic: true, claude: true, cursor: { enabled: true, mode: 'single' } }),
  assets: z.object({
    include: z.array(z.string()).default(['base.behavior-basic']),
    exclude: z.array(z.string()).default([]),
  }).default({ include: ['base.behavior-basic'], exclude: [] }),
  disabledRules: z.array(z.string()).default([]),
  customRules: z.union([
    z.object({
      autoDiscover: z.boolean().default(true),
      paths: z.array(z.string()).default(['.ai-rules/rules/*.yaml']),
    }),
    z.array(z.string()),
  ]).default({ autoDiscover: true, paths: ['.ai-rules/rules/*.yaml'] }),
  writeMode: z.literal('managed-block').default('managed-block'),
  rulesets: z.array(z.string()).optional(),
});

export type RulesConfig = z.infer<typeof ConfigSchema>;

export function normalizeConfig(raw: Record<string, unknown>): RulesConfig {
  const config = { ...raw };

  if (config.rulesets && !config.assets) {
    const rulesets = config.rulesets as string[];
    const assetMap: Record<string, string> = {
      'behavior.basic': 'base.behavior-basic',
    };
    const include = rulesets.map((r) => assetMap[r] ?? r);
    config.assets = { include, exclude: [] };
  }
  delete config.rulesets;

  if (Array.isArray(config.customRules)) {
    config.customRules = { autoDiscover: true, paths: ['.ai-rules/rules/*.yaml'] };
  }

  return ConfigSchema.parse(config);
}

export function defaultConfig(overrides: Partial<RulesConfig> = {}): RulesConfig {
  return ConfigSchema.parse({
    version: '0.2.0',
    language: 'zh-CN',
    targets: { generic: true, claude: true, cursor: { enabled: true, mode: 'single' } },
    assets: { include: ['base.behavior-basic'], exclude: [] },
    disabledRules: [],
    customRules: { autoDiscover: true, paths: ['.ai-rules/rules/*.yaml'] },
    writeMode: 'managed-block',
    ...overrides,
  });
}

export async function loadConfig(root: string): Promise<RulesConfig> {
  const raw = await readFile(join(root, CONFIG_PATH), 'utf8');
  return normalizeConfig(JSON.parse(raw));
}

export async function writeConfig(root: string, config: RulesConfig): Promise<void> {
  const path = join(root, CONFIG_PATH);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}
