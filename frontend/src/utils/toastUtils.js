export const showSuccessToast = (setToast, message) => {
  setToast({ message, type: 'success' });
};

export const showErrorToast = (setToast, message) => {
  setToast({ message, type: 'error' });
};

export const showInfoToast = (setToast, message) => {
  setToast({ message, type: 'info' });
};
