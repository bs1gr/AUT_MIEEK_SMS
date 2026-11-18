/**
 * What Utils > Export > Session Export/Import shows to an account the server refuses.
 *
 * Every request of the panel asks for a permission only an administrator holds. A teacher who
 * opened the section got a red message that was the name of a missing text
 * ("failedToLoadSemesters"), the line "No semesters found in the system", which was not true,
 * and an import form whose every button the server would refuse (found on 18 November 2026).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n/config';
import { LanguageProvider, useLanguage } from '@/LanguageContext';
import SessionExportImport from '../SessionExportImport';

vi.mock('@/api/api', () => ({
  sessionAPI: { listSemesters: vi.fn(), exportSession: vi.fn(), importSession: vi.fn() },
}));

import { sessionAPI } from '@/api/api';

const listSemesters = sessionAPI.listSemesters as unknown as ReturnType<typeof vi.fn>;

// The panel is handed the `t` of useLanguage by the Export page; so is it here.
const Panel = ({ showToast }: { showToast: (message: string, type?: string) => void }) => {
  const { t } = useLanguage();
  return <SessionExportImport t={t} showToast={showToast} />;
};

const renderPanel = async (language: 'en' | 'el' = 'en') => {
  localStorage.setItem('i18nextLng', language);
  await i18n.changeLanguage(language);
  const showToast = vi.fn();
  render(
    <I18nextProvider i18n={i18n}>
      <LanguageProvider>
        <Panel showToast={showToast} />
      </LanguageProvider>
    </I18nextProvider>
  );
  return showToast;
};

describe('SessionExportImport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('tells a refused account that it may not use the panel, and offers no form', async () => {
    listSemesters.mockRejectedValue({ response: { status: 403 } });

    const showToast = await renderPanel();

    expect(await screen.findByTestId('session-not-allowed')).toHaveTextContent(
      'Your account may not export or import a session. Ask an administrator.'
    );
    expect(showToast).not.toHaveBeenCalled();
    expect(screen.queryByText('No semesters found in the system')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(document.querySelector('input[type="file"]')).toBeNull();
  });

  it('says it in Greek to a Greek reader', async () => {
    listSemesters.mockRejectedValue({ response: { status: 403 } });

    await renderPanel('el');

    expect(await screen.findByTestId('session-not-allowed')).toHaveTextContent(
      'Ο λογαριασμός σας δεν μπορεί να εξαγάγει ή να εισαγάγει περίοδο.'
    );
  });

  it('says that the semesters could not be loaded when the request fails for another reason', async () => {
    listSemesters.mockRejectedValue(new Error('network'));

    const showToast = await renderPanel();

    await waitFor(() => expect(showToast).toHaveBeenCalledWith('Could not load the semesters', 'error'));
    expect(screen.getByText('Could not load the semesters')).toBeInTheDocument();
    expect(screen.queryByText('No semesters found in the system')).not.toBeInTheDocument();
    // The import half does not depend on the list and stays.
    expect(document.querySelector('input[type="file"]')).not.toBeNull();
  });

  it('offers the semesters to an account the server answers', async () => {
    listSemesters.mockResolvedValue(['A', 'B']);

    await renderPanel();

    expect(await screen.findByRole('option', { name: 'A' })).toBeInTheDocument();
    expect(screen.queryByTestId('session-not-allowed')).not.toBeInTheDocument();
  });
});
