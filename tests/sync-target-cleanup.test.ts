import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile, writeFile, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { initCommand } from '../src/commands/init.js';
import { syncCommand } from '../src/commands/sync.js';

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('sync target cleanup', () => {
  it('removes generated files for disabled targets', async () => {
    const root = await mkdtemp(join(tmpdir(), 'br-rules-cleanup-'));

    await initCommand({}, root);

    expect(await exists(join(root, 'AGENTS.md'))).toBe(true);
    expect(await exists(join(root, 'CLAUDE.md'))).toBe(true);
    expect(await exists(join(root, '.cursor/rules/ai-coding.mdc'))).toBe(true);

    const configPath = join(root, '.ai-rules/config.json');
    const config = JSON.parse(await readFile(configPath, 'utf8'));

    config.targets = {
      generic: true,
      claude: false,
      cursor: { enabled: false, mode: 'single' },
    };

    await writeFile(configPath, JSON.stringify(config, null, 2) + '\n');

    await syncCommand(root);

    expect(await exists(join(root, 'AGENTS.md'))).toBe(true);
    expect(await exists(join(root, 'CLAUDE.md'))).toBe(false);
    expect(await exists(join(root, '.cursor/rules/ai-coding.mdc'))).toBe(false);
    expect(await exists(join(root, '.cursor'))).toBe(false);
  });
});
