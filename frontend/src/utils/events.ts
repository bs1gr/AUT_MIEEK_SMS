/**
 * Simple event emitter for cross-component communication
 * Used to notify components when data changes (e.g., grades updated)
 */

type EventCallback = (...args: any[]) => void;

class EventEmitter {
  private events: Map<string, Set<EventCallback>>;

  constructor() {
    this.events = new Map();
  }

  on(event: string, callback: EventCallback): () => void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.events.get(event)?.delete(callback);
    };
  }

  emit(event: string, ...args: any[]): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(...args));
    }
  }

  off(event: string, callback: EventCallback): void {
    this.events.get(event)?.delete(callback);
  }
}

export const eventBus = new EventEmitter();

// Event names
export const EVENTS = {
  GRADE_ADDED: 'grade:added',
  GRADE_UPDATED: 'grade:updated',
  GRADE_DELETED: 'grade:deleted',
  GRADES_BULK_ADDED: 'grades:bulk_added',
  ATTENDANCE_ADDED: 'attendance:added',
  ATTENDANCE_UPDATED: 'attendance:updated',
  ATTENDANCE_DELETED: 'attendance:deleted',
  ATTENDANCE_BULK_ADDED: 'attendance:bulk_added',
  STUDENT_UPDATED: 'student:updated',
  COURSE_UPDATED: 'course:updated',
  DAILY_PERFORMANCE_ADDED: 'daily_performance:added',
} as const;
