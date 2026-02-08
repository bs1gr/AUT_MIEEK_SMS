// Note: no React hooks needed here
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/LanguageContext';
import type { StudentFormData } from '@/types';
import { studentSchema } from '@/schemas';
import type { StudentFormData as SchemaStudentFormData } from '@/schemas';
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

interface AddStudentModalProps {
  onClose: () => void;
  onAdd: (student: StudentFormData) => void;
}

const AddStudentModal: React.FC<AddStudentModalProps> = ({ onClose, onAdd }) => {
  const { t } = useLanguage();

  const form = useForm<SchemaStudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      student_id: '',
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      address: '',
      date_of_birth: '',
      enrollment_date: new Date().toISOString().split('T')[0],
      academic_year: '',
      class_division: '',
    },
  });


  const onSubmit = (data: SchemaStudentFormData): void => {
    // Map schema data to existing StudentFormData type
    const studentData: StudentFormData = {
      student_id: data.student_id,
      last_name: data.last_name,
      first_name: data.first_name,
      father_name: '', // Not in form but backend accepts as optional
      mobile_phone: data.phone || '',
      phone: data.phone || '',
      email: data.email,
      health_issue: '', // Not in form but backend accepts as optional
      note: '', // Not in form but backend accepts as optional
      study_year: 1, // Default to 1st year, backend accepts as optional
      academic_year: data.academic_year,
      class_division: data.class_division,
      enrollment_date: data.enrollment_date,
    };
    onAdd(studentData);
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
          <h2 className="text-xl font-bold mb-6">{t('addNewStudent')}</h2>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
            <FormField
              control={form.control}
              name="student_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('studentId')} *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., S12345"
                      aria-label={t('studentId')}
                      data-testid="student-id-input"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('firstNamePlaceholder')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('firstNamePlaceholder')}
                        aria-label={t('firstNamePlaceholder')}
                        data-testid="first-name-input"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="last_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('lastNamePlaceholder')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('lastNamePlaceholder')}
                        aria-label={t('lastNamePlaceholder')}
                        data-testid="last-name-input"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('emailPlaceholder')}</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder={t('emailPlaceholder')}
                      aria-label={t('emailPlaceholder')}
                      data-testid="email-input"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('phonePlaceholder')}</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      placeholder={t('phonePlaceholder')}
                      aria-label={t('phonePlaceholder')}
                      data-testid="phone-input"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('addressPlaceholder')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('addressPlaceholder')}
                      aria-label={t('addressPlaceholder')}
                      data-testid="address-input"
                      {...field}
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="date_of_birth"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('dateOfBirth')}</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        aria-label={t('dateOfBirth')}
                        data-testid="date-of-birth-input"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="enrollment_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('enrollmentDate')}</FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        aria-label={t('enrollmentDate')}
                        data-testid="enrollment-date-input"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="academic_year"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('academicYear')}</FormLabel>
                  <FormControl>
                    <select
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                      aria-label={t('academicYear')}
                      data-testid="academic-year-select"
                      value={field.value || ''}
                      onChange={(e) => field.onChange(e.target.value)}
                    >
                      <option value="">{t('pleaseSelect')}</option>
                      <option value="A">{t('classA')}</option>
                      <option value="B">{t('classB')}</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="class_division"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t('classDivision')}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t('classDivisionPlaceholder')}
                      aria-label={t('classDivision')}
                      data-testid="class-division-input"
                      {...field}
                      value={field.value || ''}
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
                data-testid="submit-student"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? t('saving') : t('addStudent')}
              </Button>
            </div>
          </form>
        </Form>
      </motion.div>
    </motion.div>
    </AnimatePresence>
  );
};

export default AddStudentModal;
