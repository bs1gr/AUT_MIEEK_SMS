import { useState } from 'react';
import { HelpCircle, Book, MessageCircle, Video, ChevronDown, ChevronRight, Search, Download, ExternalLink } from 'lucide-react';
import { useLanguage } from '../../LanguageContext';

const HelpDocumentation = () => {
  const { t } = useLanguage() as { t: (key: string) => string };
  const [expandedSection, setExpandedSection] = useState<string | null>('getting-started');
  const [searchQuery, setSearchQuery] = useState('');

  const toggleSection = (sectionId: string) => {
    setExpandedSection(expandedSection === sectionId ? null : sectionId);
  };

  // Using translations for all help content
  const documentation = [
    {
      id: 'getting-started',
      title: t('helpGettingStarted'),
      icon: Book,
      color: 'text-green-600',
      items: [
        {
          question: t('helpHowToAddStudent'),
          answer: t('helpAddStudentAnswer')
        },
        {
          question: t('helpHowToNavigate'),
          answer: t('helpNavigateAnswer')
        },
        {
          question: t('helpWhatDoINeed'),
          answer: t('helpWhatNeedAnswer')
        }
      ]
    },
    {
      id: 'students',
      title: t('helpStudentManagement'),
      icon: MessageCircle,
      color: 'text-blue-600',
      items: [
        {
          question: t('helpHowToEditStudent'),
          answer: t('helpEditStudentAnswer')
        },
        {
          question: t('helpHowToDeleteStudent'),
          answer: t('helpDeleteStudentAnswer')
        },
        {
          question: t('helpHowToSearchStudent'),
          answer: t('helpSearchStudentAnswer')
        }
      ]
    },
    {
      id: 'courses',
      title: t('helpCourseEvaluation'),
      icon: Book,
      color: 'text-indigo-600',
      items: [
        {
          question: t('helpWhatAreEvaluationRules'),
          answer: t('helpEvaluationRulesAnswer')
        },
        {
          question: t('helpHowToSetEvaluationRules'),
          answer: t('helpSetEvaluationRulesAnswer')
        },
        {
          question: t('helpCanIChangeRules'),
          answer: t('helpChangeRulesAnswer')
        }
      ]
    },
    {
      id: 'autosave',
      title: t('helpAutosaveFeatures'),
      icon: HelpCircle,
      color: 'text-emerald-600',
      items: [
        {
          question: t('helpWhatIsAutosave'),
          answer: t('helpAutosaveAnswer')
        },
        {
          question: t('helpWhereIsAutosave'),
          answer: t('helpWhereAutosaveAnswer')
        },
        {
          question: t('helpHowDoIKnowSaving'),
          answer: t('helpKnowSavingAnswer')
        },
        {
          question: t('helpCanIDisableAutosave'),
          answer: t('helpDisableAutosaveAnswer')
        },
        {
          question: t('helpWhatIfAutosaveFails'),
          answer: t('helpAutosaveFailAnswer')
        },
        {
          question: t('helpDoesAutosaveWorkOffline'),
          answer: t('helpAutosaveOfflineAnswer')
        },
        {
          question: t('helpIsAutosaveSecure'),
          answer: t('helpAutosaveSecureAnswer')
        }
      ]
    },
    {
      id: 'improvements',
      title: t('helpRecentImprovements'),
      icon: MessageCircle,
      color: 'text-amber-600',
      items: [
        {
          question: t('helpWhatsNewInLatest'),
          answer: t('helpWhatsNewAnswer')
        },
        {
          question: t('helpSessionExportImport'),
          answer: t('helpSessionExportImportAnswer')
        },
        {
          question: t('helpHowToExportSemester'),
          answer: t('helpExportSemesterAnswer')
        },
        {
          question: t('helpHowToImportSemester'),
          answer: t('helpImportSemesterAnswer')
        },
        {
          question: t('helpWhatIsRateLimitIncrease'),
          answer: t('helpRateLimitIncreaseAnswer')
        },
        {
          question: t('helpPersistentLogin'),
          answer: t('helpPersistentLoginAnswer')
        },
        {
          question: t('helpWindowsInstaller'),
          answer: t('helpWindowsInstallerAnswer')
        }
      ]
    },
    {
      id: 'attendance',
      title: t('helpAttendanceTracking'),
      icon: Video,
      color: 'text-purple-600',
      items: [
        {
          question: t('helpHowToRecordAttendance'),
          answer: t('helpRecordAttendanceAnswer')
        },
        {
          question: t('helpWhatDoAttendanceStatusesMean'),
          answer: t('helpAttendanceStatusAnswer')
        },
        {
          question: t('helpWhatIsAbsencePenalty'),
          answer: t('helpAbsencePenaltyAnswer')
        },
        {
          question: t('helpDoesAttendanceAffectFinal'),
          answer: t('helpAttendanceAffectAnswer')
        }
      ]
    },
    {
      id: 'daily-performance',
      title: t('helpDailyPerformance'),
      icon: MessageCircle,
      color: 'text-orange-600',
      items: [
        {
          question: t('helpWhatIsDailyPerformance'),
          answer: t('helpDailyPerformanceAnswer')
        },
        {
          question: t('helpHowToRateDailyPerformance'),
          answer: t('helpRateDailyPerformanceAnswer')
        },
        {
          question: t('helpWhatIsPerformanceMultiplier'),
          answer: t('helpPerformanceMultiplierAnswer')
        }
      ]
    },
    {
      id: 'grades',
      title: t('helpGradeManagement'),
      icon: Book,
      color: 'text-yellow-600',
      items: [
        {
          question: t('helpHowToAddGrades'),
          answer: t('helpAddGradesAnswer')
        },
        {
          question: t('helpHowDoesWeightWork'),
          answer: t('helpWeightAnswer')
        },
        {
          question: t('helpHowIsFinalGradeCalculated'),
          answer: t('helpFinalGradeCalculatedAnswer')
        },
        {
          question: t('helpDoDailyPerformanceAffectFinal'),
          answer: t('helpDailyPerformanceAffectAnswer')
        },
        {
          question: t('helpHowIsGPACalculated'),
          answer: t('helpGPACalculationAnswer')
        }
      ]
    },
    {
      id: 'performance',
      title: t('helpPerformanceAnalytics'),
      icon: HelpCircle,
      color: 'text-cyan-600',
      items: [
        {
          question: t('helpWhatIsGradeBreakdown'),
          answer: t('helpGradeBreakdownAnswer')
        },
        {
          question: t('helpHowToViewBreakdown'),
          answer: t('helpViewBreakdownAnswer')
        },
        {
          question: t('helpWhatIsGreekGrade'),
          answer: t('helpGreekGradeAnswer')
        }
      ]
    },
    {
      id: 'calendar',
      title: t('helpCalendarSchedule'),
      icon: Video,
      color: 'text-teal-600',
      items: [
        {
          question: t('helpHowToExportSchedule'),
          answer: t('helpExportScheduleAnswer')
        },
        {
          question: t('helpWhatIsICSFile'),
          answer: t('helpICSFileAnswer')
        },
        {
          question: t('helpScheduleNotShowing'),
          answer: t('helpScheduleNotShowingAnswer')
        }
      ]
    },
    {
      id: 'export',
      title: t('helpDataExport'),
      icon: HelpCircle,
      color: 'text-red-600',
      items: [
        {
          question: t('helpWhatExportFormats'),
          answer: t('helpExportFormatsAnswer')
        },
        {
          question: t('helpHowToExportStudentData'),
          answer: t('helpExportStudentDataAnswer')
        }
      ]
    },
    {
      id: 'localization',
      title: t('helpLanguageLocalization'),
      icon: MessageCircle,
      color: 'text-pink-600',
      items: [
        {
          question: t('helpHowToChangeLanguage'),
          answer: t('helpChangeLanguageAnswer')
        },
        {
          question: t('helpWhatIsLocalized'),
          answer: t('helpLocalizedAnswer')
        },
        {
          question: t('helpWhyGreekEnglishCategories'),
          answer: t('helpLocalizationCategoriesAnswer')
        },
        {
          question: t('helpArePlaceholdersBilingual'),
          answer: t('helpPlaceholdersBilingualAnswer')
        }
      ]
    },
    {
      id: 'system',
      title: t('helpSystemManagement'),
      icon: Book,
      color: 'text-gray-600',
      items: [
        {
          question: t('helpHowToBackup'),
          answer: t('helpBackupAnswer')
        },
        {
          question: t('helpHowToRestore'),
          answer: t('helpRestoreAnswer')
        },
        {
          question: t('helpWhatIsSampleData'),
          answer: t('helpSampleDataAnswer')
        },
        {
          question: t('helpSystemHealth'),
          answer: t('helpSystemHealthAnswer')
        },
        {
          question: t('helpHowToChangeTheme'),
          answer: t('helpChangeThemeAnswer')
        },
        {
          question: t('helpWhatIsSystemTheme'),
          answer: t('helpSystemThemeAnswer')
        },
        {
          question: t('helpCleanupObsolete'),
          answer: t('helpCleanupObsoleteAnswer')
        },
        {
          question: t('helpDockerVolumeUpdate'),
          answer: t('helpDockerVolumeUpdateAnswer')
        },
        {
          question: t('helpUpdateVolumeHowTo'),
          answer: t('helpUpdateVolumeHowToAnswer')
        },
        {
          question: t('helpUpdateVolumeRevert'),
          answer: t('helpUpdateVolumeRevertAnswer')
        },
        {
          question: t('helpUpdateVolumeMigrate'),
          answer: t('helpUpdateVolumeMigrateAnswer')
        }
      ]
    },
    {
      id: 'custom-reports',
      title: t('helpCustomReports'),
      icon: Book,
      color: 'text-indigo-600',
      items: [
        {
          question: t('helpWhatAreCustomReports'),
          answer: t('helpCustomReportsAnswer')
        },
        {
          question: t('helpHowToCreateReport'),
          answer: t('helpCreateReportAnswer')
        },
        {
          question: t('helpWhatIsReportBuilder'),
          answer: t('helpReportBuilderAnswer')
        },
        {
          question: t('helpHowToEditReport'),
          answer: t('helpEditReportAnswer')
        },
        {
          question: t('helpHowToGenerateReport'),
          answer: t('helpGenerateReportAnswer')
        },
        {
          question: t('helpWhatAreTemplates'),
          answer: t('helpTemplatesAnswer')
        },
        {
          question: t('helpHowToUseTemplate'),
          answer: t('helpUseTemplateAnswer')
        },
        {
          question: t('helpHowToCreateTemplate'),
          answer: t('helpCreateTemplateAnswer')
        },
        {
          question: t('helpHowToShareTemplate'),
          answer: t('helpShareTemplateAnswer')
        },
        {
          question: t('helpWhatIsDataSourceTile'),
          answer: t('helpDataSourceTileAnswer')
        },
        {
          question: t('helpWhatIsOutputFormatTile'),
          answer: t('helpOutputFormatTileAnswer')
        },
        {
          question: t('helpWhatFiltersAvailable'),
          answer: t('helpFiltersAvailableAnswer')
        },
        {
          question: t('helpHowManySortRules'),
          answer: t('helpSortRulesAnswer')
        },
        {
          question: t('helpCanIDuplicateReport'),
          answer: t('helpDuplicateReportAnswer')
        },
        {
          question: t('helpWhereAreGeneratedReports'),
          answer: t('helpGeneratedReportsAnswer')
        }
      ]
    },
    {
      id: 'utils',
      title: t('helpUtilsOperations'),
      icon: MessageCircle,
      color: 'text-blue-600',
      items: [
        {
          question: t('helpWhatIsDevTools'),
          answer: t('helpDevToolsAnswer')
        },
        {
          question: t('helpHowToAccessControlPanel'),
          answer: t('helpControlPanelAnswer')
        },
        {
          question: t('helpWhatIsServerControl'),
          answer: t('helpServerControlAnswer')
        }
      ]
    }
  ];

  const filteredDocumentation = documentation.map(section => ({
    ...section,
    items: section.items.filter(item =>
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(section => section.items.length > 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center space-x-3">
          <HelpCircle className="text-indigo-600" size={28} />
          <span>{t('helpTitle')}</span>
        </h1>
      </div>
      <p className="text-gray-600">{t('everythingYouNeed')}</p>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder={t('searchDocumentation')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Documentation Sections */}
      <div className="space-y-3">
        {filteredDocumentation.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {t('noResults')}
          </div>
        ) : (
          filteredDocumentation.map((section) => (
            <div key={section.id} className="bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <section.icon className={section.color} size={24} />
                  <h2 className="text-lg font-semibold text-gray-800">{section.title}</h2>
                  <span className="text-sm text-gray-500">({section.items.length} {t('topics')})</span>
                </div>
                {expandedSection === section.id ? (
                  <ChevronDown className="text-gray-400" size={20} />
                ) : (
                  <ChevronRight className="text-gray-400" size={20} />
                )}
              </button>

              {expandedSection === section.id && (
                <div className="px-6 pb-4 space-y-4">
                  {section.items.map((item, idx) => (
                    <div key={idx} className="border-l-4 border-indigo-200 pl-4 py-2">
                      <h3 className="font-semibold text-gray-800 mb-2">{item.question}</h3>
                      <p className="text-gray-600 text-sm leading-relaxed">{item.answer}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
      {/* Additional Resources */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border border-indigo-200">
        <h3 className="text-lg font-bold text-gray-800 mb-4">{t('stillNeedHelp')}</h3>
        <p className="text-gray-600 mb-4">{t('additionalResources')}</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* User Guide - PDF Downloads */}
          <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
            <Book className="text-indigo-600 mb-2" size={24} />
            <h4 className="font-semibold text-gray-800 mb-1">{t('userGuide')}</h4>
            <p className="text-sm text-gray-600 mb-3">{t('comprehensivePDF')}</p>
            <div className="space-y-2">
              <a
                href="/docs/SMS_User_Guide_EN.pdf"
                download="SMS_User_Guide_EN.pdf"
                className="flex items-center text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                <Download size={14} className="mr-1" />
                {t('downloadEnglishPDF')}
              </a>
              <a
                href="/docs/SMS_User_Guide_EL.pdf"
                download="SMS_User_Guide_EL.pdf"
                className="flex items-center text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                <Download size={14} className="mr-1" />
                {t('downloadGreekPDF')}
              </a>
            </div>
          </div>
          {/* Video Tutorials - Coming Soon */}
          <div className="bg-white rounded-lg p-4 shadow-sm opacity-75">
            <Video className="text-purple-600 mb-2" size={24} />
            <h4 className="font-semibold text-gray-800 mb-1">{t('videoTutorials')}</h4>
            <p className="text-sm text-gray-600 mb-3">{t('stepByStep')}</p>
            <p className="text-xs text-gray-500 italic">{t('comingSoon')}</p>
          </div>
          {/* Contact Support - GitHub Links */}
          <div className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
            <MessageCircle className="text-green-600 mb-2" size={24} />
            <h4 className="font-semibold text-gray-800 mb-1">{t('contactSupport')}</h4>
            <p className="text-sm text-gray-600 mb-3">{t('personalizedAssistance')}</p>
            <div className="space-y-2">
              <a
                href="https://github.com/bs1gr/AUT_MIEEK_SMS/issues"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-sm text-green-600 hover:text-green-800 font-medium"
              >
                <ExternalLink size={14} className="mr-1" />
                {t('reportIssue')}
              </a>
              <a
                href="https://github.com/bs1gr/AUT_MIEEK_SMS/discussions"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center text-sm text-green-600 hover:text-green-800 font-medium"
              >
                <ExternalLink size={14} className="mr-1" />
                {t('discussionForum')}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpDocumentation;
