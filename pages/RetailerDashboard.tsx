
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, UserRole, BatchEvent } from '../types';
import { dbService } from '../services/dbService';
import { blockchainService } from '../services/blockchainService';
import { Store, CheckCircle, PackageCheck, AlertCircle, Camera, Navigation, Loader2, MapPin, Radio, ShieldCheck, Search } from 'lucide-react';

interface RetailerDashboardProps {
  user: UserProfile;
  onTrace: (id: string) => void;
}

const RetailerDashboard: React.FC<RetailerDashboardProps> = ({ user, onTrace }) => {
  const [batchId, setBatchId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const [shelfLocation, setShelfLocation] = useState('Organic Section - Bay 04');

  // AUTOMATION: Detect Batch ID from URL Hash on load
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#trace/')) {
      const id = hash.replace('#trace/', '');
      setBatchId(id.toUpperCase());
    }
  }, []);

  // AUTOMATION: Initialize Logistics Node Components
  useEffect(() => {
    // 1. Lock GPS Coordinates
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn("Location denied", err),
        { enableHighAccuracy: true }
      );
    }

    // 2. Start Camera Vision
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment', width: 640, height: 480 } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraActive(true);
        }
      } catch (err) {
        console.error("Camera vision failed", err);
      }
    };
    startCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  const handleReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    const batch = dbService.getBatch(batchId);
    
    if (!batch) {
      setError("CRITICAL: This Asset ID is not registered on the global protocol.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const timestamp = Date.now();
      const currentLat = location?.lat || null;
      const currentLng = location?.lng || null;

      const eventData = { batchId, shelfLocation, lat: currentLat, lng: currentLng, type: 'RETAIL' };
      const dataHash = blockchainService.generateDataHash(eventData);
      const txHash = await blockchainService.submitToBlockchain(dataHash);

      const event: BatchEvent = {
        id: Math.random().toString(36).substr(2, 9),
        batchId,
        role: UserRole.RETAILER,
        userName: user.name,
        timestamp,
        latitude: currentLat,
        longitude: currentLng,
        details: { 
          action: 'Final Reception at Destination Node',
          shelfLocation,
          status: 'Available for Consumer Purchase'
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
    <div className="max-w-6xl mx-auto space-y-10 animate-spring pb-20">
      {/* Header Info */}
      <div className="flex justify-between items-end border-b border-gray-100 pb-8">
        <div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tighter uppercase leading-none mb-3">Retail Node</h1>
          <div className="flex items-center space-x-4">
             <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Merchant: {user.name}</p>
             <div className="h-1 w-1 bg-gray-300 rounded-full"></div>
             <p className="text-indigo-600 font-black uppercase tracking-widest text-xs flex items-center space-x-2">
                <Radio size={14} className="animate-pulse" />
                <span>Sync Active</span>
             </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
           <div className={`flex items-center space-x-2 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all ${location ? 'bg-green-50 border-green-200 text-green-600' : 'bg-orange-50 border-orange-200 text-orange-600 animate-pulse'}`}>
              <MapPin size={12} />
              <span>{location ? 'Store Verified' : 'Locating Store...'}</span>
           </div>
           <div className={`flex items-center space-x-2 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all ${cameraActive ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-red-50 border-red-200 text-red-600'}`}>
              <Camera size={12} />
              <span>{cameraActive ? 'Vision Live' : 'Vision Error'}</span>
           </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-10">
        {/* RETAILER VISION FEED */}
        <div className="lg:col-span-3 bg-gray-900 rounded-[4rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.4)] relative overflow-hidden flex items-center justify-center min-h-[500px] border-4 border-gray-800">
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="absolute inset-0 w-full h-full object-cover opacity-50 contrast-125"
          />
          
          {/* Scanning Overlay */}
          <div className="absolute inset-0 pointer-events-none">
             <div className="absolute top-0 w-full h-1/2 bg-gradient-to-b from-indigo-500/10 to-transparent"></div>
             <div className="absolute inset-0 border-[40px] border-gray-900/40"></div>
             
             {/* Dynamic Scan Target */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-white/10 rounded-[3rem]">
                <div className="absolute -top-4 -left-4 w-14 h-14 border-t-4 border-l-4 border-indigo-400 rounded-tl-2xl"></div>
                <div className="absolute -top-4 -right-4 w-14 h-14 border-t-4 border-r-4 border-indigo-400 rounded-tr-2xl"></div>
                <div className="absolute -bottom-4 -left-4 w-14 h-14 border-b-4 border-l-4 border-indigo-400 rounded-bl-2xl"></div>
                <div className="absolute -bottom-4 -right-4 w-14 h-14 border-b-4 border-r-4 border-indigo-400 rounded-br-2xl"></div>
             </div>
             
             <div className="absolute left-0 w-full h-0.5 bg-indigo-400/50 shadow-[0_0_20px_#818cf8] animate-scan-slow top-0"></div>
          </div>

          <div className="relative z-40 text-center">
             <div className="bg-white/5 backdrop-blur-md px-6 py-3 rounded-2xl border border-white/10 mb-4 inline-block">
                <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest leading-none">Scanning Inbound Freight</p>
             </div>
          </div>
        </div>

        {/* RECEPTION CONTROL PANEL */}
        <div className="lg:col-span-2 bg-white p-12 rounded-[4rem] shadow-2xl border border-gray-100 flex flex-col justify-between">
          <div className="space-y-10">
            <div className="flex items-center space-x-5">
              <div className="bg-indigo-600 p-5 rounded-3xl text-white shadow-xl shadow-indigo-100">
                <Store size={36} />
              </div>
              <div>
                 <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tighter leading-none">Reception</h2>
                 <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mt-2">End-of-Transit Verification</p>
              </div>
            </div>

            <form onSubmit={handleReceive} className="space-y-8">
              {error && (
                <div className="p-5 bg-red-50 border border-red-100 rounded-3xl flex items-center space-x-4 text-red-600 text-xs animate-bounce-short">
                  <AlertCircle size={20} className="flex-shrink-0" />
                  <p className="font-black uppercase tracking-tight">{error}</p>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mb-3 ml-2">Shipment ID</label>
                <div className="relative">
                  <input 
                    required
                    value={batchId}
                    onChange={(e) => setBatchId(e.target.value.toUpperCase())}
                    placeholder="SCAN OR ENTER ID"
                    className="w-full px-8 py-7 border-2 border-transparent focus:border-indigo-500 bg-gray-50 text-gray-900 rounded-[2.2rem] outline-none transition-all font-mono font-black text-2xl tracking-widest placeholder:text-gray-200"
                  />
                  <div className="absolute right-8 top-1/2 -translate-y-1/2 text-indigo-300">
                    <Search size={28} />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mb-3 ml-2">In-Store Mapping</label>
                <div className="grid grid-cols-1 gap-4">
                   <input 
                     required
                     value={shelfLocation}
                     onChange={(e) => setShelfLocation(e.target.value)}
                     className="w-full px-8 py-6 bg-gray-50 rounded-[1.8rem] border-2 border-transparent focus:border-indigo-500 font-bold text-gray-800 outline-none transition-all"
                   />
                   <div className="flex space-x-2">
                      {['Shelf A', 'Cold Case 2', 'Organic Bin'].map(tag => (
                        <button 
                          key={tag}
                          type="button"
                          onClick={() => setShelfLocation(tag)}
                          className="px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all"
                        >
                          {tag}
                        </button>
                      ))}
                   </div>
                </div>
              </div>

              <div className="pt-6">
                <button 
                  type="submit"
                  disabled={loading || !batchId}
                  className="w-full bg-indigo-600 text-white py-9 rounded-[3rem] font-black uppercase text-xl tracking-[0.2em] hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-200 flex items-center justify-center space-x-4 disabled:opacity-30 active:scale-[0.98] btn-wow"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={32} />
                      <span className="text-sm">VERIFYING ON-CHAIN...</span>
                    </>
                  ) : (
                    <>
                      <PackageCheck size={36} />
                      <span>Accept & Seal Shipment</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          <div className="mt-12 text-center opacity-40">
             <div className="inline-flex items-center space-x-2 text-[8px] font-black text-gray-500 uppercase tracking-[0.6em] border-t border-gray-100 pt-6">
                <ShieldCheck size={12} />
                <span>Cryptographic Merchant ID: {user.uid}</span>
             </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scan-slow {
          0% { top: 10%; }
          50% { top: 90%; }
          100% { top: 10%; }
        }
        .animate-scan-slow {
          animation: scan-slow 6s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
      `}</style>
    </div>
  );
};

export default RetailerDashboard;
