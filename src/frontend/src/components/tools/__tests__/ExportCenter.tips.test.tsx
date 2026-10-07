import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n/config';
import { LanguageProvider } from '@/LanguageContext';
import ExportCenter from '../ExportCenter';

vi.mock('@/api/api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/api/api')>()),
  default: { get: vi.fn().mockResolvedValue({ data: [] }), post: vi.fn().mockResolvedValue({ data: {} }) },
  coursesAPI: { getAll: vi.fn().mockResolvedValue([]) },
}));
vi.mock('react-to-print', () => ({ useReactToPrint: () => vi.fn() }));
vi.mock('../SessionExportImport', () => ({ default: () => null }));
vi.mock('../PrintableCalendarSheet', () => ({ default: () => null }));

const renderCenter = () =>
  render(
    <I18nextProvider i18n={i18n}>
      <LanguageProvider>
        <MemoryRouter>
          <ExportCenter />
        </MemoryRouter>
      </LanguageProvider>
    </I18nextProvider>,
  );

describe('ExportCenter export tips', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en');
  });

  // <Trans> only reads the default namespace unless told otherwise; these keys live in `export`.
  it('renders the translated tips, not their keys', () => {
    renderCenter();
    expect(screen.queryByText(/exportTip(Excel|PDF|StudentReports)/)).toBeNull();
    expect(screen.getByText('Excel files').tagName).toBe('B');
    expect(screen.getByText('PDF files').tagName).toBe('B');
    expect(screen.getByText('Analytics exports').tagName).toBe('B');
  });
});
