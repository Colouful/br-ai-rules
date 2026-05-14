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

  it('uses interactive mode by default in TTY without selection parameters', () => {
    expect(shouldUseInteractiveInit({}, { isTTY: true })).toBe(true);
  });

  it('does not use interactive mode by default outside TTY', () => {
    expect(shouldUseInteractiveInit({}, { isTTY: false })).toBe(false);
  });

  it('keeps sync false from disabling default interactive mode in TTY', () => {
    expect(shouldUseInteractiveInit({ sync: false }, { isTTY: true })).toBe(true);
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

  it('uses interactive prompts for sync false in TTY without syncing target files', async () => {
    const tmpRoot = await createRoot();

    await initCommand({ sync: false }, tmpRoot, {
      isTTY: true,
      prompts: {
        selectAssets: async () => ['base.behavior-basic', 'framework.vue'],
        selectTargets: async () => ['generic'],
        sourcePath: async () => null,
        confirmSummary: async () => true,
      },
    });

    const config = await loadConfig(tmpRoot);
    expect(config.assets.include).toEqual(['base.behavior-basic', 'framework.vue']);
    expect(config.targets.generic).toBe(true);
    expect(config.targets.claude).toBe(false);
    expect(config.targets.cursor.enabled).toBe(false);
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

  it('skips invalid source path and does not write source assets', async () => {
    const tmpRoot = await createRoot();
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    await initCommand({ interactive: true, asset: 'team.bad-source-pack', sync: false }, tmpRoot, {
      isTTY: true,
      prompts: {
        selectAssets: async () => ['base.behavior-basic'],
        selectTargets: async () => ['generic'],
        sourcePath: async () => 'missing-source',
        confirmSummary: async () => true,
      },
    });

    const config = await loadConfig(tmpRoot);
    expect(errorSpy).toHaveBeenCalledWith('✗ Source path not found: missing-source');
    expect(config.sources).toEqual([]);
    expect(config.assets.include).toEqual(['base.behavior-basic']);
  });
});
