/**
 * ChangePasswordPromptModal is the first screen of every new account (password_change_required).
 *
 * Uses the app's real i18n instance, not test-utils/i18n-test-wrapper: the wrapper merges
 * namespaces differently and has no `controlPanel` namespace, so it cannot show whether the
 * modal's keys resolve the way they do in the app. They did not: the modal looked its keys up as
 * `controlPanel.x` in the default namespace, where they do not exist, and every string fell back
 * to its English default — Greek users got an all-English modal.
 */
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import { afterEach, describe, expect, it, vi } from 'vitest';

import i18n from '../../../i18n/config';
import ChangePasswordPromptModal from '../ChangePasswordPromptModal';

const renderIn = async (lng: 'en' | 'el', onOpenPasswordForm = vi.fn()) => {
  await i18n.changeLanguage(lng);
  render(
    <I18nextProvider i18n={i18n}>
      <ChangePasswordPromptModal isOpen onOpenPasswordForm={onOpenPasswordForm} />
    </I18nextProvider>
  );
  return onOpenPasswordForm;
};

describe('ChangePasswordPromptModal', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders nothing when closed', () => {
    const { container } = render(
      <I18nextProvider i18n={i18n}>
        <ChangePasswordPromptModal isOpen={false} />
      </I18nextProvider>
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('is entirely in Greek when the UI is Greek', async () => {
    await renderIn('el');

    expect(screen.getByRole('heading')).toHaveTextContent('Αλλαγή Κωδικού Πρόσβασης');
    expect(screen.getByRole('button')).toHaveTextContent('Αλλάξτε τον Κωδικό Τώρα');
    expect(screen.getByText('Ο κωδικός πρέπει να περιλαμβάνει:')).toBeInTheDocument();
    expect(screen.getByText(/Κεφαλαίο γράμμα/)).toBeInTheDocument();
    expect(screen.getByText('Δεν μπορείτε να συνεχίσετε μέχρι να αλλάξετε τον κωδικό σας.')).toBeInTheDocument();
    // No English left over from fallback defaults.
    expect(document.body.textContent).not.toMatch(/Change Your Password|Password must include|You cannot continue/);
  });

  it('is in English when the UI is English', async () => {
    await renderIn('en');

    expect(screen.getByRole('heading')).toHaveTextContent('Change Your Password');
    expect(screen.getByRole('button')).toHaveTextContent('Change Password Now');
    expect(screen.getByText('You cannot continue until your password has been changed.')).toBeInTheDocument();
  });

  it('opens the password form from its button', async () => {
    const onOpen = await renderIn('en');

    fireEvent.click(screen.getByRole('button'));
    expect(onOpen).toHaveBeenCalledTimes(1);
  });
});
