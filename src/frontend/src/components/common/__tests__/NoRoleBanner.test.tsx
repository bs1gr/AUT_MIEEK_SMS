/**
 * The line an account without a role sees on every page.
 *
 * Such an account sees the same pages and buttons as anybody, and the server refuses each of
 * its requests: until November 2026 nothing told it why ("Error loading analytics data",
 * "Failed to load data"). The owner, 18 November 2026: "a sentence telling an account without
 * access why its pages fail".
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import NoRoleBanner from '../NoRoleBanner';
import authEn from '@/locales/en/auth.js';
import authEl from '@/locales/el/auth.js';

const authValue: { user: { id: number; role?: string | null; email: string } | null } = { user: null };
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => authValue }));
vi.mock('@/LanguageContext', () => ({ useLanguage: () => ({ t: (key: string) => key }) }));

const as = (role: string | null | undefined) => {
  authValue.user = { id: 4, role, email: 'someone@example.com' };
  return render(<NoRoleBanner />);
};

describe('NoRoleBanner', () => {
  it.each(['none', 'student', 'viewer', 'guest', 'staff', '', null, undefined])(
    'tells an account whose role is %j that it has no role',
    (role) => {
      as(role);

      expect(screen.getByTestId('no-role-banner')).toHaveTextContent('auth.noRoleNotice');
      expect(screen.getByRole('status')).toBeInTheDocument();
    }
  );

  it.each(['admin', 'teacher', 'Admin', ' teacher '])('says nothing to an account whose role is %j', (role) => {
    as(role);

    expect(screen.queryByTestId('no-role-banner')).not.toBeInTheDocument();
  });

  it('says nothing while nobody is signed in', () => {
    authValue.user = null;
    render(<NoRoleBanner />);

    expect(screen.queryByTestId('no-role-banner')).not.toBeInTheDocument();
  });

  it('has its sentence in both languages', () => {
    expect((authEn as Record<string, string>).noRoleNotice).toMatch(/no role/i);
    expect((authEl as Record<string, string>).noRoleNotice).toMatch(/δεν έχει ρόλο/);
  });
});
