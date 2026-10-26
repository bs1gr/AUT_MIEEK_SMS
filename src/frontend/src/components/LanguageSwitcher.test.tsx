import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import i18n from '@/i18n/config';
import { LanguageProvider } from '@/LanguageContext';
import LanguageSwitcher from './LanguageSwitcher';

// Real i18n instance: a mocked t() would hide keys that do not resolve.
const renderSwitcher = () =>
  render(
    <LanguageProvider>
      <LanguageSwitcher />
    </LanguageProvider>
  );

describe('LanguageSwitcher', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage('en');
  });

  it('labels the toggle in English when English is active', () => {
    localStorage.setItem('i18nextLng', 'en');
    renderSwitcher();

    const button = screen.getByRole('button', { name: 'Switch to Greek' });
    expect(button).toHaveAttribute('title', 'Current language: English');
    expect(button).toHaveTextContent('EN');
  });

  it('labels the toggle in Greek once Greek is active', async () => {
    localStorage.setItem('i18nextLng', 'en');
    renderSwitcher();

    fireEvent.click(screen.getByRole('button', { name: 'Switch to Greek' }));

    const button = await screen.findByRole('button', { name: 'Αλλαγή σε Αγγλικά' });
    expect(button).toHaveAttribute('title', 'Τρέχουσα γλώσσα: Ελληνικά');
    expect(button).toHaveTextContent('ΕΛ');
  });

  it('shows English for a regional en-US locale, so one tap switches to Greek', async () => {
    localStorage.setItem('i18nextLng', 'en-US');
    renderSwitcher();

    fireEvent.click(screen.getByRole('button', { name: 'Switch to Greek' }));

    await waitFor(() => expect(localStorage.getItem('i18nextLng')).toBe('el'));
  });
});
