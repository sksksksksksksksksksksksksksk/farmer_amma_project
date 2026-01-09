
export enum UserRole {
  FARMER = 'FARMER',
  DISTRIBUTOR = 'DISTRIBUTOR',
  RETAILER = 'RETAILER',
  CUSTOMER = 'CUSTOMER'
}

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  name: string;
}

export interface Batch {
  id: string;
  farmerId: string;
  crop: string;
  seedType: string;
  quantity: string;
  harvestDate: string;
  location: string;
  imageUrl?: string;
  createdAt: number;
}

export interface BatchEvent {
  id: string;
  batchId: string;
  role: UserRole;
  userName: string;
  timestamp: number;
  latitude: number | null;
  longitude: number | null;
  details: Record<string, any>;
  dataHash: string;
  txHash: string;
}

export interface TraceData {
  batch: Batch;
  events: BatchEvent[];
}
