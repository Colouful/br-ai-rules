import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { defaultConfig, GENERATED_PATH } from '../src/core/config.js';
import { initCommand } from '../src/commands/init.js';

let root = '';

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

describe('config version', () => {
  it('defaultConfig version matches package.json', async () => {
    const config = defaultConfig();
    const pkg = JSON.parse(await readFile(join(process.cwd(), 'package.json'), 'utf8'));
    expect(config.version).toBe(pkg.version);
    expect(config.version).not.toBe('0.2.0');
  });

  it('init generates config with correct version', async () => {
    root = await mkdtemp(join(tmpdir(), 'br-rules-version-'));
    await initCommand({ sync: false }, root);
    const config = JSON.parse(await readFile(join(root, '.ai-rules/config.json'), 'utf8'));
    const pkg = JSON.parse(await readFile(join(process.cwd(), 'package.json'), 'utf8'));
    expect(config.version).toBe(pkg.version);
  });

  it('generated.json version matches package.json', async () => {
    root = await mkdtemp(join(tmpdir(), 'br-rules-version-'));
    await initCommand({}, root);
    const generated = JSON.parse(await readFile(join(root, GENERATED_PATH), 'utf8'));
    const pkg = JSON.parse(await readFile(join(process.cwd(), 'package.json'), 'utf8'));
    expect(generated.version).toBe(pkg.version);
  });
});
