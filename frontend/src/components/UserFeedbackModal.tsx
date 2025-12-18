import { useState } from 'react';
import { useLanguage } from '../LanguageContext';
import Modal from './ui/Modal';
import Button from './ui/button';
import Textarea from './ui/textarea';

interface UserFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedback: string) => void;
}

const UserFeedbackModal = ({ isOpen, onClose, onSubmit }: UserFeedbackModalProps) => {
  const { t } = useLanguage();
  const [feedback, setFeedback] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    await onSubmit(feedback);
    setSubmitting(false);
    setFeedback('');
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('feedback.title')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
          {t('feedback.prompt')}
          <Textarea
            value={feedback}
            onChange={e => setFeedback(e.target.value)}
            rows={4}
            required
            className="mt-2 w-full"
            placeholder={t('feedback.placeholder')}
          />
        </label>
        <div className="flex justify-end gap-2">
          <Button type="button" onClick={onClose} variant="secondary">
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={submitting || !feedback.trim()}>
            {submitting ? t('common.sending') : t('feedback.submit')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default UserFeedbackModal;
