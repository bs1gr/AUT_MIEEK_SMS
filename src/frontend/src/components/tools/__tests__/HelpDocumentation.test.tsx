/**
 * The Help & Documentation tab as a person sees it.
 *
 * The answers hold their steps and lists one to a line. Until 18 November 2026 the page
 * showed each answer as one paragraph ("1. Open ... 2. Click ... 3. ..." in a row), in both
 * languages. What the answers say is checked in i18n/__tests__/helpContent.test.ts.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/i18n/config';
import { LanguageProvider } from '@/LanguageContext';
import HelpDocumentation from '../HelpDocumentation';

const renderHelp = async (language: 'en' | 'el') => {
  localStorage.setItem('i18nextLng', language);
  await i18n.changeLanguage(language);
  render(
    <I18nextProvider i18n={i18n}>
      <LanguageProvider>
        <HelpDocumentation />
      </LanguageProvider>
    </I18nextProvider>
  );
};

describe('HelpDocumentation', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows the steps of an answer one to a line', async () => {
    await renderHelp('en');

    // The first group is open when the tab opens.
    const question = await screen.findByText('How do I add a student?');
    const answer = within(question.parentElement as HTMLElement).getByTestId('help-answer');
    expect(answer).toHaveClass('whitespace-pre-line');
    expect(answer.textContent).toContain('1. Open "Students"\n2. Click "Add Student"');
  });

  it('opens a group and finds an answer by a word in it', async () => {
    const user = userEvent.setup();
    await renderHelp('en');

    await user.click(screen.getByRole('button', { name: /Attendance Tracking/ }));
    expect(screen.getByText('How do I record attendance?')).toBeInTheDocument();

    await user.type(screen.getByPlaceholderText('Search help topics...'), 'absence penalty');
    // Only the groups with a matching answer stay.
    expect(screen.queryByRole('button', { name: /Quick Start/ })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Attendance Tracking/ })).toBeInTheDocument();
  });

  it('answers in Greek on the Greek page', async () => {
    await renderHelp('el');

    const question = await screen.findByText('Πώς προσθέτω έναν σπουδαστή;');
    const answer = within(question.parentElement as HTMLElement).getByTestId('help-answer');
    expect(answer.textContent).toContain('1. Ανοίξτε τους «Σπουδαστές»\n2. Πατήστε «Προσθήκη Σπουδαστή»');
    expect(screen.getByText('Σύντομος Οδηγός')).toBeInTheDocument();
  });
});
