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
    stacks: z.array(z.string()).default(['generic'])
  }).default({ targets: ['generic', 'claude', 'cursor'], stacks: ['generic'] }),
  content: z.record(z.string().min(1), z.string().min(1))
});

export type Rule = z.infer<typeof RuleSchema>;

export const builtInRules: Rule[] = [
  {
    id: 'behavior.clarify-before-coding',
    name: '需求不清先澄清',
    category: 'behavior',
    severity: 'must',
    metadata: { sourceVisibility: 'internal', inspiredBy: ['andrej-karpathy-skills'] },
    appliesTo: { targets: ['generic', 'claude', 'cursor'], stacks: ['generic'] },
    content: { 'zh-CN': '当需求、范围、验收标准不清楚时，先提出关键问题，不要直接修改代码。' }
  },
  {
    id: 'behavior.restate-goal-and-scope',
    name: '修改前复述目标和影响范围',
    category: 'behavior',
    severity: 'must',
    metadata: { sourceVisibility: 'internal', inspiredBy: ['andrej-karpathy-skills'] },
    appliesTo: { targets: ['generic', 'claude', 'cursor'], stacks: ['generic'] },
    content: { 'zh-CN': '开始修改前，先简要说明你理解的目标、可能涉及的文件和不应触碰的范围。' }
  },
  {
    id: 'behavior.minimal-change',
    name: '优先最小修改',
    category: 'behavior',
    severity: 'must',
    metadata: { sourceVisibility: 'internal', inspiredBy: ['andrej-karpathy-skills'] },
    appliesTo: { targets: ['generic', 'claude', 'cursor'], stacks: ['generic'] },
    content: { 'zh-CN': '优先做完成当前任务所需的最小修改，不扩大影响范围。' }
  },
  {
    id: 'behavior.no-unrelated-refactor',
    name: '禁止无关重构',
    category: 'behavior',
    severity: 'must',
    metadata: { sourceVisibility: 'internal', inspiredBy: ['andrej-karpathy-skills'] },
    appliesTo: { targets: ['generic', 'claude', 'cursor'], stacks: ['generic'] },
    content: { 'zh-CN': '不要做无关重构，不要格式化无关文件，不要删除不理解的代码。' }
  },
  {
    id: 'behavior.verify-behavior-change',
    name: '行为变化必须验证',
    category: 'behavior',
    severity: 'must',
    metadata: { sourceVisibility: 'internal', inspiredBy: ['mattpocock-skills'] },
    appliesTo: { targets: ['generic', 'claude', 'cursor'], stacks: ['generic'] },
    content: { 'zh-CN': '如果修改会影响功能行为，必须补充测试或说明可执行的手工验证方式。' }
  },
  {
    id: 'behavior.report-validation-and-risk',
    name: '完成后说明验证和风险',
    category: 'behavior',
    severity: 'must',
    metadata: { sourceVisibility: 'internal', inspiredBy: ['superpowers', 'addy-osmani-agent-skills'] },
    appliesTo: { targets: ['generic', 'claude', 'cursor'], stacks: ['generic'] },
    content: { 'zh-CN': '最终回复必须说明修改文件、验证结果、未覆盖风险。如果没有运行验证，必须说明原因。' }
  }
];

export const builtInRulesets: Record<string, string[]> = {
  'behavior.basic': builtInRules.map((rule) => rule.id)
};

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
