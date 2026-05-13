import readline from 'node:readline';
import type { Readable, Writable } from 'node:stream';

export type PromptInput = Readable & { isTTY?: boolean; setRawMode?: (mode: boolean) => void };
export type PromptOutput = Writable;
export type PromptOption = {
  id: string;
  label: string;
  locked?: boolean;
  kind?: 'item' | 'action';
  action?: 'select-all' | 'clear';
};

type SingleSelectOptions = {
  message: string;
  options: PromptOption[];
  input?: PromptInput;
  output?: PromptOutput;
};

type MultiSelectOptions = SingleSelectOptions & {
  selectedIds?: string[];
  minSelection?: number;
};

type TextOptions = {
  message: string;
  input?: PromptInput;
  output?: PromptOutput;
};

type KeypressKey = {
  name?: string;
  ctrl?: boolean;
};

const ENTER_KEYS = new Set(['return', 'enter']);

export async function promptSingleSelect({
  message,
  options,
  input = process.stdin,
  output = process.stdout,
}: SingleSelectOptions): Promise<string> {
  assertOptions(options);
  return new Promise((resolve, reject) => {
    let cursor = 0;
    const cleanup = startRawKeypress(input, onKeypress);

    renderSingleSelect(output, message, options, cursor);

    function onKeypress(_value: string, key: KeypressKey): void {
      if (handleAbort(key, cleanup, reject)) return;

      if (key.name === 'down') {
        cursor = Math.min(cursor + 1, options.length - 1);
        renderSingleSelect(output, message, options, cursor);
        return;
      }

      if (key.name === 'up') {
        cursor = Math.max(cursor - 1, 0);
        renderSingleSelect(output, message, options, cursor);
        return;
      }

      if (key.name && ENTER_KEYS.has(key.name)) {
        cleanup();
        resolve(options[cursor].id);
      }
    }
  });
}

export async function promptMultiSelect({
  message,
  options,
  selectedIds = [],
  minSelection = 0,
  input = process.stdin,
  output = process.stdout,
}: MultiSelectOptions): Promise<string[]> {
  assertOptions(options);
  const lockedIds = options
    .filter((option) => option.locked && !isActionOption(option))
    .map((option) => option.id);
  const selected = new Set([...selectedIds, ...lockedIds]);

  return new Promise((resolve, reject) => {
    let cursor = 0;
    const cleanup = startRawKeypress(input, onKeypress);

    renderMultiSelect(output, message, options, selected, cursor);

    function onKeypress(_value: string, key: KeypressKey): void {
      if (handleAbort(key, cleanup, reject)) return;

      if (key.name === 'down') {
        cursor = Math.min(cursor + 1, options.length - 1);
        renderMultiSelect(output, message, options, selected, cursor);
        return;
      }

      if (key.name === 'up') {
        cursor = Math.max(cursor - 1, 0);
        renderMultiSelect(output, message, options, selected, cursor);
        return;
      }

      if (key.name === 'space') {
        applySpace(options[cursor], options, selected);
        renderMultiSelect(output, message, options, selected, cursor);
        return;
      }

      if (key.name && ENTER_KEYS.has(key.name)) {
        const result = selectedResult(options, selected);
        if (result.length < minSelection) {
          output.write(`至少选择 ${minSelection} 项\n`);
          renderMultiSelect(output, message, options, selected, cursor);
          return;
        }

        cleanup();
        resolve(result);
      }
    }
  });
}

export async function promptText({
  message,
  input = process.stdin,
  output = process.stdout,
}: TextOptions): Promise<string> {
  const rl = readline.createInterface({
    input,
    output,
    terminal: Boolean(input.isTTY),
  });

  return new Promise((resolve) => {
    rl.question(`${message} `, (answer) => {
      rl.close();
      input.pause();
      resolve(answer.trim());
    });
  });
}

function startRawKeypress(input: PromptInput, onKeypress: (value: string, key: KeypressKey) => void): () => void {
  readline.emitKeypressEvents(input);
  input.setRawMode?.(true);
  input.resume();
  input.on('keypress', onKeypress);

  return () => {
    input.off('keypress', onKeypress);
    input.setRawMode?.(false);
    input.pause();
  };
}

function handleAbort(key: KeypressKey, cleanup: () => void, reject: (reason?: unknown) => void): boolean {
  if (key.ctrl && key.name === 'c') {
    cleanup();
    reject(new Error('用户取消'));
    return true;
  }
  return false;
}

function applySpace(option: PromptOption, options: PromptOption[], selected: Set<string>): void {
  if (option.action === 'select-all') {
    for (const item of options) {
      if (!isActionOption(item)) {
        selected.add(item.id);
      }
    }
    return;
  }

  if (option.action === 'clear') {
    for (const item of options) {
      if (!isActionOption(item) && !item.locked) {
        selected.delete(item.id);
      }
    }
    return;
  }

  if (option.locked) return;

  if (selected.has(option.id)) {
    selected.delete(option.id);
  } else {
    selected.add(option.id);
  }
}

function selectedResult(options: PromptOption[], selected: Set<string>): string[] {
  return options
    .filter((option) => !isActionOption(option) && selected.has(option.id))
    .map((option) => option.id);
}

function renderSingleSelect(
  output: PromptOutput,
  message: string,
  options: PromptOption[],
  cursor: number,
): void {
  output.write(`${message}\n`);
  for (const [index, option] of options.entries()) {
    output.write(`${index === cursor ? '>' : ' '} ${option.label}\n`);
  }
}

function renderMultiSelect(
  output: PromptOutput,
  message: string,
  options: PromptOption[],
  selected: Set<string>,
  cursor: number,
): void {
  output.write(`${message}\n`);
  for (const [index, option] of options.entries()) {
    const marker = isActionOption(option) ? ' ' : selected.has(option.id) ? 'x' : ' ';
    output.write(`${index === cursor ? '>' : ' '} [${marker}] ${option.label}\n`);
  }
}

function isActionOption(option: PromptOption): boolean {
  return option.kind === 'action' || option.action !== undefined;
}

function assertOptions(options: PromptOption[]): void {
  if (options.length === 0) {
    throw new Error('至少提供一个选项');
  }
}
