
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, UserRole, BatchEvent } from '../types';
import { dbService } from '../services/dbService';
import { blockchainService } from '../services/blockchainService';
import { Truck, CheckCircle, Loader2, MapPin, Camera, Zap, RefreshCw, Image as ImageIcon } from 'lucide-react';

declare const Html5Qrcode: any;

interface DistributorDashboardProps {
  user: UserProfile;
  onTrace: (id: string) => void;
}

const DistributorDashboard: React.FC<DistributorDashboardProps> = ({ user, onTrace }) => {
  const [batchId, setBatchId] = useState('');
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanHighlight, setScanHighlight] = useState(false);
  const [analyzingFile, setAnalyzingFile] = useState(false);
  
  const scannerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMounted = useRef(true);
  
  const [formData, setFormData] = useState({
    transportMode: 'Truck - Refrigerated',
    temp: '4°C',
    carrier: 'AgriLogistics Global'
  });

  const safeStopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch (e) {
        console.debug("Scanner stop suppressed:", e);
      } finally {
        scannerRef.current = null;
      }
    }
  };

  const parseQrContent = (text: string) => {
    const pattern = /([A-Z0-9]{4,10}-\d{3,6})/i;
    const match = text.match(pattern);
    if (match) return match[1].toUpperCase();
    if (text.includes('/#trace/')) {
      const parts = text.split('/#trace/');
      if (parts[1]) return parts[1].split(/[?#]/)[0].toUpperCase();
    }
    return text.trim().toUpperCase();
  };

  const startScanner = async () => {
    if (!isMounted.current) return;
    try {
      await safeStopScanner();
      const container = document.getElementById("scanner-container");
      if (!container) return;
      const html5QrCode = new Html5Qrcode("scanner-container");
      scannerRef.current = html5QrCode;
      const config = { 
        fps: 20,
        qrbox: (viewWidth: number, viewHeight: number) => {
          const size = Math.min(viewWidth, viewHeight) * 0.7;
          return { width: size, height: size };
        },
        aspectRatio: 1.0
      };
      await html5QrCode.start(
        { facingMode: "environment" }, 
        config, 
        (decodedText: string) => {
          const id = parseQrContent(decodedText);
          if (id && id.length >= 4) {
            setBatchId(id);
            setScanHighlight(true);
            if ('vibrate' in navigator) navigator.vibrate([100, 50, 100]);
            setTimeout(() => setScanHighlight(false), 1500);
          }
        }, 
        () => {} 
      );
      if (isMounted.current) setCameraActive(true);
    } catch (err) {
      if (isMounted.current) setCameraActive(false);
    }
  };

  useEffect(() => {
    isMounted.current = true;
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        null, { enableHighAccuracy: true }
      );
    }
    const timer = setTimeout(startScanner, 1000);
    return () => {
      isMounted.current = false;
      clearTimeout(timer);
      safeStopScanner();
    };
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAnalyzingFile(true);
    const html5QrCode = new Html5Qrcode("scanner-hidden-reader");
    try {
      const decodedText = await html5QrCode.scanFile(file, true);
      const id = parseQrContent(decodedText);
      if (id) {
        setBatchId(id);
        setScanHighlight(true);
        setTimeout(() => setScanHighlight(false), 2000);
      }
    } catch (err) {
      alert("Verification Failed: No detectable QR signature.");
    } finally {
      setAnalyzingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchId) return;
    setLoading(true);
    try {
      const pos: any = await new Promise((res, rej) => 
        navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 5000 })
      ).catch(() => ({ coords: { latitude: 0, longitude: 0 } }));
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const event: BatchEvent = {
        id: Math.random().toString(36).substr(2, 9),
        batchId,
        role: UserRole.DISTRIBUTOR,
        userName: user.name,
        timestamp: Date.now(),
        latitude: lat || null,
        longitude: lng || null,
        details: { ...formData, action: 'Shipment Custody Confirmed' },
        dataHash: blockchainService.generateDataHash({ batchId, ...formData, lat, lng }),
        txHash: await blockchainService.submitToBlockchain("distributor-log")
      };
      await dbService.addEvent(event);
      alert(`Asset ${batchId} synchronized.`);
      setBatchId('');
    } catch (err: any) {
      alert("Submission Error: Check network or GPS.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-spring pb-20 px-4">
      <div id="scanner-hidden-reader" className="hidden"></div>
      <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-gray-100 pb-8">
        <div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tighter uppercase mb-2">Carrier Hub</h1>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Registry Node: {user.name}</p>
        </div>
        <div className="flex items-center space-x-4">
           <div className={`px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest ${location ? 'bg-green-50 text-green-600 border-green-200' : 'bg-red-50 text-red-600 animate-pulse'}`}>
              <MapPin size={12} className="inline mr-2" />
              <span>{location ? 'GPS Locked' : 'Locating...'}</span>
           </div>
           <button onClick={startScanner} className="p-3 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-all active:scale-90 border border-gray-200">
              <RefreshCw size={20} className={cameraActive ? '' : 'animate-spin text-blue-600'} />
           </button>
        </div>
      </div>
      <div className="grid lg:grid-cols-5 gap-10">
        <div className={`lg:col-span-3 bg-black rounded-[4rem] shadow-2xl relative overflow-hidden min-h-[550px] border-4 transition-all duration-500 ${scanHighlight ? 'border-green-500 scale-[1.01]' : 'border-gray-800'}`}>
          <div id="scanner-container" className="absolute inset-0 w-full h-full [&_video]:object-cover"></div>
          {!cameraActive && (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 space-y-4">
                <Camera size={48} className="animate-pulse" />
                <p className="text-[10px] font-black uppercase tracking-widest">Waking Camera Hardware...</p>
             </div>
          )}
          <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
             <div className={`w-80 h-80 border-4 rounded-[3.5rem] transition-all duration-300 relative ${scanHighlight ? 'border-white bg-green-500/30' : 'border-green-500/60 shadow-[0_0_150px_rgba(34,197,94,0.5)]'}`}>
                {!scanHighlight && cameraActive && <div className="absolute left-0 w-full h-1 bg-green-400 shadow-[0_0_40px_#4ade80] animate-scan top-0"></div>}
                {scanHighlight && <div className="absolute inset-0 flex items-center justify-center"> <CheckCircle size={110} className="text-white animate-bounce" /> </div>}
             </div>
          </div>
          <div className="absolute top-8 left-8 z-30 flex items-center space-x-3 bg-black/80 backdrop-blur-xl px-6 py-3 rounded-2xl border border-white/10">
             <div className={`w-2.5 h-2.5 rounded-full ${cameraActive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
             <span className="text-white text-[10px] font-black uppercase tracking-[0.2em]">{cameraActive ? 'AI Vision Optimized' : 'Hardware Idle'}</span>
          </div>
          <div className="absolute bottom-10 left-0 right-0 z-30 flex flex-col items-center space-y-4 px-8">
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={analyzingFile}
              className="bg-white px-12 py-6 rounded-[2.5rem] text-gray-900 font-black uppercase text-sm shadow-2xl transition-all active:scale-95 flex items-center space-x-4 border-2 border-transparent hover:border-blue-600"
            >
              {analyzingFile ? <Loader2 size={24} className="animate-spin" /> : <ImageIcon size={24} className="text-blue-600" />}
              <span>{analyzingFile ? 'Decoding...' : 'Upload QR Photo'}</span>
            </button>
          </div>
        </div>
        <div className="lg:col-span-2 bg-white p-12 rounded-[4rem] shadow-2xl border border-gray-100 flex flex-col">
          <form onSubmit={handleSubmit} className="space-y-8 flex-grow">
            <div className="space-y-4">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] ml-2">Manifest Identity</label>
              <div className="relative">
                <input 
                  required
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value.toUpperCase())}
                  placeholder="POINT AT QR"
                  className={`w-full px-8 py-7 border-2 transition-all font-mono font-black text-2xl uppercase rounded-[2.2rem] outline-none ${scanHighlight ? 'border-green-500 bg-green-50 text-green-700' : 'border-transparent bg-gray-50 focus:border-blue-600'}`}
                />
                <Zap className={`absolute right-8 top-1/2 -translate-y-1/2 ${scanHighlight ? 'text-green-500' : 'text-gray-200'}`} size={24} />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] ml-2">Transport Chain</label>
                <select 
                  value={formData.transportMode}
                  onChange={(e) => setFormData({...formData, transportMode: e.target.value})}
                  className="w-full px-8 py-5 border border-gray-100 rounded-[1.8rem] bg-gray-50 font-black text-sm uppercase outline-none"
                >
                  <option>Truck - Refrigerated</option>
                  <option>Truck - Ambient</option>
                  <option>Air Priority Cargo</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] ml-2">Sensor Data</label>
                <input 
                  value={formData.temp}
                  onChange={(e) => setFormData({...formData, temp: e.target.value})}
                  className="w-full px-8 py-5 border border-gray-100 rounded-[1.8rem] bg-gray-50 font-bold outline-none"
                />
              </div>
            </div>
            <button 
              type="submit"
              disabled={loading || !batchId}
              className="w-full bg-blue-600 text-white py-9 rounded-[3.5rem] font-black uppercase text-xl hover:bg-blue-700 shadow-2xl flex items-center justify-center space-x-4 disabled:opacity-30 transition-all active:scale-[0.98] mt-auto"
            >
              {loading ? <Loader2 className="animate-spin" size={32} /> : <span>SIGN PROVENANCE BLOCK</span>}
            </button>
          </form>
        </div>
      </div>
      <style>{`
        @keyframes scan { 0% { top: 0; } 100% { top: 100%; } }
        .animate-scan { animation: scan 1.2s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default DistributorDashboard;
