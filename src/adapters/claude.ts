import type { Rule } from '../core/rules.js';
import { pickRuleContent } from '../core/rules.js';

export function renderClaude(rules: Rule[], language: string): string {
  const items = rules.map((rule, index) => `${index + 1}. **${rule.name}**：${pickRuleContent(rule, language)}`).join('\n');
  return `# CLAUDE.md\n\n## Claude Code 项目规则\n\n你在本项目中工作时必须遵守以下规则：\n\n${items}\n\n## 完成前检查\n\n- 检查是否存在无关改动。\n- 说明是否运行测试；如果没有运行，说明原因。\n- 明确剩余风险。`;
}
