
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, UserRole, BatchEvent } from '../types';
import { dbService } from '../services/dbService';
import { blockchainService } from '../services/blockchainService';
import { Store, CheckCircle, PackageCheck, AlertCircle, Camera, Navigation, Loader2, MapPin, Radio, ShieldCheck, Search, Scan, Clock, Upload, Image as ImageIcon } from 'lucide-react';
import { Html5Qrcode } from 'https://esm.sh/html5-qrcode';

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
  const [scanHighlight, setScanHighlight] = useState(false);
  const [analyzingFile, setAnalyzingFile] = useState(false);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [shelfLocation, setShelfLocation] = useState('Organic Section - Bay 04');

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
      id = parts[parts.length - 1];
    }
    return id.trim().toUpperCase();
  };

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.warn("Location denied", err),
        { enableHighAccuracy: true }
      );
    }

    const startScanner = async () => {
      try {
        const html5QrCode = new Html5Qrcode("retail-scanner");
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
            return { width: Math.floor(minDim * 0.7), height: Math.floor(minDim * 0.7) };
          },
          aspectRatio: 1.0
        };

        await html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback, () => {});
        setCameraActive(true);
      } catch (err) {
        console.error("Retail scanner failed", err);
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
    
    const html5QrCode = new Html5Qrcode("retail-hidden-reader");
    try {
      await new Promise(r => setTimeout(r, 1000));
      const decodedText = await html5QrCode.scanFile(file, true);
      const id = parseQrContent(decodedText);
      if (id && id.length > 3) {
        setBatchId(id);
        setScanHighlight(true);
        setTimeout(() => setScanHighlight(false), 1500);
      }
    } catch (err) {
      alert("Extraction Failed: No matrix detected in selected image.");
    } finally {
      setAnalyzingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    const batch = dbService.getBatch(batchId);
    if (!batch) {
      setError("CRITICAL: Asset ID not found.");
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
        details: { action: 'Reception Verified', shelfLocation, status: 'Active Retail' },
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
      <div id="retail-hidden-reader" className="hidden"></div>
      <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />

      <div className="flex justify-between items-end border-b border-gray-100 pb-8">
        <div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tighter uppercase leading-none mb-3">Retail Node</h1>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Merchant: {user.name}</p>
        </div>
        <div className="flex items-center space-x-4">
           <div className={`flex items-center space-x-2 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest ${location ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
              <MapPin size={12} /> <span>{location ? 'Store Verified' : 'Locating...'}</span>
           </div>
           <div className={`flex items-center space-x-2 px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest ${cameraActive ? 'bg-indigo-50 text-indigo-600' : 'bg-red-50 text-red-600'}`}>
              <Camera size={12} /> <span>{cameraActive ? 'Vision Live' : 'Offline'}</span>
           </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-10">
        <div className={`lg:col-span-3 bg-gray-900 rounded-[4rem] relative overflow-hidden flex flex-col items-center justify-center min-h-[500px] border-4 transition-all duration-500 ${scanHighlight ? 'border-indigo-500 scale-[1.01]' : 'border-gray-800'}`}>
          <div id="retail-scanner" className="absolute inset-0 w-full h-full [&>div]:border-none [&_video]:object-cover opacity-70"></div>
          
          <div className="absolute inset-0 pointer-events-none z-20">
             <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 border-2 rounded-[3rem] transition-all duration-500 ${scanHighlight ? 'border-white bg-indigo-500/20' : 'border-white/10'}`}>
                <div className={`absolute -top-4 -left-4 w-16 h-16 border-t-8 border-l-8 rounded-tl-2xl transition-colors ${scanHighlight ? 'border-white' : 'border-indigo-400'}`}></div>
                <div className={`absolute -top-4 -right-4 w-16 h-16 border-t-8 border-r-8 rounded-tr-2xl transition-colors ${scanHighlight ? 'border-white' : 'border-indigo-400'}`}></div>
                <div className={`absolute -bottom-4 -left-4 w-16 h-16 border-b-8 border-l-8 rounded-bl-2xl transition-colors ${scanHighlight ? 'border-white' : 'border-indigo-400'}`}></div>
                <div className={`absolute -bottom-4 -right-4 w-16 h-16 border-b-8 border-r-8 rounded-br-2xl transition-colors ${scanHighlight ? 'border-white' : 'border-indigo-400'}`}></div>
                {scanHighlight && <div className="animate-ping text-white"> <CheckCircle size={64} /> </div>}
             </div>
             {!scanHighlight && <div className="absolute left-0 w-full h-0.5 bg-indigo-400/50 shadow-[0_0_20px_#818cf8] animate-scan top-0"></div>}
          </div>

          <div className="relative z-40 mt-auto mb-10 w-full flex justify-center">
             <button 
               onClick={() => fileInputRef.current?.click()}
               disabled={analyzingFile}
               className="bg-black/40 backdrop-blur-xl px-12 py-5 rounded-[2rem] border border-white/20 hover:bg-black/60 transition-all flex items-center space-x-4 text-white group"
             >
                {analyzingFile ? <Loader2 size={24} className="animate-spin text-indigo-400" /> : <Upload size={24} className="text-indigo-400 group-hover:-translate-y-1 transition-transform" />}
                <span className="font-black uppercase tracking-widest text-sm italic">{analyzingFile ? 'Decoding...' : 'Import Manifest Photo'}</span>
             </button>
          </div>
        </div>

        <div className="lg:col-span-2 bg-white p-12 rounded-[4rem] shadow-2xl border border-gray-100 flex flex-col justify-between">
          <div className="space-y-10">
            <div className="flex items-center space-x-5">
              <div className="bg-indigo-600 p-5 rounded-3xl text-white shadow-xl shadow-indigo-100"> <Store size={36} /> </div>
              <div>
                 <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tighter leading-none">Reception</h2>
                 <p className="text-gray-400 font-bold text-[10px] uppercase tracking-widest mt-2">Final Node Entry</p>
              </div>
            </div>

            <form onSubmit={handleReceive} className="space-y-8">
              {error && <div className="p-5 bg-red-50 text-red-600 rounded-3xl text-xs font-black animate-bounce-short"> {error} </div>}

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mb-3 ml-2">Shipment ID</label>
                <div className="relative">
                  <input 
                    required
                    value={batchId}
                    onChange={(e) => setBatchId(e.target.value.toUpperCase())}
                    placeholder="SCANNING..."
                    className={`w-full px-8 py-7 border-2 transition-all font-mono font-black text-2xl tracking-widest placeholder:text-gray-200 outline-none rounded-[2.2rem] ${scanHighlight ? 'border-green-500 bg-green-50' : 'border-transparent bg-gray-50 focus:border-indigo-500'}`}
                  />
                  <div className={`absolute right-8 top-1/2 -translate-y-1/2 transition-all ${scanHighlight ? 'text-green-500 scale-125' : 'text-indigo-300'}`}>
                    {scanHighlight ? <CheckCircle size={28} /> : <Scan size={28} />}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mb-3 ml-2">Shelf Slot</label>
                <input required value={shelfLocation} onChange={(e) => setShelfLocation(e.target.value)} className="w-full px-8 py-6 bg-gray-50 rounded-[1.8rem] font-bold text-gray-800 outline-none" />
              </div>

              <div className="pt-6">
                <button type="submit" disabled={loading || !batchId} className="w-full bg-indigo-600 text-white py-9 rounded-[3rem] font-black uppercase text-xl hover:bg-indigo-700 transition-all shadow-2xl disabled:opacity-30 active:scale-[0.98] btn-wow">
                  {loading ? 'SYNCING...' : 'ACCEPT SHIPMENT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RetailerDashboard;
