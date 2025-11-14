export const OPERATIONS_TAB_KEYS = ['exports', 'maintenance', 'settings', 'help'] as const;

export type OperationsTabKey = (typeof OPERATIONS_TAB_KEYS)[number];
export type LegacyOperationsTabKey = OperationsTabKey | 'devtools';

export interface OperationsLocationState {
  tab?: LegacyOperationsTabKey;
  scrollTo?: string;
}
