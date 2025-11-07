import { describe, it, expect } from 'vitest';

// String utility tests

describe('String utilities', () => {
  it('should trim whitespace', () => {
    expect('  hello  '.trim()).toBe('hello');
  });

  it('should convert to uppercase', () => {
    expect('abc'.toUpperCase()).toBe('ABC');
  });
});

// Array utility tests

describe('Array utilities', () => {
  it('should find an element', () => {
    expect([1, 2, 3].includes(2)).toBe(true);
  });

  it('should map values', () => {
    expect([1, 2, 3].map(x => x * 2)).toEqual([2, 4, 6]);
  });
});
