
import { Batch, BatchEvent, TraceData } from '../types';
import { supabase } from './supabase';

export const dbService = {
  getBatches: async (): Promise<Batch[]> => {
    const { data, error } = await supabase
      .from('batches')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Fetch Batches Error:", error);
      throw new Error(error.message);
    }
    return data.map(b => ({
      ...b,
      farmerId: b.farmer_id,
      seedType: b.seed_type,
      harvestDate: b.harvest_date,
      createdAt: new Date(b.created_at).getTime()
    }));
  },

  getBatch: async (id: string): Promise<Batch | undefined> => {
    const { data, error } = await supabase
      .from('batches')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) return undefined;
    return {
      ...data,
      farmerId: data.farmer_id,
      seedType: data.seed_type,
      harvestDate: data.harvest_date,
      createdAt: new Date(data.created_at).getTime()
    };
  },

  createBatch: async (batch: Batch): Promise<void> => {
    const { error } = await supabase
      .from('batches')
      .insert([{
        id: batch.id,
        farmer_id: batch.farmerId,
        crop: batch.crop,
        seed_type: batch.seedType,
        quantity: batch.quantity,
        harvest_date: batch.harvestDate,
        location: batch.location
      }]);
    
    if (error) {
      console.error("Create Batch Error:", error);
      throw new Error(`Blockchain Entry Failed: ${error.message}`);
    }
  },

  getEvents: async (batchId?: string): Promise<BatchEvent[]> => {
    let query = supabase.from('events').select('*');
    if (batchId) {
      query = query.eq('batch_id', batchId);
    }
    
    const { data, error } = await query.order('timestamp', { ascending: true });
    if (error) throw error;
    
    return data.map(e => ({
      id: e.id,
      batchId: e.batch_id,
      role: e.role,
      userName: e.user_name,
      timestamp: e.timestamp,
      latitude: e.latitude,
      longitude: e.longitude,
      details: e.details,
      dataHash: e.data_hash,
      txHash: e.tx_hash
    }));
  },

  addEvent: async (event: BatchEvent): Promise<void> => {
    const { error } = await supabase
      .from('events')
      .insert([{
        id: event.id,
        batch_id: event.batchId,
        role: event.role,
        user_name: event.userName,
        timestamp: event.timestamp,
        latitude: event.latitude,
        longitude: event.longitude,
        details: event.details,
        data_hash: event.dataHash,
        tx_hash: event.txHash
      }]);
    
    if (error) {
      console.error("Add Event Error:", error);
      throw new Error(`Event Audit Log Failed: ${error.message}`);
    }
  },

  getTraceData: async (batchId: string): Promise<TraceData | null> => {
    const batch = await dbService.getBatch(batchId);
    if (!batch) return null;
    const events = await dbService.getEvents(batchId);
    return { batch, events };
  }
};
