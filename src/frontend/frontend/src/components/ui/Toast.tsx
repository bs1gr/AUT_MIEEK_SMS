import { useTranslation } from 'react-i18next';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type = 'info', onClose }) => {
  const { t } = useTranslation();
  const bgColor = {
    success: 'bg-green-100 text-green-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-blue-100 text-blue-800',
  }[type];

  // Split message by newlines and render as separate lines
  const lines = message.split('\n');

  return (
    <div className={`fixed top-4 right-4 p-4 rounded shadow-lg ${bgColor}`}>
      <div className="flex justify-between items-start gap-4">
        <div className="whitespace-pre-line">
          {lines.map((line, idx) => (
            <div key={idx}>{line}</div>
          ))}
        </div>
        <button onClick={onClose} className="font-bold flex-shrink-0">{t('close')}</button>
      </div>
    </div>
  );
};

export default Toast;
