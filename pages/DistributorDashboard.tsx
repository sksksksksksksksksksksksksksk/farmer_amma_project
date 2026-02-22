
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, UserRole, BatchEvent } from '../types';
import { dbService } from '../services/dbService';
import { blockchainService } from '../services/blockchainService';
import { aiService } from '../services/aiService';
import { 
  Truck, CheckCircle, Loader2, MapPin, Camera, Zap, 
  RefreshCw, Image as ImageIcon, Cpu, ShieldCheck, 
  Activity, Navigation, Layers, Scan, CornerDownRight
} from 'lucide-react';

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
    if (!text) return '';
    
    // 1. Try to match the standard batch ID pattern (e.g., ABCDEF-1234)
    const pattern = /([A-Z0-9]{4,10}-\d{3,6})/i;
    const match = text.match(pattern);
    if (match) return match[1].toUpperCase();
    
    // 2. Try to extract from URL hash (e.g., /#trace/ABCDEF-1234)
    if (text.includes('/#trace/')) {
      const parts = text.split('/#trace/');
      if (parts[1]) {
        const id = parts[1].split(/[?#]/)[0];
        if (id && id.length >= 4) return id.toUpperCase();
      }
    }
    
    // 3. Try to extract from query param (e.g., ?trace=ABCDEF-1234)
    if (text.includes('trace=')) {
      const parts = text.split('trace=');
      if (parts[1]) {
        const id = parts[1].split(/[&#]/)[0];
        if (id && id.length >= 4) return id.toUpperCase();
      }
    }

    // 4. Fallback: if it's a URL, take the last segment
    if (text.startsWith('http')) {
      try {
        const url = new URL(text);
        const pathParts = url.pathname.split('/').filter(Boolean);
        if (pathParts.length > 0) {
          const lastPart = pathParts[pathParts.length - 1];
          if (lastPart && lastPart.length >= 4) return lastPart.toUpperCase();
        }
        // Also check hash in URL object
        if (url.hash.startsWith('#trace/')) {
          const id = url.hash.replace('#trace/', '');
          if (id && id.length >= 4) return id.toUpperCase();
        }
      } catch (e) {
        // Not a valid URL, continue to fallback
      }
    }
    
    // 5. Final fallback: clean the text and check length
    const cleaned = text.trim().toUpperCase();
    return cleaned.length >= 4 ? cleaned : '';
  };

  const startScanner = async () => {
    if (!isMounted.current) return;
    try {
      await safeStopScanner();
      const container = document.getElementById("distributor-scanner-viewport");
      if (!container) return;
      const html5QrCode = new Html5Qrcode("distributor-scanner-viewport");
      scannerRef.current = html5QrCode;
      
      await html5QrCode.start(
        { facingMode: "environment" }, 
        { 
          fps: 24, 
          qrbox: (w: number, h: number) => ({ width: w * 0.75, height: h * 0.75 }), 
          aspectRatio: 1.0 
        }, 
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
    
    // Create hidden reader if needed
    let hiddenReader = document.getElementById("distributor-hidden-reader");
    if (!hiddenReader) {
      hiddenReader = document.createElement('div');
      hiddenReader.id = "distributor-hidden-reader";
      // Use visibility hidden instead of display none to ensure it's in the layout
      hiddenReader.style.visibility = "hidden";
      hiddenReader.style.position = "absolute";
      hiddenReader.style.left = "-9999px";
      hiddenReader.style.width = "100px";
      hiddenReader.style.height = "100px";
      document.body.appendChild(hiddenReader);
    }

    const html5QrCode = new Html5Qrcode("distributor-hidden-reader");
    try {
      // Try standard QR scan first
      let id = '';
      try {
        const decodedText = await html5QrCode.scanFile(file, false);
        id = parseQrContent(decodedText);
      } catch (qrErr) {
        console.log("QR Scan failed, attempting AI extraction...");
      }

      // If QR scan failed or returned no ID, try AI extraction
      if (!id) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve((reader.result as string).split(',')[1]);
          reader.onerror = reject;
        });
        
        id = await aiService.extractBatchIdFromImage(base64, file.type) || '';
      }

      if (id) {
        setBatchId(id);
        setScanHighlight(true);
        setTimeout(() => setScanHighlight(false), 2000);
      } else {
        alert("Verification Failed: Could not extract a valid Batch ID from the image (QR or Text).");
      }
    } catch (err) {
      console.error("File processing error:", err);
      alert("Verification Failed: No detectable QR signature or Batch ID found. Please ensure the manifest is clear.");
    } finally {
      setAnalyzingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      // Clean up the instance
      try {
        html5QrCode.clear();
      } catch (e) {}
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanBatchId = batchId.trim().toUpperCase();
    if (!cleanBatchId) return;
    setLoading(true);
    try {
      // Validate batch exists first
      const batch = await dbService.getBatch(cleanBatchId);
      if (!batch) {
        alert(`Validation Error: Batch ID "${cleanBatchId}" does not exist in the AgriChain registry. Please verify the ID or scan again.`);
        setLoading(false);
        return;
      }

      const pos: any = await new Promise((res, rej) => 
        navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 5000 })
      ).catch(() => ({ coords: { latitude: 0, longitude: 0 } }));
      
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      
      const event: BatchEvent = {
        id: Math.random().toString(36).substr(2, 9),
        batchId: cleanBatchId,
        role: UserRole.DISTRIBUTOR,
        userName: user.name,
        timestamp: Date.now(),
        latitude: lat || null,
        longitude: lng || null,
        details: { ...formData, action: 'Shipment Custody Confirmed' },
        dataHash: blockchainService.generateDataHash({ batchId: cleanBatchId, ...formData, lat, lng }),
        txHash: await blockchainService.submitToBlockchain("distributor-log")
      };
      
      await dbService.addEvent(event);
      await dbService.updateBatchStatus(cleanBatchId, 'IN_TRANSIT');
      alert(`Asset ${cleanBatchId} synchronized to distributed ledger and marked as IN_TRANSIT.`);
      setBatchId('');
    } catch (err: any) {
      alert("Submission Error: Check protocol synchronization or GPS.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-12 animate-spring pb-20 px-4 pt-4">
      <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-gray-100 pb-12">
        <div className="space-y-2">
          <div className="flex items-center space-x-3 mb-2">
            <div className="bg-blue-600 p-2.5 rounded-xl text-white shadow-lg shadow-blue-200">
               <Truck size={28} />
            </div>
            <span className="text-[10px] font-black uppercase text-blue-600 tracking-[0.5em]">Logistics Nexus Node</span>
          </div>
          <h1 className="text-7xl font-black text-gray-900 tracking-tighter uppercase leading-none">Carrier Hub</h1>
          <p className="text-gray-400 font-bold uppercase tracking-[0.3em] text-[10px]">Auth Identity: <span className="text-gray-900">{user.name}</span></p>
        </div>
        
        <div className="flex items-center space-x-4">
           <div className={`px-6 py-3 rounded-[1.5rem] border text-[10px] font-black uppercase tracking-widest flex items-center space-x-3 transition-all ${location ? 'bg-blue-50 text-blue-600 border-blue-200 shadow-xl' : 'bg-red-50 text-red-600 border-red-200 animate-pulse'}`}>
              <Navigation size={14} className={location ? 'animate-pulse' : ''} />
              <span>{location ? `GPS SECURE: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Awaiting GPS Link...'}</span>
           </div>
           <button onClick={startScanner} className="p-4 bg-white rounded-2xl hover:bg-gray-50 transition-all active:scale-90 border border-gray-100 shadow-xl group">
              <RefreshCw size={24} className={`text-blue-600 transition-transform duration-500 ${cameraActive ? 'group-hover:rotate-180' : 'animate-spin'}`} />
           </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-12">
        {/* Scanner Viewport */}
        <div className="lg:col-span-7 relative group">
          <div className={`bg-black rounded-[4.5rem] shadow-3xl relative overflow-hidden min-h-[600px] border-4 transition-all duration-700 ${scanHighlight ? 'border-green-500 scale-[1.01] shadow-[0_0_100px_rgba(34,197,94,0.3)]' : 'border-gray-800'}`}>
            <div id="distributor-scanner-viewport" className="absolute inset-0 w-full h-full [&_video]:object-cover opacity-80"></div>
            
            <div className="absolute inset-0 pointer-events-none z-20">
               <div className="absolute top-12 left-12 w-20 h-20 border-t-2 border-l-2 border-white/20 rounded-tl-[4rem]"></div>
               <div className="absolute top-12 right-12 w-20 h-20 border-t-2 border-r-2 border-white/20 rounded-tr-[4rem]"></div>
               <div className="absolute bottom-12 left-12 w-20 h-20 border-b-2 border-l-2 border-white/20 rounded-bl-[4rem]"></div>
               <div className="absolute bottom-12 right-12 w-20 h-20 border-b-2 border-r-2 border-white/20 rounded-br-[4rem]"></div>

               <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`w-80 h-80 border-2 rounded-[3.5rem] transition-all duration-500 relative ${scanHighlight ? 'border-white bg-green-500/20 scale-110' : 'border-blue-500/30'}`}>
                     {!scanHighlight && cameraActive && <div className="absolute left-0 w-full h-1 bg-blue-400 shadow-[0_0_40px_rgba(59,130,246,1)] animate-scan-line"></div>}
                     {scanHighlight && <div className="absolute inset-0 flex items-center justify-center"> <CheckCircle size={100} className="text-white animate-bounce" /> </div>}
                  </div>
               </div>
            </div>

            {!cameraActive && (
               <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 space-y-6 z-30 bg-gray-900/60 backdrop-blur-xl">
                  <div className="bg-blue-500/10 p-12 rounded-[3.5rem] animate-pulse">
                     <Camera size={70} className="text-blue-500" />
                  </div>
                  <p className="text-xl font-black uppercase tracking-[0.4em]">Optics Calibrating</p>
               </div>
            )}
          </div>

          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={analyzingFile}
            className="absolute -bottom-8 left-1/2 -translate-x-1/2 z-40 bg-white px-14 py-8 rounded-[3rem] text-gray-900 font-black uppercase text-sm shadow-[0_30px_60px_rgba(0,0,0,0.1)] transition-all hover:-translate-y-2 active:scale-95 flex items-center space-x-4 border border-blue-50"
          >
            {analyzingFile ? <Loader2 size={24} className="animate-spin text-blue-600" /> : <ImageIcon size={24} className="text-blue-600" />}
            <span>{analyzingFile ? 'Decoding Ledger...' : 'Upload Manifest Proof'}</span>
          </button>
        </div>

        {/* Data Sync Panel */}
        <div className="lg:col-span-5 flex flex-col space-y-8 pt-8 lg:pt-0">
          <div className="bg-white p-12 rounded-[4.5rem] shadow-3xl border border-gray-100 relative overflow-hidden group">
            <div className="absolute -top-32 -right-32 w-80 h-80 bg-blue-500/5 blur-[100px] rounded-full group-hover:bg-blue-500/10 transition-all duration-1000"></div>
            
            <div className="mb-12 relative z-10">
               <h2 className="text-4xl font-black text-gray-900 tracking-tighter uppercase leading-none">Shipment Seal</h2>
               <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-2 italic">Authenticate asset transit transition</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8 relative z-10">
              <div className="space-y-4">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.5em] ml-2">Verified Identity</label>
                <input 
                  required
                  value={batchId}
                  onChange={(e) => setBatchId(e.target.value.toUpperCase())}
                  placeholder="POINT AT MANIFEST"
                  className={`w-full px-10 py-8 border-2 transition-all font-mono font-black text-2xl uppercase rounded-[2.5rem] outline-none shadow-inner ${scanHighlight ? 'border-green-500 bg-green-50 text-green-700' : 'border-transparent bg-gray-50 focus:border-blue-600'}`}
                />
              </div>

              <div className="space-y-6">
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.5em] ml-2">Chain Protocol</label>
                  <select 
                    value={formData.transportMode}
                    onChange={(e) => setFormData({...formData, transportMode: e.target.value})}
                    className="w-full px-10 py-6 border-none rounded-[2rem] bg-gray-50 font-black text-sm uppercase outline-none focus:ring-4 focus:ring-blue-100 transition-all appearance-none cursor-pointer"
                  >
                    <option>Truck - Refrigerated</option>
                    <option>Truck - Ambient</option>
                    <option>Air Priority Cargo</option>
                    <option>Intermodal Sea</option>
                  </select>
                </div>
                
                <div className="space-y-3">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.5em] ml-2">Sensor Telemetry</label>
                  <input 
                    value={formData.temp}
                    onChange={(e) => setFormData({...formData, temp: e.target.value})}
                    className="w-full px-10 py-6 border-none rounded-[2rem] bg-gray-50 font-black outline-none focus:ring-4 focus:ring-blue-100 transition-all shadow-inner"
                    placeholder="e.g. 3.8°C"
                  />
                </div>
              </div>

              <button 
                type="submit"
                disabled={loading || !batchId}
                className="w-full bg-blue-600 text-white py-10 rounded-[3.5rem] font-black uppercase text-2xl hover:bg-blue-700 shadow-2xl shadow-blue-200 flex items-center justify-center space-x-5 disabled:opacity-30 transition-all active:scale-[0.98] mt-8 group"
              >
                {loading ? <Loader2 className="animate-spin" size={36} /> : (
                  <>
                    <ShieldCheck size={32} className="group-hover:scale-110 transition-transform" />
                    <span>Authorize Transfer</span>
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="bg-gray-900 p-10 rounded-[4rem] text-white flex items-center space-x-8 shadow-2xl relative overflow-hidden group">
             <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:rotate-12 transition-transform"> <Activity size={80} /> </div>
             <div className="bg-blue-600 p-5 rounded-[1.8rem] shadow-xl relative z-10">
                <Cpu size={32} />
             </div>
             <div className="relative z-10">
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-400">Ledger Status</p>
                <p className="text-sm font-bold opacity-80 mt-1">Live Synchronization with Sepolia Node Alpha-04.</p>
             </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes scan-line { 0% { top: 0; } 100% { top: 100%; } }
        .animate-scan-line { animation: scan-line 3s cubic-bezier(0.4, 0, 0.2, 1) infinite; }
      `}</style>
    </div>
  );
};

export default DistributorDashboard;
