import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RequireAdmin from '../RequireAdmin';

const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const renderAtAdmin = () =>
  render(
    <MemoryRouter initialEntries={['/admin/permissions']}>
      <Routes>
        <Route path="/" element={<div>public home</div>} />
        <Route path="/dashboard" element={<div>dashboard</div>} />
        <Route element={<RequireAdmin />}>
          <Route path="/admin/permissions" element={<div>admin only content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );

describe('RequireAdmin', () => {
  it('renders the admin route when the user has the admin role', () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, email: 'a@b.com', role: 'admin' } });

    renderAtAdmin();

    expect(screen.getByText('admin only content')).toBeInTheDocument();
  });

  it('is case-insensitive when checking the admin role', () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, email: 'a@b.com', role: 'Admin' } });

    renderAtAdmin();

    expect(screen.getByText('admin only content')).toBeInTheDocument();
  });

  it('redirects to "/" when there is no user', () => {
    mockUseAuth.mockReturnValue({ user: null });

    renderAtAdmin();

    expect(screen.getByText('public home')).toBeInTheDocument();
  });

  it('redirects a non-admin authenticated user to "/dashboard"', () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, email: 'a@b.com', role: 'teacher' } });

    renderAtAdmin();

    expect(screen.getByText('dashboard')).toBeInTheDocument();
    expect(screen.queryByText('admin only content')).not.toBeInTheDocument();
  });

  it('redirects to "/dashboard" when the user has no role at all', () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, email: 'a@b.com' } });

    renderAtAdmin();

    expect(screen.getByText('dashboard')).toBeInTheDocument();
  });
});
