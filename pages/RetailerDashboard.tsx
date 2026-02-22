
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, UserRole, BatchEvent } from '../types';
import { dbService } from '../services/dbService';
import { blockchainService } from '../services/blockchainService';
import { aiService } from '../services/aiService';
import { 
  Store, CheckCircle, Camera, Loader2, MapPin, 
  ShieldCheck, RefreshCw, Image as ImageIcon, 
  ShoppingCart, Layers, Activity, Search, QrCode,
  Tag, Box
} from 'lucide-react';

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
  const [recentEvents, setRecentEvents] = useState<BatchEvent[]>([]);
  
  const scannerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMounted = useRef(true);
  const [shelfLocation, setShelfLocation] = useState('Organic Aisle - Bin 12');

  const fetchRecent = async () => {
    try {
      const events = await dbService.getEvents();
      setRecentEvents(events.filter(e => e.role === UserRole.RETAILER).reverse().slice(0, 10));
    } catch (e) {}
  };

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
      const container = document.getElementById("retailer-scanner-viewport");
      if (!container) return;
      const html5QrCode = new Html5Qrcode("retailer-scanner-viewport");
      scannerRef.current = html5QrCode;
      
      await html5QrCode.start(
        { facingMode: "environment" },
        { 
          fps: 24, 
          qrbox: (w: number, h: number) => ({ width: w * 0.75, height: h * 0.75 }), 
          aspectRatio: 1.0 
        },
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
    fetchRecent();
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
    let hiddenReader = document.getElementById("retail-hidden-reader");
    if (!hiddenReader) {
      hiddenReader = document.createElement('div');
      hiddenReader.id = "retail-hidden-reader";
      hiddenReader.style.visibility = "hidden";
      hiddenReader.style.position = "absolute";
      hiddenReader.style.left = "-9999px";
      hiddenReader.style.width = "100px";
      hiddenReader.style.height = "100px";
      document.body.appendChild(hiddenReader);
    }

    const html5QrCode = new Html5Qrcode("retail-hidden-reader");
    try {
      // Try standard QR scan first
      let id = '';
      try {
        const decodedText = await html5QrCode.scanFile(file, false);
        id = parseQrContent(decodedText);
      } catch (qrErr) {
        console.log("Retail QR Scan failed, attempting AI extraction...");
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
      console.error("Retail file processing error:", err);
      alert("Verification Failed: No detectable QR signature or Batch ID found.");
    } finally {
      setAnalyzingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      try {
        html5QrCode.clear();
      } catch (e) {}
    }
  };

  const handleReceive = async (e: React.FormEvent) => {
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
        role: UserRole.RETAILER,
        userName: user.name,
        timestamp: Date.now(),
        latitude: lat || null,
        longitude: lng || null,
        details: { action: 'Arrival Receipt Verified', shelf: shelfLocation },
        dataHash: blockchainService.generateDataHash({ batchId: cleanBatchId, shelfLocation, lat, lng }),
        txHash: await blockchainService.submitToBlockchain("retail-block")
      };
      
      await dbService.addEvent(event);
      await dbService.updateBatchStatus(cleanBatchId, 'RETAILED');
      setBatchId('');
      fetchRecent();
      onTrace(cleanBatchId);
    } catch (err: any) {
      alert("Verification Error: Check blockchain node connection.");
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
            <div className="bg-indigo-600 p-2.5 rounded-xl text-white shadow-lg shadow-indigo-200">
               <Store size={28} />
            </div>
            <span className="text-[10px] font-black uppercase text-indigo-600 tracking-[0.5em]">Market Protocol Node</span>
          </div>
          <h1 className="text-7xl font-black text-gray-900 tracking-tighter uppercase leading-none">Market Hub</h1>
          <p className="text-gray-400 font-bold uppercase tracking-[0.3em] text-[10px]">Registry Node: <span className="text-gray-900">{user.name}</span></p>
        </div>
        
        <div className="flex items-center space-x-4">
           <div className={`px-6 py-3 rounded-[1.5rem] border text-[10px] font-black uppercase tracking-widest flex items-center space-x-3 transition-all ${location ? 'bg-indigo-50 text-indigo-600 border-indigo-200 shadow-xl' : 'bg-orange-50 text-orange-600 border-orange-200 animate-pulse'}`}>
              <MapPin size={14} className={location ? 'animate-bounce' : ''} />
              <span>{location ? `STORE AUTH: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}` : 'Locating Marketplace...'}</span>
           </div>
           <button onClick={startScanner} className="p-4 bg-white rounded-2xl hover:bg-gray-50 transition-all active:scale-90 border border-gray-100 shadow-xl group">
              <RefreshCw size={24} className={`text-indigo-600 transition-transform duration-500 ${cameraActive ? 'group-hover:rotate-180' : 'animate-spin'}`} />
           </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-12">
        {/* Scanner Area */}
        <div className="lg:col-span-7 relative group">
          <div className={`bg-black rounded-[4.5rem] shadow-3xl relative overflow-hidden min-h-[600px] border-4 transition-all duration-700 ${scanHighlight ? 'border-indigo-400 scale-[1.01] shadow-[0_0_100px_rgba(79,70,229,0.3)]' : 'border-gray-800'}`}>
            <div id="retailer-scanner-viewport" className="absolute inset-0 w-full h-full [&_video]:object-cover opacity-85"></div>
            
            <div className="absolute inset-0 pointer-events-none z-20">
               <div className="absolute top-12 left-12 w-20 h-20 border-t-2 border-l-2 border-indigo-500/40 rounded-tl-[4rem]"></div>
               <div className="absolute top-12 right-12 w-20 h-20 border-t-2 border-r-2 border-indigo-500/40 rounded-tr-[4rem]"></div>
               <div className="absolute bottom-12 left-12 w-20 h-20 border-b-2 border-l-2 border-indigo-500/40 rounded-bl-[4rem]"></div>
               <div className="absolute bottom-12 right-12 w-20 h-20 border-b-2 border-r-2 border-indigo-500/40 rounded-br-[4rem]"></div>

               <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`w-80 h-80 border-2 rounded-full transition-all duration-700 relative ${scanHighlight ? 'border-white bg-indigo-500/30 scale-110' : 'border-indigo-500/20'}`}>
                     <div className="absolute inset-[-10px] border border-white/5 rounded-full"></div>
                     {scanHighlight && <div className="absolute inset-0 flex items-center justify-center"> <CheckCircle size={100} className="text-white animate-bounce" /> </div>}
                  </div>
               </div>
            </div>

            {!cameraActive && (
               <div className="absolute inset-0 flex flex-col items-center justify-center text-white/50 space-y-6 z-30 bg-gray-900/70 backdrop-blur-xl">
                  <div className="bg-indigo-500/10 p-14 rounded-full animate-pulse border border-indigo-500/20">
                     <ShoppingCart size={70} className="text-indigo-400" />
                  </div>
                  <p className="text-xl font-black uppercase tracking-[0.5em]">Network Optical Sync</p>
               </div>
            )}
          </div>

          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={analyzingFile}
            className="absolute -bottom-8 left-1/2 -translate-x-1/2 z-40 bg-white px-14 py-8 rounded-[3rem] text-gray-900 font-black uppercase text-sm shadow-[0_30px_60px_rgba(0,0,0,0.15)] transition-all hover:-translate-y-2 active:scale-95 flex items-center space-x-4 border border-indigo-50"
          >
            {analyzingFile ? <Loader2 size={24} className="animate-spin text-indigo-600" /> : <ImageIcon size={24} className="text-indigo-600" />}
            <span>{analyzingFile ? 'Decoding Proof...' : 'Analyze Photo Manifest'}</span>
          </button>
        </div>

        {/* Action Panel */}
        <div className="lg:col-span-5 flex flex-col space-y-8 pt-10 lg:pt-0">
          <div className="bg-white p-12 rounded-[4.5rem] shadow-3xl border border-gray-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/5 blur-[100px] rounded-full group-hover:bg-indigo-500/10 transition-all duration-1000"></div>
            
            <div className="mb-12 relative z-10">
               <h2 className="text-4xl font-black text-gray-900 tracking-tighter uppercase leading-none">Arrival Seal</h2>
               <p className="text-gray-400 font-bold text-xs uppercase tracking-widest mt-2 italic">Confirm marketplace entry for the batch</p>
            </div>

            <form onSubmit={handleReceive} className="space-y-10 relative z-10">
              <div className="space-y-4">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.6em] ml-2">Product Hash Label</label>
                <input 
                  required 
                  value={batchId} 
                  onChange={(e) => setBatchId(e.target.value.toUpperCase())} 
                  placeholder="SCAN OR TYPE HASH" 
                  className={`w-full px-10 py-8 rounded-[2.5rem] font-mono font-black text-2xl outline-none border-2 transition-all shadow-inner ${scanHighlight ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-transparent bg-gray-50 focus:border-indigo-500'}`} 
                />
              </div>

              <div className="space-y-4">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.6em] ml-2">Market Placement</label>
                <div className="relative">
                  <input 
                    required 
                    value={shelfLocation} 
                    onChange={(e) => setShelfLocation(e.target.value)} 
                    className="w-full px-10 py-7 bg-gray-50 rounded-[2.2rem] font-black outline-none border-2 border-transparent focus:border-indigo-500 shadow-inner" 
                    placeholder="e.g. Aisle 4 / Shelf B"
                  />
                  <Layers className="absolute right-10 top-1/2 -translate-y-1/2 text-gray-300" size={24} />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={loading || !batchId} 
                className="w-full bg-indigo-600 text-white py-10 rounded-[3.5rem] font-black uppercase text-2xl hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-200 active:scale-[0.98] disabled:opacity-30 mt-8 group"
              >
                {loading ? <Loader2 className="animate-spin mx-auto" size={36} /> : (
                  <div className="flex items-center justify-center space-x-5">
                    <ShieldCheck size={32} className="group-hover:scale-110 transition-transform" />
                    <span>Seal Marketplace Record</span>
                  </div>
                )}
              </button>
            </form>
          </div>

          <div className="bg-indigo-950 p-12 rounded-[4rem] text-white flex flex-col space-y-6 shadow-2xl relative overflow-hidden group">
             <div className="absolute bottom-0 right-0 p-8 opacity-10 group-hover:scale-125 transition-transform"> <Tag size={120} /> </div>
             <div className="flex items-center space-x-5">
                <div className="bg-white/10 p-5 rounded-[2rem]">
                  <Box size={32} className="text-indigo-400" />
                </div>
                <h4 className="font-black uppercase tracking-tighter text-2xl">Inventory Flow</h4>
             </div>
             <p className="text-indigo-200/60 font-bold text-sm leading-relaxed relative z-10">Every arrival event creates a verifiable link in the consumer transparency portal.</p>
             <div className="pt-4 flex items-center space-x-3 text-indigo-400 font-black text-[10px] uppercase tracking-widest cursor-pointer hover:text-indigo-300 transition-colors" onClick={() => batchId && onTrace(batchId)}>
                <span>Audit Chain History</span>
                <RefreshCw size={12} />
             </div>
          </div>
        </div>
      </div>

      {/* Recent Inventory Table */}
      <div className="mt-20 animate-spring stagger-3">
        <div className="flex items-center justify-between mb-8 px-4">
          <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tighter">Market Inventory</h2>
          <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-4 py-1.5 rounded-full border border-indigo-100">Last 10 Records</span>
        </div>
        
        <div className="bg-white rounded-[3.5rem] border border-gray-100 shadow-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">Batch ID</th>
                  <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">Placement</th>
                  <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">GPS Node</th>
                  <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.4em] text-gray-400">Timestamp</th>
                  <th className="px-10 py-8 text-[10px] font-black uppercase tracking-[0.4em] text-gray-400 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentEvents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-10 py-20 text-center">
                      <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No recent inventory arrivals recorded.</p>
                    </td>
                  </tr>
                ) : (
                  recentEvents.map((event) => (
                    <tr key={event.id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="px-10 py-8">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-600 flex items-center justify-center">
                            <Store size={16} />
                          </div>
                          <span className="font-mono text-sm font-black text-gray-900">{event.batchId}</span>
                        </div>
                      </td>
                      <td className="px-10 py-8">
                        <span className="text-sm font-bold text-gray-900">{event.details.shelf || 'N/A'}</span>
                      </td>
                      <td className="px-10 py-8">
                        <span className="text-[10px] font-mono font-bold text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-full">
                          {event.latitude?.toFixed(4)}, {event.longitude?.toFixed(4)}
                        </span>
                      </td>
                      <td className="px-10 py-8">
                        <span className="text-xs text-gray-500 font-medium">{new Date(event.timestamp).toLocaleString()}</span>
                      </td>
                      <td className="px-10 py-8 text-right">
                        <button 
                          onClick={() => onTrace(event.batchId)}
                          className="p-3 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        >
                          <ShieldCheck size={20} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RetailerDashboard;
