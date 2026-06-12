import React from 'react';
import '@testing-library/jest-dom/vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReactElement } from 'react';
import { I18nextProvider } from 'react-i18next';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import i18n from '../../i18n';
import { LanguageProvider } from '../../LanguageContext';
import ExportDialog from './ExportDialog';

const renderWithLanguage = (ui: ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <I18nextProvider i18n={i18n}>
        <LanguageProvider>{children}</LanguageProvider>
      </I18nextProvider>
    </QueryClientProvider>
  );
  return render(ui, { wrapper: Wrapper });
};

describe('ExportDialog', () => {
  it('renders and toggles dialog', () => {
    renderWithLanguage(<ExportDialog />);
    const openBtn = screen.getByTestId('open-export-dialog-btn');
    expect(openBtn).toBeInTheDocument();

    fireEvent.click(openBtn);
    // Check for the h3 title using a more specific query
    const title = screen.getByRole('heading', { level: 3, name: /Export Data/i });
    expect(title).toBeInTheDocument();

    const closeBtn = screen.getByTestId('close-export-dialog-btn');
    expect(closeBtn).toBeInTheDocument();

    fireEvent.click(closeBtn);
    expect(title).not.toBeInTheDocument();
  });
});
