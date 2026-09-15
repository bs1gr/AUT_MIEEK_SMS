import { Database, Download, Upload } from 'lucide-react';
import { useSessionExportImport } from './useSessionExportImport';

interface SessionExportImportProps {
  t: (key: string, params?: Record<string, unknown>) => string;
  showToast: (message: string, type?: string) => void;
}

const SessionExportImport = ({ t, showToast }: SessionExportImportProps) => {
  const {
    semesters,
    selectedSemester,
    setSelectedSemester,
    selectedFile,
    mergeStrategy,
    setMergeStrategy,
    loadingSemesters,
    exportingSession,
    importingSession,
    validatingImport,
    validationResult,
    fileInputRef,
    handleExportSession,
    handleImportSession,
    handleFileChange,
    handleValidateImport,
  } = useSessionExportImport({ t, showToast });

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
      <div className="flex items-center space-x-2 mb-6">
        <Database size={24} className="text-indigo-600" />
        <h2 className="text-2xl font-bold text-gray-800">{t('sessionExportImport')}</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Export Session */}
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-gradient-to-br from-blue-500 to-blue-700 p-3 rounded-xl">
              <Download className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">{t('exportCompleteSession')}</h3>
              <p className="text-sm text-gray-600">{t('exportSessionDescription')}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('selectSemester')}
              </label>
              {loadingSemesters ? (
                <div className="text-sm text-gray-500">{t('loadingSemesters')}</div>
              ) : semesters.length === 0 ? (
                <div className="text-sm text-gray-500">{t('noSemestersFound')}</div>
              ) : (
                <select
                  value={selectedSemester}
                  onChange={(e) => setSelectedSemester(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  aria-label={t('selectSemester')}
                >
                  <option value="">{t('chooseSemester')}</option>
                  {semesters.map((semester) => (
                    <option key={semester} value={semester}>
                      {semester}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <button
              onClick={handleExportSession}
              disabled={exportingSession || !selectedSemester || semesters.length === 0}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-700 text-white px-4 py-3 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {exportingSession ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>{t('exportingSession')}</span>
                </>
              ) : (
                <>
                  <Download size={20} />
                  <span>{t('exportSession')}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Import Session */}
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="flex items-center space-x-3 mb-4">
            <div className="bg-gradient-to-br from-green-500 to-green-700 p-3 rounded-xl">
              <Upload className="text-white" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800">{t('importSession')}</h3>
              <p className="text-sm text-gray-600">{t('importSessionDescription')}</p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('selectFile')}
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                aria-label={t('selectFile')}
                title={t('chooseSessionFile')}
              />
              {selectedFile && (
                <p className="text-sm text-gray-600 mt-2">
                  📄 {selectedFile.name}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('mergeStrategy')}
              </label>
              <div className="space-y-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="mergeStrategy"
                    value="update"
                    checked={mergeStrategy === 'update'}
                    onChange={(e) => setMergeStrategy(e.target.value as 'update' | 'skip')}
                    className="text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm">
                    <strong>{t('updateExisting')}</strong> - {t('updateExistingDesc')}
                  </span>
                </label>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="radio"
                    name="mergeStrategy"
                    value="skip"
                    checked={mergeStrategy === 'skip'}
                    onChange={(e) => setMergeStrategy(e.target.value as 'update' | 'skip')}
                    className="text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm">
                    <strong>{t('skipExisting')}</strong> - {t('skipExistingDesc')}
                  </span>
                </label>
              </div>
            </div>

            {/* Validation Result Display */}
            {validationResult && (
              <div className={`p-4 rounded-lg ${validationResult.validation_passed ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                {validationResult.validation_passed ? (
                  <div>
                    <div className="flex items-center space-x-2 text-green-800 font-semibold mb-2">
                      <span>✅</span>
                      <span>{t('validationPassed')}</span>
                    </div>
                    <div className="text-sm text-green-700">
                      <p>{t('readyToImport')}</p>
                      <ul className="list-disc list-inside mt-1">
                        <li>{validationResult.counts?.courses || 0} {t('courses')}</li>
                        <li>{validationResult.counts?.students || 0} {t('students')}</li>
                        <li>{validationResult.counts?.grades || 0} {t('grades')}</li>
                      </ul>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center space-x-2 text-red-800 font-semibold mb-2">
                      <span>❌</span>
                      <span>{t('validationFailed', { count: Number(validationResult.total_errors || 0) })}</span>
                    </div>
                    <div className="text-sm text-red-700 max-h-40 overflow-y-auto">
                      <ul className="list-disc list-inside space-y-1">
                        {validationResult.errors?.slice(0, 10).map((err: unknown, idx: number) => (
                          <li key={idx}>{String(err)}</li>
                        ))}
                        {validationResult.errors && validationResult.errors.length > 10 && (
                          <li className="font-semibold">{t('andMoreErrors', { count: Number(validationResult.errors.length - 10) })}</li>
                        )}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleValidateImport}
                disabled={validatingImport || !selectedFile}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-700 text-white px-4 py-3 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {validatingImport ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>{t('validating')}</span>
                  </>
                ) : (
                  <>
                    <span>🔍</span>
                    <span>{t('validate')}</span>
                  </>
                )}
              </button>

              <button
                onClick={handleImportSession}
                disabled={importingSession || !selectedFile || !!(validationResult && !validationResult.validation_passed)}
                className="w-full bg-gradient-to-r from-green-500 to-green-700 text-white px-4 py-3 rounded-lg hover:shadow-lg transition-all disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                {importingSession ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>{t('importingSession')}</span>
                  </>
                ) : (
                  <>
                    <Upload size={20} />
                    <span>{t('importSessionButton')}</span>
                  </>
                )}
              </button>
            </div>

            {/* Safety Note */}
            <div className="text-xs text-gray-500 italic">
              {t('validationTip')}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionExportImport;
