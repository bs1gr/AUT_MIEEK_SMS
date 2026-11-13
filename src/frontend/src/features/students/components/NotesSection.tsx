import React, { ChangeEvent, useCallback } from 'react';
import { useLanguage } from '@/LanguageContext';
import { useAutosave } from '@/hooks';
import { CloudUpload } from 'lucide-react';

interface NotesSectionProps {
  value: string;
  onChange: (value: string) => void;
  /** The latest text could not be saved on the server. */
  saveFailed?: boolean;
}

const NotesSection: React.FC<NotesSectionProps> = ({ value, onChange, saveFailed = false }) => {
  const { t } = useLanguage();

  // Wrap onChange in useCallback to ensure stable reference for autosave
  const performSave = useCallback(async () => {
    // The save itself is done by onChange (useStudentNotes sends it to the server);
    // this only drives the "pending / saving" indicator.
    return Promise.resolve();
  }, []);

  // Track autosave state for visual feedback
  const { isSaving: isAutosaving, isPending: autosavePending } = useAutosave(
    performSave,
    [value],
    { delay: 2000, enabled: true, skipInitial: true }
  );

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
  };

  return (
    <div className="border rounded-lg p-4 bg-white shadow-md">
      <div className="flex items-center justify-between mb-2">
        <div className="font-semibold text-indigo-800 drop-shadow-xs">{t('notes')}</div>
        {(isAutosaving || autosavePending) && (
          <div className="flex items-center gap-1 text-xs text-indigo-700">
            <CloudUpload
              className={isAutosaving ? 'animate-pulse text-blue-600' : 'text-gray-400'}
              size={14}
            />
            <span>{isAutosaving ? t('saving') : t('autosavePending')}</span>
          </div>
        )}
      </div>
      <textarea
        value={value}
        onChange={handleChange}
        className="w-full min-h-[100px] border rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        placeholder={t('notePlaceholder') || 'Add notes about this student...'}
      />
      {saveFailed ? (
        <p className="mt-1 text-xs text-red-600" role="status" data-testid="note-save-failed">
          {t('noteSaveFailed') || 'Not saved. It will be retried on your next change.'}
        </p>
      ) : (
        <p className="mt-1 text-xs text-gray-500">
          {t('notePrivateHint') || 'Your own notes: only your account can see them.'}
        </p>
      )}
    </div>
  );
};

export default NotesSection;
