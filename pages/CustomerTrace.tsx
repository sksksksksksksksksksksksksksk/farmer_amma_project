
import React, { useState, useEffect, useRef } from 'react';
import { TraceData, UserRole } from '../types';
import { dbService } from '../services/dbService';
import { Search, MapPin, Calendar, Clock, ShieldCheck, ExternalLink, QrCode, Truck, ShoppingCart, Loader2, Camera, X, Zap, Upload, AlertTriangle } from 'lucide-react';
import { Html5Qrcode } from 'https://esm.sh/html5-qrcode';

interface CustomerTraceProps {
  batchId: string | null;
}

const CustomerTrace: React.FC<CustomerTraceProps> = ({ batchId: initialBatchId }) => {
  const [searchInput, setSearchInput] = useState('');
  const [traceData, setTraceData] = useState<TraceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [cameraPermissionStatus, setCameraPermissionStatus] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [scanningFile, setScanningFile] = useState(false);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialBatchId) {
      handleSearch(initialBatchId.toUpperCase());
    }
  }, [initialBatchId]);

  const handleSearch = async (id: string) => {
    if (!id) return;
    setLoading(true);
    setError(false);
    try {
      const data = await dbService.getTraceData(id);
      if (data) {
        setTraceData(data);
        setSearchInput(id);
      } else {
        setError(true);
        setTraceData(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const startScanner = async () => {
    setIsScannerOpen(true);
    setCameraPermissionStatus('pending');
    
    try {
      // Direct permission request
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setCameraPermissionStatus('granted');
    } catch (err) {
      console.warn("Camera permission error:", err);
      setCameraPermissionStatus('denied');
    }

    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;
        
        const qrCodeSuccessCallback = (decodedText: string) => {
          let id = decodedText;
          if (decodedText.includes('/#trace/')) {
            id = decodedText.split('/#trace/')[1];
          } else if (decodedText.includes('trace=')) {
            id = decodedText.split('trace=')[1].split('&')[0];
          }
          stopScanner();
          handleSearch(id.toUpperCase());
        };

        const config = { fps: 15, qrbox: { width: 250, height: 250 } };
        await html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback, () => {});
        setCameraPermissionStatus('granted');
      } catch (err) {
        console.warn("Scanner failed to start:", err);
        setCameraPermissionStatus('denied');
      }
    }, 400);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => {
        setIsScannerOpen(false);
        scannerRef.current = null;
      }).catch(err => {
        console.error("Scanner stop error", err);
        setIsScannerOpen(false);
        scannerRef.current = null;
      });
    } else {
      setIsScannerOpen(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setScanningFile(true);
    const html5QrCode = new Html5Qrcode("reader-hidden");
    
    try {
      const decodedText = await html5QrCode.scanFile(file, true);
      let id = decodedText;
      if (decodedText.includes('/#trace/')) {
        id = decodedText.split('/#trace/')[1];
      }
      setIsScannerOpen(false);
      handleSearch(id.toUpperCase());
    } catch (err) {
      console.error("File scan failed", err);
      alert("No valid AgriChain QR code detected. Please ensure the image is clear.");
    } finally {
      setScanningFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput) handleSearch(searchInput.toUpperCase());
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 mb-20 relative">
      <div id="reader-hidden" className="hidden"></div>
      
      {/* Visual Identity Search Area */}
      <div className="mb-16 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
        <h2 className="text-4xl font-black text-gray-900 mb-4 tracking-tighter uppercase leading-none">Chain Discovery</h2>
        <p className="text-gray-500 mb-10 text-lg font-medium max-w-xl mx-auto">Verify harvest integrity by scanning the product label or entering its unique ledger ID.</p>
        
        <div className="flex flex-col lg:flex-row items-stretch justify-center gap-5 max-w-4xl mx-auto">
          {/* Scanner Toggle */}
          <button 
            onClick={startScanner}
            className="flex-grow flex items-center justify-center space-x-4 bg-green-600 text-white px-10 py-7 rounded-[2.5rem] font-black uppercase text-xl tracking-[0.1em] hover:bg-green-700 transition-all shadow-2xl shadow-green-100 active:scale-95 group btn-wow"
          >
            <Camera size={32} className="group-hover:rotate-12 transition-transform" />
            <span>Launch Scanner</span>
          </button>

          <div className="flex items-center justify-center lg:px-2">
             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1.5 rounded-full border border-gray-100">Or</span>
          </div>

          {/* Manual Input Form */}
          <form onSubmit={onFormSubmit} className="flex-grow w-full flex items-center p-2 bg-white rounded-[2rem] shadow-xl border border-gray-100 hover:ring-8 hover:ring-green-50 transition-all duration-500">
            <input 
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="flex-grow px-6 py-4 rounded-2xl outline-none font-mono tracking-widest uppercase text-lg text-green-600 font-bold placeholder:text-gray-200"
              placeholder="AG-XXXX-XXXX"
            />
            <button className="bg-gray-900 text-white p-5 rounded-[1.5rem] hover:bg-black transition-all shadow-xl active:scale-95">
              <Search size={24} />
            </button>
          </form>
        </div>
      </div>

      {/* REINFORCED SCANNER MODAL FOR DESKTOP & MOBILE */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-3xl animate-in fade-in duration-300">
          {/* Click outside to close */}
          <div className="absolute inset-0 z-0" onClick={stopScanner}></div>
          
          <div className="relative z-10 bg-gray-900 w-full max-w-lg max-h-[90vh] rounded-[4rem] overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,0.8)] border border-white/10 flex flex-col animate-spring">
            
            {/* Modal Header - Always Visible */}
            <div className="p-8 border-b border-white/5 flex justify-between items-center bg-black/40 flex-shrink-0">
               <div className="flex items-center space-x-4">
                 <div className="bg-green-500/20 p-3 rounded-2xl text-green-400">
                   <Zap size={24} className="animate-pulse" />
                 </div>
                 <div>
                    <h3 className="text-white font-black uppercase tracking-widest text-sm italic leading-none">Agri-Vision Feed</h3>
                    <p className="text-[8px] text-green-400 font-bold uppercase tracking-[0.4em] mt-1">Status: {cameraPermissionStatus === 'granted' ? 'Connected' : 'Standby'}</p>
                 </div>
               </div>
               <button 
                 onClick={stopScanner} 
                 className="p-4 bg-white/5 rounded-2xl text-gray-400 hover:text-white transition-all hover:bg-white/10 active:scale-90"
                 aria-label="Close Scanner"
               >
                  <X size={28} />
               </button>
            </div>
            
            {/* Camera / Interaction Area */}
            <div className="relative flex-grow bg-black overflow-hidden flex flex-col">
               {cameraPermissionStatus === 'denied' ? (
                 <div className="flex-grow flex flex-col items-center justify-center p-12 text-center text-white space-y-8">
                    <div className="bg-orange-500/10 p-8 rounded-full">
                       <AlertTriangle size={64} className="text-orange-500 animate-bounce" />
                    </div>
                    <div>
                       <h4 className="text-2xl font-black uppercase mb-3 tracking-tighter">Permission Required</h4>
                       <p className="text-gray-400 text-sm leading-relaxed max-w-xs mx-auto">Camera access is currently blocked. Grant permission in your browser or select a photo from your device.</p>
                    </div>
                    <div className="flex flex-col w-full space-y-4">
                       <button 
                         onClick={startScanner}
                         className="w-full bg-white text-black py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-gray-100 transition-all active:scale-95"
                       >
                         Retry Camera
                       </button>
                       <button 
                         onClick={stopScanner}
                         className="w-full bg-white/5 text-gray-400 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/10 transition-all"
                       >
                         Dismiss
                       </button>
                    </div>
                 </div>
               ) : (
                 <div className="relative aspect-square sm:aspect-auto sm:flex-grow">
                   <div id="reader" className="w-full h-full [&>div]:border-none [&_video]:object-cover [&_video]:w-full [&_video]:h-full"></div>
                   
                   {/* Scanning Overlay Reticle */}
                   <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center p-10">
                      <div className="relative w-full aspect-square max-w-[280px] border-2 border-green-500/30 rounded-[3rem]">
                         <div className="absolute -top-2 -left-2 w-14 h-14 border-t-8 border-l-8 border-green-500 rounded-tl-2xl shadow-[0_0_20px_rgba(34,197,94,0.4)]"></div>
                         <div className="absolute -top-2 -right-2 w-14 h-14 border-t-8 border-r-8 border-green-500 rounded-tr-2xl shadow-[0_0_20px_rgba(34,197,94,0.4)]"></div>
                         <div className="absolute -bottom-2 -left-2 w-14 h-14 border-b-8 border-l-8 border-green-500 rounded-bl-2xl shadow-[0_0_20px_rgba(34,197,94,0.4)]"></div>
                         <div className="absolute -bottom-2 -right-2 w-14 h-14 border-b-8 border-r-8 border-green-500 rounded-br-2xl shadow-[0_0_20px_rgba(34,197,94,0.4)]"></div>
                      </div>
                      <div className="absolute left-0 w-full h-1.5 bg-green-500 shadow-[0_0_40px_#22c55e] animate-scan top-0 z-20"></div>
                   </div>
                 </div>
               )}
            </div>

            {/* Bottom Controls Area */}
            <div className="p-10 bg-black/60 text-center flex-shrink-0">
               <div className="space-y-8">
                  <div className="flex items-center justify-center space-x-4 opacity-50">
                    <div className="h-px bg-white/20 flex-grow"></div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.5em]">Manual verification path</p>
                    <div className="h-px bg-white/20 flex-grow"></div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row gap-4">
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-grow flex items-center justify-center space-x-3 bg-white/10 border border-white/10 text-white py-6 rounded-[2rem] font-black uppercase text-xs tracking-[0.1em] hover:bg-white/20 transition-all active:scale-95 disabled:opacity-50"
                      disabled={scanningFile}
                    >
                      {scanningFile ? (
                        <>
                          <Loader2 size={24} className="animate-spin text-green-500" />
                          <span>Decrypting File...</span>
                        </>
                      ) : (
                        <>
                          <Upload size={24} className="text-green-500" />
                          <span>Upload From Gallery</span>
                        </>
                      )}
                    </button>
                    
                    {/* Explicit Secondary Close for Desktop visibility */}
                    <button 
                      onClick={stopScanner}
                      className="sm:w-20 flex items-center justify-center bg-white/5 text-gray-500 p-6 rounded-[2rem] hover:text-white transition-all active:scale-95"
                    >
                      <X size={24} />
                    </button>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {loading && !isScannerOpen && (
        <div className="text-center py-20 animate-in fade-in duration-500">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-green-500 blur-2xl opacity-20 animate-pulse"></div>
            <Loader2 className="animate-spin h-24 w-24 text-green-600 relative z-10" />
          </div>
          <p className="mt-10 text-gray-900 font-black text-2xl tracking-tighter uppercase animate-pulse">Consulting Distributed Nodes...</p>
        </div>
      )}

      {error && !loading && (
        <div className="bg-white p-14 rounded-[4rem] border border-red-100 text-center shadow-2xl animate-in zoom-in duration-500 max-w-xl mx-auto">
          <div className="w-24 h-24 bg-red-50 text-red-500 rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-inner">
            <Search size={56} />
          </div>
          <h4 className="text-gray-900 font-black text-4xl tracking-tighter uppercase mb-6 leading-none">Record Not Found</h4>
          <p className="text-gray-500 font-medium mb-12 leading-relaxed text-lg">The identifier <span className="font-mono font-bold text-red-600 bg-red-50 px-2 rounded">"{searchInput}"</span> does not appear on the AgriChain global ledger.</p>
          <div className="flex flex-col sm:flex-row gap-4">
             <button 
               onClick={startScanner}
               className="flex-grow bg-gray-900 text-white px-10 py-6 rounded-[2rem] font-black uppercase text-sm tracking-widest hover:bg-black transition-all active:scale-95 shadow-xl"
             >
               Try New Scan
             </button>
             <button 
               onClick={() => { setError(false); setSearchInput(''); }}
               className="bg-gray-100 text-gray-400 px-8 py-6 rounded-[2rem] font-black uppercase text-[10px] tracking-widest hover:bg-gray-200 transition-all"
             >
               Clear
             </button>
          </div>
        </div>
      )}

      {traceData && !loading && (
        <div className="space-y-12 animate-in slide-in-from-bottom-8 duration-700">
          {/* Header Card */}
          <div className="bg-white rounded-[4rem] p-12 border border-gray-100 shadow-2xl overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-12">
              <div className="bg-green-600 text-white px-5 py-2.5 rounded-2xl text-[10px] font-black border border-green-500 flex items-center space-x-2 shadow-xl shadow-green-100/50">
                <ShieldCheck size={18} />
                <span className="uppercase tracking-[0.2em]">Provenance Verified</span>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-12 items-start">
              <div className="w-full md:w-56 h-56 bg-gray-50 rounded-[3.5rem] flex items-center justify-center border-2 border-dashed border-gray-200 group-hover:border-green-300 transition-colors">
                <QrCode size={100} className="text-green-600 group-hover:scale-110 transition-transform duration-500" />
              </div>
              <div className="flex-grow">
                <span className="inline-block px-4 py-1.5 bg-green-100 text-green-700 text-[10px] font-black rounded-xl uppercase tracking-[0.3em] mb-4">Genesis Protocol ID: {traceData.batch.id}</span>
                <h3 className="text-7xl font-black text-gray-900 mb-2 tracking-tighter uppercase leading-none">{traceData.batch.crop}</h3>
                <p className="text-3xl text-emerald-600 font-bold mb-10 italic">Premium Grade: {traceData.batch.seedType}</p>
                
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 border-t border-gray-50 pt-10">
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 block uppercase font-black tracking-[0.3em]">Volume</span>
                    <span className="text-xl text-gray-900 font-black tracking-tight">{traceData.batch.quantity}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 block uppercase font-black tracking-[0.3em]">Source Node</span>
                    <span className="text-xl text-gray-900 font-black tracking-tight">{traceData.batch.location}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 block uppercase font-black tracking-[0.3em]">Harvested</span>
                    <span className="text-xl text-gray-900 font-black tracking-tight">{new Date(traceData.batch.harvestDate).toLocaleDateString()}</span>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] text-gray-400 block uppercase font-black tracking-[0.3em]">Status</span>
                    <span className="text-xl text-green-600 font-black tracking-tight uppercase">Public</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline */}
          <div className="relative pt-10">
            <div className="flex items-center justify-between mb-16 px-6">
              <h4 className="text-4xl font-black text-gray-900 tracking-tighter uppercase leading-none">Immutable Custody Chain</h4>
              <div className="flex items-center space-x-3 text-[11px] font-black text-gray-400 uppercase tracking-widest bg-gray-50 px-5 py-2.5 rounded-full">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]"></div>
                <span>Decentralized Sync: Live</span>
              </div>
            </div>
            
            <div className="space-y-20 relative before:absolute before:left-12 before:top-4 before:bottom-4 before:w-2 before:bg-gradient-to-b before:from-green-500 before:via-blue-500 before:to-indigo-500 before:rounded-full before:shadow-inner">
              {traceData.events.map((event, idx) => (
                <div 
                  key={event.id} 
                  className={`relative pl-32 animate-in slide-in-from-left-12 duration-700`}
                  style={{ animationDelay: `${idx * 200}ms`, animationFillMode: 'both' }}
                >
                  {/* Node Icon */}
                  <div className={`absolute left-0 top-0 w-24 h-24 bg-white rounded-[2.5rem] shadow-2xl border-[6px] flex items-center justify-center z-10 transition-all duration-500 hover:scale-110 hover:-rotate-6
                    ${event.role === UserRole.FARMER ? 'border-green-500 shadow-green-200/50' : ''}
                    ${event.role === UserRole.DISTRIBUTOR ? 'border-blue-500 shadow-blue-200/50' : ''}
                    ${event.role === UserRole.RETAILER ? 'border-indigo-500 shadow-indigo-200/50' : ''}
                  `}>
                    {event.role === UserRole.FARMER && <MapPin className="text-green-600" size={40} />}
                    {event.role === UserRole.DISTRIBUTOR && <Truck className="text-blue-600" size={40} />}
                    {event.role === UserRole.RETAILER && <ShoppingCart className="text-indigo-600" size={40} />}
                  </div>

                  {/* Node Content */}
                  <div className="bg-white/90 backdrop-blur-xl p-10 rounded-[3.5rem] border border-white shadow-[0_30px_60px_-15px_rgba(0,0,0,0.08)] hover:shadow-2xl transition-all duration-500 group relative overflow-hidden">
                    {/* Background role identifier */}
                    <div className="absolute top-0 right-0 p-8 opacity-5 font-black text-6xl uppercase tracking-tighter pointer-events-none">{event.role}</div>

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-6 relative z-10">
                      <div>
                        <div className="flex items-center space-x-3 mb-2">
                           <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-sm
                             ${event.role === UserRole.FARMER ? 'bg-green-100 text-green-700' : ''}
                             ${event.role === UserRole.DISTRIBUTOR ? 'bg-blue-100 text-blue-700' : ''}
                             ${event.role === UserRole.RETAILER ? 'bg-indigo-100 text-indigo-700' : ''}
                           `}>
                             {event.role} Node Verification
                           </span>
                           {event.details.automatedSync && (
                             <span className="bg-gray-900 text-white text-[9px] px-3 py-1 rounded-lg font-black uppercase tracking-widest flex items-center space-x-1">
                               <Zap size={10} className="text-green-400" />
                               <span>Auto-Sync</span>
                             </span>
                           )}
                        </div>
                        <h5 className="text-3xl font-black text-gray-900 tracking-tight leading-none uppercase italic">{event.details.action}</h5>
                      </div>
                      
                      <div className="bg-gray-50 px-6 py-4 rounded-3xl border border-gray-100 flex items-center space-x-4">
                         <div className="text-right">
                           <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Network Time</p>
                           <p className="text-sm font-bold text-gray-800">
                             {new Date(event.timestamp).toLocaleDateString()} • {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                           </p>
                         </div>
                         <Clock size={24} className="text-gray-300" />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10 relative z-10">
                      {Object.entries(event.details).map(([key, value]) => {
                        if (key === 'action' || key === 'automatedSync') return null;
                        return (
                          <div key={key} className="bg-gray-50/50 p-5 rounded-2xl border border-gray-100/50 hover:bg-white transition-colors group/stat">
                            <span className="text-[10px] text-gray-400 capitalize font-black tracking-widest mb-1 block group-hover/stat:text-green-600 transition-colors">{key.replace(/([A-Z])/g, ' $1')}</span>
                            <p className="text-lg font-bold text-gray-900">{String(value)}</p>
                          </div>
                        );
                      })}
                      {event.latitude && (
                        <div className="bg-green-50/50 p-5 rounded-2xl border border-green-100/50 flex flex-col justify-between">
                          <div className="flex items-center justify-between mb-2">
                             <span className="text-[10px] text-green-600/70 uppercase font-black tracking-widest">Global GPS Lock</span>
                             <MapPin size={14} className="text-green-500 animate-bounce" />
                          </div>
                          <p className="text-lg font-mono font-black text-green-800 tracking-tighter">
                            {event.latitude.toFixed(6)}°N, {event.longitude?.toFixed(6)}°E
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="pt-8 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-6 relative z-10">
                      <div className="flex items-center space-x-4">
                        <div className="bg-emerald-100 p-2 rounded-lg">
                           <ShieldCheck size={20} className="text-emerald-600" />
                        </div>
                        <div>
                           <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Hash Security</p>
                           <p className="text-xs font-mono font-bold text-emerald-700 truncate max-w-[200px]">{event.txHash}</p>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => { e.preventDefault(); alert(`Blockchain Metadata Verification:\n\nPayload: ${JSON.stringify(event.details, null, 2)}\n\nLedger Hash: ${event.dataHash}\nTx Reference: ${event.txHash}\nNetwork: AgriChain-Mainnet-v1`); }}
                        className="bg-gray-900 text-white px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center space-x-3 transition-all hover:bg-black active:scale-95 shadow-xl group/btn"
                      >
                        <span className="group-hover/btn:translate-x-1 transition-transform">Audit Evidence</span>
                        <ExternalLink size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scan {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
        .animate-scan {
          animation: scan 3s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default CustomerTrace;
