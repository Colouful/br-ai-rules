import { loadConfig } from '../core/config.js';
import { resolveRules, renderFiles, writeRenderedFile } from '../core/render.js';
import { writeGenerated } from '../core/generated.js';
import { unlink } from 'node:fs/promises';
import { join } from 'node:path';

const TARGET_FILES = {
  generic: 'AGENTS.md',
  claude: 'CLAUDE.md',
  cursor: '.cursor/rules/ai-coding.mdc',
} as const;

export async function syncCommand(root = process.cwd()): Promise<void> {
  const config = await loadConfig(root);
  const ctx = await resolveRules(root, config);
  const files = renderFiles(config, ctx);

  // Remove files for disabled targets
  const writtenPaths = new Set(files.map((f) => f.path));
  for (const [target, filePath] of Object.entries(TARGET_FILES)) {
    if (writtenPaths.has(filePath)) continue;
    const fullPath = join(root, filePath);
    try {
      await unlink(fullPath);
    } catch {}
    // Clean up empty parent directories for cursor
    if (target === 'cursor') {
      try {
        const { rmdir } = await import('node:fs/promises');
        await rmdir(join(root, '.cursor/rules'));
        await rmdir(join(root, '.cursor'));
      } catch {}
    }
  }

  for (const file of files) await writeRenderedFile(root, file);
  await writeGenerated(root, files, ctx);
  console.log(`Synced ${files.length} file(s).`);
}
