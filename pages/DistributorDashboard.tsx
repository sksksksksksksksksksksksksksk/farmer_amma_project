
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, UserRole, BatchEvent } from '../types';
import { dbService } from '../services/dbService';
import { blockchainService } from '../services/blockchainService';
import { Truck, Scan, CheckCircle, Navigation, Loader2, MapPin, Radio, Camera, ShieldCheck, Timer, Upload, Image as ImageIcon } from 'lucide-react';
import { Html5Qrcode } from 'https://esm.sh/html5-qrcode';

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
  const [scanHighlight, setScanHighlight] = useState(false);
  const [analyzingFile, setAnalyzingFile] = useState(false);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    transportMode: 'Truck - Refrigerated',
    temp: '4°C',
    carrier: 'AgriLogistics Global'
  });

  useEffect(() => {
    const hash = window.location.hash;
    if (hash.startsWith('#trace/')) {
      const id = hash.replace('#trace/', '');
      setBatchId(id.toUpperCase());
    }
  }, []);

  const parseQrContent = (text: string) => {
    let id = text;
    if (text.includes('/#trace/')) {
      id = text.split('/#trace/')[1].split('?')[0];
    } else if (text.includes('trace=')) {
      id = text.split('trace=')[1].split('&')[0];
    } else if (text.startsWith('http')) {
      const parts = text.split('/');
      const lastPart = parts[parts.length - 1];
      if (lastPart.includes('-') || lastPart.length > 4) {
        id = lastPart;
      }
    }
    return id.trim().toUpperCase();
  };

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn("Location access denied", err),
        { enableHighAccuracy: true }
      );
    }

    const startScanner = async () => {
      try {
        const html5QrCode = new Html5Qrcode("scanner-container");
        scannerRef.current = html5QrCode;
        
        const qrCodeSuccessCallback = (decodedText: string) => {
          const id = parseQrContent(decodedText);
          if (id && id.length > 3) {
            setBatchId(id);
            setScanHighlight(true);
            setTimeout(() => setScanHighlight(false), 1500);
          }
        };

        const config = { 
          fps: 20, 
          qrbox: (viewWidth: number, viewHeight: number) => {
            const minDim = Math.min(viewWidth, viewHeight);
            const boxSize = Math.floor(minDim * 0.7);
            return { width: boxSize, height: boxSize };
          },
          aspectRatio: 1.0
        };

        await html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback, () => {});
        setCameraActive(true);
      } catch (err) {
        console.error("Scanner failed to start", err);
        setCameraActive(false);
      }
    };

    startScanner();

    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, []);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setAnalyzingFile(true);
    
    const html5QrCode = new Html5Qrcode("scanner-hidden-reader");
    try {
      await new Promise(r => setTimeout(r, 800)); // Cinematic pause
      const decodedText = await html5QrCode.scanFile(file, true);
      const id = parseQrContent(decodedText);
      if (id && id.length > 3) {
        setBatchId(id);
        setScanHighlight(true);
        setTimeout(() => setScanHighlight(false), 1500);
      }
    } catch (err) {
      alert("Verification Error: No valid AgriChain matrix found in image.");
    } finally {
      setAnalyzingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

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
      const timestamp = Date.now();
      const currentLat = location?.lat || null;
      const currentLng = location?.lng || null;

      const eventData = { batchId, ...formData, lat: currentLat, lng: currentLng, timestamp, type: 'TRANSIT' };
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
      <div id="scanner-hidden-reader" className="hidden"></div>
      <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />

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

      <div className="grid lg:grid-cols-5 gap-10">
        <div className={`lg:col-span-3 bg-gray-900 rounded-[4rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,0.5)] relative overflow-hidden flex flex-col items-center justify-center min-h-[500px] border-4 transition-all duration-700 ${scanHighlight ? 'border-green-500 scale-[1.02]' : 'border-gray-800'}`}>
          <div id="scanner-container" className="absolute inset-0 w-full h-full [&>div]:border-none [&_video]:object-cover opacity-80"></div>

          <div className="absolute inset-0 pointer-events-none z-20">
             <div className={`absolute left-0 w-full h-1 bg-green-500 shadow-[0_0_25px_#22c55e] transition-all duration-300 ${scanHighlight ? 'opacity-0' : 'animate-scan opacity-70'}`}></div>
             <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 border-2 rounded-[4rem] flex items-center justify-center transition-all duration-500 ${scanHighlight ? 'border-white bg-green-500/20 scale-110' : 'border-white/10'}`}>
                <div className={`absolute -top-4 -left-4 w-16 h-16 border-t-8 border-l-8 rounded-tl-3xl transition-colors duration-300 ${scanHighlight ? 'border-white' : 'border-green-500'}`}></div>
                <div className={`absolute -top-4 -right-4 w-16 h-16 border-t-8 border-r-8 rounded-tr-3xl transition-colors duration-300 ${scanHighlight ? 'border-white' : 'border-green-500'}`}></div>
                <div className={`absolute -bottom-4 -left-4 w-16 h-16 border-b-8 border-l-8 rounded-bl-3xl transition-colors duration-300 ${scanHighlight ? 'border-white' : 'border-green-500'}`}></div>
                <div className={`absolute -bottom-4 -right-4 w-16 h-16 border-b-8 border-r-8 rounded-br-3xl transition-colors duration-300 ${scanHighlight ? 'border-white' : 'border-green-500'}`}></div>
                {scanHighlight && <div className="animate-ping bg-white rounded-full p-4"> <CheckCircle size={64} className="text-green-600" /> </div>}
             </div>
          </div>

          <div className="relative z-40 flex flex-col items-center mt-auto mb-10">
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={analyzingFile}
              className="bg-white/10 backdrop-blur-xl px-10 py-5 rounded-[2rem] border border-white/20 hover:bg-white/20 transition-all flex items-center space-x-4 text-white group"
            >
               {analyzingFile ? <Loader2 size={24} className="animate-spin text-green-400" /> : <Upload size={24} className="text-green-400 group-hover:scale-110 transition-transform" />}
               <span className="font-black uppercase tracking-widest text-sm">{analyzingFile ? 'Analyzing...' : 'Upload Image'}</span>
            </button>
          </div>
        </div>

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
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mb-3 ml-2">Detected Asset ID</label>
              <div className="relative group">
                <input 
                  required
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value.toUpperCase())}
                  placeholder="AUTO-FILL ON SCAN"
                  className={`w-full px-8 py-6 border-2 transition-all font-mono font-bold text-xl uppercase placeholder:text-gray-200 outline-none rounded-[1.8rem] ${scanHighlight ? 'border-green-500 bg-green-50' : 'border-transparent bg-gray-50 focus:border-blue-500'}`}
                />
                <div className={`absolute right-6 top-1/2 -translate-y-1/2 transition-all ${scanHighlight ? 'text-green-500 scale-125' : 'text-blue-500'}`}>
                  {scanHighlight ? <CheckCircle size={24} /> : <Scan size={24} />}
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
                </select>
              </div>
              <div className="space-y-3">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] ml-2">Environment Metrics</label>
                <input 
                  value={formData.temp}
                  onChange={(e) => setFormData({...formData, temp: e.target.value})}
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
                {loading ? <><Loader2 className="animate-spin" size={32} /> <span className="text-sm">SEALING...</span></> : <><Navigation size={28} /> <span>SYNC ASSET</span></>}
              </button>
            </div>
          </form>
        </div>
      </div>

      <style>{`
        @keyframes scan { 0% { top: 0; } 50% { top: 100%; } 100% { top: 0; } }
        .animate-scan { animation: scan 3s linear infinite; }
      `}</style>
    </div>
  );
};

export default DistributorDashboard;
