import { describe, it, expect } from 'vitest';

describe('TypeScript basic types', () => {
  it('should infer string type', () => {
    const name: string = 'Copilot';
    expect(typeof name).toBe('string');
  });

  it('should infer number type', () => {
    const value: number = 42;
    expect(typeof value).toBe('number');
  });

  it('should support arrays', () => {
    const arr: number[] = [1, 2, 3];
    expect(Array.isArray(arr)).toBe(true);
    expect(arr.length).toBe(3);
  });

  it('should support interfaces', () => {
    interface User { id: number; name: string; }
    const user: User = { id: 1, name: 'Test' };
    expect(user.id).toBe(1);
    expect(user.name).toBe('Test');
  });
});
