import { describe, expect, it } from 'vitest';
import { defaultConfig } from '../src/core/config.js';
import { builtInRules } from '../src/core/rules.js';
import { renderFiles } from '../src/core/render.js';

describe('render files', () => {
  it('renders default targets', () => {
    const files = renderFiles(defaultConfig(), builtInRules);
    expect(files.map((file) => file.path)).toEqual([
      'AGENTS.md',
      'CLAUDE.md',
      '.cursor/rules/ai-coding.mdc'
    ]);
    expect(files[0].content).toContain('AI Coding 通用规则');
    expect(files[1].content).toContain('Claude Code 项目规则');
    expect(files[2].content).toContain('alwaysApply: true');
  });
});
