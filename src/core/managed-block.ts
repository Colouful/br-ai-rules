export const START_MARKER = '<!-- BR-AI-RULES:START -->';
export const END_MARKER = '<!-- BR-AI-RULES:END -->';

export function createManagedBlock(content: string): string {
  return `${START_MARKER}\n${content.trim()}\n${END_MARKER}\n`;
}

export function upsertManagedBlock(existing: string | null, generatedContent: string): string {
  const block = createManagedBlock(generatedContent);

  if (!existing || existing.trim().length === 0) {
    return block;
  }

  const start = existing.indexOf(START_MARKER);
  const end = existing.indexOf(END_MARKER);

  if (start >= 0 && end >= 0 && end > start) {
    const before = existing.slice(0, start);
    const after = existing.slice(end + END_MARKER.length).replace(/^\n+/, '');
    return after ? `${before}${block}${after}` : `${before}${block}`;
  }

  const separator = existing.endsWith('\n') ? '\n' : '\n\n';
  return `${existing}${separator}${block}`;
}

export function extractManagedBlock(fileContent: string): string | null {
  const start = fileContent.indexOf(START_MARKER);
  const end = fileContent.indexOf(END_MARKER);

  if (start < 0 || end < 0 || end <= start) {
    return null;
  }

  return fileContent.slice(start + START_MARKER.length, end).trim();
}
