import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/core/config.js';
import { expandAssetsToRules } from '../src/core/assets.js';
import { renderFiles } from '../src/core/render.js';
import type { ResolvedContext } from '../src/core/render.js';

describe('render files', () => {
  it('renders default targets', async () => {
    const config = defaultConfig();
    const { rules, assets } = await expandAssetsToRules(config.assets.include, config.assets.exclude);
    const ctx: ResolvedContext = { rules, assets, customRules: [] };
    const files = renderFiles(config, ctx);
    expect(files.map((file) => file.path)).toEqual([
      'AGENTS.md',
      'CLAUDE.md',
      '.cursor/rules/ai-coding.mdc',
    ]);
    expect(files[0].content).toContain('AI Coding 行为规则');
    expect(files[1].content).toContain('Claude Code 项目规则');
    expect(files[2].content).toContain('alwaysApply: true');
  });
});
