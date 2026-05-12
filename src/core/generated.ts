import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { GENERATED_PATH } from './config.js';
import { sha256 } from './checksum.js';
import type { RenderedFile } from './render.js';

export async function writeGenerated(root: string, files: RenderedFile[]): Promise<void> {
  const payload = {
    version: '0.1.0',
    generatedAt: new Date().toISOString(),
    files: files.map((file) => ({
      path: file.path,
      checksum: sha256(file.content),
      rules: file.rules
    }))
  };
  const path = join(root, GENERATED_PATH);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
}
