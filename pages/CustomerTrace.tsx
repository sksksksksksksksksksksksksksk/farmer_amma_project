
import React, { useState, useEffect, useRef } from 'react';
import { TraceData, UserRole } from '../types';
import { dbService } from '../services/dbService';
import { Search, MapPin, Calendar, Clock, ShieldCheck, ExternalLink, QrCode, Truck, ShoppingCart, Loader2, Camera, X, Zap, Upload, AlertTriangle, Info, Database, History, RefreshCcw, CheckCircle, Image as ImageIcon } from 'lucide-react';
import { Html5Qrcode } from 'https://esm.sh/html5-qrcode';

interface CustomerTraceProps {
  batchId: string | null;
}

const CustomerTrace: React.FC<CustomerTraceProps> = ({ batchId: initialBatchId }) => {
  const [searchInput, setSearchInput] = useState('');
  const [traceData, setTraceData] = useState<TraceData | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorType, setErrorType] = useState<'NONE' | 'INVALID_ID' | 'NOT_FOUND' | 'SCAN_FAILED'>('NONE');
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [cameraPermissionStatus, setCameraPermissionStatus] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [scanningFile, setScanningFile] = useState(false);
  const [scanHighlight, setScanHighlight] = useState(false);
  
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
    setErrorType('NONE');
    setTraceData(null);
    
    try {
      await new Promise(r => setTimeout(r, 600));
      const data = await dbService.getTraceData(id);
      if (data) {
        setTraceData(data);
        setSearchInput(id);
      } else {
        const isValidFormat = /^[A-Z0-9]{4,}-[0-9]{4}$/.test(id) || id.length > 3;
        setErrorType(isValidFormat ? 'NOT_FOUND' : 'INVALID_ID');
      }
    } catch (err) {
      setErrorType('INVALID_ID');
    } finally {
      setLoading(false);
    }
  };

  const parseQrContent = (text: string) => {
    let id = text;
    // Handle URL formats
    if (text.includes('/#trace/')) {
      id = text.split('/#trace/')[1].split('?')[0];
    } else if (text.includes('trace=')) {
      id = text.split('trace=')[1].split('&')[0];
    } else if (text.startsWith('http')) {
      const parts = text.split('/');
      const lastPart = parts[parts.length - 1];
      id = lastPart;
    }
    return id.trim();
  };

  const startScanner = async () => {
    setIsScannerOpen(true);
    setCameraPermissionStatus('pending');
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      setCameraPermissionStatus('granted');
    } catch (err) {
      setCameraPermissionStatus('denied');
    }

    setTimeout(async () => {
      try {
        const html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;
        
        const qrCodeSuccessCallback = (decodedText: string) => {
          const id = parseQrContent(decodedText);
          if (id && id.length > 3) {
            setScanHighlight(true);
            setTimeout(() => {
              stopScanner();
              handleSearch(id.toUpperCase());
            }, 800);
          } else {
            setErrorType('SCAN_FAILED');
            stopScanner();
          }
        };

        const config = { fps: 20, qrbox: { width: 250, height: 250 } };
        await html5QrCode.start({ facingMode: "environment" }, config, qrCodeSuccessCallback, () => {});
      } catch (err) {
        setCameraPermissionStatus('denied');
      }
    }, 450);
  };

  const stopScanner = () => {
    setScanHighlight(false);
    if (scannerRef.current) {
      scannerRef.current.stop().then(() => {
        setIsScannerOpen(false);
        scannerRef.current = null;
      }).catch(() => {
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
    setErrorType('NONE');
    
    const html5QrCode = new Html5Qrcode("reader-hidden");
    try {
      // Simulate cryptographic matrix analysis
      await new Promise(r => setTimeout(r, 1200));
      const decodedText = await html5QrCode.scanFile(file, true);
      const id = parseQrContent(decodedText);
      setIsScannerOpen(false);
      handleSearch(id.toUpperCase());
    } catch (err) {
      console.error("Matrix Decode Failure:", err);
      setErrorType('SCAN_FAILED');
    } finally {
      setScanningFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-12 mb-20 relative">
      <div id="reader-hidden" className="hidden"></div>
      
      {/* Universal Hidden File Input */}
      <input 
        type="file" 
        accept="image/*" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
      />

      {!traceData && !loading && errorType === 'NONE' && (
        <div className="mb-16 text-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
          <div className="inline-flex items-center space-x-2 bg-green-50 px-5 py-2.5 rounded-2xl mb-10 border border-green-100 shadow-sm">
            <ShieldCheck className="text-green-600" size={20} />
            <span className="text-[11px] font-black uppercase tracking-[0.3em] text-green-700">Decentralized Trust Protocol</span>
          </div>
          <h2 className="text-7xl md:text-8xl font-black text-gray-900 mb-6 tracking-tighter uppercase leading-none">Trace Origins.</h2>
          <p className="text-gray-500 mb-16 text-2xl font-medium max-w-3xl mx-auto leading-relaxed italic opacity-80">Empowering consumers with real-time blockchain provenance data.</p>
          
          <div className="flex flex-col lg:flex-row items-stretch justify-center gap-8 max-w-6xl mx-auto mb-16">
            {/* Action 1: Live Scanner */}
            <button 
              onClick={startScanner} 
              className="flex-grow flex flex-col items-center justify-center space-y-6 bg-green-600 text-white p-14 rounded-[5rem] font-black uppercase hover:bg-green-700 transition-all shadow-2xl shadow-green-200 active:scale-95 group border-b-[12px] border-green-800"
            >
              <Camera size={72} className="group-hover:rotate-12 transition-transform duration-500" />
              <div className="text-center">
                <span className="text-3xl block tracking-tighter mb-1">Live Vision</span>
                <span className="text-[10px] opacity-60 tracking-[0.4em] font-bold">Launch Scanner</span>
              </div>
            </button>

            {/* Action 2: Image Analysis (Gallery Upload) */}
            <button 
              onClick={() => fileInputRef.current?.click()} 
              disabled={scanningFile}
              className={`flex-grow flex flex-col items-center justify-center space-y-6 bg-white text-gray-900 p-14 rounded-[5rem] font-black uppercase transition-all shadow-2xl border-2 border-gray-100 border-b-[12px] border-gray-200 active:scale-95 group relative overflow-hidden ${scanningFile ? 'cursor-wait' : 'hover:bg-gray-50'}`}
            >
              {scanningFile && <div className="absolute inset-0 bg-green-500/10 animate-pulse"></div>}
              {scanningFile ? (
                <Loader2 size={72} className="animate-spin text-green-600" />
              ) : (
                <ImageIcon size={72} className="text-green-600 group-hover:-translate-y-3 transition-transform duration-500" />
              )}
              <div className="text-center relative z-10">
                <span className="text-3xl block tracking-tighter mb-1">{scanningFile ? 'Analyzing...' : 'Verify from Photo'}</span>
                <span className="text-[10px] opacity-40 tracking-[0.4em] font-bold italic">Extract from Image</span>
              </div>
            </button>

            {/* Action 3: Manual ID Entry */}
            <div className="flex-grow flex flex-col items-center justify-center bg-gray-50 p-14 rounded-[5rem] border-2 border-gray-100 border-b-[12px] border-gray-200 shadow-xl">
               <div className="w-full flex items-center p-3 bg-white rounded-[3rem] shadow-sm border border-gray-100 focus-within:ring-[12px] focus-within:ring-green-50 transition-all">
                  <input 
                    value={searchInput} 
                    onChange={(e) => setSearchInput(e.target.value)} 
                    onKeyPress={(e) => e.key === 'Enter' && handleSearch(searchInput.toUpperCase())}
                    className="flex-grow px-8 py-5 rounded-2xl outline-none font-mono tracking-widest uppercase text-2xl text-green-600 font-black placeholder:text-gray-200 w-full" 
                    placeholder="BATCH-ID" 
                  />
                  <button 
                    onClick={() => handleSearch(searchInput.toUpperCase())}
                    className="bg-gray-900 text-white p-7 rounded-[2.5rem] hover:bg-black transition-all shadow-xl active:scale-95 group/search"
                  > 
                    <Search size={32} className="group-hover/search:scale-110 transition-transform" /> 
                  </button>
               </div>
               <p className="mt-8 text-[11px] font-black text-gray-300 uppercase tracking-[0.6em] italic">Direct Node Query</p>
            </div>
          </div>
        </div>
      )}

      {isScannerOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/95 backdrop-blur-3xl animate-in fade-in duration-300">
          <div className="absolute inset-0 z-0" onClick={stopScanner}></div>
          <div className={`relative z-10 bg-gray-900 w-full max-w-lg rounded-[4.5rem] overflow-hidden shadow-[0_50px_100px_rgba(0,0,0,1)] border transition-all duration-500 flex flex-col animate-spring ${scanHighlight ? 'border-green-500 scale-[1.03]' : 'border-white/10'}`}>
            
            <div className="p-10 border-b border-white/5 flex justify-between items-center bg-black/40 flex-shrink-0">
               <div className="flex items-center space-x-4 text-green-400">
                 <Zap size={28} className="animate-pulse" />
                 <div>
                    <h3 className="text-white font-black uppercase tracking-[0.2em] text-sm italic leading-none">{scanHighlight ? 'Locked On Code' : 'Agri-Vision Feed'}</h3>
                    <p className="text-[8px] font-black uppercase tracking-[0.4em] mt-1 opacity-60">Matrix Capture Mode</p>
                 </div>
               </div>
               <button onClick={stopScanner} className="p-5 bg-white/5 rounded-3xl text-gray-400 hover:text-white transition-all hover:bg-white/10 active:scale-90"> <X size={36} /> </button>
            </div>
            
            <div className="relative flex-grow bg-black overflow-hidden">
               {cameraPermissionStatus === 'denied' ? (
                 <div className="absolute inset-0 flex flex-col items-center justify-center p-14 text-center text-white space-y-8">
                    <AlertTriangle size={80} className="text-orange-500 animate-bounce" />
                    <h4 className="text-3xl font-black uppercase tracking-tighter">Permission Blocked</h4>
                    <button onClick={startScanner} className="w-full bg-green-600 text-white py-6 rounded-3xl font-black text-lg uppercase tracking-widest shadow-2xl transition-all active:scale-95">Retry Permission</button>
                 </div>
               ) : (
                 <div className="relative aspect-square">
                   <div id="reader" className="w-full h-full [&_video]:object-cover"></div>
                   <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center p-12">
                      <div className={`relative w-full aspect-square border-2 rounded-[4rem] transition-all duration-500 ${scanHighlight ? 'border-green-500 bg-green-500/10' : 'border-green-500/20'}`}>
                         <div className={`absolute -top-3 -left-3 w-20 h-20 border-t-8 border-l-8 rounded-tl-3xl shadow-[0_0_30px_#22c55e] transition-colors ${scanHighlight ? 'border-white' : 'border-green-500'}`}></div>
                         <div className={`absolute -top-3 -right-3 w-20 h-20 border-t-8 border-r-8 rounded-tr-3xl shadow-[0_0_30px_#22c55e] transition-colors ${scanHighlight ? 'border-white' : 'border-green-500'}`}></div>
                         <div className={`absolute -bottom-3 -left-3 w-20 h-20 border-b-8 border-l-8 rounded-bl-3xl shadow-[0_0_30px_#22c55e] transition-colors ${scanHighlight ? 'border-white' : 'border-green-500'}`}></div>
                         <div className={`absolute -bottom-3 -right-3 w-20 h-20 border-b-8 border-r-8 rounded-br-3xl shadow-[0_0_30px_#22c55e] transition-colors ${scanHighlight ? 'border-white' : 'border-green-500'}`}></div>
                         {scanHighlight && <div className="absolute inset-0 flex items-center justify-center animate-ping text-white"><CheckCircle size={80} /></div>}
                      </div>
                      {!scanHighlight && <div className="absolute left-0 w-full h-1.5 bg-green-500 shadow-[0_0_40px_#22c55e] animate-scan top-0 z-20"></div>}
                   </div>
                 </div>
               )}
            </div>

            <div className="p-12 bg-black/80 text-center flex-shrink-0">
               <div className="space-y-10">
                  <div className="flex flex-col sm:flex-row gap-5">
                    <button onClick={() => fileInputRef.current?.click()} className="flex-grow flex items-center justify-center space-x-4 bg-white/10 border border-white/10 text-white py-7 rounded-[2.5rem] font-black uppercase text-sm tracking-widest hover:bg-white/20 transition-all disabled:opacity-50" disabled={scanningFile}>
                      {scanningFile ? <Loader2 size={24} className="animate-spin text-green-400" /> : <Upload size={24} className="text-green-500" />}
                      <span>{scanningFile ? 'Analyzing...' : 'Scan from Photo'}</span>
                    </button>
                    <button onClick={stopScanner} className="sm:w-24 bg-red-500/10 text-red-500 p-7 rounded-[2.5rem] hover:bg-red-500 hover:text-white transition-all"> <X size={28} /> </button>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center py-32 animate-in fade-in duration-500">
          <Loader2 className="animate-spin h-32 w-32 text-green-600 mx-auto" />
          <p className="mt-12 text-gray-900 font-black text-4xl tracking-tighter uppercase animate-pulse">Consulting Ledger...</p>
        </div>
      )}

      {errorType !== 'NONE' && !loading && (
        <div className="bg-white p-20 rounded-[5rem] border border-gray-100 text-center shadow-3xl animate-in zoom-in duration-500 max-w-2xl mx-auto">
          <div className={`w-32 h-32 mx-auto mb-12 rounded-[3.5rem] flex items-center justify-center shadow-2xl ${errorType === 'NOT_FOUND' ? 'bg-orange-50 text-orange-500' : 'bg-red-50 text-red-500'}`}>
            {errorType === 'NOT_FOUND' ? <Database size={72} /> : <AlertTriangle size={72} />}
          </div>
          <h4 className="text-gray-900 font-black text-5xl tracking-tighter uppercase mb-6">{errorType === 'NOT_FOUND' ? 'Ledger Miss' : 'Verification Error'}</h4>
          <p className="text-gray-500 font-medium mb-14 text-xl leading-relaxed">
            {errorType === 'SCAN_FAILED' ? "The matrix in the uploaded image could not be verified. Please ensure the QR code is clear and not obscured." : "The ID provided could not be matched with any blockchain entry."}
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
             <button onClick={() => fileInputRef.current?.click()} className="bg-green-600 text-white px-12 py-8 rounded-[3rem] font-black uppercase text-lg hover:bg-green-700 transition-all shadow-2xl flex items-center justify-center space-x-4"> <Upload size={28} /> <span>Try Different Photo</span> </button>
             <button onClick={() => { setErrorType('NONE'); setSearchInput(''); }} className="bg-gray-100 text-gray-500 px-10 py-8 rounded-[3rem] font-black uppercase text-xs tracking-widest">Back to Discovery</button>
          </div>
        </div>
      )}

      {traceData && !loading && (
        <div className="space-y-16 animate-in slide-in-from-bottom-12 duration-1000">
          <div className="bg-white rounded-[5rem] p-16 border border-gray-50 shadow-3xl overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-16">
              <div className="bg-emerald-600 text-white px-8 py-4 rounded-[2rem] text-xs font-black flex items-center space-x-3 shadow-2xl">
                <ShieldCheck size={24} /> <span className="uppercase tracking-[0.4em]">Verified Batch</span>
              </div>
            </div>
            <div className="flex flex-col lg:flex-row gap-20 items-center">
              <div className="w-full lg:w-80 h-80 bg-gray-50 rounded-[5rem] flex items-center justify-center border-4 border-dashed border-gray-100"> <QrCode size={160} className="text-emerald-600" /> </div>
              <div className="flex-grow text-center lg:text-left">
                <span className="inline-block px-6 py-2 bg-emerald-50 text-emerald-700 text-xs font-black rounded-2xl uppercase tracking-[0.5em] mb-8">Node: {traceData.batch.id}</span>
                <h3 className="text-8xl font-black text-gray-900 mb-4 tracking-tighter uppercase leading-none">{traceData.batch.crop}</h3>
                <p className="text-4xl text-emerald-500 font-bold mb-14 italic opacity-90">{traceData.batch.seedType}</p>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-12 border-t border-gray-100 pt-14 text-left">
                  <div><span className="text-xs text-gray-400 block font-black tracking-widest mb-3 uppercase">Net Weight</span><span className="text-3xl text-gray-900 font-black tracking-tighter">{traceData.batch.quantity}</span></div>
                  <div><span className="text-xs text-gray-400 block font-black tracking-widest mb-3 uppercase">Origin</span><span className="text-3xl text-gray-900 font-black tracking-tighter">{traceData.batch.location}</span></div>
                  <div><span className="text-xs text-gray-400 block font-black tracking-widest mb-3 uppercase">Genesis</span><span className="text-3xl text-gray-900 font-black tracking-tighter">{new Date(traceData.batch.harvestDate).toLocaleDateString()}</span></div>
                  <div><span className="text-xs text-gray-400 block font-black tracking-widest mb-3 uppercase">Status</span><span className="text-3xl text-emerald-600 font-black tracking-tighter uppercase">Final</span></div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative pt-10">
            <div className="flex items-center justify-between mb-24 px-10">
              <h4 className="text-5xl font-black text-gray-900 tracking-tighter uppercase leading-none">Blockchain Audit Trail</h4>
              <div className="flex items-center space-x-4 bg-gray-50 px-8 py-4 rounded-full border border-gray-100">
                <div className="w-4 h-4 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_15px_#10b981]"></div>
                <span className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] italic">Network Health: 100%</span>
              </div>
            </div>
            
            <div className="space-y-32 relative before:absolute before:left-16 before:top-4 before:bottom-4 before:w-3 before:bg-gradient-to-b before:from-emerald-500 before:via-blue-500 before:to-indigo-500 before:rounded-full">
              {traceData.events.map((event, idx) => (
                <div key={event.id} className={`relative pl-48 animate-in slide-in-from-left-20 duration-1000`} style={{ animationDelay: `${idx * 300}ms`, animationFillMode: 'both' }}>
                  <div className={`absolute left-0 top-0 w-32 h-32 bg-white rounded-[3.5rem] shadow-4xl border-[10px] flex items-center justify-center z-10 transition-all duration-1000 hover:scale-110 hover:-rotate-12
                    ${event.role === UserRole.FARMER ? 'border-emerald-500' : ''}
                    ${event.role === UserRole.DISTRIBUTOR ? 'border-blue-500' : ''}
                    ${event.role === UserRole.RETAILER ? 'border-indigo-500' : ''}
                  `}>
                    {event.role === UserRole.FARMER && <MapPin className="text-emerald-600" size={56} />}
                    {event.role === UserRole.DISTRIBUTOR && <Truck className="text-blue-600" size={56} />}
                    {event.role === UserRole.RETAILER && <ShoppingCart className="text-indigo-600" size={56} />}
                  </div>

                  <div className="bg-white/95 backdrop-blur-2xl p-14 rounded-[5rem] border border-white shadow-4xl hover:shadow-[0_80px_160px_-40px_rgba(0,0,0,0.15)] transition-all duration-700 group relative overflow-hidden text-left">
                    <div className="absolute top-0 right-0 p-12 opacity-5 font-black text-8xl uppercase tracking-tighter pointer-events-none">{event.role}</div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-12 gap-10 relative z-10">
                      <div>
                        <div className="flex items-center space-x-5 mb-4">
                           <span className={`px-6 py-2 rounded-2xl text-[11px] font-black uppercase tracking-[0.4em] shadow-sm
                             ${event.role === UserRole.FARMER ? 'bg-emerald-100 text-emerald-700' : ''}
                             ${event.role === UserRole.DISTRIBUTOR ? 'bg-blue-100 text-blue-700' : ''}
                             ${event.role === UserRole.RETAILER ? 'bg-indigo-100 text-indigo-700' : ''}
                           `}> Blockchain Node: {event.role} </span>
                           {event.details.automatedSync && <span className="bg-gray-900 text-white text-[10px] px-5 py-2 rounded-xl font-black uppercase tracking-[0.4em] flex items-center space-x-3"> <Zap size={14} className="text-emerald-400" /> <span>Automated</span> </span>}
                        </div>
                        <h5 className="text-5xl font-black text-gray-900 tracking-tighter leading-none uppercase italic group-hover:text-emerald-600 transition-all">{event.details.action}</h5>
                      </div>
                      <div className="bg-gray-50 px-10 py-6 rounded-[3rem] border border-gray-100 flex items-center space-x-6 shadow-inner">
                         <div className="text-right">
                           <p className="text-[11px] text-gray-400 font-black uppercase tracking-widest mb-1">Lock Time</p>
                           <p className="text-xl font-black text-gray-800 tracking-tight"> {new Date(event.timestamp).toLocaleDateString()} • {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} </p>
                         </div>
                         <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-gray-300 border border-gray-100"> <Clock size={32} /> </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10 mb-14 relative z-10">
                      {Object.entries(event.details).map(([key, value]) => {
                        if (key === 'action' || key === 'automatedSync') return null;
                        return (
                          <div key={key} className="bg-gray-50/50 p-8 rounded-[2.5rem] border border-gray-100/50 hover:bg-white transition-all group/node shadow-sm">
                            <span className="text-[11px] text-gray-400 capitalize font-black tracking-widest mb-3 block group-hover/node:text-emerald-500 transition-colors">{key.replace(/([A-Z])/g, ' $1')}</span>
                            <p className="text-2xl font-black text-gray-900 tracking-tighter">{String(value)}</p>
                          </div>
                        );
                      })}
                    </div>
                    <div className="pt-12 border-t border-gray-50 flex flex-col sm:flex-row items-center justify-between gap-10 relative z-10">
                      <div className="flex items-center space-x-6">
                        <div className="bg-emerald-100 p-4 rounded-3xl"> <ShieldCheck size={36} className="text-emerald-600" /> </div>
                        <div>
                           <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.4em] mb-1">Protocol Hash</p>
                           <p className="text-xs font-mono font-bold text-emerald-800/60 truncate max-w-[320px]">{event.txHash}</p>
                        </div>
                      </div>
                      <button onClick={(e) => { e.preventDefault(); alert(`BLOCKCHAIN AUDIT:\n\nPayload: ${JSON.stringify(event.details, null, 2)}\n\nHash: ${event.dataHash}\nTx: ${event.txHash}`); }} className="bg-gray-900 text-white px-12 py-6 rounded-[2.5rem] font-black uppercase text-sm hover:bg-black transition-all shadow-2xl flex items-center space-x-4">
                        <span>Audit Proofs</span> <ExternalLink size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-32 text-center pb-12">
               <button onClick={() => { setTraceData(null); setSearchInput(''); window.location.hash = '#landing'; }} className="inline-flex items-center space-x-4 bg-gray-50 text-gray-400 px-12 py-6 rounded-[3rem] font-black uppercase text-xs tracking-widest hover:bg-gray-900 hover:text-white transition-all shadow-xl group">
                 <RefreshCcw size={20} className="group-hover:rotate-180 transition-transform duration-1000" />
                 <span>Trace Another</span>
               </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes scan { 0% { top: 0%; } 50% { top: 100%; } 100% { top: 0%; } }
        .animate-scan { animation: scan 2.5s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default CustomerTrace;
