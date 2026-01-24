import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRateLimit } from '../../hooks/useRateLimit';
import { Student } from '@/types/student';

interface StudentFormProps {
  initialData?: Partial<Student>;
  onSubmit: (data: Partial<Student>) => Promise<void>;
  onCancel: () => void;
}

const StudentForm: React.FC<StudentFormProps> = ({ initialData, onSubmit, onCancel }) => {
  const { t } = useTranslation();
  const { isRateLimited, call } = useRateLimit(2000); // 2 second cooldown to prevent double-submit
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<Partial<Student>>({
    first_name: '',
    last_name: '',
    email: '',
    // student_id can be optionally provided via initialData when editing
    ...initialData
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isRateLimited || isSubmitting) return;

    setIsSubmitting(true);

    call(async () => {
      try {
        await onSubmit(formData);
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('students.firstName')}
          </label>
          <input
            type="text"
            required
            value={formData.first_name}
            onChange={e => setFormData((prev: any) => ({ ...prev, first_name: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('students.lastName')}
          </label>
          <input
            type="text"
            required
            value={formData.last_name}
            onChange={e => setFormData((prev: any) => ({ ...prev, last_name: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('students.email')}
          </label>
          <input
            type="email"
            required
            value={formData.email}
            onChange={e => setFormData((prev: any) => ({ ...prev, email: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t mt-6">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          disabled={isSubmitting}
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          disabled={isSubmitting || isRateLimited}
          className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
        >
          {isSubmitting ? t('common.saving') : t('common.save')}
        </button>
      </div>
    </form>
  );
};

export default StudentForm;
