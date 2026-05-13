import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/core/config.js';
import {
  applyGroupAction,
  buildInitConfigFromSelection,
  buildSelectionDefaults,
  type InteractiveInitSelection,
} from '../src/core/interactive/selection-model.js';

describe('selection model', () => {
  it('keeps base asset locked and maps selected assets to config', () => {
    const selection: InteractiveInitSelection = {
      language: 'zh-CN',
      assetIds: ['framework.vue', 'language.typescript'],
      sourcePath: null,
      sourceAssetIds: [],
      targets: ['generic', 'cursor'],
      sync: true,
      evidence: ['检测到 Vue'],
    };

    const config = buildInitConfigFromSelection(selection);

    expect(config.assets.include).toEqual([
      'base.behavior-basic',
      'framework.vue',
      'language.typescript',
    ]);
    expect(config.targets.generic).toBe(true);
    expect(config.targets.claude).toBe(false);
    expect(config.targets.cursor.enabled).toBe(true);
  });

  it('adds source config and selected source assets', () => {
    const config = buildInitConfigFromSelection({
      language: 'zh-CN',
      assetIds: ['language.java'],
      sourcePath: './team-rules-source',
      sourceAssetIds: ['team.starter-pack'],
      targets: ['generic'],
      sync: false,
      evidence: [],
    });

    expect(config.sources).toEqual([{ type: 'local', path: './team-rules-source' }]);
    expect(config.assets.include).toEqual([
      'base.behavior-basic',
      'language.java',
      'team.starter-pack',
    ]);
  });

  it('keeps multiple existing sources through defaults and config rebuild', () => {
    const existing = defaultConfig();
    existing.sources = [
      { type: 'local', path: './one' },
      { type: 'local', path: './two' },
    ];

    const defaults = buildSelectionDefaults({ existingConfig: existing });
    const config = buildInitConfigFromSelection({
      ...defaults,
      sync: false,
    });

    expect(defaults.sourcePath).toBe('./one');
    expect(defaults.sources).toEqual([
      { type: 'local', path: './one' },
      { type: 'local', path: './two' },
    ]);
    expect(config.sources).toEqual([
      { type: 'local', path: './one' },
      { type: 'local', path: './two' },
    ]);
  });

  it('does not inherit source assets when params override source path only', () => {
    const existing = defaultConfig();
    existing.sources = [{ type: 'local', path: './old' }];
    existing.assets.include = ['base.behavior-basic', 'framework.vue', 'team.old'];

    const defaults = buildSelectionDefaults({
      paramDefaults: { sourcePath: './new' },
      existingConfig: existing,
    });
    const config = buildInitConfigFromSelection({
      ...defaults,
      sync: false,
    });

    expect(defaults.sourcePath).toBe('./new');
    expect(defaults.sources).toEqual([{ type: 'local', path: './new' }]);
    expect(defaults.sourceAssetIds).toEqual([]);
    expect(config.sources).toEqual([{ type: 'local', path: './new' }]);
    expect(config.assets.include).toEqual(['base.behavior-basic', 'framework.vue']);
  });

  it('applies default precedence params over existing over detected over conservative', () => {
    const existing = defaultConfig();
    existing.assets.include = ['base.behavior-basic', 'framework.react'];
    existing.targets.claude = false;
    const defaults = buildSelectionDefaults({
      paramDefaults: { assetIds: ['framework.vue'], targets: ['cursor'] },
      existingConfig: existing,
      detected: {
        assetIds: ['framework.react', 'language.typescript'],
        targets: ['generic', 'claude', 'cursor'],
        signals: [],
        evidence: ['detected'],
      },
    });

    expect(defaults.assetIds).toEqual(['base.behavior-basic', 'framework.vue']);
    expect(defaults.targets).toEqual(['cursor']);
  });

  it('select all and clear only affect selectable items', () => {
    const all = applyGroupAction({
      action: 'select-all',
      selectedIds: ['base.behavior-basic'],
      optionIds: ['base.behavior-basic', 'language.typescript', 'language.java'],
      lockedIds: ['base.behavior-basic'],
    });
    expect(all).toEqual(['base.behavior-basic', 'language.typescript', 'language.java']);

    const cleared = applyGroupAction({
      action: 'clear',
      selectedIds: all,
      optionIds: ['base.behavior-basic', 'language.typescript', 'language.java'],
      lockedIds: ['base.behavior-basic'],
    });
    expect(cleared).toEqual(['base.behavior-basic']);
  });

  it('throws when output targets are empty', () => {
    expect(() => buildInitConfigFromSelection({
      language: 'zh-CN',
      assetIds: [],
      sourcePath: null,
      sourceAssetIds: [],
      targets: [],
      sync: true,
      evidence: [],
    })).toThrow('至少选择一个输出目标');
  });
});
