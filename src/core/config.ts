import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { z } from 'zod';

export const CONFIG_PATH = '.ai-rules/config.json';
export const GENERATED_PATH = '.ai-rules/generated.json';

export const ConfigSchema = z.object({
  version: z.string().default('0.1.0'),
  language: z.string().default('zh-CN'),
  targets: z.object({
    generic: z.boolean().default(true),
    claude: z.boolean().default(true),
    cursor: z.object({
      enabled: z.boolean().default(true),
      mode: z.enum(['single', 'grouped']).default('single')
    }).default({ enabled: true, mode: 'single' })
  }).default({ generic: true, claude: true, cursor: { enabled: true, mode: 'single' } }),
  rulesets: z.array(z.string()).default(['behavior.basic']),
  disabledRules: z.array(z.string()).default([]),
  customRules: z.array(z.string()).default([]),
  writeMode: z.literal('managed-block').default('managed-block')
});

export type RulesConfig = z.infer<typeof ConfigSchema>;

export function defaultConfig(overrides: Partial<RulesConfig> = {}): RulesConfig {
  return ConfigSchema.parse({
    version: '0.1.0',
    language: 'zh-CN',
    targets: { generic: true, claude: true, cursor: { enabled: true, mode: 'single' } },
    rulesets: ['behavior.basic'],
    disabledRules: [],
    customRules: [],
    writeMode: 'managed-block',
    ...overrides
  });
}

export async function loadConfig(root: string): Promise<RulesConfig> {
  const raw = await readFile(join(root, CONFIG_PATH), 'utf8');
  return ConfigSchema.parse(JSON.parse(raw));
}

export async function writeConfig(root: string, config: RulesConfig): Promise<void> {
  const path = join(root, CONFIG_PATH);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(config, null, 2)}\n`, 'utf8');
}
