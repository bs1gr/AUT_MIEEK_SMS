import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

// Reads version from VITE_APP_VERSION (injected at build time)
const version = import.meta.env.VITE_APP_VERSION || 'dev';

export default function Footer() {
  const { t } = useTranslation('common');
  const year = new Date().getFullYear();

  return (
    <footer className="w-full text-center text-xs text-gray-400 py-4">
      <span className="select-none">{t('footerCredits', { year, version })}</span>
      {' · '}
      <Link to="/privacy" className="underline hover:text-gray-600" data-testid="footer-privacy-link">
        {t('privacyLink')}
      </Link>
    </footer>
  );
}