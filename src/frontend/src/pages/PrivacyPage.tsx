/**
 * The privacy notice (GDPR Art. 13), reachable without signing in from the footer of every page.
 * The text describes what the system does; who the controller is comes from the server's
 * PRIVACY_* settings, and while those are empty the page says to ask the school office.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import apiClient from '@/api/api';

interface PrivacyInfo {
  controller_name: string;
  contact: string;
  dpo_contact: string;
  notice_url: string;
  configured: boolean;
}

const SECTIONS: { title: string; paragraphs: string[] }[] = [
  { title: 'dataTitle', paragraphs: ['dataStudents', 'dataHealth', 'dataStaff'] },
  { title: 'purposeTitle', paragraphs: ['purposeText', 'purposeBasis'] },
  { title: 'accessTitle', paragraphs: ['accessText', 'accessHosting'] },
  { title: 'cookiesTitle', paragraphs: ['cookiesText', 'cookiesNone'] },
  { title: 'retentionTitle', paragraphs: ['retentionText'] },
  { title: 'rightsTitle', paragraphs: ['rightsText', 'rightsComplaint'] },
];

const isHttpUrl = (value: string): boolean => /^https?:\/\//i.test(value);

export default function PrivacyPage() {
  const { t } = useTranslation('privacy');
  const navigate = useNavigate();
  // undefined = still loading; null = the server did not answer (treated as "not configured").
  const [info, setInfo] = useState<PrivacyInfo | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    apiClient
      .get<PrivacyInfo>('/privacy/info')
      .then((response) => {
        if (active) setInfo(response?.data ?? null);
      })
      .catch(() => {
        if (active) setInfo(null);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <article className="mx-auto w-full max-w-3xl space-y-6 py-8" data-testid="privacy-page">
      <header className="space-y-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="text-sm font-semibold text-indigo-700 underline"
          data-testid="privacy-back"
        >
          {t('back')}
        </button>
        <h1 className="text-2xl font-bold text-gray-900">{t('title')}</h1>
        <p className="text-sm text-gray-700">{t('intro')}</p>
      </header>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs" data-testid="privacy-controller">
        <h2 className="text-lg font-semibold text-gray-900">{t('controllerTitle')}</h2>
        {info === undefined ? (
          <p className="mt-2 text-sm text-gray-600">{t('loading')}</p>
        ) : info?.configured ? (
          <div className="mt-2 space-y-1 text-sm text-gray-800">
            <p>{t('controllerNamed', { name: info.controller_name })}</p>
            <p>{t('controllerContact', { contact: info.contact })}</p>
            {info.dpo_contact && <p>{t('controllerDpo', { contact: info.dpo_contact })}</p>}
            {isHttpUrl(info.notice_url) && (
              <p>
                <a
                  href={info.notice_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-indigo-700 underline"
                >
                  {t('controllerNoticeLink')}
                </a>
              </p>
            )}
          </div>
        ) : (
          <p className="mt-2 text-sm text-gray-800">{t('controllerNotConfigured')}</p>
        )}
      </section>

      {SECTIONS.map((section) => (
        <section key={section.title} className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
          <h2 className="text-lg font-semibold text-gray-900">{t(section.title)}</h2>
          <div className="mt-2 space-y-2 text-sm text-gray-800">
            {section.paragraphs.map((key) => (
              <p key={key}>{t(key)}</p>
            ))}
          </div>
        </section>
      ))}
    </article>
  );
}
