
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, UserRole, BatchEvent } from '../types';
import { dbService } from '../services/dbService';
import { blockchainService } from '../services/blockchainService';
import { Store, CheckCircle, Camera, Loader2, MapPin, ShieldCheck, RefreshCw, Image as ImageIcon } from 'lucide-react';

declare const Html5Qrcode: any;

interface RetailerDashboardProps {
  user: UserProfile;
  onTrace: (id: string) => void;
}

const RetailerDashboard: React.FC<RetailerDashboardProps> = ({ user, onTrace }) => {
  const [batchId, setBatchId] = useState('');
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanHighlight, setScanHighlight] = useState(false);
  const [analyzingFile, setAnalyzingFile] = useState(false);
  
  const scannerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMounted = useRef(true);
  const [shelfLocation, setShelfLocation] = useState('Produce Aisle - Bin 14');

  const safeStopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
      } catch (e) {
        console.debug("Retail scanner stop suppressed:", e);
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
      const container = document.getElementById("retail-scanner-view");
      if (!container) return;
      const html5QrCode = new Html5Qrcode("retail-scanner-view");
      scannerRef.current = html5QrCode;
      await html5QrCode.start(
        { facingMode: "environment" },
        { fps: 20, qrbox: (w: number, h: number) => ({ width: Math.min(w, h) * 0.7, height: Math.min(w, h) * 0.7 }), aspectRatio: 1.0 },
        (text: string) => {
          const id = parseQrContent(text);
          if (id && id.length >= 4) { 
            setBatchId(id); 
            setScanHighlight(true); 
            if ('vibrate' in navigator) navigator.vibrate([80, 40, 80]);
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
    const html5QrCode = new Html5Qrcode("retail-hidden-reader");
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

  const handleReceive = async (e: React.FormEvent) => {
    e.preventDefault();
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
        role: UserRole.RETAILER,
        userName: user.name,
        timestamp: Date.now(),
        latitude: lat || null,
        longitude: lng || null,
        details: { action: 'Arrival Receipt Verified', shelf: shelfLocation },
        dataHash: blockchainService.generateDataHash({ batchId, shelfLocation, lat, lng }),
        txHash: await blockchainService.submitToBlockchain("retail-block")
      };
      await dbService.addEvent(event);
      onTrace(batchId);
    } catch (err: any) {
      alert("Verification Error: Check connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-spring pb-20 px-4">
      <div id="retail-hidden-reader" className="hidden"></div>
      <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-gray-100 pb-8">
        <div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tighter uppercase mb-2">Market Node</h1>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Merchant Registry: {user.name}</p>
        </div>
        <div className="flex items-center space-x-4">
           <div className={`px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest ${location ? 'bg-green-50 text-green-600 border-green-200' : 'bg-orange-50 text-orange-600 animate-pulse'}`}>
              <MapPin size={12} className="inline mr-2" /> <span>{location ? 'Store Verified' : 'Locating Node...'}</span>
           </div>
           <button onClick={startScanner} className="p-3 bg-gray-100 rounded-2xl hover:bg-gray-200 transition-all active:scale-90 border border-gray-200">
              <RefreshCw size={20} className={cameraActive ? '' : 'animate-spin text-indigo-600'} />
           </button>
        </div>
      </div>
      <div className="grid lg:grid-cols-5 gap-10">
        <div className={`lg:col-span-3 bg-black rounded-[4rem] relative overflow-hidden min-h-[550px] border-4 transition-all duration-500 ${scanHighlight ? 'border-indigo-500 scale-[1.01]' : 'border-gray-800'}`}>
          <div id="retail-scanner-view" className="absolute inset-0 w-full h-full [&_video]:object-cover"></div>
          {!cameraActive && (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 space-y-4">
                <Camera size={48} className="animate-pulse" />
                <p className="text-[10px] font-black uppercase tracking-widest">Waking Market Sensor...</p>
             </div>
          )}
          <div className="absolute inset-0 pointer-events-none z-20 flex items-center justify-center">
             <div className={`w-80 h-80 border-4 rounded-[3.5rem] transition-all duration-300 relative ${scanHighlight ? 'border-white bg-indigo-500/30' : 'border-indigo-500/60'}`}>
                {!scanHighlight && cameraActive && <div className="absolute left-0 w-full h-1 bg-indigo-400 animate-scan top-0"></div>}
                {scanHighlight && <CheckCircle size={110} className="text-white animate-pulse" />}
             </div>
          </div>
          <div className="absolute bottom-10 left-0 right-0 z-30 flex flex-col items-center space-y-4 px-8">
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={analyzingFile}
              className="bg-white px-12 py-6 rounded-[2.5rem] text-gray-900 font-black uppercase text-sm shadow-2xl transition-all active:scale-95 flex items-center space-x-4 border-2 border-transparent hover:border-indigo-600"
            >
              {analyzingFile ? <Loader2 size={24} className="animate-spin" /> : <ImageIcon size={24} className="text-indigo-600" />}
              <span>{analyzingFile ? 'Decoding...' : 'Gallery Manifest Upload'}</span>
            </button>
          </div>
        </div>
        <div className="lg:col-span-2 bg-white p-12 rounded-[4rem] shadow-2xl border border-gray-100 flex flex-col">
          <form onSubmit={handleReceive} className="space-y-8 flex-grow">
            <div className="space-y-4">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] ml-2">Verified Identity</label>
              <input required value={batchId} onChange={(e) => setBatchId(e.target.value.toUpperCase())} placeholder="POINT AT MANIFEST" className={`w-full px-8 py-7 rounded-[2.2rem] font-black text-2xl outline-none border-2 transition-all ${scanHighlight ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-transparent bg-gray-50 focus:border-indigo-500'}`} />
            </div>
            <div className="space-y-4">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] ml-2">Shelf Placement</label>
              <input required value={shelfLocation} onChange={(e) => setShelfLocation(e.target.value)} className="w-full px-8 py-6 bg-gray-50 rounded-[1.8rem] font-bold outline-none border-2 border-transparent focus:border-indigo-500 shadow-inner" />
            </div>
            <button type="submit" disabled={loading || !batchId} className="w-full bg-indigo-600 text-white py-9 rounded-[3.5rem] font-black uppercase text-xl hover:bg-indigo-700 transition-all shadow-2xl disabled:opacity-30 mt-auto">
              {loading ? <Loader2 className="animate-spin mx-auto" size={32} /> : 'SEAL RECEPTION'}
            </button>
          </form>
        </div>
      </div>
      <style>{` @keyframes scan { 0% { top: 0; } 100% { top: 100%; } } .animate-scan { animation: scan 1.2s ease-in-out infinite; } `}</style>
    </div>
  );
};

export default RetailerDashboard;
