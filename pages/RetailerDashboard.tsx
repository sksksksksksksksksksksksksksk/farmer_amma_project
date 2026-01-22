
import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, UserRole, BatchEvent } from '../types';
import { dbService } from '../services/dbService';
import { blockchainService } from '../services/blockchainService';
import { Store, CheckCircle, Camera, Navigation, Loader2, MapPin, Radio, ShieldCheck, Search, Scan, Upload } from 'lucide-react';
import { Html5Qrcode } from 'https://esm.sh/html5-qrcode';

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
        null,
        { enableHighAccuracy: true }
      );
    }

    const startScanner = async () => {
      try {
        const html5QrCode = new Html5Qrcode("retail-scanner");
        scannerRef.current = html5QrCode;
        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 20, qrbox: 250 },
          (text) => {
            const id = parseQrContent(text);
            if (id) { setBatchId(id); setScanHighlight(true); setTimeout(() => setScanHighlight(false), 1000); }
          },
          () => {}
        );
        setCameraActive(true);
      } catch (err) { setCameraActive(false); }
    };
    startScanner();
    return () => { if (scannerRef.current) scannerRef.current.stop(); };
  }, []);

  const handleReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Capture fresh location
      const pos: any = await new Promise((res, rej) => 
        navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 5000 })
      );
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;

      const timestamp = Date.now();
      const eventData = { batchId, shelfLocation, lat, lng, type: 'RETAIL' };
      const dataHash = blockchainService.generateDataHash(eventData);
      const txHash = await blockchainService.submitToBlockchain(dataHash);

      const event: BatchEvent = {
        id: Math.random().toString(36).substr(2, 9),
        batchId,
        role: UserRole.RETAILER,
        userName: user.name,
        timestamp,
        latitude: lat,
        longitude: lng,
        details: { action: 'Reception Verified', shelfLocation, gpsSeal: `${lat}, ${lng}` },
        dataHash,
        txHash
      };

      await dbService.addEvent(event);
      onTrace(batchId);
    } catch (err: any) {
      alert("GPS proof required to accept shipment.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-spring pb-20">
      <div className="flex justify-between items-end border-b border-gray-100 pb-8">
        <div>
          <h1 className="text-5xl font-black text-gray-900 tracking-tighter uppercase leading-none mb-3">Retail Node</h1>
          <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Merchant: {user.name}</p>
        </div>
        <div className="flex items-center space-x-4">
           <div className={`px-4 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest ${location ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600 animate-pulse'}`}>
              <MapPin size={12} className="inline mr-2" /> <span>{location ? 'Store Verified' : 'Locating...'}</span>
           </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-5 gap-10">
        <div className={`lg:col-span-3 bg-gray-900 rounded-[4rem] relative overflow-hidden flex items-center justify-center min-h-[500px] border-4 transition-all ${scanHighlight ? 'border-indigo-500' : 'border-gray-800'}`}>
          <div id="retail-scanner" className="absolute inset-0 w-full h-full [&_video]:object-cover opacity-70"></div>
          {!scanHighlight && <div className="absolute left-0 w-full h-0.5 bg-indigo-400 shadow-[0_0_20px_#818cf8] animate-scan top-0"></div>}
        </div>

        <div className="lg:col-span-2 bg-white p-12 rounded-[4rem] shadow-2xl border border-gray-100">
          <div className="flex items-center space-x-5 mb-10">
            <div className="bg-indigo-600 p-5 rounded-3xl text-white shadow-xl shadow-indigo-100"> <Store size={36} /> </div>
            <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter leading-none">Reception</h2>
          </div>

          <form onSubmit={handleReceive} className="space-y-8">
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mb-3 ml-2">Shipment ID</label>
              <input required value={batchId} onChange={(e) => setBatchId(e.target.value.toUpperCase())} className="w-full px-8 py-7 bg-gray-50 rounded-[2.2rem] font-black text-2xl tracking-widest outline-none border-2 border-transparent focus:border-indigo-500 transition-all" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.4em] mb-3 ml-2">Shelf Slot</label>
              <input required value={shelfLocation} onChange={(e) => setShelfLocation(e.target.value)} className="w-full px-8 py-6 bg-gray-50 rounded-[1.8rem] font-bold text-gray-800 outline-none" />
            </div>
            <button type="submit" disabled={loading || !batchId} className="w-full bg-indigo-600 text-white py-9 rounded-[3rem] font-black uppercase text-xl hover:bg-indigo-700 transition-all shadow-2xl disabled:opacity-30 btn-wow">
              {loading ? <Loader2 className="animate-spin mx-auto" /> : 'ACCEPT SHIPMENT + GPS'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RetailerDashboard;
