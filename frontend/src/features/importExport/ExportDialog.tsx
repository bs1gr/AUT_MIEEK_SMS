import React, { useState } from 'react';
import { useLanguage } from '@/LanguageContext';

// ExportDialog: Step 1 - Skeleton component
// This will be expanded in future micro-batches.

type ExportDialogProps = object;

const ExportDialog: React.FC<ExportDialogProps> = () => {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <div>
      <button onClick={() => setOpen(true)} data-testid="open-export-dialog-btn">
        {t('importExport.openExportDialog')}
      </button>
      {open && (
        <div style={{ border: '1px solid #aaa', padding: 16, background: '#fff', position: 'absolute', zIndex: 10 }}>
          <h3>{t('importExport.exportData')}</h3>
          <p>Export options coming soon...</p>
          <button onClick={() => setOpen(false)} data-testid="close-export-dialog-btn">{t('common.close')}</button>
        </div>
      )}
    </div>
  );
};

export default ExportDialog;
