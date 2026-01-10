
import React, { useState } from 'react';
import { UserRole } from '../types';
import { authService } from '../services/authService';
import { ShieldCheck, QrCode, MapPin, Truck, UserPlus, LogIn, AlertCircle, Loader2, Leaf, ArrowRight, CheckCircle, Globe, Cpu, Camera, Search } from 'lucide-react';

interface LandingPageProps {
  onLogin: (email: string, role: UserRole) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.FARMER);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegistering) {
        if (!name || !email) throw new Error("Please fill in all fields.");
        const user = await authService.signup(name, email, role);
        onLogin(user.email, user.role);
      } else {
        if (!email) throw new Error("Please enter your email.");
        const user = await authService.login(email, role);
        onLogin(user.email, user.role);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const navigateToScan = () => {
    window.location.hash = '#trace';
  };

  return (
    <div className="relative min-h-[92vh] flex flex-col items-center justify-center py-10">
      {/* Dynamic Background Network */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <svg className="w-full h-full opacity-20" viewBox="0 0 1440 800" xmlns="http://www.w3.org/2000/svg">
          <circle cx="200" cy="200" r="4" fill="#16a34a" className="parallax-slow" />
          <circle cx="1200" cy="150" r="3" fill="#16a34a" className="parallax-fast" />
          <circle cx="600" cy="700" r="5" fill="#16a34a" className="parallax-slow" />
          <circle cx="1300" cy="600" r="4" fill="#16a34a" className="parallax-fast" />
          
          <path d="M200 200 L600 700" stroke="#16a34a" strokeWidth="1" fill="none" className="pulse-line" />
          <path d="M600 700 L1200 150" stroke="#16a34a" strokeWidth="1" fill="none" className="pulse-line" />
          <path d="M1200 150 L1300 600" stroke="#16a34a" strokeWidth="1" fill="none" className="pulse-line" />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto px-6 grid lg:grid-cols-2 gap-12 lg:gap-24 items-center relative z-10">
        {/* Cinematic Hero */}
        <div className="animate-spring">
          <div className="inline-flex items-center space-x-3 bg-green-50/80 backdrop-blur-md text-green-700 px-5 py-2.5 rounded-2xl mb-10 border border-green-100 shadow-xl shadow-green-900/5">
            <Globe size={20} className="animate-spin-slow" />
            <span className="text-xs font-black uppercase tracking-[0.2em]">Global Trust Protocol</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black text-gray-900 leading-[0.9] mb-10 tracking-tighter">
            AgriChain<br/>
            <span className="text-shimmer">Traceability.</span>
          </h1>
          
          <p className="text-2xl text-gray-500 mb-12 max-w-lg leading-relaxed font-medium">
            Bridging the distance from <span className="text-green-600 font-bold">field</span> to <span className="text-green-600 font-bold">fork</span> through decentralized proof of origin.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 mb-16">
            <button 
              onClick={navigateToScan}
              className="flex items-center justify-center space-x-4 bg-gray-900 text-white px-10 py-8 rounded-[2.5rem] font-black uppercase text-xl tracking-[0.1em] hover:bg-black transition-all shadow-2xl active:scale-95 group btn-wow"
            >
              <Camera size={32} className="group-hover:rotate-12 transition-transform" />
              <span>Consumer Scan</span>
            </button>
            
            <div className="flex items-center space-x-4 p-6 bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-50">
              <div className="bg-green-600 p-3 rounded-2xl text-white shadow-lg shadow-green-200">
                <ShieldCheck size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Security</p>
                <p className="font-bold text-gray-800">Blockchain Verified</p>
              </div>
            </div>
          </div>
        </div>

        {/* 3D Form Card */}
        <div className="animate-spring stagger-1">
          <div className="glass-card p-12 rounded-[3.5rem] relative overflow-hidden">
            {/* Animated accent light */}
            <div className="absolute -top-32 -right-32 w-80 h-80 bg-green-500/10 blur-[80px] rounded-full"></div>

            <div className="flex justify-between items-start mb-12">
              <div>
                <h2 className="text-4xl font-black text-gray-900 tracking-tighter mb-2">
                  {isRegistering ? 'New Node' : 'Identity Hub'}
                </h2>
                <div className="flex items-center space-x-2 text-green-600 font-bold text-sm">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                  <span>Secure Protocol Connection</span>
                </div>
              </div>
              <div className="bg-gray-900 p-5 rounded-[2rem] shadow-2xl rotate-3">
                {isRegistering ? <UserPlus className="text-white" size={28} /> : <LogIn className="text-white" size={28} />}
              </div>
            </div>

            {error && (
              <div className="mb-8 p-5 bg-red-50 border border-red-100 rounded-[1.5rem] flex items-center space-x-4 text-red-600 text-sm animate-bounce-short">
                <AlertCircle size={24} className="flex-shrink-0" />
                <p className="font-bold">{error}</p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {isRegistering && (
                <div className="animate-spring stagger-1">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-2">Entity Description</label>
                  <input 
                    type="text" 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Highlands Harvest Co."
                    className="w-full px-7 py-5 rounded-[1.5rem] border-2 border-transparent focus:border-green-500 bg-gray-50/50 text-gray-900 outline-none transition-all font-bold placeholder:text-gray-300 shadow-inner"
                    required={isRegistering}
                  />
                </div>
              )}

              <div className="animate-spring stagger-2">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-2">Secure Email Endpoint</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="verify@agrichain.net"
                  className="w-full px-7 py-5 rounded-[1.5rem] border-2 border-transparent focus:border-green-500 bg-gray-50/50 text-gray-900 outline-none transition-all font-bold placeholder:text-gray-300 shadow-inner"
                  required
                />
              </div>

              <div className="animate-spring stagger-3">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 ml-2">Network Assignment</label>
                <div className="relative">
                  <select 
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-7 py-5 rounded-[1.5rem] border-2 border-transparent focus:border-green-500 bg-gray-50/50 text-gray-900 outline-none transition-all font-black appearance-none cursor-pointer shadow-inner"
                  >
                    <option value={UserRole.FARMER}>Farmer (Genesis Node)</option>
                    <option value={UserRole.DISTRIBUTOR}>Logistics (Carrier Node)</option>
                    <option value={UserRole.RETAILER}>Market (Retail Node)</option>
                  </select>
                  <div className="absolute right-8 top-1/2 -translate-y-1/2 pointer-events-none text-green-600">
                    <ArrowRight size={20} className="rotate-90" />
                  </div>
                </div>
              </div>

              <div className="pt-6 animate-spring stagger-4">
                <button 
                  type="submit"
                  disabled={loading}
                  className="w-full btn-wow bg-green-600 text-white py-6 rounded-[2rem] font-black text-xl hover:bg-green-700 transition-all shadow-2xl shadow-green-200 flex items-center justify-center space-x-3 disabled:opacity-70 active:scale-[0.97] duration-300"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={28} />
                      <span className="uppercase tracking-widest text-sm">Authenticating Node...</span>
                    </>
                  ) : (
                    <>
                      <span>{isRegistering ? 'INITIALIZE NODE' : 'ACCESS DASHBOARD'}</span>
                      <ShieldCheck size={24} />
                    </>
                  )}
                </button>
              </div>
            </form>

            <div className="mt-10 text-center">
              <button 
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setError(null);
                }}
                className="text-xs font-black text-green-600 hover:text-green-700 uppercase tracking-[0.2em] py-4 px-8 rounded-2xl hover:bg-green-50 transition-all active:scale-95"
              >
                {isRegistering 
                  ? 'Switch to Established Login' 
                  : 'Register a New Protocol ID'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Feature Section */}
      <div className="max-w-7xl mx-auto px-6 py-20 grid md:grid-cols-4 gap-8 w-full">
        {[
          { icon: <CheckCircle />, title: "Provenance", desc: "Absolute proof of origin and growth methodology." },
          { icon: <Truck />, title: "Logistics", desc: "Hardened spatial proofs for every transit leg." },
          { icon: <ShieldCheck />, title: "Immutable", desc: "Zero-edit blockchain ledger history." },
          { icon: <QrCode />, title: "Traceable", desc: "Instant public verification for consumers." },
        ].map((feat, i) => (
          <div key={i} className={`animate-spring stagger-${i+1} bg-white p-10 rounded-[2.5rem] border border-gray-50 hover:shadow-2xl hover:-translate-y-4 transition-all duration-700 group text-center lg:text-left shadow-xl shadow-gray-100/50`}>
            <div className="bg-green-50 w-16 h-16 flex items-center justify-center rounded-2xl mb-8 mx-auto lg:mx-0 text-green-600 group-hover:bg-green-600 group-hover:text-white group-hover:rotate-12 transition-all duration-500 shadow-inner">
              {feat.icon}
            </div>
            <h4 className="font-black text-2xl text-gray-900 mb-3 tracking-tighter uppercase">{feat.title}</h4>
            <p className="text-gray-500 font-medium leading-relaxed">{feat.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LandingPage;
