import type { Rule } from '../core/rules.js';
import { pickRuleContent, groupRulesByCategory, categoryTitles } from '../core/rules.js';

export function renderCursor(rules: Rule[], language: string): string {
  const groups = groupRulesByCategory(rules);
  const sections: string[] = [];
  for (const [category, categoryRules] of Object.entries(groups)) {
    const title = categoryTitles[category] ?? category;
    const items = categoryRules.map((rule) => `- **${rule.name}**：${pickRuleContent(rule, language)}`).join('\n');
    sections.push(`### ${title}\n\n${items}`);
  }
  return `---\ndescription: AI Coding behavior and coding rules\nalwaysApply: true\n---\n\n# AI Coding 规则\n\n本规则适用于当前项目所有代码、测试和文档修改。\n\n${sections.join('\n\n')}\n\n## 完成前检查\n\n必须说明修改文件、验证结果和剩余风险。`;
}
