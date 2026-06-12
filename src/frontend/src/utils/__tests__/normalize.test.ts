import { describe, it, expect } from 'vitest';
import { normalizeResponseToArray, asArray } from '@/utils/normalize';

describe('normalize utils', () => {
  it('returns same array when given an array', () => {
    const input = [1, 2, 3];
    expect(normalizeResponseToArray<number>(input)).toEqual([1, 2, 3]);
    expect(asArray<number>(input)).toEqual([1, 2, 3]);
  });

  it('extracts items from paginated object', () => {
    const input = { items: ['a', 'b'] };
    expect(normalizeResponseToArray<string>(input)).toEqual(['a', 'b']);
  });

  it('extracts results from paginated object', () => {
    const input = { results: ['x', 'y'] };
    expect(normalizeResponseToArray<string>(input)).toEqual(['x', 'y']);
  });

  it('returns empty array for unknown shapes', () => {
    expect(normalizeResponseToArray<number>(null)).toEqual([]);
    expect(normalizeResponseToArray<number>({ foo: 'bar' })).toEqual([]);
  });
});
