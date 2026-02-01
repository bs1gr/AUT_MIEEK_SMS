import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from './ui/Modal';
import { Button } from './ui/button';
import { Textarea } from './ui/textarea';

interface UserFeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (feedback: string) => void;
}

const UserFeedbackModal = ({ isOpen, onClose, onSubmit }: UserFeedbackModalProps) => {
  const { t } = useTranslation();
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
    <Modal isOpen={isOpen} onClose={onClose} title={t('title', { ns: 'feedback' })}>
      <form onSubmit={handleSubmit} className="space-y-4" aria-label={t('title', { ns: 'feedback' })}>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200" htmlFor="user-feedback-textarea">
          {t('prompt', { ns: 'feedback' })}
        </label>
        <Textarea
          id="user-feedback-textarea"
          value={feedback}
          onChange={e => setFeedback(e.target.value)}
          rows={4}
          required
          className="w-full mt-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-y"
          placeholder={t('placeholder', { ns: 'feedback' })}
          aria-required="true"
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button type="button" onClick={onClose} variant="secondary">
            {t('cancel', { ns: 'common' })}
          </Button>
          <Button type="submit" disabled={submitting || !feedback.trim()} aria-busy={submitting}>
            {submitting ? t('sending', { ns: 'common' }) : t('submit', { ns: 'feedback' })}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default UserFeedbackModal;
