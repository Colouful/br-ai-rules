import { mkdtemp, rm, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { initCommand } from '../src/commands/init.js';
import { checkCommand } from '../src/commands/check.js';

let root = '';

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

describe('check command', () => {
  it('passes after init and fails after managed block drift', async () => {
    root = await mkdtemp(join(tmpdir(), 'br-ai-rules-'));
    await initCommand({}, root);
    await checkCommand(root);

    const claude = join(root, 'CLAUDE.md');
    const content = await readFile(claude, 'utf8');
    await writeFile(claude, content.replace('需求不清先澄清', '被手动改坏'), 'utf8');

    await checkCommand(root);
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
  });
});
