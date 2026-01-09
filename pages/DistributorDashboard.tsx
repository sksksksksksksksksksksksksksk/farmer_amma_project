
import React, { useState } from 'react';
import { UserProfile, UserRole, BatchEvent } from '../types';
import { dbService } from '../services/dbService';
import { blockchainService } from '../services/blockchainService';
import { Truck, Scan, CheckCircle, Navigation } from 'lucide-react';

interface DistributorDashboardProps {
  user: UserProfile;
  onTrace: (id: string) => void;
}

const DistributorDashboard: React.FC<DistributorDashboardProps> = ({ user, onTrace }) => {
  const [batchId, setBatchId] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    transportMode: 'Truck - Refrigerated',
    temp: '4°C',
    carrier: 'Fast-Track Logistics'
  });

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    const batch = dbService.getBatch(batchId);
    if (!batch) {
      alert("Invalid Batch ID");
      return;
    }

    setLoading(true);
    try {
      // Capture Geo
      let lat = null, lng = null;
      try {
        const pos: any = await new Promise((res, rej) => 
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 3000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch (e) {}

      const eventData = { batchId, ...formData, lat, lng, type: 'TRANSIT' };
      const dataHash = blockchainService.generateDataHash(eventData);
      const txHash = await blockchainService.submitToBlockchain(dataHash);

      const event: BatchEvent = {
        id: Math.random().toString(36).substr(2, 9),
        batchId,
        role: UserRole.DISTRIBUTOR,
        userName: user.name,
        timestamp: Date.now(),
        latitude: lat,
        longitude: lng,
        details: { 
          action: 'Picked up for distribution',
          ...formData
        },
        dataHash,
        txHash
      };

      await dbService.addEvent(event);
      setSuccess(batchId);
      setBatchId('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Distributor Portal</h1>
        <p className="text-gray-500">Scan QR or enter ID to log transit details.</p>
      </div>

      {success && (
        <div className="bg-green-100 border border-green-200 p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-3 text-green-800">
            <CheckCircle size={24} />
            <p className="font-semibold">Successfully updated batch journey for {success}</p>
          </div>
          <button 
            onClick={() => onTrace(success)}
            className="text-green-700 font-bold hover:underline"
          >
            Verify on Chain
          </button>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center space-x-3 mb-6">
            <div className="bg-blue-100 p-2 rounded-lg">
              <Truck className="text-blue-600" size={24} />
            </div>
            <h2 className="text-xl font-bold">Log Movement</h2>
          </div>

          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Batch ID</label>
              <div className="relative">
                <input 
                  required
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value.toUpperCase())}
                  placeholder="e.g. AB123XYZ"
                  className="w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none uppercase font-mono"
                />
                <button 
                  type="button"
                  className="absolute right-2 top-2 p-1 text-gray-400 hover:text-blue-600"
                >
                  <Scan size={20} />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Transport Mode</label>
              <select 
                value={formData.transportMode}
                onChange={(e) => setFormData({...formData, transportMode: e.target.value})}
                className="w-full p-3 border rounded-lg"
              >
                <option>Truck - Refrigerated</option>
                <option>Truck - Ambient</option>
                <option>Air Freight</option>
                <option>Sea Freight</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-1">Storage Condition</label>
              <input 
                value={formData.temp}
                onChange={(e) => setFormData({...formData, temp: e.target.value})}
                placeholder="e.g. 4°C"
                className="w-full p-3 border rounded-lg"
              />
            </div>

            <button 
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-bold hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center space-x-2"
            >
              {loading ? (
                <span>Syncing with Node...</span>
              ) : (
                <>
                  <Navigation size={18} />
                  <span>Update Location & Log</span>
                </>
              )}
            </button>
          </form>
        </div>

        <div className="bg-gray-50 p-8 rounded-2xl border border-dashed border-gray-300 flex flex-col items-center justify-center text-center">
          <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm">
            <Scan size={32} className="text-gray-400" />
          </div>
          <h3 className="font-bold text-lg mb-2">QR Scan Preview</h3>
          <p className="text-gray-500 text-sm max-w-xs">
            Using a mobile device? Point your camera at the Batch QR code to automatically fill the form.
          </p>
          <div className="mt-8 p-4 bg-white border rounded-lg w-full">
            <p className="text-xs font-mono text-gray-400">Waiting for hardware activation...</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DistributorDashboard;
