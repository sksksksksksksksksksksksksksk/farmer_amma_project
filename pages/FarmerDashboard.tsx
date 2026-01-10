
import React, { useState, useEffect } from 'react';
import { UserProfile, Batch, UserRole, BatchEvent } from '../types';
import { dbService } from '../services/dbService';
import { blockchainService } from '../services/blockchainService';
import { Plus, CheckCircle2, ChevronRight, QrCode, X, Download, Printer, ShieldCheck, Copy, Check, Share2, Leaf, ExternalLink } from 'lucide-react';

interface FarmerDashboardProps {
  user: UserProfile;
  onTrace: (id: string) => void;
}

const FarmerDashboard: React.FC<FarmerDashboardProps> = ({ user, onTrace }) => {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedBatchQR, setSelectedBatchQR] = useState<Batch | null>(null);
  const [copied, setCopied] = useState(false);
  const [formData, setFormData] = useState({
    crop: '',
    seedType: '',
    quantity: '',
    location: '',
  });

  useEffect(() => {
    setBatches(dbService.getBatches().filter(b => b.farmerId === user.uid));
  }, [user.uid]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const batchId = Math.random().toString(36).substr(2, 6).toUpperCase() + '-' + Math.floor(1000 + Math.random() * 9000);
      const newBatch: Batch = {
        id: batchId,
        farmerId: user.uid,
        crop: formData.crop,
        seedType: formData.seedType,
        quantity: formData.quantity,
        location: formData.location,
        harvestDate: new Date().toISOString(),
        createdAt: Date.now(),
      };

      await dbService.createBatch(newBatch);

      let lat = null, lng = null;
      try {
        const pos: any = await new Promise((res, rej) => 
          navigator.geolocation.getCurrentPosition(res, rej, { timeout: 5000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch (err) {
        console.warn("Geolocation failed", err);
      }

      const eventData = { ...newBatch, lat, lng, type: 'ORIGIN' };
      const dataHash = blockchainService.generateDataHash(eventData);
      const txHash = await blockchainService.submitToBlockchain(dataHash);

      const genesisEvent: BatchEvent = {
        id: Math.random().toString(36).substr(2, 9),
        batchId,
        role: UserRole.FARMER,
        userName: user.name,
        timestamp: Date.now(),
        latitude: lat,
        longitude: lng,
        details: { action: 'Harvest & Registration', crop: formData.crop },
        dataHash,
        txHash
      };

      await dbService.addEvent(genesisEvent);
      
      setBatches([newBatch, ...batches]);
      setShowForm(false);
      setFormData({ crop: '', seedType: '', quantity: '', location: '' });
      setSelectedBatchQR(newBatch);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadQR = async (batch: Batch) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(window.location.origin + '/#trace/' + batch.id)}`;
    try {
      const response = await fetch(qrUrl);
      if (!response.ok) throw new Error('Download failed');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = url;
      link.download = `AgriChain_Manifest_${batch.crop}_${batch.id}.png`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
    } catch (error) {
      console.error('QR Download Error:', error);
      window.open(qrUrl, '_blank');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-12 pb-24">
      {/* Hidden Print Manifest Template */}
      <div id="print-label" className="hidden print:block print:p-20 bg-white">
        {selectedBatchQR && (
          <div className="border-[12px] border-black p-16 text-center space-y-12">
            <h1 className="text-7xl font-black uppercase tracking-tighter italic">AGRICHAIN</h1>
            <div className="flex justify-center py-10">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=600x600&data=${encodeURIComponent(window.location.origin + '/#trace/' + selectedBatchQR.id)}`}
                className="w-[450px] h-[450px]"
                alt="QR Code"
              />
            </div>
            <div className="space-y-6">
              <h2 className="text-6xl font-black uppercase text-black">{selectedBatchQR.crop}</h2>
              <p className="text-4xl font-mono font-black border-2 border-black inline-block px-8 py-4">ID: {selectedBatchQR.id}</p>
              <div className="grid grid-cols-2 text-2xl font-bold pt-8">
                 <p className="text-left">ORIGIN: {selectedBatchQR.location}</p>
                 <p className="text-right">DATE: {new Date(selectedBatchQR.harvestDate).toLocaleDateString()}</p>
              </div>
            </div>
            <p className="text-lg font-black uppercase tracking-[0.5em] border-t-4 border-black pt-12">DECENTRALIZED PROVENANCE SEAL</p>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div className="animate-spring">
          <h1 className="text-6xl font-black text-gray-900 tracking-tighter uppercase mb-2">Inventory</h1>
          <p className="text-green-600 font-black uppercase tracking-[0.3em] text-[10px] bg-green-50 px-4 py-1.5 rounded-full border border-green-100">Genesis Node: {user.name}</p>
        </div>
        <button 
          onClick={() => setShowForm(!showForm)}
          className="bg-green-600 text-white px-12 py-6 rounded-[2.5rem] font-black flex items-center space-x-4 hover:bg-green-700 transition-all shadow-2xl shadow-green-200 active:scale-95 group"
        >
          <Plus size={28} className="group-hover:rotate-90 transition-transform duration-300" />
          <span className="text-xl uppercase tracking-tight">Register New Crop</span>
        </button>
      </div>

      {showForm && (
        <div className="bg-white glass-card p-14 rounded-[4.5rem] border border-gray-100 shadow-[0_60px_100px_-20px_rgba(0,0,0,0.1)] animate-spring relative overflow-hidden">
          <div className="mb-14 flex items-center space-x-6">
             <div className="bg-green-600 p-5 rounded-[2rem] text-white shadow-xl shadow-green-200">
                <Leaf size={36} />
             </div>
             <div>
                <h2 className="text-4xl font-black text-gray-900 uppercase tracking-tighter">New Manifest</h2>
                <p className="text-gray-400 font-bold text-sm tracking-widest uppercase">Initializing Distributed Entry...</p>
             </div>
          </div>
          
          <form onSubmit={handleCreate} className="grid md:grid-cols-2 gap-12">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] ml-2">Crop Variety</label>
              <input 
                required
                className="w-full px-10 py-7 border-2 border-transparent focus:border-green-500 bg-gray-50 rounded-[2.2rem] outline-none transition-all font-black text-2xl shadow-inner placeholder:text-gray-200" 
                placeholder="e.g. Tomato"
                value={formData.crop}
                onChange={(e) => setFormData({...formData, crop: e.target.value})}
              />
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] ml-2">Seed Protocol</label>
              <input 
                required
                className="w-full px-10 py-7 border-2 border-transparent focus:border-green-500 bg-gray-50 rounded-[2.2rem] outline-none transition-all font-black text-2xl shadow-inner placeholder:text-gray-200" 
                placeholder="e.g. Heirloom"
                value={formData.seedType}
                onChange={(e) => setFormData({...formData, seedType: e.target.value})}
              />
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] ml-2">Estimated Yield</label>
              <input 
                required
                className="w-full px-10 py-7 border-2 border-transparent focus:border-green-500 bg-gray-50 rounded-[2.2rem] outline-none transition-all font-black text-2xl shadow-inner placeholder:text-gray-200" 
                placeholder="e.g. 500 KG"
                value={formData.quantity}
                onChange={(e) => setFormData({...formData, quantity: e.target.value})}
              />
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] ml-2">Farm Quadrant</label>
              <input 
                required
                className="w-full px-10 py-7 border-2 border-transparent focus:border-green-500 bg-gray-50 rounded-[2.2rem] outline-none transition-all font-black text-2xl shadow-inner placeholder:text-gray-200" 
                placeholder="e.g. North Plot"
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
              />
            </div>
            <div className="md:col-span-2 flex justify-end items-center space-x-12 mt-12 pt-12 border-t border-gray-50">
              <button type="button" onClick={() => setShowForm(false)} className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] hover:text-red-500 transition-colors">Abort</button>
              <button 
                type="submit" 
                disabled={loading}
                className="bg-gray-900 text-white px-20 py-7 rounded-[2.5rem] font-black text-2xl hover:bg-black transition-all shadow-2xl active:scale-95 btn-wow"
              >
                {loading ? 'HASHING...' : 'SEAL RECORD'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-12">
        {batches.map((batch, idx) => (
          <div key={batch.id} className={`bg-white rounded-[4rem] border border-gray-100 overflow-hidden shadow-xl hover:shadow-[0_40px_80px_-15px_rgba(0,0,0,0.12)] transition-all duration-700 group animate-spring stagger-${(idx % 4) + 1}`}>
            <div className="p-12">
              <div className="flex justify-between items-start mb-12">
                <div>
                  <h3 className="font-black text-4xl text-gray-900 uppercase tracking-tighter mb-2 group-hover:text-green-600 transition-colors leading-none">{batch.crop}</h3>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <p className="text-[10px] text-gray-400 font-black tracking-widest uppercase">CHAIN-ID: {batch.id}</p>
                  </div>
                </div>
                <div className="bg-green-50 p-4 rounded-3xl text-green-600 shadow-inner">
                  <CheckCircle2 size={32} />
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <button 
                  onClick={() => onTrace(batch.id)}
                  className="flex-grow py-7 bg-gray-900 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.3em] hover:bg-black transition-all shadow-xl active:scale-95"
                >
                  History
                </button>
                <button 
                  onClick={() => setSelectedBatchQR(batch)}
                  className="p-7 bg-green-50 text-green-600 rounded-[2rem] hover:bg-green-600 hover:text-white transition-all shadow-xl shadow-green-100/50 active:scale-95"
                >
                  <QrCode size={28} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* REINFORCED QR MANIFEST MODAL */}
      {selectedBatchQR && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-xl animate-in fade-in duration-500">
           <div className="absolute inset-0" onClick={() => setSelectedBatchQR(null)}></div>
           
           <div className="relative bg-white w-full max-w-2xl rounded-[5rem] shadow-[0_100px_200px_rgba(0,0,0,0.6)] overflow-hidden animate-spring flex flex-col max-h-[95vh]">
             
             {/* Header Section */}
             <div className="flex justify-between items-center px-14 py-10 bg-gray-50/50 border-b border-gray-100 flex-shrink-0">
                <div className="flex items-center space-x-5 text-green-600">
                   <ShieldCheck size={40} className="animate-pulse" />
                   <div>
                      <h2 className="text-3xl font-black uppercase tracking-tighter leading-none">AgriChain Seal</h2>
                      <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] mt-1">Verified Origin Asset</p>
                   </div>
                </div>
                <button 
                  onClick={() => setSelectedBatchQR(null)} 
                  className="p-5 bg-white rounded-3xl hover:bg-red-50 hover:text-red-500 text-gray-400 transition-all hover:rotate-90 shadow-sm border border-gray-100"
                >
                  <X size={32} />
                </button>
             </div>

             {/* Content Area with Custom Scrollbar */}
             <div className="p-14 overflow-y-auto flex-grow">
                <div className="flex flex-col items-center text-center">
                   
                   {/* Cinematic QR Container */}
                   <div className="relative mb-14 group/qr">
                      <div className="p-12 bg-white rounded-[5rem] border-[12px] border-green-600/5 shadow-[0_40px_80px_-15px_rgba(0,0,0,0.15)] group-hover/qr:scale-105 transition-all duration-700">
                         <img 
                           src={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(window.location.origin + '/#trace/' + selectedBatchQR.id)}`}
                           alt="QR"
                           className="w-64 h-64 sm:w-[22rem] sm:h-[22rem] mx-auto"
                         />
                      </div>
                      <div className="absolute -top-6 -left-6 w-20 h-20 border-t-[10px] border-l-[10px] border-green-500 rounded-tl-[3rem]"></div>
                      <div className="absolute -top-6 -right-6 w-20 h-20 border-t-[10px] border-r-[10px] border-green-500 rounded-tr-[3rem]"></div>
                      <div className="absolute -bottom-6 -left-6 w-20 h-20 border-b-[10px] border-l-[10px] border-green-500 rounded-bl-[3rem]"></div>
                      <div className="absolute -bottom-6 -right-6 w-20 h-20 border-b-[10px] border-r-[10px] border-green-500 rounded-br-[3rem]"></div>
                   </div>

                   {/* Information Block */}
                   <div className="mb-14 space-y-6">
                      <h3 className="text-7xl font-black text-gray-900 uppercase tracking-tighter leading-none mb-4">{selectedBatchQR.crop}</h3>
                      <div className="flex items-center justify-center space-x-4 bg-gray-50 px-12 py-6 rounded-[2.5rem] mx-auto border border-gray-100 w-fit shadow-inner group/copy">
                         <span className="font-mono text-gray-900 font-black tracking-[0.2em] text-xl">#{selectedBatchQR.id}</span>
                         <button onClick={() => handleCopyId(selectedBatchQR.id)} className="text-gray-300 hover:text-gray-900 transition-all">
                            {copied ? <Check size={32} className="text-green-600" /> : <Copy size={32} className="group-hover/copy:scale-110 transition-transform" />}
                         </button>
                      </div>
                   </div>

                   {/* CORE ACTION AREA - MUST BE VISIBLE */}
                   <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 w-full">
                      <button 
                        onClick={() => handleDownloadQR(selectedBatchQR)}
                        className="flex items-center justify-center space-x-5 bg-gray-900 text-white py-10 rounded-[3rem] font-black uppercase text-xl tracking-[0.2em] hover:bg-black transition-all active:scale-95 shadow-2xl hover:-translate-y-2 group/btn"
                      >
                         <Download size={36} className="group-hover/btn:translate-y-1 transition-transform" />
                         <span>Save Label</span>
                      </button>
                      <button 
                        onClick={handlePrint}
                        className="flex items-center justify-center space-x-5 bg-green-600 text-white py-10 rounded-[3rem] font-black uppercase text-xl tracking-[0.2em] hover:bg-green-700 transition-all active:scale-95 shadow-2xl shadow-green-100/50 hover:-translate-y-2 group/btn"
                      >
                         <Printer size={36} className="group-hover/btn:scale-110 transition-transform" />
                         <span>Print Manifest</span>
                      </button>
                   </div>
                   
                   <p className="mt-14 text-[10px] font-black text-gray-300 uppercase tracking-[0.6em] animate-pulse">
                      Distributed Ledger Signature • AgriChain Protocol
                   </p>
                </div>
             </div>
           </div>
        </div>
      )}

      <style>{`
        @media print {
          body * { visibility: hidden; }
          #print-label, #print-label * { visibility: visible !important; }
          #print-label { position: absolute; left: 0; top: 0; width: 100%; display: block !important; background: white !important; }
        }
      `}</style>
    </div>
  );
};

export default FarmerDashboard;
