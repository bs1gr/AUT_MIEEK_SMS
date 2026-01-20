import React from 'react';
import { render, screen, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../i18n';
import HistoryTable from './HistoryTable';

const renderWithLanguage = (ui: ReactElement) => {
  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
  );
  return render(ui, { wrapper: Wrapper });
};

describe('HistoryTable', () => {
  it('renders without crashing and shows placeholder', () => {
    renderWithLanguage(<HistoryTable />);
    expect(screen.getByTestId('history-table-root')).toBeInTheDocument();
    // When there are no jobs, it should show the "No import or export jobs found" message
    expect(screen.getByText(/No import or export jobs found/i)).toBeInTheDocument();
  });
});
