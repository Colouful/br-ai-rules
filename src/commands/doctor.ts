import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadConfig, CONFIG_PATH, GENERATED_PATH } from '../core/config.js';
import { auditSourcePath } from '../core/source.js';
import { resolveRules, renderFiles } from '../core/render.js';
import { extractManagedBlock } from '../core/managed-block.js';

export async function doctorCommand(root = process.cwd()): Promise<void> {
  console.log('BR AI Rules — 诊断\n');

  let config;
  try {
    config = await loadConfig(root);
  } catch (e) {
    console.error(`✗ 未找到或无法解析 ${CONFIG_PATH}`);
    console.error(`  ${e instanceof Error ? e.message : e}`);
    process.exitCode = 1;
    return;
  }
  console.log(`✓ ${CONFIG_PATH} 可读`);

  for (const src of config.sources) {
    const audit = await auditSourcePath(root, src.path);
    for (const w of audit.warnings) console.warn(`⚠ ${w}`);
    if (audit.errors.length > 0) {
      for (const err of audit.errors) console.error(`✗ ${err}`);
      process.exitCode = 1;
      return;
    }
    if (audit.loaded) {
      console.log(`✓ 规则来源 ${src.path} (${audit.loaded.manifest.name}@${audit.loaded.manifest.version})`);
    }
  }

  if (config.sources.length === 0) {
    console.log('ℹ 未配置本地规则来源（config.sources 为空）');
  }

  let ctx;
  try {
    ctx = await resolveRules(root, config);
  } catch (e) {
    console.error(`✗ 规则合并失败: ${e instanceof Error ? e.message : e}`);
    process.exitCode = 1;
    return;
  }
  console.log('✓ 规则与资产合并成功（无重复 ID）');

  const files = renderFiles(config, ctx);
  for (const file of files) {
    const target = join(root, file.path);
    let existing = '';
    try {
      existing = await readFile(target, 'utf8');
    } catch {
      console.error(`✗ 缺少生成目标文件: ${file.path}`);
      process.exitCode = 1;
      continue;
    }
    const managed = extractManagedBlock(existing);
    if (managed === null) {
      console.warn(`⚠ ${file.path} 中未找到托管块（managed block）`);
    } else if (managed.trim() !== file.content.trim()) {
      console.warn(`⚠ ${file.path} 与当前配置不同步，建议运行: br-rules sync`);
    } else {
      console.log(`✓ ${file.path} 与配置一致`);
    }
  }

  try {
    await readFile(join(root, GENERATED_PATH), 'utf8');
    console.log(`✓ ${GENERATED_PATH} 存在`);
  } catch {
    console.warn(`⚠ 缺少 ${GENERATED_PATH}，可运行 br-rules sync 生成`);
  }

  console.log('\n诊断完成。');
}
