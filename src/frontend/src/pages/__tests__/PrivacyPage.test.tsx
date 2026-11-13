import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import PrivacyPage from '../PrivacyPage';
import Footer from '@/components/Footer';
import apiClient from '@/api/api';
import commonEn from '@/locales/en/common.js';
import commonEl from '@/locales/el/common.js';
import privacyEn from '@/locales/en/privacy.js';
import privacyEl from '@/locales/el/privacy.js';

vi.mock('@/api/api', () => ({ default: { get: vi.fn() } }));
const get = (apiClient as unknown as { get: ReturnType<typeof vi.fn> }).get;

// A real i18n instance with the real files: a key that does not resolve shows up as the raw key.
const makeI18n = async (lng: 'en' | 'el') => {
  const instance = i18n.createInstance();
  await instance.use(initReactI18next).init({
    lng,
    fallbackLng: 'en',
    resources: {
      en: { privacy: privacyEn, common: commonEn },
      el: { privacy: privacyEl, common: commonEl },
    },
    interpolation: { escapeValue: false },
  });
  return instance;
};

const renderPage = async (lng: 'en' | 'el' = 'en') => {
  const instance = await makeI18n(lng);
  return render(
    <I18nextProvider i18n={instance}>
      <MemoryRouter>
        <PrivacyPage />
        <Footer />
      </MemoryRouter>
    </I18nextProvider>
  );
};

const unconfigured = { controller_name: '', contact: '', dpo_contact: '', notice_url: '', configured: false };

describe('PrivacyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    get.mockResolvedValue({ data: unconfigured });
  });

  it('has the same keys in English and Greek, none of them empty', () => {
    expect(Object.keys(privacyEl).sort()).toEqual(Object.keys(privacyEn).sort());
    [...Object.values(privacyEn), ...Object.values(privacyEl)].forEach((text) => {
      expect(String(text).trim().length).toBeGreaterThan(3);
    });
  });

  it('says to ask the school office while the controller is not configured', async () => {
    await renderPage('en');

    expect(await screen.findByText(/have not been entered in this installation yet/)).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith('/privacy/info');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Privacy notice');
    expect(screen.getByText(/no advertising or analytics cookies/i)).toBeInTheDocument();
    expect(screen.getByText(/Commissioner for Personal Data Protection/)).toBeInTheDocument();
    // No raw translation keys on the page.
    const text = document.body.textContent ?? '';
    Object.keys(privacyEn)
      .filter((key) => /[A-Z]/.test(key))
      .forEach((key) => expect(text).not.toContain(key));
  });

  it('names the controller and its contacts when they are configured', async () => {
    get.mockResolvedValue({
      data: {
        controller_name: 'ΜΙΕΕΚ Λεμεσού',
        contact: 'office@example.org',
        dpo_contact: 'dpo@example.org',
        notice_url: 'https://example.org/privacy',
        configured: true,
      },
    });

    await renderPage('el');

    const box = await screen.findByTestId('privacy-controller');
    await waitFor(() => expect(box).toHaveTextContent('Υπεύθυνος επεξεργασίας είναι: ΜΙΕΕΚ Λεμεσού.'));
    expect(box).toHaveTextContent('office@example.org');
    expect(box).toHaveTextContent('dpo@example.org');
    expect(screen.getByRole('link', { name: 'Η πλήρης ενημέρωση απορρήτου του ιδρύματος' })).toHaveAttribute(
      'href',
      'https://example.org/privacy'
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Ενημέρωση απορρήτου');
  });

  it('never renders a link that is not http(s)', async () => {
    get.mockResolvedValue({
      data: { controller_name: 'X', contact: 'y', dpo_contact: '', notice_url: 'javascript:alert(1)', configured: true },
    });

    await renderPage('en');

    await screen.findByText('The data controller is X.');
    expect(screen.queryByRole('link', { name: /full privacy notice/ })).toBeNull();
  });

  it('still shows the notice when the server does not answer', async () => {
    get.mockRejectedValue(new Error('offline'));

    await renderPage('en');

    expect(await screen.findByText(/please ask the school office/)).toBeInTheDocument();
  });

  it('is linked from the footer of every page', async () => {
    await renderPage('el');

    expect(screen.getByTestId('footer-privacy-link')).toHaveTextContent('Ενημέρωση απορρήτου');
    expect(screen.getByTestId('footer-privacy-link')).toHaveAttribute('href', '/privacy');
  });
});
