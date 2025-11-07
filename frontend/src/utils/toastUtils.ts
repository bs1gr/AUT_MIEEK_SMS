type ToastType = 'success' | 'error' | 'info';

interface Toast {
  message: string;
  type: ToastType;
}

type SetToast = (toast: Toast) => void;

export const showSuccessToast = (setToast: SetToast, message: string): void => {
  setToast({ message, type: 'success' });
};

export const showErrorToast = (setToast: SetToast, message: string): void => {
  setToast({ message, type: 'error' });
};

export const showInfoToast = (setToast: SetToast, message: string): void => {
  setToast({ message, type: 'info' });
};
