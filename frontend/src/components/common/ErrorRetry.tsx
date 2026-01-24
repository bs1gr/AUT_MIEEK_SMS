import React from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ErrorRetryProps {
  message?: string;
  onRetry: () => void;
  isRetrying?: boolean;
}

const ErrorRetry: React.FC<ErrorRetryProps> = ({
  message,
  onRetry,
  isRetrying = false
}) => {
  const { t } = useTranslation();
  const fallbackMessage = message || t('common.errorGeneric');
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center bg-red-50 rounded-lg border border-red-100">
      <AlertCircle className="w-8 h-8 text-red-500 mb-2" />
      <p className="text-red-700 font-medium mb-4">{fallbackMessage}</p>
      <button
        onClick={onRetry}
        disabled={isRetrying}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-700 rounded-md hover:bg-red-50 transition-colors disabled:opacity-50"
      >
        <RefreshCw className={`w-4 h-4 ${isRetrying ? 'animate-spin' : ''}`} />
        <span>{isRetrying ? t('common.retrying') : t('common.tryAgain')}</span>
      </button>
    </div>
  );
};

export default ErrorRetry;
