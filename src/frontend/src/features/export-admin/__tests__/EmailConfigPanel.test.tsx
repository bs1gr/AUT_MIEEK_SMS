/**
 * Tests for EmailConfigPanel (the SMTP form in the Control Panel)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactElement } from 'react';
import i18n from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { EmailConfigPanel } from '../components/EmailConfigPanel';
import { DateTimeSettingsProvider } from '@/contexts/DateTimeSettingsContext';

// Initialize i18n for tests
i18n.init({
  lng: 'en',
  fallbackLng: 'en',
  resources: {
    en: {
      exportAdmin: {
        email: {
          title: 'Email Configuration',
          description: 'Configure export email notifications',
          host: 'SMTP Host',
          hostPlaceholder: 'smtp.example.com',
          port: 'SMTP Port',
          portPlaceholder: '587',
          username: 'SMTP Username',
          usernamePlaceholder: 'user@example.com',
          password: 'SMTP Password',
          passwordPlaceholder: '••••••••',
          fromEmail: 'From Email',
          fromEmailPlaceholder: 'noreply@example.com',
          adminEmails: 'Admin Emails',
          adminEmailsPlaceholder: 'admin@example.com',
          adminEmailsHint: 'One email per line',
          testButton: 'Test Connection',
        },
        actions: {
          save: 'Save',
          saving: 'Saving',
          testing: 'Testing',
          close: 'Close',
        },
      },
    },
  },
});

// Custom render function
const renderWithProviders = (
  ui: ReactElement,
  options?: { queryClient?: QueryClient }
) => {
  const testQueryClient =
    options?.queryClient ||
    new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={testQueryClient}>
      <I18nextProvider i18n={i18n}>
        <DateTimeSettingsProvider>{children}</DateTimeSettingsProvider>
      </I18nextProvider>
    </QueryClientProvider>
  );

  return render(ui, { wrapper: Wrapper });
};

describe('EmailConfigPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders email configuration title', () => {
    renderWithProviders(
      <EmailConfigPanel config={{ smtp_host: '', smtp_port: 587, smtp_user: '', smtp_password: '', from_email: '', from_name: '' }} onSave={async () => {}} onTest={async () => {}} />
    );

    expect(screen.getByText('Email Configuration')).toBeInTheDocument();
  });

  it('renders all SMTP form fields', () => {
    renderWithProviders(
      <EmailConfigPanel config={{ smtp_host: '', smtp_port: 587, smtp_user: '', smtp_password: '', from_email: '', from_name: '' }} onSave={async () => {}} onTest={async () => {}} />
    );

    expect(screen.getByPlaceholderText('smtp.example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('587')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('user@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('noreply@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('admin@example.com')).toBeInTheDocument();
  });

  it('renders save and test buttons', () => {
    renderWithProviders(
      <EmailConfigPanel config={{ smtp_host: '', smtp_port: 587, smtp_user: '', smtp_password: '', from_email: '', from_name: '' }} onSave={async () => {}} onTest={async () => {}} />
    );

    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /test connection/i })).toBeInTheDocument();
  });

  it('allows input in form fields', async () => {
    const user = userEvent.setup();
    renderWithProviders(
      <EmailConfigPanel config={{ smtp_host: '', smtp_port: 587, smtp_user: '', smtp_password: '', from_email: '', from_name: '' }} onSave={async () => {}} onTest={async () => {}} />
    );

    const hostInput = screen.getByPlaceholderText('smtp.example.com');
    await user.type(hostInput, 'smtp.gmail.com');

    expect(hostInput).toHaveValue('smtp.gmail.com');
  });
});
