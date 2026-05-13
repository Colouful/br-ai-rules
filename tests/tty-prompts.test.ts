import { PassThrough, Writable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import {
  promptMultiSelect,
  promptSingleSelect,
  promptText,
  type PromptInput,
  type PromptOption,
  type PromptOutput,
} from '../src/core/interactive/tty-prompts.js';

type PromptHarness = {
  input: PassThrough & PromptInput;
  output: PromptOutput;
  rawModes: boolean[];
  text: () => string;
};

const DOWN = '\u001B[B';
const SPACE = ' ';
const ENTER = '\r';

describe('tty prompts', () => {
  it('selects TypeScript with down/down/space/enter in multi-select', async () => {
    const { input, output, rawModes } = createHarness();
    const resultPromise = promptMultiSelect({
      message: '选择规则',
      options: itemOptions(),
      input,
      output,
    });

    input.write(DOWN);
    input.write(DOWN);
    input.write(SPACE);
    input.write(ENTER);

    await expect(resultPromise).resolves.toEqual(['language.typescript']);
    expect(rawModes).toEqual([true, false]);
  });

  it('keeps locked items when select-all and clear actions are used', async () => {
    const { input, output } = createHarness();
    const resultPromise = promptMultiSelect({
      message: '选择规则',
      options: [
        { id: 'base.behavior-basic', label: '基础行为', locked: true },
        { id: 'language.java', label: 'Java' },
        { id: 'select-all', label: '全选', kind: 'action', action: 'select-all' },
        { id: 'clear', label: '清空', kind: 'action', action: 'clear' },
      ],
      input,
      output,
    });

    input.write(DOWN);
    input.write(DOWN);
    input.write(SPACE);
    input.write(DOWN);
    input.write(SPACE);
    input.write(ENTER);

    await expect(resultPromise).resolves.toEqual(['base.behavior-basic']);
  });

  it('shows minSelection message and continues until enough items are selected', async () => {
    const { input, output, text } = createHarness();
    const resultPromise = promptMultiSelect({
      message: '选择规则',
      options: itemOptions(),
      minSelection: 1,
      input,
      output,
    });

    input.write(ENTER);
    input.write(DOWN);
    input.write(SPACE);
    input.write(ENTER);

    await expect(resultPromise).resolves.toEqual(['framework.vue']);
    expect(text()).toContain('至少选择 1 项');
  });

  it('returns the second item with down/enter in single-select', async () => {
    const { input, output } = createHarness();
    const resultPromise = promptSingleSelect({
      message: '选择语言',
      options: itemOptions(),
      input,
      output,
    });

    input.write(DOWN);
    input.write(ENTER);

    await expect(resultPromise).resolves.toBe('framework.vue');
  });

  it('returns trimmed input from promptText', async () => {
    const { input, output } = createHarness();
    const resultPromise = promptText({
      message: '输入路径',
      input,
      output,
    });

    input.write('  ./team-rules  \n');

    await expect(resultPromise).resolves.toBe('./team-rules');
  });

  it('rejects promptText on Ctrl+C without hanging', async () => {
    const { input, output } = createHarness();
    const resultPromise = promptText({
      message: '输入路径',
      input,
      output,
    });

    input.write('\u0003');

    await expect(resultPromise).rejects.toThrow('用户取消');
  });

  it('rejects single-select on input end and removes keypress listener', async () => {
    const { input, output } = createHarness();
    const resultPromise = promptSingleSelect({
      message: '选择语言',
      options: itemOptions(),
      input,
      output,
    });

    expect(input.listenerCount('keypress')).toBe(1);
    input.end();

    await expect(resultPromise).rejects.toThrow('输入已结束');
    expect(input.listenerCount('keypress')).toBe(0);
  });

  it('rejects multi-select on input end and removes keypress listener', async () => {
    const { input, output } = createHarness();
    const resultPromise = promptMultiSelect({
      message: '选择规则',
      options: itemOptions(),
      input,
      output,
    });

    expect(input.listenerCount('keypress')).toBe(1);
    input.end();

    await expect(resultPromise).rejects.toThrow('输入已结束');
    expect(input.listenerCount('keypress')).toBe(0);
  });

  it('restores previous raw mode when prompt completes', async () => {
    const { input, output, rawModes } = createHarness({ isRaw: true });
    const resultPromise = promptSingleSelect({
      message: '选择语言',
      options: itemOptions(),
      input,
      output,
    });

    input.write(ENTER);

    await expect(resultPromise).resolves.toBe('base.behavior-basic');
    expect(rawModes).toEqual([true, true]);
    expect(input.isRaw).toBe(true);
  });
});

function createHarness({ isRaw = false }: { isRaw?: boolean } = {}): PromptHarness {
  const input = new PassThrough() as PassThrough & PromptInput;
  const chunks: string[] = [];
  const rawModes: boolean[] = [];

  input.isTTY = true;
  input.isRaw = isRaw;
  input.setRawMode = vi.fn((mode: boolean) => {
    input.isRaw = mode;
    rawModes.push(mode);
  });

  const output = new Writable({
    write(chunk, _encoding, callback) {
      chunks.push(String(chunk));
      callback();
    },
  });

  return {
    input,
    output,
    rawModes,
    text: () => chunks.join(''),
  };
}

function itemOptions(): PromptOption[] {
  return [
    { id: 'base.behavior-basic', label: '基础行为' },
    { id: 'framework.vue', label: 'Vue' },
    { id: 'language.typescript', label: 'TypeScript' },
  ];
}
