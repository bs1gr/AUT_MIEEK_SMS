import { useState, useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/LanguageContext';
import type { Course } from '@/types';
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
  Textarea,
} from '@/components/ui';
import { modalVariants, backdropVariants } from '@/utils/animations';

interface EditCourseModalProps {
  course: Course;
  onClose: () => void;
  onUpdate: (course: Course) => void;
}

type SemesterType = 'spring' | 'winter' | 'academic_year' | 'school_year' | 'custom';

const EditCourseModal: React.FC<EditCourseModalProps> = ({ course, onClose, onUpdate }) => {
  const { t } = useLanguage();

  // Semester selection state - parse existing semester to detect type
  const [semesterType, setSemesterType] = useState<SemesterType>('custom');
  const [semesterYear, setSemesterYear] = useState<string>(new Date().getFullYear().toString());
  const [customSemester, setCustomSemester] = useState<string>('');

  const form = useForm<SchemaCourseFormData>({
    resolver: zodResolver(courseSchema) as unknown as Resolver<SchemaCourseFormData>,
    defaultValues: {
      course_code: course.course_code || '',
      course_name: course.course_name || '',
      description: '',
      credits: course.credits || 3,
      semester: course.semester || '',
      year: new Date().getFullYear(),
      instructor: '',
      absence_penalty: 0,
    },
  });

  useEffect(() => {
    if (course) {
      // Parse existing semester to detect type
      const sem = course.semester || '';
      const currentYear = new Date().getFullYear();

      // Try to extract year from semester string
      const yearMatch = sem.match(/\d{4}/);
      const extractedYear = yearMatch ? yearMatch[0] : currentYear.toString();
      setSemesterYear(extractedYear);

      // Detect semester type based on keywords
      if (sem.includes(t('springSemester')) || sem.toLowerCase().includes('spring') || sem.toLowerCase().includes('εαρινό')) {
        setSemesterType('spring');
      } else if (sem.includes(t('winterSemester')) || sem.toLowerCase().includes('winter') || sem.toLowerCase().includes('χειμερινό') || sem.toLowerCase().includes('fall')) {
        setSemesterType('winter');
      } else if (sem.includes(t('academicYear')) || sem.toLowerCase().includes('academic')) {
        setSemesterType('academic_year');
      } else if (sem.includes(t('schoolYear')) || sem.toLowerCase().includes('school')) {
        setSemesterType('school_year');
      } else {
        setSemesterType('custom');
        setCustomSemester(sem);
      }

      // Reset form with course data
      form.reset({
        course_code: course.course_code || '',
        course_name: course.course_name || '',
        description: '',
        credits: course.credits || 3,
        semester: course.semester || '',
        instructor: '',
        absence_penalty: 0,
      });
    }
  }, [course, t, form]);

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
    // Map schema data back to Course type
    const updatedCourse: Course = {
      ...course,
      course_code: data.course_code,
      course_name: data.course_name,
      semester: data.semester,
      credits: data.credits,
    };
    onUpdate(updatedCourse);
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
      >
        <motion.div
          className="bg-white rounded-2xl shadow-2xl p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto"
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="text-xl font-bold mb-6">{t('editCourse')}</h2>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="course_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('courseCodePlaceholder')}</FormLabel>
                  <FormControl>
                    <Input placeholder={t('courseCodePlaceholder')} {...field} />
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
                    <Input placeholder={t('courseNamePlaceholder')} {...field} />
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
              <label htmlFor="semesterTypeSelect" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">{t('semester')} *</label>
              <select
                value={semesterType}
                id="semesterTypeSelect"
                onChange={(e) => handleSemesterTypeChange(e.target.value as SemesterType)}
                className="w-full border px-4 py-2 rounded focus:ring-2 focus:ring-indigo-500"
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
                />
              ) : (
                <Input
                  type="text"
                  placeholder={t('yearPlaceholder')}
                  value={semesterYear}
                  onChange={(e) => handleSemesterYearChange(e.target.value)}
                />
              )}

              {/* Preview of generated semester */}
              <div className="text-sm text-gray-600 bg-gray-50 px-3 py-2 rounded">
                <strong>{t('semester')}:</strong> {form.watch('semester') || t('selectSemester')}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? t('saving') || 'Saving...' : t('saveChanges')}
              </Button>
            </div>
          </form>
        </Form>
      </motion.div>
    </motion.div>
    </AnimatePresence>
  );
};

export default EditCourseModal;
