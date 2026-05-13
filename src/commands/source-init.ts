import { mkdir, writeFile, access } from 'node:fs/promises';
import { join } from 'node:path';

const DEFAULT_DIR = 'team-rules-source';

const MANIFEST = {
  name: 'team-rules',
  version: '0.1.0',
  description: '本地团队规则源（可纳入版本库）。使用 `br-rules source check` 校验。',
  assets: ['team.starter-pack'],
};

const ASSET_YAML = `id: team.starter-pack
name: 团队起始规则包
layer: team
version: "0.1.0"
description: 示例团队资产；按需修改 rules 列表并新增 rules/*.yaml。
rules:
  - team.code-review-required
`;

const RULE_YAML = `id: team.code-review-required
name: Pull Request 必须经过 Code Review
category: team
severity: must
appliesTo:
  targets:
    - generic
    - claude
    - cursor
  stacks:
    - generic
content:
  zh-CN: |
    合并到主分支前必须经过至少一名同事的 Code Review，并处理完阻塞意见后再合并。
`;

export async function sourceInitCommand(
  options: { force?: boolean },
  directoryArg: string | undefined,
  root = process.cwd(),
): Promise<void> {
  const name = (directoryArg?.trim() || DEFAULT_DIR).replace(/\/$/, '');
  const out = join(root, name);

  await mkdir(join(out, 'assets'), { recursive: true });
  await mkdir(join(out, 'rules'), { recursive: true });

  const manifestPath = join(out, 'br-rules.source.json');
  try {
    await access(manifestPath);
    if (!options.force) {
      console.error(`Directory already has br-rules.source.json: ${name}. Use --force to overwrite starter files.`);
      process.exitCode = 1;
      return;
    }
  } catch {
    /* absent: ok */
  }

  await writeFile(manifestPath, `${JSON.stringify(MANIFEST, null, 2)}\n`, 'utf8');
  await writeFile(join(out, 'assets', 'team.starter-pack.yaml'), ASSET_YAML, 'utf8');
  await writeFile(join(out, 'rules', 'team.code-review-required.yaml'), RULE_YAML, 'utf8');

  console.log(`Created team rule source at ${name}/`);
  console.log(`Next: add to project with br-rules init --source ${name} --asset team.starter-pack`);
}
