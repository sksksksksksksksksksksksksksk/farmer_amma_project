
import React, { useState } from 'react';
import { UserProfile, UserRole, BatchEvent } from '../types';
import { dbService } from '../services/dbService';
import { blockchainService } from '../services/blockchainService';
import { Store, CheckCircle, PackageCheck, AlertCircle } from 'lucide-react';

interface RetailerDashboardProps {
  user: UserProfile;
  onTrace: (id: string) => void;
}

const RetailerDashboard: React.FC<RetailerDashboardProps> = ({ user, onTrace }) => {
  const [batchId, setBatchId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shelfLocation, setShelfLocation] = useState('Fresh Produce Section - A1');

  const handleReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    const batch = dbService.getBatch(batchId);
    if (!batch) {
      setError("Batch not found in system.");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      let lat = null, lng = null;
      try {
        const pos: any = await new Promise((res, rej) => 
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch (e) {}

      const eventData = { batchId, shelfLocation, lat, lng, type: 'RETAIL' };
      const dataHash = blockchainService.generateDataHash(eventData);
      const txHash = await blockchainService.submitToBlockchain(dataHash);

      const event: BatchEvent = {
        id: Math.random().toString(36).substr(2, 9),
        batchId,
        role: UserRole.RETAILER,
        userName: user.name,
        timestamp: Date.now(),
        latitude: lat,
        longitude: lng,
        details: { 
          action: 'Received at Retail Outlet',
          shelfLocation
        },
        dataHash,
        txHash
      };

      await dbService.addEvent(event);
      onTrace(batchId);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-indigo-600 p-8 text-white text-center">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Store size={32} />
          </div>
          <h1 className="text-2xl font-bold">Retail Reception</h1>
          <p className="opacity-80">Confirm batch arrival and finalize shelf tracking.</p>
        </div>

        <div className="p-8">
          <form onSubmit={handleReceive} className="space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-100 p-3 rounded-lg flex items-center space-x-2 text-red-600 text-sm">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Scan or Enter Batch ID</label>
              <input 
                required
                value={batchId}
                onChange={(e) => setBatchId(e.target.value.toUpperCase())}
                placeholder="BATCH-ID"
                className="w-full px-4 py-4 border-2 border-gray-100 rounded-xl focus:border-indigo-500 outline-none text-xl font-mono text-center tracking-widest"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Shelf / Storage Assignment</label>
              <input 
                required
                value={shelfLocation}
                onChange={(e) => setShelfLocation(e.target.value)}
                placeholder="e.g. Aisle 4, Cooler 2"
                className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="pt-4">
              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-200 flex items-center justify-center space-x-3 disabled:opacity-50"
              >
                {loading ? (
                  <span>Processing...</span>
                ) : (
                  <>
                    <PackageCheck size={24} />
                    <span>Confirm Receipt & Finalize Journey</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RetailerDashboard;
