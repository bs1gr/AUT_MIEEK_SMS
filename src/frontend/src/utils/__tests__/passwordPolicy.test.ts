import { describe, it, expect } from 'vitest';
import { unmetPasswordRequirements } from '../passwordPolicy';

// Mirrors backend schemas/auth.py: 8-128 characters, no whitespace, upper, lower, digit, symbol.
describe('unmetPasswordRequirements', () => {
  it.each([
    ['Short#1a', []],
    ['Αβγδεζ#1', []], // Greek capital and lowercase count, as with Python's isupper/islower
    ['short#1a', ['passwordUppercase']],
    ['SHORT#1A', ['passwordLowercase']],
    ['Shorter#a', ['passwordNumber']],
    ['Abcdefgh1234', ['passwordSpecial']], // 12 characters without a symbol: the server refuses it
    ['Sh#1a', ['passwordLength']],
    ['Has space#1A', ['passwordNoSpaces']],
    ['', ['passwordLength', 'passwordUppercase', 'passwordLowercase', 'passwordNumber', 'passwordSpecial']],
  ])('%j -> %j', (password, expected) => {
    expect(unmetPasswordRequirements(password)).toEqual(expected);
  });

  it('caps the length at 128 like the server', () => {
    expect(unmetPasswordRequirements(`Aa1#${'x'.repeat(125)}`)).toEqual(['passwordLength']);
  });
});
