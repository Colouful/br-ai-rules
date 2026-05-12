import { readFile } from 'node:fs/promises';
import YAML from 'yaml';
import { z } from 'zod';

export const RuleSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.string().min(1),
  severity: z.enum(['must', 'should', 'may']).default('must'),
  metadata: z.record(z.unknown()).optional(),
  appliesTo: z.object({
    targets: z.array(z.string()).default(['generic', 'claude', 'cursor']),
    stacks: z.array(z.string()).default(['generic']),
  }).default({ targets: ['generic', 'claude', 'cursor'], stacks: ['generic'] }),
  content: z.record(z.string().min(1), z.string().min(1)),
});

export type Rule = z.infer<typeof RuleSchema>;

export async function loadCustomRule(path: string): Promise<Rule> {
  const raw = await readFile(path, 'utf8');
  return RuleSchema.parse(YAML.parse(raw));
}

export function pickRuleContent(rule: Rule, language: string): string {
  const preferred = rule.content[language];
  const fallback = rule.content['zh-CN'];
  if (!preferred && !fallback) {
    throw new Error(`Rule ${rule.id} has no content for ${language} or zh-CN`);
  }
  return preferred ?? fallback;
}

export type GroupedRules = Record<string, Rule[]>;

export function groupRulesByCategory(rules: Rule[]): GroupedRules {
  const groups: GroupedRules = {};
  for (const rule of rules) {
    if (!groups[rule.category]) groups[rule.category] = [];
    groups[rule.category].push(rule);
  }
  for (const category of Object.keys(groups)) {
    groups[category].sort((a, b) => {
      const sev = (s: string) => (s === 'must' ? 0 : s === 'should' ? 1 : 2);
      const diff = sev(a.severity) - sev(b.severity);
      return diff !== 0 ? diff : a.id.localeCompare(b.id);
    });
  }
  return groups;
}

export const categoryTitles: Record<string, string> = {
  behavior: 'AI Coding 行为规则',
  language: '语言编码规则',
  frontend: '前端项目规则',
  backend: '后端项目规则',
  middleware: '中间件规则',
  testing: '测试规则',
  dependency: '依赖管理规则',
  security: '安全规则',
  api: 'API 契约规则',
  review: '评审规则',
  team: '团队自定义规则',
};
