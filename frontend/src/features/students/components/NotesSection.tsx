import React, { ChangeEvent } from 'react';
import { useLanguage } from '@/LanguageContext';

interface NotesSectionProps {
  value: string;
  onChange: (value: string) => void;
}

const NotesSection: React.FC<NotesSectionProps> = ({ value, onChange }) => {
  const { t } = useLanguage();

  const handleChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    onChange(event.target.value);
  };

  return (
    <div className="border rounded-lg p-4 bg-white shadow-md">
      <div className="font-semibold text-gray-800 mb-2">{t('notes')}</div>
      <textarea
        value={value}
        onChange={handleChange}
        className="w-full min-h-[100px] border rounded px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        placeholder={t('notePlaceholder') || 'Add notes about this student...'}
      />
    </div>
  );
};

export default NotesSection;
