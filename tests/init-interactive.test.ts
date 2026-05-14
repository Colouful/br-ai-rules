import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  initCommand,
  shouldUseInteractiveInit,
  type InitRuntime,
} from '../src/commands/init.js';
import { defaultConfig, loadConfig } from '../src/core/config.js';
import type { InteractiveInitSelection } from '../src/core/interactive/selection-model.js';

let root = '';

afterEach(async () => {
  vi.restoreAllMocks();
  process.exitCode = undefined;
  if (root) await rm(root, { recursive: true, force: true });
  root = '';
});

async function createRoot(prefix = 'br-rules-init-interactive-'): Promise<string> {
  root = await mkdtemp(join(tmpdir(), prefix));
  return root;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe('shouldUseInteractiveInit', () => {
  it('uses interactive mode when explicitly requested in TTY', () => {
    expect(shouldUseInteractiveInit({ interactive: true }, { isTTY: true })).toBe(true);
  });

  it('does not use interactive mode for selection parameters', () => {
    expect(shouldUseInteractiveInit({ stack: 'vue,typescript' }, { isTTY: true })).toBe(false);
  });

  it('does not use interactive mode for sync false because --no-sync is a parameter path', () => {
    expect(shouldUseInteractiveInit({ sync: false }, { isTTY: true })).toBe(false);
  });

  it('uses interactive mode by default in TTY without selection parameters', () => {
    expect(shouldUseInteractiveInit({}, { isTTY: true })).toBe(true);
  });

  it('does not use interactive mode by default outside TTY', () => {
    expect(shouldUseInteractiveInit({}, { isTTY: false })).toBe(false);
  });

});

describe('init interactive orchestrator', () => {
  it('keeps non-TTY default behavior and writes only base asset', async () => {
    const tmpRoot = await createRoot();

    await initCommand({ sync: false }, tmpRoot, { isTTY: false });

    const config = await loadConfig(tmpRoot);
    expect(config.assets.include).toEqual(['base.behavior-basic']);
  });

  it('keeps parameter path non-interactive under TTY', async () => {
    const tmpRoot = await createRoot();

    await initCommand({ stack: 'vue,typescript', sync: false }, tmpRoot, { isTTY: true });

    const config = await loadConfig(tmpRoot);
    expect(config.assets.include).toEqual(expect.arrayContaining([
      'framework.vue',
      'language.typescript',
    ]));
  });

  it('reports explicit interactive mode error outside TTY', async () => {
    const tmpRoot = await createRoot();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await initCommand({ interactive: true, sync: false }, tmpRoot, { isTTY: false });

    expect(errorSpy).toHaveBeenCalledWith('当前终端不支持交互，请使用参数模式，例如 br-rules init --stack vue,typescript。');
    expect(process.exitCode).toBe(1);
    await expect(readFile(join(tmpRoot, '.ai-rules/config.json'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('does not overwrite existing config when selecting sync-only', async () => {
    const tmpRoot = await createRoot();
    const existing = defaultConfig();
    existing.assets.include = ['base.behavior-basic', 'framework.react'];
    existing.targets.claude = false;
    await mkdir(join(tmpRoot, '.ai-rules'), { recursive: true });
    await writeFile(join(tmpRoot, '.ai-rules/config.json'), `${JSON.stringify(existing, null, 2)}\n`, 'utf8');

    await initCommand({ interactive: true, sync: false }, tmpRoot, {
      isTTY: true,
      prompts: {
        existingConfigAction: async () => 'sync-only',
      },
    });

    const config = await loadConfig(tmpRoot);
    expect(config.assets.include).toEqual(['base.behavior-basic', 'framework.react']);
    expect(config.targets.claude).toBe(false);
  });

  it('writes prompt-selected assets and targets after confirmation', async () => {
    const tmpRoot = await createRoot();
    const summaries: InteractiveInitSelection[] = [];
    const runtime: InitRuntime = {
      isTTY: true,
      prompts: {
        selectAssets: async () => ['base.behavior-basic', 'framework.vue', 'language.typescript'],
        selectTargets: async () => ['generic', 'cursor'],
        sourcePath: async () => null,
        confirmSummary: async (selection) => {
          summaries.push(selection);
          return true;
        },
      },
    };

    await initCommand({ interactive: true, sync: false }, tmpRoot, runtime);

    const config = await loadConfig(tmpRoot);
    expect(summaries[0].assetIds).toEqual(['base.behavior-basic', 'framework.vue', 'language.typescript']);
    expect(config.assets.include).toEqual(['base.behavior-basic', 'framework.vue', 'language.typescript']);
    expect(config.targets.generic).toBe(true);
    expect(config.targets.cursor.enabled).toBe(true);
    expect(config.targets.claude).toBe(false);
  });

  it('keeps sync false on the non-interactive parameter path in TTY', async () => {
    const tmpRoot = await createRoot();

    await initCommand({ sync: false }, tmpRoot, { isTTY: true });

    const config = await loadConfig(tmpRoot);
    expect(config.assets.include).toEqual(['base.behavior-basic']);
    expect(config.targets.generic).toBe(true);
    expect(config.targets.claude).toBe(true);
    expect(config.targets.cursor.enabled).toBe(true);
    expect(await exists(join(tmpRoot, 'AGENTS.md'))).toBe(false);
    expect(await exists(join(tmpRoot, 'CLAUDE.md'))).toBe(false);
    expect(await exists(join(tmpRoot, '.cursor/rules/ai-coding.mdc'))).toBe(false);
  });

  it('preserves unedited existing config fields during reconfigure', async () => {
    const tmpRoot = await createRoot();
    const existing = defaultConfig();
    existing.assets.include = ['base.behavior-basic', 'framework.react'];
    existing.assets.exclude = ['framework.react.unused'];
    existing.disabledRules = ['base.behavior-basic.confirm-before-destructive'];
    existing.customRules = { autoDiscover: false, paths: ['team/rules/*.yaml'] };
    existing.targets.cursor.mode = 'grouped';
    await mkdir(join(tmpRoot, '.ai-rules'), { recursive: true });
    await writeFile(join(tmpRoot, '.ai-rules/config.json'), `${JSON.stringify(existing, null, 2)}\n`, 'utf8');

    await initCommand({ interactive: true, sync: false }, tmpRoot, {
      isTTY: true,
      prompts: {
        existingConfigAction: async () => 'reconfigure',
        selectAssets: async () => ['base.behavior-basic', 'framework.vue'],
        selectTargets: async () => ['generic', 'cursor'],
        sourcePath: async () => null,
        confirmSummary: async () => true,
      },
    });

    const config = await loadConfig(tmpRoot);
    expect(config.assets.include).toEqual(['base.behavior-basic', 'framework.vue']);
    expect(config.assets.exclude).toEqual(['framework.react.unused']);
    expect(config.disabledRules).toEqual(['base.behavior-basic.confirm-before-destructive']);
    expect(config.customRules).toEqual({ autoDiscover: false, paths: ['team/rules/*.yaml'] });
    expect(config.targets.generic).toBe(true);
    expect(config.targets.claude).toBe(false);
    expect(config.targets.cursor.enabled).toBe(true);
    expect(config.targets.cursor.mode).toBe('grouped');
  });

  it('preserves existing multi-source config when keeping the default source during reconfigure', async () => {
    const tmpRoot = await createRoot();
    const existing = defaultConfig();
    existing.sources = [
      { type: 'local', path: './one' },
      { type: 'local', path: './two' },
    ];
    existing.assets.include = ['base.behavior-basic', 'team.one', 'team.two'];
    await mkdir(join(tmpRoot, '.ai-rules'), { recursive: true });
    await writeFile(join(tmpRoot, '.ai-rules/config.json'), `${JSON.stringify(existing, null, 2)}\n`, 'utf8');

    await initCommand({ interactive: true, sync: false }, tmpRoot, {
      isTTY: true,
      prompts: {
        existingConfigAction: async () => 'reconfigure',
        selectAssets: async () => ['base.behavior-basic'],
        selectTargets: async () => ['generic'],
        sourcePath: async () => './one',
        confirmSummary: async () => true,
      },
    });

    const config = await loadConfig(tmpRoot);
    expect(config.sources).toEqual([
      { type: 'local', path: './one' },
      { type: 'local', path: './two' },
    ]);
    expect(config.assets.include).toEqual(['base.behavior-basic', 'team.one', 'team.two']);
  });

  it('removes existing source config when source prompt returns null during reconfigure', async () => {
    const tmpRoot = await createRoot();
    const existing = defaultConfig();
    existing.sources = [{ type: 'local', path: './team-source' }];
    existing.assets.include = ['base.behavior-basic', 'team.one'];
    await mkdir(join(tmpRoot, '.ai-rules'), { recursive: true });
    await writeFile(join(tmpRoot, '.ai-rules/config.json'), `${JSON.stringify(existing, null, 2)}\n`, 'utf8');

    await initCommand({ interactive: true, sync: false }, tmpRoot, {
      isTTY: true,
      prompts: {
        existingConfigAction: async () => 'reconfigure',
        selectAssets: async () => ['base.behavior-basic'],
        selectTargets: async () => ['generic'],
        sourcePath: async () => null,
        confirmSummary: async () => true,
      },
    });

    const config = await loadConfig(tmpRoot);
    expect(config.sources).toEqual([]);
    expect(config.assets.include).toEqual(['base.behavior-basic']);
  });

  it('uses existing source asset subset as defaults when reconfiguring an existing source', async () => {
    const tmpRoot = await createRoot();
    await createTwoAssetSource(tmpRoot, 'team-source');
    const existing = defaultConfig();
    existing.sources = [{ type: 'local', path: 'team-source' }];
    existing.assets.include = ['base.behavior-basic', 'team.one'];
    await mkdir(join(tmpRoot, '.ai-rules'), { recursive: true });
    await writeFile(join(tmpRoot, '.ai-rules/config.json'), `${JSON.stringify(existing, null, 2)}\n`, 'utf8');
    const selectSourceAssets = vi.fn(async (_assets: string[], defaults: string[]) => defaults);

    await initCommand({ interactive: true, sync: false }, tmpRoot, {
      isTTY: true,
      prompts: {
        existingConfigAction: async () => 'reconfigure',
        selectAssets: async () => ['base.behavior-basic'],
        selectTargets: async () => ['generic'],
        sourcePath: async () => 'team-source',
        selectSourceAssets,
        confirmSummary: async () => true,
      },
    });

    const config = await loadConfig(tmpRoot);
    expect(selectSourceAssets).toHaveBeenCalledWith(['team.one', 'team.two'], ['team.one']);
    expect(config.sources).toEqual([{ type: 'local', path: 'team-source' }]);
    expect(config.assets.include).toEqual(['base.behavior-basic', 'team.one']);
  });

  it('retries injected source path after invalid path and skips when second answer is null', async () => {
    const tmpRoot = await createRoot();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const sourcePathPrompt = vi
      .fn<() => Promise<string | null>>()
      .mockResolvedValueOnce('missing-source')
      .mockResolvedValueOnce(null);
    const sourceRetryAction = vi.fn<() => Promise<'retry' | 'skip' | 'exit'>>().mockResolvedValue('retry');

    await initCommand({ interactive: true, asset: 'team.bad-source-pack', sync: false }, tmpRoot, {
      isTTY: true,
      prompts: {
        selectAssets: async () => ['base.behavior-basic'],
        selectTargets: async () => ['generic'],
        sourcePath: sourcePathPrompt,
        sourceRetryAction,
        confirmSummary: async () => true,
      },
    });

    const config = await loadConfig(tmpRoot);
    expect(sourcePathPrompt).toHaveBeenCalledTimes(2);
    expect(sourceRetryAction).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith('✗ Source path not found: missing-source');
    expect(config.sources).toEqual([]);
    expect(config.assets.include).toEqual(['base.behavior-basic']);
  });

  it('exits without writing config when injected invalid source path chooses exit', async () => {
    const tmpRoot = await createRoot();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const sourceRetryAction = vi.fn<() => Promise<'retry' | 'skip' | 'exit'>>().mockResolvedValue('exit');
    const sourcePathPrompt = vi.fn<() => Promise<string | null>>(async () => {
      if (sourcePathPrompt.mock.calls.length > 1) {
        throw new Error('sourcePath should not be called again after exit');
      }
      return 'missing-source';
    });

    await initCommand({ interactive: true, sync: false }, tmpRoot, {
      isTTY: true,
      prompts: {
        selectAssets: async () => ['base.behavior-basic'],
        selectTargets: async () => ['generic'],
        sourcePath: sourcePathPrompt,
        sourceRetryAction,
        confirmSummary: async () => {
          throw new Error('confirmSummary should not run after exit');
        },
      },
    });

    expect(sourcePathPrompt).toHaveBeenCalledTimes(1);
    expect(sourceRetryAction).toHaveBeenCalledTimes(1);
    expect(errorSpy).toHaveBeenCalledWith('✗ Source path not found: missing-source');
    await expect(readFile(join(tmpRoot, '.ai-rules/config.json'), 'utf8')).rejects.toMatchObject({ code: 'ENOENT' });
  });
});

async function createTwoAssetSource(rootPath: string, sourceDir: string): Promise<void> {
  const sourceRoot = join(rootPath, sourceDir);
  await mkdir(join(sourceRoot, 'assets'), { recursive: true });
  await mkdir(join(sourceRoot, 'rules'), { recursive: true });
  await writeFile(
    join(sourceRoot, 'br-rules.source.json'),
    JSON.stringify({ name: 'team-rules', version: '1.0.0', assets: ['team.one', 'team.two'] }, null, 2),
    'utf8',
  );
  for (const id of ['one', 'two']) {
    await writeFile(
      join(sourceRoot, 'assets', `team.${id}.yaml`),
      [
        `id: team.${id}`,
        `name: Team ${id}`,
        'layer: team',
        'rules:',
        `  - team.${id}.rule`,
      ].join('\n'),
      'utf8',
    );
    await writeFile(
      join(sourceRoot, 'rules', `team.${id}.rule.yaml`),
      [
        `id: team.${id}.rule`,
        `name: Team ${id} Rule`,
        'category: team',
        'severity: must',
        'content:',
        '  zh-CN: |',
        `    team ${id} rule`,
      ].join('\n'),
      'utf8',
    );
  }
}
