import { mkdir, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';

export async function addCommand(ruleId: string, options: { category?: string; severity?: string; targets?: string }, root = process.cwd()): Promise<void> {
  if (!ruleId || !ruleId.includes('.')) {
    console.error('Rule ID must contain a dot, e.g., team.no-auto-dependency');
    process.exitCode = 1;
    return;
  }

  const dir = join(root, '.ai-rules', 'rules');
  const filePath = join(dir, `${ruleId}.yaml`);

  try {
    await access(filePath);
    console.error(`Rule file already exists: ${filePath}`);
    process.exitCode = 1;
    return;
  } catch {}

  const category = options.category ?? 'team';
  const severity = options.severity ?? 'must';
  const targets = options.targets ? options.targets.split(',').map((t) => t.trim()) : ['generic', 'claude', 'cursor'];

  const yaml = `id: ${ruleId}
name: ${ruleId.split('.').pop() ?? ruleId}
category: ${category}
severity: ${severity}
appliesTo:
  targets:
${targets.map((t) => `    - ${t}`).join('\n')}
  stacks:
    - generic
content:
  zh-CN: |
    TODO: 在这里写规则内容
`;

  await mkdir(dir, { recursive: true });
  await writeFile(filePath, yaml, 'utf8');
  console.log(`Created ${filePath}`);
}
