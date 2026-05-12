import { loadConfig } from '../core/config.js';
import { resolveRules, renderFiles, writeRenderedFile } from '../core/render.js';
import { writeGenerated } from '../core/generated.js';

export async function syncCommand(root = process.cwd()): Promise<void> {
  const config = await loadConfig(root);
  const ctx = await resolveRules(root, config);
  const files = renderFiles(config, ctx);
  for (const file of files) await writeRenderedFile(root, file);
  await writeGenerated(root, files, ctx);
  console.log(`Synced ${files.length} file(s).`);
}
