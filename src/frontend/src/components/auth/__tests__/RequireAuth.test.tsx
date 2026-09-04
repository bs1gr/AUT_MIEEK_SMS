import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import RequireAuth from '../RequireAuth';

const mockUseAuth = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

const renderAtProtected = () =>
  render(
    <MemoryRouter initialEntries={['/protected']}>
      <Routes>
        <Route path="/" element={<div>public home</div>} />
        <Route element={<RequireAuth />}>
          <Route path="/protected" element={<div>secret content</div>} />
        </Route>
      </Routes>
    </MemoryRouter>
  );

describe('RequireAuth', () => {
  it('renders the protected route when a user is present', () => {
    mockUseAuth.mockReturnValue({ user: { id: 1, email: 'a@b.com', role: 'student' } });

    renderAtProtected();

    expect(screen.getByText('secret content')).toBeInTheDocument();
  });

  it('redirects to "/" when there is no user', () => {
    mockUseAuth.mockReturnValue({ user: null });

    renderAtProtected();

    expect(screen.getByText('public home')).toBeInTheDocument();
    expect(screen.queryByText('secret content')).not.toBeInTheDocument();
  });
});
