
import { Batch, BatchEvent, TraceData } from '../types';

const BATCHES_KEY = 'agrichain_batches';
const EVENTS_KEY = 'agrichain_events';

export const dbService = {
  getBatches: (): Batch[] => {
    const data = localStorage.getItem(BATCHES_KEY);
    return data ? JSON.parse(data) : [];
  },

  getBatch: (id: string): Batch | undefined => {
    return dbService.getBatches().find((b) => b.id === id);
  },

  createBatch: async (batch: Batch): Promise<void> => {
    const batches = dbService.getBatches();
    batches.push(batch);
    localStorage.setItem(BATCHES_KEY, JSON.stringify(batches));
  },

  getEvents: (batchId?: string): BatchEvent[] => {
    const data = localStorage.getItem(EVENTS_KEY);
    const allEvents: BatchEvent[] = data ? JSON.parse(data) : [];
    if (batchId) {
      return allEvents.filter((e) => e.batchId === batchId);
    }
    return allEvents;
  },

  addEvent: async (event: BatchEvent): Promise<void> => {
    const events = dbService.getEvents();
    events.push(event);
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  },

  getTraceData: async (batchId: string): Promise<TraceData | null> => {
    const batch = dbService.getBatch(batchId);
    if (!batch) return null;
    const events = dbService.getEvents(batchId).sort((a, b) => a.timestamp - b.timestamp);
    return { batch, events };
  }
};
