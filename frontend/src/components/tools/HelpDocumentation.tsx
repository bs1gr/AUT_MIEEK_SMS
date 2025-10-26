import React, { useState } from 'react';
import { HelpCircle, Book, MessageCircle, Video, ChevronDown, ChevronRight, Search } from 'lucide-react';
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
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <Book className="text-indigo-600 mb-2" size={24} />
            <h4 className="font-semibold text-gray-800 mb-1">{t('userGuide')}</h4>
            <p className="text-sm text-gray-600">{t('comprehensivePDF')}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <Video className="text-purple-600 mb-2" size={24} />
            <h4 className="font-semibold text-gray-800 mb-1">{t('videoTutorials')}</h4>
            <p className="text-sm text-gray-600">{t('stepByStep')}</p>
          </div>
          <div className="bg-white rounded-lg p-4 shadow-sm">
            <MessageCircle className="text-green-600 mb-2" size={24} />
            <h4 className="font-semibold text-gray-800 mb-1">{t('contactSupport')}</h4>
            <p className="text-sm text-gray-600">{t('personalizedAssistance')}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HelpDocumentation;
