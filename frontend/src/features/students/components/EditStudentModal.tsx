import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { useLanguage } from '@/LanguageContext';
import type { Student } from '@/types';
import { studentUpdateSchema } from '@/schemas';
import type { StudentUpdateFormData } from '@/schemas';
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

interface EditStudentModalProps {
  student: Student;
  onClose: () => void;
  onUpdate: (student: Student) => void;
}

const EditStudentModal: React.FC<EditStudentModalProps> = ({ student, onClose, onUpdate }) => {
  const { t } = useLanguage();

  const form = useForm<StudentUpdateFormData>({
    resolver: zodResolver(studentUpdateSchema),
    defaultValues: {
      id: student.id,
      first_name: student.first_name || '',
      last_name: student.last_name || '',
      email: student.email || '',
      phone: student.phone || '',
      address: '',
      date_of_birth: '',
      enrollment_date: student.enrollment_date || new Date().toISOString().split('T')[0],
    },
  });

  useEffect(() => {
    if (student) {
      form.reset({
        id: student.id,
        first_name: student.first_name || '',
        last_name: student.last_name || '',
        email: student.email || '',
        phone: student.phone || '',
        address: '',
        date_of_birth: '',
        enrollment_date: student.enrollment_date || new Date().toISOString().split('T')[0],
      });
    }
  }, [student, form]);

  const onSubmit = (data: StudentUpdateFormData): void => {
    // Map schema data back to Student type
    const updatedStudent: Student = {
      ...student,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone || '',
      mobile_phone: data.phone || '',
      enrollment_date: data.enrollment_date,
    };
    onUpdate(updatedStudent);
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
          <h2 className="text-xl font-bold mb-6">{t('editStudent')}</h2>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} noValidate className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="first_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('firstNamePlaceholder')}</FormLabel>
                    <FormControl>
                      <Input placeholder={t('firstNamePlaceholder')} {...field} />
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
                      <Input placeholder={t('lastNamePlaceholder')} {...field} />
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
                    <Input type="email" placeholder={t('emailPlaceholder')} {...field} />
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
                    <Input type="tel" placeholder={t('phonePlaceholder')} {...field} value={field.value || ''} />
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
                  <FormLabel>{t('addressPlaceholder') || 'Address'}</FormLabel>
                  <FormControl>
                    <Textarea placeholder={t('addressPlaceholder') || 'Address'} {...field} value={field.value || ''} />
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
                    <FormLabel>{t('dateOfBirth') || 'Date of Birth'}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} value={field.value || ''} />
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
                    <FormLabel>{t('enrollmentDate') || 'Enrollment Date'}</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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

export default EditStudentModal;
