
import React, { useState, useEffect } from 'react';
import { TraceData, UserRole } from '../types';
import { dbService } from '../services/dbService';
// Added missing Truck and ShoppingCart icons to the import list
import { Search, MapPin, Calendar, Clock, ShieldCheck, ExternalLink, QrCode, Truck, ShoppingCart } from 'lucide-react';

interface CustomerTraceProps {
  batchId: string | null;
}

const CustomerTrace: React.FC<CustomerTraceProps> = ({ batchId: initialBatchId }) => {
  const [searchInput, setSearchInput] = useState('');
  const [traceData, setTraceData] = useState<TraceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (initialBatchId) {
      handleSearch(initialBatchId);
    }
  }, [initialBatchId]);

  const handleSearch = async (id: string) => {
    setLoading(true);
    setError(false);
    try {
      const data = await dbService.getTraceData(id);
      if (data) {
        setTraceData(data);
      } else {
        setError(true);
        setTraceData(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput) handleSearch(searchInput.toUpperCase());
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Search Bar */}
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Track Your Food</h2>
        <p className="text-gray-500 mb-8">Enter the unique Batch ID found on your product's QR label.</p>
        <form onSubmit={onFormSubmit} className="max-w-lg mx-auto flex space-x-2">
          <input 
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-grow px-6 py-4 rounded-xl border-2 border-gray-100 focus:border-green-500 outline-none shadow-sm font-mono tracking-widest uppercase"
            placeholder="ENTER BATCH ID"
          />
          <button className="bg-green-600 text-white p-4 rounded-xl hover:bg-green-700 transition shadow-lg shadow-green-200">
            <Search size={24} />
          </button>
        </form>
      </div>

      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-green-600 border-t-transparent"></div>
          <p className="mt-4 text-gray-500">Querying Blockchain Ledger...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 p-8 rounded-2xl border border-red-100 text-center">
          <p className="text-red-600 font-semibold text-lg">Batch ID Not Found</p>
          <p className="text-gray-500 mt-2">Please double check the ID and try again.</p>
        </div>
      )}

      {traceData && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Header Card */}
          <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-xl overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8 flex space-x-2">
              <div className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold border border-green-100 flex items-center space-x-1">
                <ShieldCheck size={14} />
                <span>Verified Trace</span>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="w-full md:w-32 h-32 bg-gray-50 rounded-2xl flex items-center justify-center border-2 border-dashed border-gray-200">
                <QrCode size={48} className="text-gray-300" />
              </div>
              <div className="flex-grow">
                <h3 className="text-4xl font-extrabold text-gray-900 mb-1">{traceData.batch.crop}</h3>
                <p className="text-xl text-green-600 font-medium mb-4">{traceData.batch.seedType}</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <span className="text-xs text-gray-400 block mb-1 uppercase font-bold tracking-wider">Batch ID</span>
                    <span className="font-mono text-gray-700">{traceData.batch.id}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 block mb-1 uppercase font-bold tracking-wider">Quantity</span>
                    <span className="text-gray-700 font-medium">{traceData.batch.quantity}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 block mb-1 uppercase font-bold tracking-wider">Origin</span>
                    <span className="text-gray-700 font-medium">{traceData.batch.location}</span>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 block mb-1 uppercase font-bold tracking-wider">Harvested</span>
                    <span className="text-gray-700 font-medium">{new Date(traceData.batch.harvestDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="relative">
            <h4 className="text-2xl font-bold mb-8">Journey Roadmap</h4>
            
            <div className="space-y-12 relative before:absolute before:left-6 before:top-2 before:bottom-2 before:w-0.5 before:bg-gray-100">
              {traceData.events.map((event, idx) => (
                <div key={event.id} className="relative pl-16">
                  <div className="absolute left-0 top-1 w-12 h-12 bg-white rounded-2xl border-2 border-green-600 flex items-center justify-center z-10 shadow-sm">
                    {event.role === UserRole.FARMER && <MapPin className="text-green-600" size={24} />}
                    {event.role === UserRole.DISTRIBUTOR && <Truck className="text-blue-600" size={24} />}
                    {event.role === UserRole.RETAILER && <ShoppingCart className="text-indigo-600" size={24} />}
                  </div>

                  <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
                      <div>
                        <span className="inline-block bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest mb-1">
                          {event.role} STAGE
                        </span>
                        <h5 className="text-lg font-bold text-gray-800">{event.details.action}</h5>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center space-x-2 text-sm text-gray-500">
                          <Calendar size={14} />
                          <span>{new Date(event.timestamp).toLocaleDateString()}</span>
                          <Clock size={14} className="ml-2" />
                          <span>{new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                      {Object.entries(event.details).map(([key, value]) => {
                        if (key === 'action') return null;
                        return (
                          <div key={key}>
                            <span className="text-xs text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                            <p className="text-sm font-medium text-gray-700">{String(value)}</p>
                          </div>
                        );
                      })}
                      {event.latitude && (
                        <div>
                          <span className="text-xs text-gray-400 block">Capture Location</span>
                          <p className="text-sm font-medium text-gray-700">
                            {event.latitude.toFixed(4)}, {event.longitude?.toFixed(4)}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-green-600">
                        <ShieldCheck size={18} />
                        <span className="text-xs font-bold tracking-tight">Immutably Sealed on Blockchain</span>
                      </div>
                      <a 
                        href="#" 
                        onClick={(e) => { e.preventDefault(); alert(`Transaction proof:\n${event.txHash}`); }}
                        className="text-gray-400 hover:text-green-600 text-xs flex items-center space-x-1 underline"
                      >
                        <span>View Tx Proof</span>
                        <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerTrace;
