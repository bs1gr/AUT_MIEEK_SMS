export interface NotificationTypeOption {
  value: string;
  label: string;
}

export type BroadcastTarget = 'all' | 'role' | 'users';

export interface OperationsBroadcastPanelProps {
  t: (key: string, options?: Record<string, unknown>) => string;
  isAdmin: boolean;
  broadcastType: string;
  setBroadcastType: (value: string) => void;
  notificationTypeOptions: NotificationTypeOption[];
  broadcastTarget: BroadcastTarget;
  setBroadcastTarget: (value: BroadcastTarget) => void;
  broadcastRole: string;
  setBroadcastRole: (value: string) => void;
  broadcastUserIds: string;
  setBroadcastUserIds: (value: string) => void;
  broadcastTitle: string;
  setBroadcastTitle: (value: string) => void;
  broadcastMessage: string;
  setBroadcastMessage: (value: string) => void;
  broadcastSending: boolean;
  onSend: () => void;
}

const OperationsBroadcastPanel = ({
  t,
  isAdmin,
  broadcastType,
  setBroadcastType,
  notificationTypeOptions,
  broadcastTarget,
  setBroadcastTarget,
  broadcastRole,
  setBroadcastRole,
  broadcastUserIds,
  setBroadcastUserIds,
  broadcastTitle,
  setBroadcastTitle,
  broadcastMessage,
  setBroadcastMessage,
  broadcastSending,
  onSend,
}: OperationsBroadcastPanelProps) => {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-slate-900">
          {t('admin.title', { ns: 'notifications' })}
        </h2>
        <p className="text-sm text-slate-600">{t('admin.description', { ns: 'notifications' })}</p>
      </div>

      {!isAdmin ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          {t('admin.notAuthorized', { ns: 'notifications' })}
        </div>
      ) : (
        <div className="mt-6 grid gap-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>{t('admin.typeLabel', { ns: 'notifications' })}</span>
              <select
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                value={broadcastType}
                onChange={(event) => setBroadcastType(event.target.value)}
              >
                {notificationTypeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>{t('admin.targetLabel', { ns: 'notifications' })}</span>
              <select
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                value={broadcastTarget}
                onChange={(event) => setBroadcastTarget(event.target.value as BroadcastTarget)}
              >
                <option value="all">{t('admin.targetAll', { ns: 'notifications' })}</option>
                <option value="role">{t('admin.targetRole', { ns: 'notifications' })}</option>
                <option value="users">{t('admin.targetUsers', { ns: 'notifications' })}</option>
              </select>
            </label>
          </div>

          {broadcastTarget === 'role' && (
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>{t('admin.roleLabel', { ns: 'notifications' })}</span>
              <select
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                value={broadcastRole}
                onChange={(event) => setBroadcastRole(event.target.value)}
              >
                <option value="admin">{t('roles.admin', { ns: 'notifications' })}</option>
                <option value="teacher">{t('roles.teacher', { ns: 'notifications' })}</option>
                <option value="student">{t('roles.student', { ns: 'notifications' })}</option>
                <option value="viewer">{t('roles.viewer', { ns: 'notifications' })}</option>
              </select>
            </label>
          )}

          {broadcastTarget === 'users' && (
            <label className="space-y-2 text-sm font-medium text-slate-700">
              <span>{t('admin.userIdsLabel', { ns: 'notifications' })}</span>
              <input
                type="text"
                className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                placeholder={t('admin.userIdsPlaceholder', { ns: 'notifications' })}
                value={broadcastUserIds}
                onChange={(event) => setBroadcastUserIds(event.target.value)}
              />
              <p className="text-xs text-slate-500">{t('admin.userIdsHelp', { ns: 'notifications' })}</p>
            </label>
          )}

          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>{t('admin.titleLabel', { ns: 'notifications' })}</span>
            <input
              type="text"
              className="w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              value={broadcastTitle}
              onChange={(event) => setBroadcastTitle(event.target.value)}
            />
          </label>

          <label className="space-y-2 text-sm font-medium text-slate-700">
            <span>{t('admin.messageLabel', { ns: 'notifications' })}</span>
            <textarea
              className="min-h-[120px] w-full rounded border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              value={broadcastMessage}
              onChange={(event) => setBroadcastMessage(event.target.value)}
            />
          </label>

          <div className="flex justify-end">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg bg-indigo-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-70"
              onClick={onSend}
              disabled={broadcastSending}
            >
              {broadcastSending
                ? t('admin.sending', { ns: 'notifications' })
                : t('admin.sendButton', { ns: 'notifications' })}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperationsBroadcastPanel;
