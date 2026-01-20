import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ReactElement } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';
import ExportDialog from './ExportDialog';

const renderWithLanguage = (ui: ReactElement) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
  );
  return render(ui, { wrapper: Wrapper });
};

describe('ExportDialog', () => {
  it('renders and toggles dialog', () => {
    renderWithLanguage(<ExportDialog />);
    const openBtn = screen.getByTestId('open-export-dialog-btn');
    fireEvent.click(openBtn);
    expect(screen.getByText(/Export Data/i)).toBeInTheDocument();
    const closeBtn = screen.getByTestId('close-export-dialog-btn');
    fireEvent.click(closeBtn);
    expect(screen.queryByText(/Export Data/i)).not.toBeInTheDocument();
  });
});
