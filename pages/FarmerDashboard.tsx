
import React, { useState, useEffect } from 'react';
import { UserProfile, Batch, UserRole, BatchEvent } from '../types';
import { dbService } from '../services/dbService';
import { blockchainService } from '../services/blockchainService';
import { Plus, CheckCircle2, ChevronRight, QrCode } from 'lucide-react';

interface FarmerDashboardProps {
  user: UserProfile;
  onTrace: (id: string) => void;
}

const FarmerDashboard: React.FC<FarmerDashboardProps> = ({ user, onTrace }) => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    crop: '',
    seedType: '',
    quantity: '',
    location: '',
  });

  useEffect(() => {
    setBatches(dbService.getBatches().filter(b => b.farmerId === user.uid));
  }, [user.uid]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const batchId = Math.random().toString(36).substr(2, 9).toUpperCase();
      const newBatch: Batch = {
        id: batchId,
        farmerId: user.uid,
        crop: formData.crop,
        seedType: formData.seedType,
        quantity: formData.quantity,
        location: formData.location,
        harvestDate: new Date().toISOString(),
        createdAt: Date.now(),
      };

      // 1. Store in DB
      await dbService.createBatch(newBatch);

      // 2. Capture Geolocation
      let lat = null, lng = null;
      try {
        const pos: any = await new Promise((res, rej) => 
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch (err) {
        console.warn("Geolocation failed", err);
      }

      // 3. Create Event & Blockchain Proof
      const eventData = { ...newBatch, lat, lng, type: 'ORIGIN' };
      const dataHash = blockchainService.generateDataHash(eventData);
      const txHash = await blockchainService.submitToBlockchain(dataHash);

      const genesisEvent: BatchEvent = {
        id: Math.random().toString(36).substr(2, 9),
        batchId,
        role: UserRole.FARMER,
        userName: user.name,
        timestamp: Date.now(),
        latitude: lat,
        longitude: lng,
        details: { action: 'Harvest & Registration', crop: formData.crop },
        dataHash,
        txHash
      };

      await dbService.addEvent(genesisEvent);
      
      setBatches([newBatch, ...batches]);
      setShowForm(false);
      setFormData({ crop: '', seedType: '', quantity: '', location: '' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Farmer Dashboard</h1>
          <p className="text-gray-500">Register and manage your crop harvests.</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold flex items-center space-x-2 hover:bg-green-700 transition"
        >
          <Plus size={20} />
          <span>New Harvest</span>
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-lg">
          <form onSubmit={handleCreate} className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-semibold">Crop Name</label>
              <input 
                required
                className="w-full p-2 border rounded-md" 
                placeholder="e.g. Organic Arabica Coffee"
                value={formData.crop}
                onChange={(e) => setFormData({...formData, crop: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Seed Type</label>
              <input 
                required
                className="w-full p-2 border rounded-md" 
                placeholder="e.g. Certified Non-GMO"
                value={formData.seedType}
                onChange={(e) => setFormData({...formData, seedType: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Quantity</label>
              <input 
                required
                className="w-full p-2 border rounded-md" 
                placeholder="e.g. 500 KG"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">Farm Location (Text)</label>
              <input 
                required
                className="w-full p-2 border rounded-md" 
                placeholder="e.g. Highlands Estate, Plot 4"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
              />
            </div>
            <div className="md:col-span-2 flex justify-end space-x-3 mt-4">
              <button 
                type="button" 
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-gray-600 font-medium"
              >
                Cancel
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? 'Submitting to Blockchain...' : 'Create Batch'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {batches.length === 0 ? (
          <div className="col-span-full py-12 text-center bg-gray-50 rounded-xl border border-dashed border-gray-300">
            <p className="text-gray-500">No batches registered yet. Start by clicking "New Harvest".</p>
          </div>
        ) : (
          batches.map(batch => (
            <div key={batch.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition">
              <div className="p-5">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{batch.crop}</h3>
                    <p className="text-sm text-gray-500 font-mono">ID: {batch.id}</p>
                  </div>
                  <CheckCircle2 className="text-green-500" size={20} />
                </div>
                
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Quantity:</span>
                    <span className="font-medium">{batch.quantity}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Harvest:</span>
                    <span className="font-medium">{new Date(batch.harvestDate).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 pt-4 border-t">
                  <button 
                    onClick={() => onTrace(batch.id)}
                    className="flex-grow flex items-center justify-center space-x-2 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100 font-medium transition"
                  >
                    <ChevronRight size={18} />
                    <span>View Journey</span>
                  </button>
                  <button 
                    onClick={() => onTrace(batch.id)}
                    className="p-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition"
                  >
                    <QrCode size={20} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default FarmerDashboard;
