import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ImportWizard, ExportDialog, HistoryTable } from '../../components/import-export';

const ImportExportPage: React.FC = () => {
    const { t } = useTranslation();
    const [isImportOpen, setIsImportOpen] = useState(false);
    const [isExportOpen, setIsExportOpen] = useState(false);
    const [importType, setImportType] = useState<'students' | 'courses' | 'grades'>('students');
    // Key to force re-render of history table after operations
    const [historyKey, setHistoryKey] = useState(0);

    const handleImportClick = (type: 'students' | 'courses' | 'grades') => {
        setImportType(type);
        setIsImportOpen(true);
    };

    const refreshHistory = () => {
        setHistoryKey(prev => prev + 1);
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-gray-900">{t('importExportTitle', { ns: 'export' })}</h1>
                <div className="space-x-4 flex items-center">
                    <button
                        onClick={() => setIsExportOpen(true)}
                        className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm text-sm font-medium"
                    >
                        {t('exportData', { ns: 'export' })}
                    </button>

                    <div className="relative inline-block text-left group">
                        <button
                            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-sm text-sm font-medium flex items-center"
                        >
                            {t('importData', { ns: 'export' })}
                            <svg className="ml-2 -mr-1 h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                            </svg>
                        </button>
                        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg hidden group-hover:block z-10 border border-gray-200">
                            <div className="py-1">
                                <button
                                    onClick={() => handleImportClick('students')}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                    {t('importStudents', { ns: 'export' })}
                                </button>
                                <button
                                    onClick={() => handleImportClick('courses')}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                    {t('importCourses', { ns: 'export' })}
                                </button>
                                <button
                                    onClick={() => handleImportClick('grades')}
                                    className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                                >
                                    {t('importGrades', { ns: 'export' })}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white shadow rounded-lg p-6 mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-medium text-gray-900">{t('importExportHistory', { ns: 'export' })}</h2>
                    <button onClick={refreshHistory} className="text-blue-600 hover:text-blue-800 text-sm">
                        {t('refresh', { ns: 'common' })}
                    </button>
                </div>
                <HistoryTable key={historyKey} />
            </div>

            {isImportOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto bg-gray-500 bg-opacity-75 flex items-center justify-center p-4">
                    <div className="w-full max-w-2xl">
                        <ImportWizard
                            type={importType}
                            onCancel={() => setIsImportOpen(false)}
                            onComplete={() => {
                                setIsImportOpen(false);
                                refreshHistory();
                            }}
                        />
                    </div>
                </div>
            )}

            <ExportDialog
                isOpen={isExportOpen}
                onClose={() => {
                    setIsExportOpen(false);
                    refreshHistory();
                }}
            />
        </div>
    );
};

export default ImportExportPage;
