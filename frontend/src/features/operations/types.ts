export const OPERATIONS_TAB_KEYS = ['exports', 'imports', 'settings', 'reports', 'notifications', 'help'] as const;

export type OperationsTabKey = (typeof OPERATIONS_TAB_KEYS)[number];
export type LegacyOperationsTabKey = OperationsTabKey;

export interface OperationsLocationState {
  tab?: LegacyOperationsTabKey;
  scrollTo?: string;
}
