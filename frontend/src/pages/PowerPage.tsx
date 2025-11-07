import ServerControl from '@/components/common/ServerControl';
import ControlPanel from '@/components/ControlPanel';
import { useLanguage } from '@/LanguageContext';

export default function PowerPage() {
  const { t } = useLanguage();

  return (
    <div className="space-y-6">
      <div className="bg-white border rounded-xl p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">{t('controlPanel.title')}</h2>
        <ServerControl />
      </div>
      <ControlPanel />
    </div>
  );
}
