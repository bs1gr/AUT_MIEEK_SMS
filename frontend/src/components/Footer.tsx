import { useTranslation } from 'react-i18next';

// Reads version from VITE_APP_VERSION (injected at build time)
const version = import.meta.env.VITE_APP_VERSION || 'dev';

export default function Footer() {
  const { t } = useTranslation();
  const year = new Date().getFullYear();

  return (
    <footer className="w-full text-center text-xs text-gray-400 py-4 select-none">
      {t('common.footerCredits', { year, version })}
    </footer>
  );
}
