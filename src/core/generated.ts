import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { GENERATED_PATH } from './config.js';
import { sha256 } from './checksum.js';
import type { RenderedFile } from './render.js';
import type { ResolvedContext } from './render.js';

export async function writeGenerated(root: string, files: RenderedFile[], ctx: ResolvedContext): Promise<void> {
  const sourceRuleIds = new Set<string>();
  const sourceAssetIds = new Set<string>();
  for (const source of ctx.sources) {
    for (const rule of source.rules) sourceRuleIds.add(rule.id);
    for (const asset of source.assets) sourceAssetIds.add(asset.id);
  }

  const payload = {
    version: '0.3.0',
    generatedAt: new Date().toISOString(),
    sources: ctx.sources.map((s) => ({
      type: s.config.type,
      path: s.config.path,
      name: s.manifest.name,
      version: s.manifest.version,
    })),
    assets: ctx.assets.map((a) => ({
      id: a.id,
      layer: a.layer,
      name: a.name,
      source: sourceAssetIds.has(a.id) ? 'source' : 'built-in',
    })),
    rules: ctx.rules.map((r) => ({
      id: r.id,
      category: r.category,
      severity: r.severity,
      source: ctx.customRules.some((c) => c.id === r.id)
        ? 'custom'
        : sourceRuleIds.has(r.id)
          ? 'source'
          : 'built-in',
    })),
    targets: files.map((file) => ({
      path: file.path,
      checksum: sha256(file.content),
      rules: file.rules,
      assets: file.assets,
    })),
  };
  const path = join(root, GENERATED_PATH);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}
