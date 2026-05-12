import type { Rule } from '../core/rules.js';
import { pickRuleContent } from '../core/rules.js';

export function renderCursor(rules: Rule[], language: string): string {
  const items = rules.map((rule, index) => `${index + 1}. **${rule.name}**：${pickRuleContent(rule, language)}`).join('\n');
  return `---\ndescription: AI Coding basic behavior rules\nalwaysApply: true\n---\n\n# AI Coding 基础行为规则\n\n本规则适用于当前项目所有代码、测试和文档修改。\n\n## 必须遵守\n\n${items}\n\n## 完成前检查\n\n必须说明修改文件、验证结果和剩余风险。`;
}
