import { vi } from 'vitest';
import {
  enqueueStudentUpdate,
  getQueuedStudentUpdateCount,
  getQueuedStudentUpdates,
  removeQueuedStudentUpdate,
} from './offlineStudentUpdateQueue';

// appStorage has a module-level cache that persists across tests.
// Mock it to use localStorage directly so localStorage.clear() fully resets state.
vi.mock('@/utils/appStorage', () => ({
  getItem: (key: string) => localStorage.getItem(key),
  setItem: (key: string, value: string) => localStorage.setItem(key, value),
  removeItem: (key: string) => localStorage.removeItem(key),
  init: () => Promise.resolve(),
}));

describe('offlineStudentUpdateQueue', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('enqueues student update', () => {
    enqueueStudentUpdate(1, { first_name: 'Alice' });
    expect(getQueuedStudentUpdateCount()).toBe(1);
    expect(getQueuedStudentUpdates()[0].studentId).toBe(1);
  });

  it('deduplicates updates per student', () => {
    enqueueStudentUpdate(5, { first_name: 'First' });
    enqueueStudentUpdate(5, { first_name: 'Second' });

    const queue = getQueuedStudentUpdates();
    expect(queue).toHaveLength(1);
    expect(queue[0].data.first_name).toBe('Second');
  });

  it('removes queued item by id', () => {
    const item = enqueueStudentUpdate(2, { last_name: 'Doe' });
    removeQueuedStudentUpdate(item.id);
    expect(getQueuedStudentUpdateCount()).toBe(0);
  });
});
