import {
  enqueueStudentUpdate,
  getQueuedStudentUpdateCount,
  getQueuedStudentUpdates,
  removeQueuedStudentUpdate,
} from './offlineStudentUpdateQueue';

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
