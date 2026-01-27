
import React, { useState, useEffect, useRef } from 'react';
import { TraceData, UserRole, BatchEvent } from '../types';
import { dbService } from '../services/dbService';
import { 
  Search, MapPin, ShieldCheck, QrCode, Truck, 
  ShoppingCart, Loader2, Camera, X, RefreshCcw, 
  CheckCircle, Image as ImageIcon, Globe, Cpu, 
  Hash, ExternalLink, Navigation, Copy, Check,
  Activity, Calendar, FileSearch, Layers
} from 'lucide-react';

declare const Html5Qrcode: any;

interface CustomerTraceProps {
  batchId: string | null;
}

const CustomerTrace: React.FC<CustomerTraceProps> = ({ batchId: initialBatchId }) => {
  const [searchInput, setSearchInput] = useState('');
  const [traceData, setTraceData] = useState<TraceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzingFile, setAnalyzingFile] = useState(false);
  const [errorType, setErrorType] = useState<'NONE' | 'INVALID_ID' | 'NOT_FOUND' | 'SCAN_FAILED'>('NONE');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [scanHighlight, setScanHighlight] = useState(false);
  const [copiedHash, setCopiedHash] = useState<string | null>(null);
  
  const scannerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialBatchId) {
      handleSearch(initialBatchId.toUpperCase());
    }
  }, [initialBatchId]);

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
    return id.trim();
  };

  const handleSearch = async (id: string) => {
    if (!id) return;
    setLoading(true);
    setErrorType('NONE');
    setTraceData(null);
    try {
      const data = await dbService.getTraceData(id);
      if (data) {
        setTraceData(data);
        setSearchInput(id);
      } else {
        setErrorType('NOT_FOUND');
      }
    } catch (err) {
      setErrorType('INVALID_ID');
    } finally {
      setLoading(false);
    }
  };

  const startScanner = async () => {
    setIsScannerOpen(true);
    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode("trace-reader");
        scannerRef.current = html5QrCode;
        await html5QrCode.start(
          { facingMode: "environment" }, 
          { fps: 20, qrbox: (w: number, h: number) => ({ width: w * 0.7, height: h * 0.7 }), aspectRatio: 1.0 }, 
          (decodedText: string) => {
            const id = parseQrContent(decodedText);
            if (id) {
              setScanHighlight(true);
              setTimeout(() => {
                stopScanner();
                handleSearch(id.toUpperCase());
              }, 1000);
            }
          }, 
          () => {}
        );
      } catch (err) {
        console.error("Camera fail:", err);
      }
    }, 500);
  };

  const stopScanner = () => {
    setScanHighlight(false);
    if (scannerRef.current) {
      const currentScanner = scannerRef.current;
      scannerRef.current = null;
      try {
        if (currentScanner.isScanning) {
          currentScanner.stop().finally(() => setIsScannerOpen(false));
        } else {
          setIsScannerOpen(false);
        }
      } catch (e) {
        setIsScannerOpen(false);
      }
    } else {
      setIsScannerOpen(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setAnalyzingFile(true);
    setErrorType('NONE');
    
    // Create a temporary reader element if it doesn't exist
    let readerElement = document.getElementById("trace-reader-hidden");
    if (!readerElement) {
      readerElement = document.createElement("div");
      readerElement.id = "trace-reader-hidden";
      readerElement.style.display = "none";
      document.body.appendChild(readerElement);
    }

    const html5QrCode = new Html5Qrcode("trace-reader-hidden");
    try {
      const decodedText = await html5QrCode.scanFile(file, true);
      const id = parseQrContent(decodedText);
      if (id) {
        handleSearch(id.toUpperCase());
      } else {
        setErrorType('SCAN_FAILED');
      }
    } catch (err) {
      console.error("File scan error:", err);
      setErrorType('SCAN_FAILED');
    } finally {
      setAnalyzingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case UserRole.FARMER: return <Globe className="text-green-500" size={24} />;
      case UserRole.DISTRIBUTOR: return <Truck className="text-blue-500" size={24} />;
      case UserRole.RETAILER: return <ShoppingCart className="text-indigo-500" size={24} />;
      default: return <Activity className="text-gray-500" size={24} />;
    }
  };

  const getRoleColor = (role: UserRole) => {
    switch (role) {
      case UserRole.FARMER: return 'bg-green-500';
      case UserRole.DISTRIBUTOR: return 'bg-blue-500';
      case UserRole.RETAILER: return 'bg-indigo-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 mb-20 relative min-h-[80vh]">
      <input 
        type="file" 
        accept="image/*" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
      />
      
      {!traceData && !loading && !analyzingFile && (
        <div className="text-center animate-spring flex flex-col items-center justify-center space-y-12 py-10 lg:py-20">
          <div className="space-y-4">
            <h2 className="text-7xl lg:text-9xl font-black text-gray-900 tracking-tighter uppercase leading-none">
              Trace<br/><span className="text-green-600 italic">Origin</span>
            </h2>
            <p className="text-gray-400 font-bold uppercase tracking-[0.4em] text-[10px] lg:text-xs">Decentralized Provenance Protocol</p>
          </div>

          <div className="flex flex-col lg:flex-row items-stretch justify-center gap-8 w-full max-w-5xl">
            {/* Live Scan Button */}
            <button 
              onClick={startScanner} 
              className="flex-grow group bg-white hover:bg-green-600 p-12 lg:p-16 rounded-[4rem] shadow-2xl transition-all duration-500 hover:-translate-y-4 border border-gray-100 flex flex-col items-center relative overflow-hidden"
            >
              <div className="bg-green-50 group-hover:bg-white/20 p-8 lg:p-10 rounded-[3rem] text-green-600 group-hover:text-white transition-all duration-500 mb-8 z-10">
                <Camera size={60} />
              </div>
              <span className="text-3xl lg:text-4xl font-black uppercase text-gray-900 group-hover:text-white tracking-tighter z-10">Live Scan</span>
              <p className="mt-2 text-gray-400 group-hover:text-white/70 font-bold text-xs uppercase tracking-widest z-10">Augmented Reality Mode</p>
              <div className="absolute inset-0 bg-gradient-to-tr from-green-500/0 via-green-500/0 to-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            </button>

            {/* Photo Verify Button */}
            <button 
              onClick={() => fileInputRef.current?.click()} 
              className="flex-grow group bg-gray-900 hover:bg-black p-12 lg:p-16 rounded-[4rem] shadow-2xl transition-all duration-500 hover:-translate-y-4 flex flex-col items-center relative overflow-hidden"
            >
              <div className="bg-white/10 group-hover:bg-white/20 p-8 lg:p-10 rounded-[3rem] text-white transition-all duration-500 mb-8 z-10">
                <ImageIcon size={60} />
              </div>
              <span className="text-3xl lg:text-4xl font-black uppercase text-white tracking-tighter z-10">Photo Verify</span>
              <p className="mt-2 text-white/50 font-bold text-xs uppercase tracking-widest z-10">Upload Digital Manifest</p>
              <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-green-500/10 blur-[80px] rounded-full group-hover:bg-green-500/20 transition-all"></div>
            </button>
          </div>

          <div className="w-full max-w-xl">
             <div className="relative group">
                <input 
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch(searchInput)}
                  placeholder="ENTER BATCH ID MANUALLY"
                  className="w-full bg-gray-50 border-2 border-transparent focus:border-green-500 px-10 py-8 rounded-[2.5rem] font-mono text-lg font-black tracking-widest outline-none transition-all shadow-inner placeholder:text-gray-200 text-center"
                />
                <button 
                  onClick={() => handleSearch(searchInput)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-green-600 text-white p-5 rounded-full hover:scale-110 active:scale-90 transition-all shadow-xl"
                >
                  <Search size={24} />
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Camera UI */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl">
          <div className="absolute inset-0" onClick={stopScanner}></div>
          <div className={`relative bg-gray-900 w-full max-w-2xl rounded-[5rem] overflow-hidden border-4 transition-all duration-500 ${scanHighlight ? 'border-green-500' : 'border-white/10'}`}>
            <div id="trace-reader" className="aspect-square w-full h-full [&_video]:object-cover"></div>
            <div className="absolute inset-0 pointer-events-none border-[60px] border-black/50"></div>
            <button onClick={stopScanner} className="absolute top-10 right-10 text-white p-6 bg-black/50 backdrop-blur-md rounded-full hover:bg-red-500 transition-colors"> 
              <X size={40} /> 
            </button>
            <div className="absolute bottom-12 left-0 right-0 text-center">
               <p className="text-white font-black uppercase tracking-[0.4em] text-xs animate-pulse">Scanning AgriChain QR Network...</p>
            </div>
          </div>
        </div>
      )}

      {/* Loading States */}
      {(loading || analyzingFile) && (
        <div className="flex flex-col items-center justify-center py-40 animate-spring">
          <div className="relative">
             <div className="absolute inset-0 rounded-full border-4 border-green-500/20 scale-150 animate-ping"></div>
             <Loader2 className="animate-spin h-32 w-32 text-green-600" strokeWidth={3} />
             <div className="absolute inset-0 flex items-center justify-center">
                {analyzingFile ? <FileSearch size={32} className="text-green-500" /> : <Layers size={32} className="text-green-500" />}
             </div>
          </div>
          <p className="mt-10 text-gray-900 font-black text-4xl uppercase tracking-tighter">
            {analyzingFile ? 'Analyzing Manifest...' : 'Querying Registry...'}
          </p>
          <p className="text-gray-400 font-bold uppercase tracking-[0.3em] text-[10px] mt-2 italic">Verifying blockchain synchronization</p>
        </div>
      )}

      {/* Trace Results */}
      {traceData && (
        <div className="space-y-20 animate-spring pb-40">
          {/* Header Summary Card */}
          <div className="bg-white rounded-[5rem] p-12 lg:p-20 border border-gray-100 shadow-3xl flex flex-col lg:flex-row gap-16 items-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-green-500/5 blur-[120px] rounded-full"></div>
            <div className="relative w-72 h-72 bg-gray-50 rounded-[4.5rem] flex items-center justify-center border-4 border-dashed border-gray-200 group transition-all hover:border-green-500">
              <QrCode size={160} className="text-green-600 group-hover:scale-110 transition-transform duration-500" />
              <div className="absolute -bottom-4 bg-green-600 text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">Immutability Lock</div>
            </div>
            <div className="flex-grow space-y-8 text-center lg:text-left">
              <div className="space-y-4">
                <span className="text-xs font-black uppercase text-green-600 tracking-[0.5em] bg-green-50 px-6 py-2 rounded-full border border-green-100">Origin Batch Verified</span>
                <h3 className="text-7xl lg:text-9xl font-black text-gray-900 tracking-tighter uppercase leading-none">{traceData.batch.crop}</h3>
              </div>
              <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                 <div className="bg-gray-900 px-10 py-5 rounded-3xl flex items-center space-x-4 shadow-xl">
                   <Navigation size={24} className="text-green-500" />
                   <span className="font-mono text-2xl font-black text-white">#{traceData.batch.id}</span>
                 </div>
                 <div className="bg-green-50 px-10 py-5 rounded-3xl border border-green-100 flex items-center space-x-4 text-green-700">
                   <ShieldCheck size={24} />
                   <span className="font-black uppercase text-xs tracking-widest">Protocol Sealed</span>
                 </div>
              </div>
            </div>
          </div>

          {/* Timeline Link Formation */}
          <div className="relative max-w-6xl mx-auto pl-12 lg:pl-0">
            {/* The "Link" Line */}
            <div className="absolute left-6 lg:left-1/2 top-0 bottom-0 w-2 bg-gradient-to-b from-green-500 via-blue-500 to-indigo-500 opacity-20 -translate-x-1/2 rounded-full"></div>

            <div className="space-y-24">
              {traceData.events.map((event, idx) => (
                <div key={event.id} className={`relative flex flex-col ${idx % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-12 group`}>
                  
                  {/* Timeline Dot */}
                  <div className={`absolute left-6 lg:left-1/2 top-10 w-12 h-12 -translate-x-1/2 z-10 rounded-full border-8 border-white shadow-2xl transition-all duration-500 group-hover:scale-125 ${getRoleColor(event.role)}`}>
                    <div className="absolute inset-0 bg-white/40 animate-ping rounded-full"></div>
                  </div>

                  {/* Card Panel */}
                  <div className={`w-full lg:w-[45%] bg-white p-12 rounded-[4rem] border border-gray-100 shadow-2xl relative overflow-hidden group-hover:shadow-[0_60px_100px_-20px_rgba(0,0,0,0.1)] transition-all duration-500 ${idx % 2 === 0 ? 'lg:text-right' : 'lg:text-left'}`}>
                    
                    <div className={`flex items-center gap-6 mb-10 ${idx % 2 === 0 ? 'lg:justify-end' : 'lg:justify-start'}`}>
                      <div className="order-1">
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-[0.4em] block mb-1 italic">Verified Node</span>
                        <h4 className="font-black text-2xl text-gray-900 leading-none">{event.userName}</h4>
                      </div>
                      <div className={`p-5 rounded-[2rem] bg-gray-50 border border-gray-100 ${idx % 2 === 0 ? 'lg:order-2' : 'lg:order-first'}`}>
                        {getRoleIcon(event.role)}
                      </div>
                    </div>

                    <div className="mb-10">
                      <h5 className="text-4xl lg:text-5xl font-black text-gray-900 tracking-tighter uppercase leading-tight mb-3">{event.details.action}</h5>
                      <div className={`flex items-center gap-3 text-gray-400 ${idx % 2 === 0 ? 'lg:justify-end' : 'lg:justify-start'}`}>
                        <Calendar size={18} />
                        <span className="text-xs font-bold uppercase tracking-widest">{new Date(event.timestamp).toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Data Visualization Section */}
                    <div className="space-y-6 pt-10 border-t border-gray-100">
                      
                      {/* GPS Precision */}
                      <div className={`flex flex-col ${idx % 2 === 0 ? 'lg:items-end' : 'lg:items-start'} space-y-3`}>
                        <div className="flex items-center space-x-3 text-blue-600">
                          <MapPin size={18} />
                          <span className="text-[10px] font-black uppercase tracking-[0.3em]">GPS Spatial Precision</span>
                        </div>
                        <div className="flex items-center space-x-3 bg-blue-50/70 p-4 rounded-[2rem] border border-blue-100/50 w-full lg:w-fit">
                           <div className="px-4 border-r border-blue-200">
                              <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Latitude</p>
                              <p className="font-mono font-black text-lg text-blue-800">{event.latitude ? event.latitude.toFixed(7) : '---.---'}</p>
                           </div>
                           <div className="px-4">
                              <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest">Longitude</p>
                              <p className="font-mono font-black text-lg text-blue-800">{event.longitude ? event.longitude.toFixed(7) : '---.---'}</p>
                           </div>
                        </div>
                      </div>

                      {/* Cryptographic Hashes */}
                      <div className={`flex flex-col ${idx % 2 === 0 ? 'lg:items-end' : 'lg:items-start'} space-y-4 mt-6`}>
                        <div className="flex items-center space-x-3 text-emerald-600">
                          <Cpu size={18} />
                          <span className="text-[10px] font-black uppercase tracking-[0.3em]">Ledger Integrity Hashes</span>
                        </div>
                        <div className="w-full space-y-3">
                           {/* Data Hash */}
                           <div 
                            onClick={() => handleCopy(event.dataHash)}
                            className="group/hash flex items-center justify-between bg-gray-900 text-white/50 hover:text-white px-6 py-4 rounded-2xl transition-all cursor-pointer font-mono text-[10px]"
                           >
                             <div className="flex items-center space-x-3 overflow-hidden">
                               <Hash size={14} className="flex-shrink-0 text-emerald-500" />
                               <span className="truncate">DATA: {event.dataHash}</span>
                             </div>
                             {copiedHash === event.dataHash ? <Check size={14} className="text-green-500" /> : <Copy size={14} className="opacity-0 group-hover/hash:opacity-100 flex-shrink-0" />}
                           </div>
                           {/* Block Tx Hash */}
                           <div className="flex items-center justify-between bg-emerald-950 text-emerald-400 px-6 py-4 rounded-2xl font-mono text-[10px] border border-emerald-900 shadow-inner">
                             <div className="flex items-center space-x-3 overflow-hidden">
                               <ShieldCheck size={14} className="flex-shrink-0" />
                               <span className="truncate">BLOCK_TX: {event.txHash}</span>
                             </div>
                             <ExternalLink size={14} className="flex-shrink-0 cursor-pointer hover:scale-125 transition-transform" />
                           </div>
                        </div>
                      </div>
                    </div>

                    {/* Role BG Overlay */}
                    <div className="absolute -bottom-12 -right-6 text-[12rem] font-black text-gray-900 opacity-[0.03] select-none pointer-events-none italic tracking-tighter">
                       {event.role}
                    </div>
                  </div>

                  <div className="hidden lg:block lg:w-[45%]"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {errorType !== 'NONE' && (
        <div className="text-center py-20 animate-spring">
          <div className="bg-red-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-10 text-red-500 border border-red-100 shadow-xl shadow-red-900/5">
            <Activity size={48} className="animate-pulse" />
          </div>
          <h3 className="text-5xl font-black text-gray-900 uppercase tracking-tighter">Chain Disconnected</h3>
          <p className="text-gray-400 mt-4 font-bold uppercase tracking-widest text-xs max-w-sm mx-auto leading-relaxed">
            {errorType === 'NOT_FOUND' ? 'The requested asset registry ID could not be located in the current decentralized state.' : 'Verification signal lost. Please check lighting conditions or manifest clarity.'}
          </p>
          <button 
            onClick={() => { setErrorType('NONE'); setSearchInput(''); setTraceData(null); }}
            className="mt-14 bg-gray-900 text-white px-16 py-6 rounded-[2rem] font-black uppercase text-xs tracking-widest hover:bg-black transition-all active:scale-95 shadow-2xl"
          >
            Reconnect Protocol Query
          </button>
        </div>
      )}

      <style>{`
        @keyframes spring-reveal {
          0% { opacity: 0; transform: translateY(60px) scale(0.9); filter: blur(10px); }
          100% { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        .animate-spring { animation: spring-reveal 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        
        .shadow-3xl {
          box-shadow: 0 50px 120px -20px rgba(0,0,0,0.18);
        }

        @keyframes scan-line {
          0% { top: 0; }
          100% { top: 100%; }
        }
        .animate-scan-line {
          animation: scan-line 2s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default CustomerTrace;
