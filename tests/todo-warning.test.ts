import { mkdtemp, rm, mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { initCommand } from '../src/commands/init.js';
import { syncCommand } from '../src/commands/sync.js';

let root = '';

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true });
});

describe('custom rule TODO warning', () => {
  it('warns when custom rule content contains TODO placeholder', async () => {
    root = await mkdtemp(join(tmpdir(), 'br-rules-todo-'));
    await initCommand({ sync: false }, root);

    await mkdir(join(root, '.ai-rules/rules'), { recursive: true });
    await writeFile(join(root, '.ai-rules/rules/custom.test-rule.yaml'), [
      'id: custom.test-rule',
      'name: test rule',
      'category: team',
      'severity: must',
      'content:',
      '  zh-CN: |',
      '    TODO: 在这里写规则内容',
    ].join('\n'), 'utf8');

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await syncCommand(root);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('custom.test-rule.yaml'),
    );
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('placeholder'),
    );
    warnSpy.mockRestore();
  });

  it('does not warn when custom rule has real content', async () => {
    root = await mkdtemp(join(tmpdir(), 'br-rules-notodo-'));
    await initCommand({ sync: false }, root);

    await mkdir(join(root, '.ai-rules/rules'), { recursive: true });
    await writeFile(join(root, '.ai-rules/rules/custom.real-rule.yaml'), [
      'id: custom.real-rule',
      'name: real rule',
      'category: team',
      'severity: must',
      'content:',
      '  zh-CN: |',
      '    禁止自动新增依赖',
    ].join('\n'), 'utf8');

    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    await syncCommand(root);
    const placeholderCalls = warnSpy.mock.calls.filter(
      (c) => typeof c[0] === 'string' && c[0].includes('placeholder'),
    );
    expect(placeholderCalls).toHaveLength(0);
    warnSpy.mockRestore();
  });
});
