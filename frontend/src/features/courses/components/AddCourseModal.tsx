import { useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/LanguageContext';
import type { CourseFormData } from '@/types';
import { courseSchema } from '@/schemas';
import type { CourseFormData as SchemaCourseFormData } from '@/schemas';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  Input,
  Button,
  // Select UI components not used in this simplified modal
  Textarea,
} from '@/components/ui';
import { modalVariants, backdropVariants } from '@/utils/animations';
import { getAutoActivationStatus } from '@/utils/courseAutoActivation';

interface AddCourseModalProps {
  onClose: () => void;
  onAdd: (course: CourseFormData) => void;
}

type SemesterType = 'spring' | 'winter' | 'academic_year' | 'school_year' | 'custom';

const AddCourseModal: React.FC<AddCourseModalProps> = ({ onClose, onAdd }) => {
  const { t } = useLanguage();

  // Semester selection state
  const [semesterType, setSemesterType] = useState<SemesterType>('spring');
  const [semesterYear, setSemesterYear] = useState<string>(new Date().getFullYear().toString());
  const [customSemester, setCustomSemester] = useState<string>('');

  const form = useForm<SchemaCourseFormData>({
    // zodResolver's type inference can be too strict in some cases; cast to the
    // resolver type matching our schema-derived form values so react-hook-form
    // generics align properly.
    resolver: zodResolver(courseSchema) as unknown as Resolver<SchemaCourseFormData>,
    defaultValues: {
      course_code: '',
      course_name: '',
      description: '',
      credits: 3,
      semester: generateSemester('spring', new Date().getFullYear().toString(), ''),
      instructor: '',
      absence_penalty: 0,
    },
  });

  // Generate semester string based on type and year
  function generateSemester(type: SemesterType, year: string, custom: string): string {
    switch (type) {
      case 'spring':
        return `${t('springSemester')} ${year}`;
      case 'winter':
        return `${t('winterSemester')} ${year}`;
      case 'academic_year':
        return `${t('academicYear')} ${year}`;
      case 'school_year':
        return `${t('schoolYear')} ${year}`;
      case 'custom':
        return custom || '';
      default:
        return '';
    }
  }

  // Update semester whenever type or year changes
  const handleSemesterTypeChange = (type: SemesterType): void => {
    setSemesterType(type);
    const newSemester = generateSemester(type, semesterYear, customSemester);
    form.setValue('semester', newSemester);
  };

  const handleSemesterYearChange = (year: string): void => {
    setSemesterYear(year);
    const newSemester = generateSemester(semesterType, year, customSemester);
    form.setValue('semester', newSemester);
    form.setValue('year', parseInt(year) || new Date().getFullYear());
  };

  const handleCustomSemesterChange = (custom: string): void => {
    setCustomSemester(custom);
    const newSemester = generateSemester(semesterType, semesterYear, custom);
    form.setValue('semester', newSemester);
  };

  const onSubmit = (data: SchemaCourseFormData): void => {
    // Map schema data to existing CourseFormData type
    const courseData: CourseFormData = {
      course_code: data.course_code,
      course_name: data.course_name,
      semester: data.semester,
      credits: data.credits,
    };
    onAdd(courseData);
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        onClick={onClose}
        tabIndex={-1}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
          if (e.key === 'Enter' || e.key === ' ') onClose();
        }}
      >
        <motion.div
          className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-xl font-bold mb-6">{t('addNewCourse')}</h2>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="course_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('courseCodePlaceholder')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('courseCodePlaceholder')}
                      data-testid="course-code-input"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="course_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('courseNamePlaceholder')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('courseNamePlaceholder')}
                      data-testid="course-name-input"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('description') || 'Description'}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={t('description') || 'Description'} {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Semester Selection */}
            <div className="space-y-2">
              <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{t('semester')} *</label>
              <select
                value={semesterType}
                title={t('semester')}
                onChange={(e) => handleSemesterTypeChange(e.target.value as SemesterType)}
                className="w-full border px-4 py-2 rounded focus:ring-2 focus:ring-indigo-500"
                data-testid="semester-type-select"
              >
                <option value="spring">{t('springSemester')}</option>
                <option value="winter">{t('winterSemester')}</option>
                <option value="academic_year">{t('academicYear')}</option>
                <option value="school_year">{t('schoolYear')}</option>
                <option value="custom">{t('customSemester')}</option>
              </select>

              {semesterType === 'custom' ? (
                <Input
                  type="text"
                  placeholder={t('customSemesterPlaceholder')}
                  value={customSemester}
                  onChange={(e) => handleCustomSemesterChange(e.target.value)}
                  data-testid="custom-semester-input"
                />
              ) : (
                <Input
                  type="text"
                  placeholder={t('yearPlaceholder')}
                  value={semesterYear}
                  onChange={(e) => handleSemesterYearChange(e.target.value)}
                  data-testid="semester-year-input"
                />
              )}

              {/* Preview of generated semester */}
              <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded">
                <strong>{t('semester')}:</strong> {form.watch('semester') || t('selectSemester')}
              </div>

              {/* Auto-activation status indicator */}
              {form.watch('semester') && (() => {
                const status = getAutoActivationStatus(form.watch('semester') || '');
                const bgColor = status.isActive === true
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : status.isActive === false
                    ? 'bg-amber-50 border-amber-200 text-amber-700'
                    : 'bg-blue-50 border-blue-200 text-blue-700';

                return (
                  <div className={`text-xs border px-3 py-2 rounded ${bgColor}`}>
                    <strong>
                      {status.isActive === true && '✓ '}
                      {status.isActive === false && '⊗ '}
                      {status.isActive === null && 'ℹ '}
                      {t(status.label)}:
                    </strong>{' '}
                    {t(status.hint)}
                  </div>
                );
              })()}
            </div>

            <FormField
              control={form.control}
              name="credits"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('creditsPlaceholder')}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder={t('creditsPlaceholder')}
                      data-testid="credits-input"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="instructor"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('instructor') || 'Instructor'}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('instructor') || 'Instructor'} {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="absence_penalty"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('absencePenalty') || 'Absence Penalty'}</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.1"
                      placeholder={t('absencePenalty') || 'Absence Penalty'}
                      data-testid="absence-penalty-input"
                      {...field}
                      value={field.value || 0}
                      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                data-testid="submit-course"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? t('saving') || 'Saving...' : t('addCourse')}
              </Button>
            </div>
          </form>
        </Form>
      </motion.div>
    </motion.div>
    </AnimatePresence>
  );
};

export default AddCourseModal;
