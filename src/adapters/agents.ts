import type { Rule } from '../core/rules.js';
import { pickRuleContent } from '../core/rules.js';

export function renderAgents(rules: Rule[], language: string): string {
  const items = rules.map((rule, index) => `${index + 1}. **${rule.name}**：${pickRuleContent(rule, language)}`).join('\n');
  return `# AGENTS.md\n\n## AI Coding 通用规则\n\n${items}\n\n## 输出要求\n\n完成任务后，请说明修改文件、验证结果和剩余风险。`;
}
