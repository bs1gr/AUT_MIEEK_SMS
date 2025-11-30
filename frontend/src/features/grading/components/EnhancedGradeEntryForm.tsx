import { useState, type ChangeEvent } from 'react';
import Spinner from '@/components/ui/Spinner';
import { useLanguage } from '@/LanguageContext';

type FormFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  value: string | number;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
};

const FormField = ({ label, value, onChange, type = 'text', ...props }: FormFieldProps) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      aria-label={label}
      
      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
      {...props}
    />
  </div>
);

const EnhancedGradeEntryForm = () => {
  const { t } = useLanguage();
  const loading = false;
  const [newGrade, setNewGrade] = useState({
    assignment_name: '',
    grade: '',
    max_grade: '100',
    weight: '1',
  });

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="text-center py-6">
          <Spinner />
          <p className="text-gray-600 mt-2">{t('loadingGrades')}</p>
        </div>
      ) : (
        <form className="space-y-4">
          <FormField
            label={t('assignmentName')}
            value={newGrade.assignment_name}
            onChange={(e) => setNewGrade({ ...newGrade, assignment_name: e.target.value })}
          />
          <FormField
            label={t('score')}
            type="number"
            value={newGrade.grade}
            onChange={(e) => setNewGrade({ ...newGrade, grade: e.target.value })}
          />
          <FormField
            label={t('maxScore')}
            type="number"
            value={newGrade.max_grade}
            onChange={(e) => setNewGrade({ ...newGrade, max_grade: e.target.value })}
          />
          <FormField
            label={t('weight')}
            type="number"
            value={newGrade.weight}
            onChange={(e) => setNewGrade({ ...newGrade, weight: e.target.value })}
          />
        </form>
      )}
    </div>
  );
};

export default EnhancedGradeEntryForm;
