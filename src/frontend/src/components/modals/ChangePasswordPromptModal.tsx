import React from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle } from 'lucide-react';

interface ChangePasswordPromptModalProps {
  isOpen: boolean;
  onOpenPasswordForm?: () => void;
}

/**
 * Modal component that forces users to change their password on first login.
 * This is displayed when password_change_required=true in the user profile.
 *
 * Features:
 * - Cannot be dismissed without changing password
 * - Clear warning message in multiple languages
 * - Links to the password change form
 * - Non-blocking but persistent until password is changed
 */
export const ChangePasswordPromptModal: React.FC<ChangePasswordPromptModalProps> = ({
  isOpen,
  onOpenPasswordForm,
}) => {
  const { t } = useTranslation();

  if (!isOpen) {
    return null;
  }

  const handleOpenPasswordForm = () => {
    if (onOpenPasswordForm) {
      onOpenPasswordForm();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg dark:bg-gray-800">
        {/* Header with icon */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
            <AlertCircle className="h-6 w-6 text-blue-600 dark:text-blue-300" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('controlPanel.changePasswordRequired', 'Change Your Password')}
          </h2>
        </div>

        {/* Warning message */}
        <div className="mb-6 space-y-2">
          <p className="text-sm text-gray-700 dark:text-gray-200">
            {t(
              'controlPanel.changePasswordRequiredMessage',
              'For security reasons, you must change your password before proceeding. Please set a new secure password.'
            )}
          </p>
          <div className="rounded-md bg-yellow-50 p-3 dark:bg-yellow-900/20">
            <p className="text-xs text-yellow-800 dark:text-yellow-200">
              {t(
                'controlPanel.changePasswordSecurityWarning',
                'Your account is using default credentials which pose a security risk.'
              )}
            </p>
          </div>
        </div>

        {/* Password requirements hint */}
        <div className="mb-6 space-y-1 rounded-md bg-blue-50 p-3 dark:bg-blue-900/20">
          <p className="text-xs font-medium text-blue-900 dark:text-blue-200">
            {t('controlPanel.passwordRequirements', 'Password must include:')}
          </p>
          <ul className="space-y-1 text-xs text-blue-800 dark:text-blue-200">
            <li>• {t('controlPanel.passwordLength', '8+ characters')}</li>
            <li>• {t('controlPanel.passwordUppercase', 'Uppercase letter (A-Z)')}</li>
            <li>• {t('controlPanel.passwordLowercase', 'Lowercase letter (a-z)')}</li>
            <li>• {t('controlPanel.passwordNumber', 'Number (0-9)')}</li>
            <li>• {t('controlPanel.passwordSpecial', 'Special character (!@#$%^&*)')}</li>
          </ul>
        </div>

        {/* Action button */}
        <div className="flex gap-3">
          <button
            onClick={handleOpenPasswordForm}
            className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:hover:bg-blue-500 dark:focus:ring-offset-gray-800"
          >
            {t('controlPanel.changePasswordNow', 'Change Password Now')}
          </button>
        </div>

        {/* Footer note */}
        <p className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400">
          {t(
            'controlPanel.changePasswordMandatory',
            'You cannot continue until your password has been changed.'
          )}
        </p>
      </div>
    </div>
  );
};

export default ChangePasswordPromptModal;
