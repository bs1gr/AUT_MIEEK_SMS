// @ts-nocheck
/* eslint-disable */
import { useLanguage } from '../../LanguageContext';
import { useState } from 'react';
import { Settings, Database, Download, Upload, Trash2, RefreshCw, CheckCircle, Power, AlertTriangle } from 'lucide-react';

export default function DevTools() {
  const { t: translationFunction } = useLanguage() as any;
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const t = (key) => {
    const translated = translationFunction(key);
    if (translated !== key) return translated;

    const fallbackTranslations = {
      'devtools.title': 'Dev Tools',
      'devtools.subtitle': 'Database & System Management',
      'devtools.databaseManagement': 'Database Management',
      'devtools.systemStatus': 'System Status',
      'devtools.checkHealth': 'Check System Health',
      'devtools.backend': 'Backend',
      'devtools.frontend': 'Frontend',
      'devtools.resetDatabase': 'Reset Database',
      'devtools.addSampleData': 'Add Sample Data',
      'devtools.backupDatabase': 'Backup Database',
      'devtools.shutdown': 'Shutdown & Quit',
      'devtools.shutdownBackend': 'Shutdown Backend Server',
    };
    return fallbackTranslations[key] || key;
  };

  const showMessage = (msg, isError = false) => {
    setMessage(msg);
    setTimeout(() => setMessage(''), 5000);
  };

  const resetDatabase = async () => {
    if (!confirm(t('devtools.resetConfirm') || '⚠️ This will delete ALL data and recreate empty tables. Continue?')) return;

    setLoading(true);
    try {
      const response = await fetch('/api/v1/admin/reset-database', {
        method: 'POST'
      });

      if (response.ok) {
        showMessage(t('devtools.resetSuccess') || '✅ Database reset successfully!');
      } else {
        showMessage(t('devtools.resetError') || '❌ Failed to reset database', true);
      }
    } catch (error) {
      showMessage(`❌ ${t('devtools.error')}: ${error.message}`, true);
    }
    setLoading(false);
  };

  const backupDatabase = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/v1/admin/backup-database', {
        method: 'POST'
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.db`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showMessage(t('devtools.backupSuccess') || '✅ Database backed up successfully!');
      } else {
        showMessage(t('devtools.backupError') || '❌ Failed to backup database', true);
      }
    } catch (error) {
      showMessage(`❌ ${t('devtools.error')}: ${error.message}`, true);
    }
    setLoading(false);
  };

  const addSampleData = async () => {
    if (!confirm(t('devtools.sampleDataConfirm') || 'Add sample students, courses, and grades for testing?')) return;

    setLoading(true);
    try {
      const response = await fetch('/api/v1/admin/sample-data', {
        method: 'POST'
      });

      if (response.ok) {
        showMessage(t('devtools.sampleDataSuccess') || '✅ Sample data added successfully!');
      } else {
        showMessage(t('devtools.sampleDataError') || '❌ Failed to add sample data', true);
      }
    } catch (error) {
      showMessage(`❌ ${t('devtools.error')}: ${error.message}`, true);
    }
    setLoading(false);
  };

  const checkHealth = async () => {
    setLoading(true);
    try {
      const response = await fetch('/health');
      const data = await response.json();

      if (response.ok) {
        const students = data?.statistics?.students ?? data?.students_count ?? '—';
        showMessage(`✅ ${t('devtools.systemHealthy') || 'System Healthy'} | DB: ${data.database || data.db} | ${t('students')}: ${students}`);
      } else {
        showMessage(t('devtools.healthCheckFailed') || '❌ System health check failed', true);
      }
    } catch (error) {
      showMessage(t('devtools.cannotConnect') || '❌ Cannot connect to backend', true);
    }
    setLoading(false);
  };

  const shutdownBackend = async () => {
    if (!confirm(t('devtools.shutdownConfirm') || '⚠️ This will stop the backend server. Continue?')) return;

    setLoading(true);
    try {
      const response = await fetch('/api/v1/admin/shutdown', {
        method: 'POST'
      });

      if (response.ok) {
        showMessage(t('devtools.shutdownSuccess') || '✅ Backend shutdown initiated. Server will stop in 2 seconds.');
      } else {
        showMessage(t('devtools.shutdownError') || '❌ Failed to shutdown backend', true);
      }
    } catch (error) {
      showMessage(t('devtools.shutdownInitiated') || '✅ Backend shutdown initiated (connection closed)', false);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 mb-8 border border-white/20">
          <div className="flex items-center gap-4 mb-4">
            <Settings className="w-10 h-10 text-purple-400" />
            <div>
              <h1 className="text-4xl font-bold text-white">{t('devtools.title') || 'Dev Tools'}</h1>
              <p className="text-purple-200">{t('devtools.subtitle') || 'Database & System Management'}</p>
            </div>
          </div>

          {message && (
            <div className={`mt-4 p-4 rounded-lg ${message.includes('❌') ? 'bg-red-500/20 text-red-200' : 'bg-green-500/20 text-green-200'}`}>
              {message}
            </div>
          )}
        </div>

        {/* Status Card */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-8 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
            <CheckCircle className="w-6 h-6 text-green-400" />
            {t('devtools.systemStatus') || 'System Status'}
          </h2>
          <button
            onClick={checkHealth}
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            {t('devtools.checkHealth') || 'Check System Health'}
          </button>

          <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
            <div className="bg-white/5 p-4 rounded-lg">
              <div className="text-purple-300">{t('devtools.backend') || 'Backend'}</div>
              <div className="text-white font-mono">localhost:8080</div>
            </div>
            <div className="bg-white/5 p-4 rounded-lg">
              <div className="text-purple-300">{t('devtools.frontend') || 'Frontend'}</div>
              <div className="text-white font-mono">localhost:8080</div>
            </div>
          </div>
        </div>

        {/* Database Management */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-8 border border-white/20">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Database className="w-6 h-6 text-blue-400" />
            {t('devtools.databaseManagement') || 'Database Management'}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Backup */}
            <button
              onClick={backupDatabase}
              disabled={loading}
              className="p-6 bg-gradient-to-br from-blue-500 to-cyan-600 text-white rounded-xl hover:from-blue-600 hover:to-cyan-700 transition-all disabled:opacity-50 group"
            >
              <Download className="w-8 h-8 mb-3 group-hover:scale-110 transition-transform" />
              <div className="text-lg font-bold">{t('devtools.backupDatabase') || 'Backup Database'}</div>
              <div className="text-sm text-blue-100 mt-2">{t('devtools.backupDesc') || 'Download complete backup'}</div>
            </button>

            {/* Reset */}
            <button
              onClick={resetDatabase}
              disabled={loading}
              className="p-6 bg-gradient-to-br from-red-500 to-pink-600 text-white rounded-xl hover:from-red-600 hover:to-pink-700 transition-all disabled:opacity-50 group"
            >
              <Trash2 className="w-8 h-8 mb-3 group-hover:scale-110 transition-transform" />
              <div className="text-lg font-bold">{t('devtools.resetDatabase') || 'Reset Database'}</div>
              <div className="text-sm text-red-100 mt-2">{t('devtools.resetDesc') || 'Delete all data & recreate'}</div>
            </button>

            {/* Sample Data */}
            <button
              onClick={addSampleData}
              disabled={loading}
              className="p-6 bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-xl hover:from-purple-600 hover:to-indigo-700 transition-all disabled:opacity-50 group"
            >
              <Upload className="w-8 h-8 mb-3 group-hover:scale-110 transition-transform" />
              <div className="text-lg font-bold">{t('devtools.addSampleData') || 'Add Sample Data'}</div>
              <div className="text-sm text-purple-100 mt-2">{t('devtools.sampleDataDesc') || 'Populate with test data'}</div>
            </button>
          </div>
        </div>

        {/* Shutdown Section */}
        <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 mb-8 border border-white/20 border-red-500/50">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Power className="w-6 h-6 text-red-400" />
            {t('devtools.shutdown') || 'Shutdown & Quit'}
          </h2>

          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-red-200">
                <p className="font-semibold mb-2">{t('devtools.shutdownWarning') || 'Warning: This will stop all servers'}</p>
                <ul className="space-y-1 ml-4 list-disc">
                  <li>{t('devtools.shutdownStep1') || 'Backend will stop immediately'}</li>
                  <li>{t('devtools.shutdownStep2') || 'Frontend must be stopped manually (Ctrl+C in terminal)'}</li>
                  <li>{t('devtools.shutdownStep3') || 'All unsaved changes will be lost'}</li>
                </ul>
              </div>
            </div>
          </div>

          <button
            onClick={shutdownBackend}
            disabled={loading}
            className="px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 text-white rounded-lg hover:from-red-700 hover:to-red-800 transition-all disabled:opacity-50 flex items-center gap-2"
          >
            <Power className="w-5 h-5" />
            {t('devtools.shutdownBackend') || 'Shutdown Backend Server'}
          </button>

          <div className="mt-4 p-4 bg-white/5 rounded-lg">
            <p className="text-sm text-purple-200 mb-2 font-semibold">{t('devtools.toStopFrontend') || 'To stop Frontend:'}</p>
            <code className="text-xs text-green-300 bg-black/30 px-3 py-2 rounded block">
              {t('devtools.frontendStopCmd') || 'Press Ctrl+C in the terminal where frontend is running'}
            </code>
          </div>
        </div>

        {/* Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h3 className="text-xl font-bold text-white mb-3">🚀 {t('devtools.quickLinks') || 'Quick Links'}</h3>
            <div className="space-y-2 text-purple-200">
              <a href="/docs" target="_blank" rel="noopener noreferrer" className="block hover:text-white transition-colors">
                → {t('devtools.apiDocs') || 'API Documentation'}
              </a>
              <a href="/redoc" target="_blank" rel="noopener noreferrer" className="block hover:text-white transition-colors">
                → {t('devtools.apiRedoc') || 'API ReDoc'}
              </a>
              <a href="/health" target="_blank" rel="noopener noreferrer" className="block hover:text-white transition-colors">
                → {t('devtools.healthEndpoint') || 'Health Check Endpoint'}
              </a>
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-6 border border-white/20">
            <h3 className="text-xl font-bold text-white mb-3">⚠️ {t('devtools.safetyTips') || 'Safety Tips'}</h3>
            <ul className="space-y-2 text-purple-200 text-sm">
              <li>• {t('devtools.tip1') || 'Always backup before resetting'}</li>
              <li>• {t('devtools.tip2') || 'Sample data is for testing only'}</li>
              <li>• {t('devtools.tip3') || 'Reset will delete ALL existing data'}</li>
              <li>• {t('devtools.tip4') || 'Check health status regularly'}</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
