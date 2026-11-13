/**
 * Administrator-only section of the student edit dialog: the health information (which no other
 * screen or list shows), the personal-data file that answers an access request, and permanent
 * erasure. The server enforces the administrator rule; this panel is simply not rendered for
 * anyone else.
 */
import { useEffect, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { useLanguage } from '@/LanguageContext';
import { dataSubjectAPI } from '@/api/dataSubjectAPI';
import { downloadBlob } from '@/utils/downloadFile';
import type { Student } from '@/types';

interface StudentPrivacyPanelProps {
  student: Student;
  /** Called after the student was permanently erased. */
  onErased: (studentId: number) => void;
}

type HealthState = 'loading' | 'ready' | 'unavailable' | 'saving' | 'saved' | 'failed';
type Busy = null | 'export' | 'erase';

const StudentPrivacyPanel: React.FC<StudentPrivacyPanelProps> = ({ student, onErased }) => {
  const { t } = useLanguage();
  const [health, setHealth] = useState('');
  const [stored, setStored] = useState('');
  const [healthState, setHealthState] = useState<HealthState>('loading');
  // False on an installation that does not record health information: the field is then left out.
  const [healthEnabled, setHealthEnabled] = useState(true);
  const [busy, setBusy] = useState<Busy>(null);
  const [message, setMessage] = useState<'exportFailed' | 'eraseFailed' | null>(null);
  const [eraseOpen, setEraseOpen] = useState(false);
  const [confirmText, setConfirmText] = useState('');

  useEffect(() => {
    let active = true;
    setHealthState('loading');
    dataSubjectAPI
      .getHealth(student.id)
      .then(({ text, enabled }) => {
        if (!active) return;
        setHealthEnabled(enabled);
        setHealth(text);
        setStored(text);
        setHealthState('ready');
      })
      .catch(() => {
        if (active) setHealthState('unavailable');
      });
    return () => {
      active = false;
    };
  }, [student.id]);

  const saveHealth = async () => {
    setHealthState('saving');
    try {
      const saved = await dataSubjectAPI.saveHealth(student.id, health);
      setHealth(saved);
      setStored(saved);
      setHealthState('saved');
    } catch {
      setHealthState('failed');
    }
  };

  const exportData = async () => {
    setBusy('export');
    setMessage(null);
    try {
      const file = await dataSubjectAPI.exportData(student.id);
      await downloadBlob(file.blob, file.filename);
    } catch {
      setMessage('exportFailed');
    } finally {
      setBusy(null);
    }
  };

  const registryNumber = String(student.student_id ?? '').trim();
  const canErase = registryNumber !== '' && confirmText.trim() === registryNumber;

  const erase = async () => {
    if (!canErase) return;
    setBusy('erase');
    setMessage(null);
    try {
      await dataSubjectAPI.erase(student.id, confirmText.trim());
      onErased(student.id);
    } catch {
      setMessage('eraseFailed');
      setBusy(null);
    }
  };

  if (healthState === 'unavailable') return null;

  return (
    <section className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4" data-testid="student-privacy-panel">
      <h3 className="flex items-center gap-2 text-sm font-bold text-amber-900">
        <ShieldAlert size={16} />
        {t('privacyPanelTitle')}
      </h3>
      <p className="mt-1 text-xs text-amber-900">{t('privacyPanelHint')}</p>

      {healthEnabled && (
        <>
      <label htmlFor="student-health-info" className="mt-3 block text-sm font-semibold text-gray-800">
        {t('healthInfoLabel')}
      </label>
      <textarea
        id="student-health-info"
        value={health}
        onChange={(event) => {
          setHealth(event.target.value);
          if (healthState !== 'loading') setHealthState('ready');
        }}
        disabled={healthState === 'loading' || healthState === 'saving'}
        rows={2}
        maxLength={5000}
        className="mt-1 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm"
        data-testid="student-health-info"
      />
      <div className="mt-1 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => void saveHealth()}
          disabled={health === stored || healthState === 'loading' || healthState === 'saving'}
          className="rounded-md border border-indigo-200 bg-white px-3 py-1 text-sm font-semibold text-indigo-700 disabled:opacity-50"
          data-testid="student-health-save"
        >
          {t('healthInfoSave')}
        </button>
        <span className="text-xs" role="status">
          {healthState === 'saved' && <span className="text-green-700">{t('healthInfoSaved')}</span>}
          {healthState === 'failed' && <span className="text-red-600">{t('healthInfoFailed')}</span>}
        </span>
      </div>
        </>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-amber-200 pt-3">
        <button
          type="button"
          onClick={() => void exportData()}
          disabled={busy !== null}
          className="rounded-md border border-indigo-200 bg-white px-3 py-1 text-sm font-semibold text-indigo-700 disabled:opacity-50"
          data-testid="student-data-export"
        >
          {t('personalDataExport')}
        </button>
        <button
          type="button"
          onClick={() => setEraseOpen((open) => !open)}
          disabled={busy !== null}
          className="rounded-md border border-red-200 bg-white px-3 py-1 text-sm font-semibold text-red-700 disabled:opacity-50"
          data-testid="student-erase-toggle"
        >
          {t('eraseStudent')}
        </button>
        {message && (
          <span className="text-xs text-red-600" role="status">
            {t(message === 'exportFailed' ? 'personalDataExportFailed' : 'eraseStudentFailed')}
          </span>
        )}
      </div>

      {eraseOpen && (
        <div className="mt-3 rounded-lg border border-red-200 bg-white p-3" data-testid="student-erase-confirm">
          <p className="text-sm text-red-800">{t('eraseStudentWarning')}</p>
          <label htmlFor="student-erase-input" className="mt-2 block text-xs font-semibold text-gray-800">
            {t('eraseStudentConfirmLabel', { number: registryNumber })}
          </label>
          <input
            id="student-erase-input"
            value={confirmText}
            onChange={(event) => setConfirmText(event.target.value)}
            autoComplete="off"
            className="mt-1 w-full rounded border border-gray-300 px-3 py-1 text-sm"
            data-testid="student-erase-input"
          />
          <button
            type="button"
            onClick={() => void erase()}
            disabled={!canErase || busy !== null}
            className="mt-2 rounded-md bg-red-600 px-3 py-1 text-sm font-semibold text-white disabled:opacity-50"
            data-testid="student-erase-button"
          >
            {t('eraseStudentButton')}
          </button>
        </div>
      )}
    </section>
  );
};

export default StudentPrivacyPanel;
