
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, UserRole, BatchEvent } from '../types';
import { dbService } from '../services/dbService';
import { blockchainService } from '../services/blockchainService';
import { Truck, Scan, CheckCircle, Navigation, Loader2, MapPin, Radio, Camera, ShieldCheck, Timer } from 'lucide-react';

interface DistributorDashboardProps {
  user: UserProfile;
  onTrace: (id: string) => void;
}

const DistributorDashboard: React.FC<DistributorDashboardProps> = ({ user, onTrace }) => {
  const [batchId, setBatchId] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const [formData, setFormData] = useState({
    transportMode: 'Truck - Refrigerated',
    temp: '4°C',
    carrier: 'AgriLogistics Global'
  });

  // AUTOMATION: Detect ID from URL hash for auto-fill
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#trace/')) {
      const id = hash.replace('#trace/', '');
      setBatchId(id.toUpperCase());
    }
  }, []);

  // AUTOMATION: Start Camera and Location on Mount
  useEffect(() => {
    // 1. Initialize High-Accuracy Geolocation
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
          console.log("GPS Location Locked");
        },
        (err) => console.warn("Location access denied", err),
        { enableHighAccuracy: true }
      );
    }

    // 2. Initialize Camera Feed
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraActive(true);
        }
      } catch (err) {
        console.error("Camera access failed", err);
      }
    };

    startCamera();

    // Cleanup
    return () => {
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach(track => track.stop());
      }
    };
  }, []);

  const handleAutomatedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchId) return;

    const batch = dbService.getBatch(batchId);
    if (!batch) {
      alert("CRITICAL ERROR: Asset ID not found in decentralized registry.");
      return;
    }

    setLoading(true);
    try {
      // Capture CURRENT exact metrics for the ledger
      const timestamp = Date.now();
      const currentLat = location?.lat || null;
      const currentLng = location?.lng || null;

      const eventData = { 
        batchId, 
        ...formData, 
        lat: currentLat, 
        lng: currentLng, 
        timestamp,
        type: 'TRANSIT' 
      };
      
      const dataHash = blockchainService.generateDataHash(eventData);
      const txHash = await blockchainService.submitToBlockchain(dataHash);

      const event: BatchEvent = {
        id: Math.random().toString(36).substr(2, 9),
        batchId,
        role: UserRole.DISTRIBUTOR,
        userName: user.name,
        timestamp,
        latitude: currentLat,
        longitude: currentLng,
        details: { 
          action: 'Logistics Custody Transferred',
          ...formData,
          automatedSync: true
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
    <div className="max-w-6xl mx-auto space-y-10 animate-spring pb-20">
      <div className="flex justify-between items-end border-b border-gray-100 pb-8">
        <div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tighter uppercase leading-none mb-3">Distributor Hub</h1>
          <div className="flex items-center space-x-4">
             <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Node: {user.name}</p>
             <div className="h-1 w-1 bg-gray-300 rounded-full"></div>
             <p className="text-blue-600 font-black uppercase tracking-widest text-xs flex items-center space-x-2">
                <Radio size={14} className="animate-pulse" />
                <span>Network Status: Online</span>
             </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
           <div className={`flex items-center space-x-2 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all ${location ? 'bg-green-50 border-green-200 text-green-600' : 'bg-orange-50 border-orange-200 text-orange-600 animate-pulse'}`}>
              <MapPin size={12} />
              <span>{location ? 'GPS Locked' : 'Searching GPS...'}</span>
           </div>
           <div className={`flex items-center space-x-2 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all ${cameraActive ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-red-50 border-red-200 text-red-600 animate-pulse'}`}>
              <Camera size={12} />
              <span>{cameraActive ? 'Vision Active' : 'Vision Offline'}</span>
           </div>
        </div>
      </div>

      {success && (
        <div className="bg-green-600 p-8 rounded-[3rem] flex items-center justify-between text-white shadow-2xl shadow-green-200 animate-spring">
          <div className="flex items-center space-x-6">
            <div className="bg-white/20 p-4 rounded-full">
              <ShieldCheck size={40} />
            </div>
            <div>
              <p className="font-black text-2xl tracking-tighter uppercase leading-none mb-1">Asset Synchronized</p>
              <p className="text-sm opacity-80 font-mono">Blockchain Receipt: {success}</p>
            </div>
          </div>
          <button 
            onClick={() => onTrace(success)}
            className="bg-white text-green-700 px-10 py-4 rounded-2xl text-sm font-black hover:bg-gray-100 transition-all active:scale-95 uppercase tracking-widest"
          >
            Audit History
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-10">
        
        {/* AUTOMATED VISION PORTAL */}
        <div className="lg:col-span-3 bg-gray-900 rounded-[4rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] relative overflow-hidden flex items-center justify-center min-h-[500px] border-4 border-gray-800">
          
          {/* Real Video Feed */}
          <video 
            ref={videoRef} 
            autoPlay 
            playsInline 
            className="absolute inset-0 w-full h-full object-cover opacity-60 grayscale-[20%]"
          />

          {/* Holographic Overlays */}
          <div className="absolute inset-0 pointer-events-none">
             {/* Cyber Scan Line */}
             <div className="absolute left-0 w-full h-1 bg-green-500 shadow-[0_0_25px_#22c55e] animate-scan z-30 opacity-70"></div>
             
             {/* Tech Brackets */}
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 border-2 border-white/20 rounded-[4rem] flex items-center justify-center">
                <div className="absolute -top-4 -left-4 w-12 h-12 border-t-4 border-l-4 border-green-500 rounded-tl-2xl"></div>
                <div className="absolute -top-4 -right-4 w-12 h-12 border-t-4 border-r-4 border-green-500 rounded-tr-2xl"></div>
                <div className="absolute -bottom-4 -left-4 w-12 h-12 border-b-4 border-l-4 border-green-500 rounded-bl-2xl"></div>
                <div className="absolute -bottom-4 -right-4 w-12 h-12 border-b-4 border-r-4 border-green-500 rounded-br-2xl"></div>
             </div>
          </div>

          <div className="relative z-40 flex flex-col items-center">
            {!cameraActive && (
              <div className="text-center p-10 bg-black/40 backdrop-blur-md rounded-3xl border border-white/10">
                <Camera size={64} className="text-gray-500 mx-auto mb-6 animate-pulse" />
                <h3 className="text-white font-black text-xl uppercase mb-2">Awaiting Vision Node</h3>
                <p className="text-gray-400 text-sm">Please authorize camera access for auto-sync.</p>
              </div>
            )}
            
            <div className="mt-64 flex flex-col items-center">
               <div className="bg-white/10 backdrop-blur-xl px-8 py-4 rounded-3xl border border-white/20 mb-6">
                  <div className="flex items-center space-x-3 text-green-400">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_#22c55e]"></div>
                    <p className="text-xs font-mono font-bold tracking-widest uppercase italic">Automatic Scanner Engine v4.0</p>
                  </div>
               </div>
            </div>
          </div>

          {/* Bottom Feed Stats */}
          <div className="absolute bottom-10 left-10 right-10 flex justify-between items-center z-50">
             <div className="bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex items-center space-x-4">
                <Timer size={18} className="text-blue-400" />
                <div>
                  <p className="text-[8px] text-gray-500 uppercase font-black tracking-widest">Network Time</p>
                  <p className="text-xs text-white font-mono font-bold">{new Date().toLocaleTimeString()}</p>
                </div>
             </div>
             <div className="bg-black/60 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex items-center space-x-4">
                <Navigation size={18} className="text-green-400" />
                <div>
                  <p className="text-[8px] text-gray-500 uppercase font-black tracking-widest">Coordinates</p>
                  <p className="text-xs text-white font-mono font-bold">
                    {location ? `${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'SENSING...'}
                  </p>
                </div>
             </div>
          </div>
        </div>

        {/* LOGISTICS NODE DATA CONTROL */}
        <div className="lg:col-span-2 bg-white p-12 rounded-[4rem] shadow-2xl border border-gray-100 flex flex-col">
          <div className="flex items-center space-x-5 mb-10">
            <div className="bg-blue-600 p-4 rounded-3xl text-white shadow-xl shadow-blue-200">
              <Truck size={32} />
            </div>
            <div>
               <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Manifest Sync</h2>
               <p className="text-gray-400 font-bold text-xs uppercase tracking-widest">Digital Custody Seal</p>
            </div>
          </div>

          <form onSubmit={handleAutomatedSubmit} className="space-y-8 flex-grow">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-3 ml-2">Scanned Asset ID</label>
              <div className="relative group">
                <input 
                  required
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value.toUpperCase())}
                  placeholder="AG-XXXX-XXXX"
                  className="w-full px-8 py-6 border-2 border-transparent focus:border-blue-500 bg-gray-50 text-gray-900 rounded-[1.8rem] outline-none transition-all font-mono font-bold text-xl uppercase placeholder:text-gray-200"
                />
                <div className="absolute right-6 top-1/2 -translate-y-1/2 text-blue-500 group-hover:rotate-12 transition-transform">
                  <Scan size={24} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2">Transport Architecture</label>
                <select 
                  value={formData.transportMode}
                  onChange={(e) => setFormData({...formData, transportMode: e.target.value})}
                  className="w-full px-8 py-5 border border-gray-100 rounded-[1.5rem] bg-gray-50 text-gray-800 outline-none transition-all font-bold cursor-pointer appearance-none shadow-sm"
                >
                  <option>Truck - Cold Chain v2</option>
                  <option>Truck - Standard Freight</option>
                  <option>Autonomous Air Cargo</option>
                  <option>Smart Sea Express</option>
                </select>
              </div>

              <div className="space-y-3">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2">Environment Metrics</label>
                <input 
                  value={formData.temp}
                  onChange={(e) => setFormData({...formData, temp: e.target.value})}
                  placeholder="e.g. 4°C Constant"
                  className="w-full px-8 py-5 border border-gray-100 rounded-[1.5rem] bg-gray-50 text-gray-800 outline-none transition-all font-bold shadow-sm"
                />
              </div>
            </div>

            <div className="pt-6">
              <button 
                type="submit"
                disabled={loading || !batchId}
                className="w-full bg-blue-600 text-white py-8 rounded-[2.5rem] font-black uppercase text-lg tracking-[0.2em] hover:bg-blue-700 transition-all shadow-2xl shadow-blue-200 flex items-center justify-center space-x-4 disabled:opacity-40 active:scale-[0.98] duration-300 btn-wow"
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" size={32} />
                    <span className="text-sm">SEALING ON-CHAIN...</span>
                  </>
                ) : (
                  <>
                    <Navigation size={28} />
                    <span>SYNC & SEAL ASSET</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-10 text-center opacity-30">
             <p className="text-[9px] font-black text-gray-500 uppercase tracking-[0.4em]">
                Blockchain Node ID: {user.uid}
             </p>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { top: 0; }
          50% { top: 100%; }
          100% { top: 0; }
        }
        .animate-scan {
          animation: scan 4s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default DistributorDashboard;
