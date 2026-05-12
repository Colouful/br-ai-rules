import type { Rule } from '../core/rules.js';
import { pickRuleContent, groupRulesByCategory, categoryTitles } from '../core/rules.js';

export function renderAgents(rules: Rule[], language: string): string {
  const groups = groupRulesByCategory(rules);
  const sections: string[] = [];
  for (const [category, categoryRules] of Object.entries(groups)) {
    const title = categoryTitles[category] ?? category;
    const items = categoryRules.map((rule) => `- **${rule.name}**：${pickRuleContent(rule, language)}`).join('\n');
    sections.push(`### ${title}\n\n${items}`);
  }
  return `# AGENTS.md\n\n## AI Coding 规则\n\n${sections.join('\n\n')}\n\n## 输出要求\n\n完成任务后，请说明修改文件、验证结果和剩余风险。`;
}
