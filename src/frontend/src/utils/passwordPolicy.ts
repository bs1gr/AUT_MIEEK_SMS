/**
 * The one password rule, as the backend enforces it (schemas/auth.py: 8–128 characters,
 * _validate_password_strength: no whitespace, an uppercase and a lowercase letter, a digit and
 * a symbol). Every password form checks it before sending, so the user sees what is missing
 * instead of a server error. The SMS Lite installer applies the same rule to its admin password.
 *
 * Letters and digits follow Unicode, as Python's isupper/islower/isdigit/isalnum do: a Greek
 * capital counts as an uppercase letter.
 */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

/** Translation keys (controlPanel namespace) of the requirements, in display order. */
export type PasswordRequirementKey =
  | 'passwordLength'
  | 'passwordUppercase'
  | 'passwordLowercase'
  | 'passwordNumber'
  | 'passwordSpecial'
  | 'passwordNoSpaces';

export function unmetPasswordRequirements(password: string): PasswordRequirementKey[] {
  const unmet: PasswordRequirementKey[] = [];
  if (password.length < PASSWORD_MIN_LENGTH || password.length > PASSWORD_MAX_LENGTH) unmet.push('passwordLength');
  if (!/\p{Lu}/u.test(password)) unmet.push('passwordUppercase');
  if (!/\p{Ll}/u.test(password)) unmet.push('passwordLowercase');
  if (!/\p{Nd}/u.test(password)) unmet.push('passwordNumber');
  if (!/[^\p{L}\p{N}\s]/u.test(password)) unmet.push('passwordSpecial');
  if (/\s/u.test(password)) unmet.push('passwordNoSpaces');
  return unmet;
}
