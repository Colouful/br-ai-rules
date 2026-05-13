import readline from 'node:readline';
import type { Readable, Writable } from 'node:stream';

export type PromptInput = Readable & { isTTY?: boolean; isRaw?: boolean; setRawMode?: (mode: boolean) => void };
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
    const cleanup = startRawKeypress(input, onKeypress, reject);

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
    const cleanup = startRawKeypress(input, onKeypress, reject);

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

  return new Promise((resolve, reject) => {
    let settled = false;

    const cleanup = (): void => {
      rl.off('SIGINT', onSigint);
      rl.off('close', onClose);
      input.off('end', onEnd);
      input.off('close', onInputClose);
      input.off('error', onInputError);
      input.pause();
    };

    const settle = <T>(callback: (value: T) => void, value: T): void => {
      if (settled) return;
      settled = true;
      cleanup();
      rl.close();
      callback(value);
    };

    const rejectPrompt = (reason: Error): void => {
      settle(reject, reason);
    };

    function onSigint(): void {
      rejectPrompt(cancelError());
    }

    function onClose(): void {
      rejectPrompt(new Error('输入已关闭'));
    }

    function onEnd(): void {
      rejectPrompt(new Error('输入已结束'));
    }

    function onInputClose(): void {
      rejectPrompt(new Error('输入已关闭'));
    }

    function onInputError(error: Error): void {
      rejectPrompt(error);
    }

    rl.once('SIGINT', onSigint);
    rl.once('close', onClose);
    input.once('end', onEnd);
    input.once('close', onInputClose);
    input.once('error', onInputError);

    rl.question(`${message} `, (answer) => {
      settle(resolve, answer.trim());
    });
  });
}

function startRawKeypress(
  input: PromptInput,
  onKeypress: (value: string, key: KeypressKey) => void,
  reject: (reason?: unknown) => void,
): () => void {
  const previousRawMode = Boolean(input.isRaw);
  let cleaned = false;

  const rejectFromInput = (reason: Error): void => {
    cleanup();
    reject(reason);
  };

  const onEnd = (): void => rejectFromInput(new Error('输入已结束'));
  const onClose = (): void => rejectFromInput(new Error('输入已关闭'));
  const onError = (error: Error): void => rejectFromInput(error);

  function cleanup(): void {
    if (cleaned) return;
    cleaned = true;
    input.off('keypress', onKeypress);
    input.off('end', onEnd);
    input.off('close', onClose);
    input.off('error', onError);
    input.setRawMode?.(previousRawMode);
    input.pause();
  }

  readline.emitKeypressEvents(input);
  input.setRawMode?.(true);
  input.resume();
  input.on('keypress', onKeypress);
  input.once('end', onEnd);
  input.once('close', onClose);
  input.once('error', onError);

  return cleanup;
}

function handleAbort(key: KeypressKey, cleanup: () => void, reject: (reason?: unknown) => void): boolean {
  if (key.ctrl && key.name === 'c') {
    cleanup();
    reject(cancelError());
    return true;
  }
  return false;
}

function cancelError(): Error {
  return new Error('用户取消');
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
