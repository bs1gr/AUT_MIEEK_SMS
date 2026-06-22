import { vi } from 'vitest';
import type { Grade } from '@/types';
import {
  enqueueGradeMutation,
  getQueuedGradeMutationCount,
  getQueuedGradeMutations,
  removeQueuedGradeMutation,
} from './offlineGradesQueue';

// appStorage has a module-level cache that persists across tests.
// Mock it to use localStorage directly so localStorage.clear() fully resets state.
vi.mock('@/utils/appStorage', () => ({
  getItem: (key: string) => localStorage.getItem(key),
  setItem: (key: string, value: string) => localStorage.setItem(key, value),
  removeItem: (key: string) => localStorage.removeItem(key),
  init: () => Promise.resolve(),
}));

const makePayload = (overrides?: Partial<Omit<Grade, 'id'>>): Omit<Grade, 'id'> => ({
  student_id: 1,
  course_id: 2,
  assignment_name: 'Quiz 1',
  category: 'Quizzes',
  grade: 9,
  max_grade: 10,
  weight: 1,
  date_submitted: '2026-03-05',
  ...overrides,
});

describe('offlineGradesQueue', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('enqueues create mutation', () => {
    enqueueGradeMutation({ op: 'create', payload: makePayload() });
    expect(getQueuedGradeMutationCount()).toBe(1);
    expect(getQueuedGradeMutations()[0].op).toBe('create');
  });

  it('deduplicates update mutation by gradeId', () => {
    enqueueGradeMutation({ op: 'update', gradeId: 10, payload: makePayload({ grade: 8 }) });
    enqueueGradeMutation({ op: 'update', gradeId: 10, payload: makePayload({ grade: 7 }) });

    const queue = getQueuedGradeMutations();
    expect(queue).toHaveLength(1);
    expect(queue[0].payload.grade).toBe(7);
  });

  it('removes queued mutation by id', () => {
    const item = enqueueGradeMutation({ op: 'create', payload: makePayload() });
    removeQueuedGradeMutation(item.id);
    expect(getQueuedGradeMutationCount()).toBe(0);
  });
});
