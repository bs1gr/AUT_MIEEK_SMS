import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import useSemesterArchive from './useSemesterArchive';

const REASON_KEYS: Record<string, string> = {
  not_passed: 'reasonNotPassed',
  incomplete_grading: 'reasonIncompleteGrading',
  no_evaluation_rules: 'reasonNoEvaluationRules',
  already_archived: 'reasonAlreadyArchived',
};

const SemesterArchivePage: React.FC = () => {
  const { t } = useTranslation();
  const {
    semesters,
    preview,
    exports,
    loadingSemesters,
    loadingPreview,
    executing,
    error,
    loadSemesters,
    loadExports,
    runPreview,
    execute,
    downloadExport,
  } = useSemesterArchive();

  const [selectedSemester, setSelectedSemester] = useState('');
  const [passThreshold, setPassThreshold] = useState(60);
  const [confirmText, setConfirmText] = useState('');
  const [result, setResult] = useState<{
    export_id: number;
    export_filename: string | null;
    students_affected: number;
    courses_affected: number;
    enrollments_archived: number;
    enrollments_skipped: number;
  } | null>(null);

  useEffect(() => {
    loadSemesters();
    loadExports();
  }, [loadSemesters, loadExports]);

  const handlePreview = async () => {
    if (!selectedSemester) return;
    setResult(null);
    await runPreview(selectedSemester, passThreshold);
  };

  const handleExecute = async () => {
    if (!selectedSemester || confirmText !== selectedSemester) return;
    const res = await execute(selectedSemester, passThreshold, confirmText);
    if (res) {
      setResult(res);
      setConfirmText('');
      await runPreview(selectedSemester, passThreshold);
    }
  };

  const canExecute = !!preview && preview.eligible_count > 0 && confirmText === selectedSemester && !executing;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">{t('pageTitle', { ns: 'semesterArchive' })}</h1>
      <p className="text-sm text-gray-600 mb-6">{t('pageDescription', { ns: 'semesterArchive' })}</p>

      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      <div className="bg-white shadow rounded-lg p-6 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('selectSemester', { ns: 'semesterArchive' })}
            </label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              value={selectedSemester}
              onChange={(e) => {
                setSelectedSemester(e.target.value);
                setConfirmText('');
                setResult(null);
              }}
              disabled={loadingSemesters}
            >
              <option value="">{t('chooseSemester', { ns: 'semesterArchive' })}</option>
              {semesters.map((s) => (
                <option key={s.semester} value={s.semester}>
                  {s.semester} ({t('courseCount', { ns: 'semesterArchive', count: s.course_count })})
                  {s.already_archived ? ` — ${t('alreadyArchived', { ns: 'semesterArchive' })}` : ''}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('passThreshold', { ns: 'semesterArchive' })}
            </label>
            <input
              type="number"
              min={0}
              max={100}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              value={passThreshold}
              onChange={(e) => setPassThreshold(Number(e.target.value))}
            />
          </div>
        </div>
        <div className="mt-4">
          <button
            type="button"
            onClick={handlePreview}
            disabled={!selectedSemester || loadingPreview}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
          >
            {loadingPreview ? t('previewing', { ns: 'semesterArchive' }) : t('runPreview', { ns: 'semesterArchive' })}
          </button>
        </div>
      </div>

      {preview && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('previewTitle', { ns: 'semesterArchive' })}</h2>

          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            {t('eligibleTitle', { ns: 'semesterArchive', count: preview.eligible_count })}
          </h3>
          {preview.eligible.length === 0 ? (
            <p className="text-sm text-gray-500 mb-4">{t('eligibleEmpty', { ns: 'semesterArchive' })}</p>
          ) : (
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-1 pr-4">{t('student', { ns: 'semesterArchive' })}</th>
                    <th className="py-1 pr-4">{t('course', { ns: 'semesterArchive' })}</th>
                    <th className="py-1 pr-4">{t('finalGrade', { ns: 'semesterArchive' })}</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.eligible.map((pair) => (
                    <tr key={`${pair.student_id}-${pair.course_id}`} className="border-t">
                      <td className="py-1 pr-4">{pair.student_name}</td>
                      <td className="py-1 pr-4">{pair.course_code} — {pair.course_name}</td>
                      <td className="py-1 pr-4">{pair.letter_grade} ({pair.final_grade.toFixed(1)}%)</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <h3 className="text-sm font-semibold text-gray-700 mb-2">
            {t('excludedTitle', { ns: 'semesterArchive', count: preview.excluded_count })}
          </h3>
          {preview.excluded.length === 0 ? (
            <p className="text-sm text-gray-500">{t('excludedEmpty', { ns: 'semesterArchive' })}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="py-1 pr-4">{t('student', { ns: 'semesterArchive' })}</th>
                    <th className="py-1 pr-4">{t('course', { ns: 'semesterArchive' })}</th>
                    <th className="py-1 pr-4">{t('reason', { ns: 'semesterArchive' })}</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.excluded.map((pair) => (
                    <tr key={`${pair.student_id}-${pair.course_id}`} className="border-t">
                      <td className="py-1 pr-4">{pair.student_name}</td>
                      <td className="py-1 pr-4">{pair.course_code} — {pair.course_name}</td>
                      <td className="py-1 pr-4">{t(REASON_KEYS[pair.reason] || pair.reason, { ns: 'semesterArchive' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {preview.eligible_count > 0 && (
            <div className="mt-6 pt-6 border-t">
              <h3 className="text-sm font-semibold text-gray-900 mb-2">
                {t('confirmSectionTitle', { ns: 'semesterArchive' })}
              </h3>
              <p className="text-sm text-gray-600 mb-3">{t('confirmInstructions', { ns: 'semesterArchive' })}</p>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('confirmInputLabel', { ns: 'semesterArchive', semester: selectedSemester })}
              </label>
              <input
                type="text"
                className="w-full sm:w-96 border border-gray-300 rounded-md px-3 py-2 text-sm mb-3"
                placeholder={t('confirmInputPlaceholder', { ns: 'semesterArchive' }) as string}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
              />
              {confirmText && confirmText !== selectedSemester && (
                <p className="text-xs text-red-600 mb-3">{t('confirmMismatch', { ns: 'semesterArchive' })}</p>
              )}
              <div>
                <button
                  type="button"
                  onClick={handleExecute}
                  disabled={!canExecute}
                  className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
                >
                  {executing ? t('executing', { ns: 'semesterArchive' }) : t('execute', { ns: 'semesterArchive' })}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {result && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-green-800 mb-3">
            {t('executeSuccessTitle', { ns: 'semesterArchive' })}
          </h2>
          <dl className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
            <div>
              <dt className="text-gray-500">{t('studentsAffected', { ns: 'semesterArchive' })}</dt>
              <dd className="font-semibold text-gray-900">{result.students_affected}</dd>
            </div>
            <div>
              <dt className="text-gray-500">{t('coursesAffected', { ns: 'semesterArchive' })}</dt>
              <dd className="font-semibold text-gray-900">{result.courses_affected}</dd>
            </div>
            <div>
              <dt className="text-gray-500">{t('enrollmentsArchived', { ns: 'semesterArchive' })}</dt>
              <dd className="font-semibold text-gray-900">{result.enrollments_archived}</dd>
            </div>
            <div>
              <dt className="text-gray-500">{t('enrollmentsSkipped', { ns: 'semesterArchive' })}</dt>
              <dd className="font-semibold text-gray-900">{result.enrollments_skipped}</dd>
            </div>
          </dl>
          {result.export_filename && (
            <button
              type="button"
              onClick={() => downloadExport(result.export_id, `${result.export_filename}.enc`)}
              className="mt-4 bg-white text-green-700 border border-green-300 px-4 py-2 rounded-md hover:bg-green-100 text-sm font-medium"
            >
              {t('downloadExport', { ns: 'semesterArchive' })}
            </button>
          )}
        </div>
      )}

      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('historyTitle', { ns: 'semesterArchive' })}</h2>
        {exports.length === 0 ? (
          <p className="text-sm text-gray-500">{t('historyEmpty', { ns: 'semesterArchive' })}</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-1 pr-4">{t('selectSemester', { ns: 'semesterArchive' })}</th>
                  <th className="py-1 pr-4">{t('statusColumn', { ns: 'semesterArchive' })}</th>
                  <th className="py-1 pr-4">{t('enrollmentsArchived', { ns: 'semesterArchive' })}</th>
                  <th className="py-1 pr-4" />
                </tr>
              </thead>
              <tbody>
                {exports.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="py-1 pr-4">{row.semester}</td>
                    <td className="py-1 pr-4">
                      {t(`status${row.status.charAt(0).toUpperCase()}${row.status.slice(1)}`, { ns: 'semesterArchive' })}
                    </td>
                    <td className="py-1 pr-4">{row.enrollments_archived}</td>
                    <td className="py-1 pr-4">
                      {row.export_filename && (
                        <button
                          type="button"
                          onClick={() => downloadExport(row.id, `${row.export_filename}.enc`)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          {t('downloadExport', { ns: 'semesterArchive' })}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default SemesterArchivePage;
