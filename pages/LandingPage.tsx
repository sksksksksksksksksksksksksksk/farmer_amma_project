
import React, { useState } from 'react';
import { UserRole } from '../types';
import { ShieldCheck, QrCode, MapPin, Truck } from 'lucide-react';

interface LandingPageProps {
  onLogin: (email: string, role: UserRole) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>(UserRole.FARMER);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    onLogin(email, role);
  };

  return (
    <div className="relative">
      {/* Hero Section */}
      <div className="bg-green-50 border-b border-green-100">
        <div className="max-w-7xl mx-auto px-4 py-16 md:py-24 grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-4xl md:text-6xl font-extrabold text-gray-900 leading-tight mb-6">
              Traceability from <span className="text-green-600">Farm to Table</span>
            </h1>
            <p className="text-lg text-gray-600 mb-8 max-w-lg">
              Ensuring food safety and supply chain integrity through blockchain technology and real-time QR tracking.
            </p>
            
            <div className="flex flex-wrap gap-4 mb-12">
              <div className="flex items-center space-x-2 text-sm font-medium text-gray-700 bg-white px-4 py-2 rounded-full shadow-sm border">
                <ShieldCheck className="text-green-600" size={18} />
                <span>Blockchain Verified</span>
              </div>
              <div className="flex items-center space-x-2 text-sm font-medium text-gray-700 bg-white px-4 py-2 rounded-full shadow-sm border">
                <QrCode className="text-blue-600" size={18} />
                <span>QR Traceability</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-xl border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Sign in to your Portal</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Work Email</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none transition"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Your Role</label>
                <select 
                  value={role}
                  onChange={(e) => setRole(e.target.value as UserRole)}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-green-500 outline-none transition"
                >
                  <option value={UserRole.FARMER}>Farmer (Producer)</option>
                  <option value={UserRole.DISTRIBUTOR}>Distributor (Logistics)</option>
                  <option value={UserRole.RETAILER}>Retailer (Market)</option>
                </select>
              </div>
              <button 
                type="submit"
                className="w-full bg-green-600 text-white py-4 rounded-lg font-bold hover:bg-green-700 transition shadow-lg shadow-green-200"
              >
                Access Dashboard
              </button>
            </form>
            <p className="mt-4 text-center text-sm text-gray-500">
              New to the platform? Contact system admin.
            </p>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <h3 className="text-3xl font-bold text-center mb-12">How it Works</h3>
        <div className="grid md:grid-cols-4 gap-8">
          {[
            { icon: <MapPin className="text-green-600" />, title: "Provenance", desc: "Know exactly where your seeds and crops come from." },
            { icon: <Truck className="text-blue-600" />, title: "Logistics", desc: "Real-time location capture at every transit point." },
            { icon: <ShieldCheck className="text-purple-600" />, title: "Immutable", desc: "Data is hashed and secured on the Polygon blockchain." },
            { icon: <QrCode className="text-orange-600" />, title: "Transparency", desc: "One scan gives the customer the full verified story." },
          ].map((feature, i) => (
            <div key={i} className="bg-white p-6 rounded-xl border border-gray-100 hover:shadow-md transition">
              <div className="bg-gray-50 w-12 h-12 flex items-center justify-center rounded-lg mb-4">
                {feature.icon}
              </div>
              <h4 className="font-bold text-lg mb-2">{feature.title}</h4>
              <p className="text-gray-600 text-sm">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default LandingPage;
