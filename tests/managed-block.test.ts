import { describe, expect, it } from 'vitest';
import { extractManagedBlock, upsertManagedBlock } from '../src/core/managed-block.js';

describe('managed block', () => {
  it('creates a new block for empty file', () => {
    const next = upsertManagedBlock(null, 'hello');
    expect(next).toContain('BR-AI-RULES:START');
    expect(extractManagedBlock(next)).toBe('hello');
  });

  it('replaces only managed block', () => {
    const existing = ['before', '<!-- BR-AI-RULES:START -->', 'old', '<!-- BR-AI-RULES:END -->', 'after'].join('\n');
    const next = upsertManagedBlock(existing, 'new');
    expect(next).toContain('before');
    expect(next).toContain('after');
    expect(next).not.toContain('old');
    expect(extractManagedBlock(next)).toBe('new');
  });

  it('appends a managed block when file has no block', () => {
    const next = upsertManagedBlock('custom content', 'generated');
    expect(next).toContain('custom content');
    expect(extractManagedBlock(next)).toBe('generated');
  });
});
