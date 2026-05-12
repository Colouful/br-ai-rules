import { loadConfig } from '../core/config.js';
import { resolveRules, renderFiles, writeRenderedFile } from '../core/render.js';
import { writeGenerated } from '../core/generated.js';

export async function syncCommand(root = process.cwd()): Promise<void> {
  const config = await loadConfig(root);
  const rules = await resolveRules(root, config);
  const files = renderFiles(config, rules);
  for (const file of files) await writeRenderedFile(root, file);
  await writeGenerated(root, files);
  console.log(`Synced ${files.length} file(s).`);
}
