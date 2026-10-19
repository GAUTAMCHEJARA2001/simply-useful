import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Building2, ShieldCheck, Award, Factory, Sparkles, CheckCircle2, 
  ArrowRight, Phone, Mail, MapPin, Download, FileText, ChevronRight, 
  Star, Droplets, Hammer, Layers, Compass, BarChart3, Users, Clock, 
  Globe, Search, Check, Send, ExternalLink, HelpCircle, X, Zap, 
  TrendingUp, Laptop, Smartphone, Database, Lock, Sliders, RefreshCw,
  ShoppingCart, Receipt, Truck, FileCheck, Target, Trophy, Gauge, Briefcase, Play
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const PublicLandingPage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  // Active Sandbox Simulator Tab
  const [activeSandboxTab, setActiveSandboxTab] = useState<'order' | 'field' | 'inventory' | 'hr'>('order');

  // ── 1. ORDER ESTIMATOR SANDBOX STATE ──
  const [demoProduct, setDemoProduct] = useState<'admixture' | 'waterproofing' | 'tile_mortar'>('admixture');
  const [demoQuantity, setDemoQuantity] = useState<number>(200);
  const [demoDiscount, setDemoDiscount] = useState<number>(5);
  const [demoCustomerType, setDemoCustomerType] = useState<'dealer' | 'contractor' | 'distributor'>('dealer');

  const productPrices = {
    admixture: { name: 'PCE-800 High-Range Superplasticizer (200L Drum)', unitPrice: 12500, unit: 'Drum', gst: 18 },
    waterproofing: { name: 'HyperCote 2K Elastic Polymer Waterproof Coating (20Kg Kit)', unitPrice: 3800, unit: 'Kit', gst: 18 },
    tile_mortar: { name: 'Polymer-Modified C2TE Tile Adhesive (40Kg Bag)', unitPrice: 750, unit: 'Bag', gst: 18 },
  };

  const selectedProductData = productPrices[demoProduct];
  const grossAmount = demoQuantity * selectedProductData.unitPrice;
  const discountAmount = (grossAmount * demoDiscount) / 100;
  const taxableAmount = grossAmount - discountAmount;
  const gstAmount = (taxableAmount * selectedProductData.gst) / 100;
  const netPayable = taxableAmount + gstAmount;

  // ── 2. FIELD SALES TRACKER SANDBOX STATE ──
  const [selectedRep, setSelectedRep] = useState<'vikram' | 'amit' | 'neha'>('vikram');
  const repsData = {
    vikram: {
      name: 'Vikram Patel',
      territory: 'Ahmedabad - Gandhinagar Beat',
      kmLogged: 64.2,
      taRate: 3.5,
      visitsCount: 9,
      targetMonth: 1200000,
      achievedMonth: 1380000,
      recentVisit: 'Apex Hardware & Traders (Naroda) • Checked in 11:42 AM',
      rank: '#1 Regional Leader',
    },
    amit: {
      name: 'Amit Shah',
      territory: 'Surat - Navsari Industrial Circle',
      kmLogged: 82.5,
      taRate: 3.5,
      visitsCount: 11,
      targetMonth: 1500000,
      achievedMonth: 1520000,
      recentVisit: 'Reliable Build Solutions (Sachin) • Checked in 1:15 PM',
      rank: '#2 Territory Star',
    },
    neha: {
      name: 'Neha Halpati',
      territory: 'Vadodara - Bharuch Chemical Belt',
      kmLogged: 45.0,
      taRate: 3.5,
      visitsCount: 8,
      targetMonth: 900000,
      achievedMonth: 880000,
      recentVisit: 'Gujarat Industrial Paints (Makarpura) • Checked in 2:30 PM',
      rank: '#3 Growing Achiever',
    },
  };
  const activeRepData = repsData[selectedRep];

  // ── 3. INVENTORY & BOM PRODUCTION SIMULATOR STATE ──
  const [productionBatchSize, setProductionBatchSize] = useState<number>(2000);
  const [isSimulatingBatch, setIsSimulatingBatch] = useState(false);
  const [batchProducedCount, setBatchProducedCount] = useState<number>(0);

  const handleSimulateProduction = () => {
    setIsSimulatingBatch(true);
    setTimeout(() => {
      setIsSimulatingBatch(false);
      setBatchProducedCount(prev => prev + 1);
      toast({
        title: 'BOM Production Run Complete 🏭',
        description: `Successfully allocated raw materials and added ${productionBatchSize.toLocaleString('en-IN')} Liters into Central Warehouse stock ledger.`,
      });
    }, 600);
  };

  // ── 4. HR LETTER ENGINE SIMULATOR STATE ──
  const [hrCandidateName, setHrCandidateName] = useState('Rahul K. Sharma');
  const [hrCandidateRole, setHrCandidateRole] = useState('Senior Production Chemist');
  const [hrOfferedSalary, setHrOfferedSalary] = useState('₹45,000 / month');

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans selection:bg-slate-900 selection:text-white">
      
      {/* ── TOP ANNOUNCEMENT BAR ── */}
      <div className="bg-slate-50 border-b border-slate-200/80 text-[11px] text-slate-600 py-2 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Simply Useful Enterprise Platform
            </span>
            <span className="hidden md:inline text-slate-300">•</span>
            <span className="hidden md:inline text-slate-500">PostgreSQL Isolated Tenant Schemas</span>
            <span className="hidden md:inline text-slate-300">•</span>
            <span className="hidden md:inline text-slate-500">Real-Time Multi-Warehouse Operations</span>
          </div>

          <div className="flex items-center gap-3 text-slate-500">
            <span className="hidden sm:inline">Enterprise Cloud Infrastructure</span>
            <span className="hidden sm:inline text-slate-300">•</span>
            <Link to="/login" className="text-slate-900 hover:text-blue-600 transition-colors font-semibold">
              Client Portal Sign In →
            </Link>
          </div>
        </div>
      </div>

      {/* ── CLEAN STICKY HEADER ── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-slate-900 flex items-center justify-center font-bold text-white text-sm shadow-xs transition-transform group-hover:scale-105">
              SU
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base text-slate-900 tracking-tight">SIMPLY USEFUL</span>
                <span className="text-[10px] bg-slate-100 text-slate-700 font-semibold px-1.5 py-0.2 rounded border border-slate-200">
                  ERP &amp; OTS
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">Operations OS for Manufacturing &amp; Distribution</p>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="hidden lg:flex items-center gap-7 text-xs font-medium text-slate-600">
            <a href="#concept" className="hover:text-slate-900 transition-colors">Architecture</a>
            <a href="#sandbox" className="hover:text-blue-600 transition-colors flex items-center gap-1 text-slate-900 font-semibold">
              <Zap className="w-3.5 h-3.5 text-blue-600" /> Interactive Sandbox
            </a>
            <a href="#modules" className="hover:text-slate-900 transition-colors">Core Modules</a>
            <a href="#security" className="hover:text-slate-900 transition-colors">Multi-Tenant Isolation</a>
          </nav>

          {/* Action Button */}
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const el = document.getElementById('sandbox');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="hidden sm:flex text-xs border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 mr-1.5 text-blue-600" /> Test Drive Sandbox
            </Button>

            <Link to="/login">
              <Button 
                size="sm"
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-4 h-9 shadow-xs cursor-pointer"
              >
                Sign In <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── MINIMALIST HERO SECTION ── */}
      <section className="pt-20 pb-16 px-4 sm:px-8 border-b border-slate-200/70 bg-gradient-to-b from-slate-50/60 to-white">
        <div className="max-w-4xl mx-auto text-center space-y-6">
          
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" /> High-Velocity Operations Platform
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
            The ERP &amp; Order Tracking OS <br />
            <span className="text-blue-600">Built for Real-World Speed.</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Replace clunky spreadsheets and disconnected tools. <strong>Simply Useful</strong> connects multi-warehouse stock, GPS field beat routes, automated sales pricing, and verified corporate HR documents into one clean, schema-isolated cloud system.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button
              size="lg"
              onClick={() => {
                const el = document.getElementById('sandbox');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm px-6 h-11 shadow-xs cursor-pointer"
            >
              <Zap className="w-4 h-4 mr-2 text-amber-300" /> Try Feature Sandbox
            </Button>
            <Link to="/login">
              <Button
                size="lg"
                variant="outline"
                className="border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-sm px-6 h-11 cursor-pointer"
              >
                Client Portal Sign In
              </Button>
            </Link>
          </div>

          {/* Clean Metric Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-8 text-left">
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
              <p className="text-2xl font-bold text-slate-900">50,000+</p>
              <p className="text-xs font-medium text-slate-600 mt-1">Orders Dispatched</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Across wholesale depots</p>
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
              <p className="text-2xl font-bold text-slate-900">99.98%</p>
              <p className="text-xs font-medium text-slate-600 mt-1">Stock Ledger Accuracy</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Live batch &amp; BOM tracking</p>
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
              <p className="text-2xl font-bold text-slate-900">100%</p>
              <p className="text-xs font-medium text-slate-600 mt-1">Schema Isolation</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Zero tenant data cross-talk</p>
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
              <p className="text-2xl font-bold text-slate-900">&lt; 150ms</p>
              <p className="text-xs font-medium text-slate-600 mt-1">API Latency (P95)</p>
              <p className="text-[10px] text-slate-400 mt-0.5">Vite &amp; Django ORM backend</p>
            </div>
          </div>

        </div>
      </section>

      {/* ── THE CORE CONCEPT: WHY SIMPLY USEFUL? ── */}
      <section id="concept" className="py-16 px-4 sm:px-8 border-b border-slate-200/70 bg-white">
        <div className="max-w-6xl mx-auto space-y-10">
          
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="text-blue-600 font-mono text-xs font-bold uppercase tracking-wider">Operational Architecture</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Engineered for Manufacturing &amp; Wholesale Operations
            </h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              Designed from real factory and warehouse workflows to remove friction at every operational touchpoint:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-slate-50/70 border border-slate-200 p-5 rounded-xl space-y-2.5 hover:border-slate-300 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center font-bold">
                <Truck className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Live Stock Dispatches</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                No ghost stock or double-booking. Orders automatically lock batch inventory across production hubs and local warehouse facilities.
              </p>
            </div>

            <div className="bg-slate-50/70 border border-slate-200 p-5 rounded-xl space-y-2.5 hover:border-slate-300 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100 flex items-center justify-center font-bold">
                <MapPin className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">GPS Field Beat Tracking</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Sales Officers check in with geofenced GPS verification. Odometer start/end readings calculate per-KM travel allowances and populate scorecards.
              </p>
            </div>

            <div className="bg-slate-50/70 border border-slate-200 p-5 rounded-xl space-y-2.5 hover:border-slate-300 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center font-bold">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Isolated Tenant Schemas</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                PostgreSQL schema-level separation ensures every client organization has isolated table spaces. Zero risk of data leaks.
              </p>
            </div>

            <div className="bg-slate-50/70 border border-slate-200 p-5 rounded-xl space-y-2.5 hover:border-slate-300 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center font-bold">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Corporate HR Letters</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Generate verified single-page A4 Offer Letters, Appointment Notices, Incentive Schemes, and Experience Certificates with tamper-evident reference codes.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ── INTERACTIVE LIVE FEATURE SANDBOX ── */}
      <section id="sandbox" className="py-16 px-4 sm:px-8 border-b border-slate-200/70 bg-slate-50/40">
        <div className="max-w-6xl mx-auto space-y-8">
          
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold">
              <Play className="w-3 h-3 text-blue-600" /> Interactive Feature Sandbox
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Test Drive Platform Workflows Live
            </h2>
            <p className="text-sm text-slate-600">
              Interact directly with live simulated workflows below:
            </p>
          </div>

          {/* Sandbox Navigation Tabs */}
          <div className="flex items-center justify-center gap-2 flex-wrap">
            <button
              onClick={() => setActiveSandboxTab('order')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeSandboxTab === 'order'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <ShoppingCart className="w-3.5 h-3.5 text-blue-500" />
              <span>1. Order &amp; Pricing Estimator</span>
            </button>

            <button
              onClick={() => setActiveSandboxTab('field')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeSandboxTab === 'field'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Gauge className="w-3.5 h-3.5 text-indigo-500" />
              <span>2. Field GPS &amp; Travel Log</span>
            </button>

            <button
              onClick={() => setActiveSandboxTab('inventory')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeSandboxTab === 'inventory'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Factory className="w-3.5 h-3.5 text-emerald-500" />
              <span>3. Live Stock &amp; BOM Engine</span>
            </button>

            <button
              onClick={() => setActiveSandboxTab('hr')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeSandboxTab === 'hr'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5 text-amber-500" />
              <span>4. HR Letterhead Studio</span>
            </button>
          </div>

          {/* ── SANDBOX CONTAINER ── */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-xs">
            
            {/* ── TAB 1: ORDER ESTIMATOR ── */}
            {activeSandboxTab === 'order' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left: Interactive Controls */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-blue-600" /> Live Sales Order Estimator
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Adjust quantity, discount, and tier to see live pricing &amp; tax calculation.</p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">Catalog Item</label>
                    <select
                      value={demoProduct}
                      onChange={(e) => setDemoProduct(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900 cursor-pointer"
                    >
                      <option value="admixture">PCE-800 Hyperplasticizer (₹12,500 / Drum)</option>
                      <option value="waterproofing">HyperCote 2K Elastic Coating (₹3,800 / Kit)</option>
                      <option value="tile_mortar">Polymer-Modified C2TE Tile Adhesive (₹750 / Bag)</option>
                    </select>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs font-medium text-slate-700 mb-1">
                      <span>Order Quantity: <strong>{demoQuantity} {selectedProductData.unit}s</strong></span>
                      <span className="text-slate-900 font-semibold">₹{(selectedProductData.unitPrice * demoQuantity).toLocaleString('en-IN')} Gross</span>
                    </div>
                    <input
                      type="range"
                      min="10"
                      max="500"
                      step="10"
                      value={demoQuantity}
                      onChange={(e) => setDemoQuantity(Number(e.target.value))}
                      className="w-full accent-slate-900 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
                      <span>10 Units</span>
                      <span>250 Units</span>
                      <span>500 Units</span>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center text-xs font-medium text-slate-700 mb-1">
                      <span>Commercial Discount: <strong>{demoDiscount}%</strong></span>
                      <span className="text-emerald-600 font-semibold">-₹{discountAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max="15"
                      step="1"
                      value={demoDiscount}
                      onChange={(e) => setDemoDiscount(Number(e.target.value))}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">Party Tier &amp; Credit Category</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'dealer', label: 'Dealer', limit: '₹5.0L' },
                        { id: 'contractor', label: 'Contractor', limit: '₹10.0L' },
                        { id: 'distributor', label: 'Distributor', limit: '₹25.0L' },
                      ].map(tier => (
                        <button
                          key={tier.id}
                          type="button"
                          onClick={() => setDemoCustomerType(tier.id as any)}
                          className={`p-2 rounded-lg border text-center text-xs font-medium transition-all cursor-pointer ${
                            demoCustomerType === tier.id
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <div>{tier.label}</div>
                          <div className={`text-[10px] mt-0.5 ${demoCustomerType === tier.id ? 'text-slate-300' : 'text-slate-400'}`}>
                            {tier.limit} Limit
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Clean Pro-Forma Estimate Slip */}
                <div className="lg:col-span-7 bg-slate-50/60 rounded-xl p-5 border border-slate-200 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
                    <div>
                      <span className="text-[10px] bg-slate-200 text-slate-800 font-semibold px-2 py-0.5 rounded uppercase">
                        PRO-FORMA ESTIMATE • SIMULATION
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">SIMPLY USEFUL COMMERCIAL BILL</h4>
                      <p className="text-[11px] text-slate-500">Ref: OTS/EST/2026-27/0842 • Date: {new Date().toLocaleDateString('en-IN')}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
                        ✓ Credit Approved
                      </span>
                    </div>
                  </div>

                  <table className="w-full text-xs text-left mb-3">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px]">
                        <th className="py-1.5">Description</th>
                        <th className="py-1.5 text-center">Qty</th>
                        <th className="py-1.5 text-right">Unit Rate</th>
                        <th className="py-1.5 text-right">Taxable</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-2 font-medium text-slate-900">{selectedProductData.name}</td>
                        <td className="py-2 text-center font-mono">{demoQuantity}</td>
                        <td className="py-2 text-right font-mono">₹{selectedProductData.unitPrice.toLocaleString('en-IN')}</td>
                        <td className="py-2 text-right font-mono font-semibold">₹{taxableAmount.toLocaleString('en-IN')}</td>
                      </tr>
                    </tbody>
                  </table>

                  <div className="space-y-1 border-t border-slate-200 pt-2.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Gross Subtotal:</span>
                      <span className="font-mono">₹{grossAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-emerald-700 font-medium">
                      <span>Commercial Discount ({demoDiscount}%):</span>
                      <span className="font-mono">-₹{discountAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Applicable CGST + SGST (18%):</span>
                      <span className="font-mono">+₹{gstAmount.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900 text-sm pt-2 border-t border-slate-200">
                      <span>Net Total Payable:</span>
                      <span className="font-mono text-blue-600">₹{Math.round(netPayable).toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  <div className="mt-3.5 pt-2.5 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Generated instantly via Simply Useful OTS Engine</span>
                    <Button 
                      size="sm" 
                      onClick={() => toast({ title: 'Simulated Order Converted!', description: 'In production, this allocates warehouse stock and generates dispatch slips.' })}
                      className="bg-slate-900 hover:bg-slate-800 text-white text-xs h-7 cursor-pointer"
                    >
                      Convert to Live Order →
                    </Button>
                  </div>
                </div>

              </div>
            )}

            {/* ── TAB 2: FIELD GPS & TRAVEL LOG ── */}
            {activeSandboxTab === 'field' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Controls */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Gauge className="w-4 h-4 text-indigo-600" /> Field Beat &amp; Route Telematics
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Track Sales Officer odometer logs, dealer visit geo-stamps, and rankings.</p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">Select Sales Officer</label>
                    <div className="space-y-2">
                      {(['vikram', 'amit', 'neha'] as const).map(k => (
                        <button
                          key={k}
                          type="button"
                          onClick={() => setSelectedRep(k)}
                          className={`w-full p-2.5 rounded-lg border flex items-center justify-between transition-all cursor-pointer ${
                            selectedRep === k
                              ? 'bg-slate-900 border-slate-900 text-white'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <div className="text-left">
                            <p className="font-semibold text-xs">{repsData[k].name}</p>
                            <p className={`text-[10px] ${selectedRep === k ? 'text-slate-300' : 'text-slate-400'}`}>
                              {repsData[k].territory}
                            </p>
                          </div>
                          <span className={`text-[11px] font-mono font-semibold ${selectedRep === k ? 'text-blue-300' : 'text-blue-600'}`}>
                            {repsData[k].rank}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Live Telematics Display */}
                <div className="lg:col-span-7 bg-slate-50/60 border border-slate-200 rounded-xl p-5 space-y-4 text-xs">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div>
                      <span className="text-[10px] bg-slate-200 text-slate-800 font-semibold px-2 py-0.5 rounded uppercase">
                        GPS GEO-VERIFIED TELEMATICS
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 mt-1">{activeRepData.name} • {activeRepData.territory}</h4>
                    </div>
                    <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                      ● Active on Field
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white border border-slate-200 p-3 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">Today's Odometer</span>
                      <span className="text-lg font-bold text-slate-900">{activeRepData.kmLogged} KM</span>
                    </div>
                    <div className="bg-white border border-slate-200 p-3 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">Travel Allowance</span>
                      <span className="text-lg font-bold text-emerald-700">₹{(activeRepData.kmLogged * activeRepData.taRate).toFixed(0)}</span>
                    </div>
                    <div className="bg-white border border-slate-200 p-3 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">Dealer Visits</span>
                      <span className="text-lg font-bold text-blue-600">{activeRepData.visitsCount} Checked In</span>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 p-3 rounded-lg space-y-1">
                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">Latest Geofenced Check-In:</span>
                    <p className="text-xs font-medium text-slate-800">{activeRepData.recentVisit}</p>
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-slate-600">Monthly Target Progress:</span>
                      <span className="text-slate-900 font-semibold">₹{(activeRepData.achievedMonth / 100000).toFixed(1)}L / ₹{(activeRepData.targetMonth / 100000).toFixed(1)}L ({Math.round((activeRepData.achievedMonth / activeRepData.targetMonth) * 100)}%)</span>
                    </div>
                    <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div 
                        className="bg-blue-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, Math.round((activeRepData.achievedMonth / activeRepData.targetMonth) * 100))}%` }}
                      />
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* ── TAB 3: INVENTORY & BOM ENGINE ── */}
            {activeSandboxTab === 'inventory' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Controls */}
                <div className="lg:col-span-5 space-y-4">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Factory className="w-4 h-4 text-emerald-600" /> Automated BOM Production Simulator
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Specify batch size to compute real-time raw material consumption.</p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">
                      Batch Volume: <strong>{productionBatchSize.toLocaleString('en-IN')} Liters</strong>
                    </label>
                    <input
                      type="range"
                      min="500"
                      max="10000"
                      step="500"
                      value={productionBatchSize}
                      onChange={(e) => setProductionBatchSize(Number(e.target.value))}
                      className="w-full accent-slate-900 cursor-pointer"
                    />
                  </div>

                  <Button
                    onClick={handleSimulateProduction}
                    disabled={isSimulatingBatch}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs h-9 shadow-xs cursor-pointer"
                  >
                    {isSimulatingBatch ? <RefreshCw className="w-3.5 h-3.5 animate-spin mr-2" /> : <Play className="w-3.5 h-3.5 mr-2" />}
                    Simulate Production Run &amp; Deduct RM Stock
                  </Button>

                  {batchProducedCount > 0 && (
                    <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                      ✓ {batchProducedCount} batch(es) completed. Stock credited to Central Warehouse ledger.
                    </div>
                  )}
                </div>

                {/* Right: BOM Breakdown */}
                <div className="lg:col-span-7 bg-slate-50/60 border border-slate-200 rounded-xl p-5 space-y-3">
                  <h4 className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Raw Material Depletion Calculation (Formula: PCE-800 Master Mix)
                  </h4>

                  <div className="space-y-2">
                    {[
                      { name: 'PCE Polymer Concentrate (Liquid)', ratio: 0.28, unit: 'Kg', stock: '14,200 Kg Available' },
                      { name: 'Sodium Gluconate Set Retarder', ratio: 0.04, unit: 'Kg', stock: '3,800 Kg Available' },
                      { name: 'Defoamer & Stabilizing Additive', ratio: 0.015, unit: 'Kg', stock: '950 Kg Available' },
                      { name: 'HDPE 200L Industrial Barrels', ratio: 0.005, unit: 'Barrels', stock: '340 Barrels Available' },
                    ].map((mat, i) => (
                      <div key={i} className="bg-white border border-slate-200 p-2.5 rounded-lg flex items-center justify-between text-xs">
                        <div>
                          <p className="font-semibold text-slate-900">{mat.name}</p>
                          <p className="text-[10px] text-slate-400">{mat.stock}</p>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-semibold text-emerald-700">
                            -{(productionBatchSize * mat.ratio).toFixed(1)} {mat.unit}
                          </span>
                          <span className="block text-[10px] text-slate-400">Auto-deducted</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* ── TAB 4: HR LETTERHEAD STUDIO ── */}
            {activeSandboxTab === 'hr' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Controls */}
                <div className="lg:col-span-5 space-y-3.5">
                  <div className="border-b border-slate-100 pb-3">
                    <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-amber-600" /> HR Corporate Document Generator
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">Live preview single-page A4 letterhead with verified reference code and corporate seal.</p>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">Candidate / Employee Name</label>
                    <input
                      type="text"
                      value={hrCandidateName}
                      onChange={(e) => setHrCandidateName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">Designation / Role</label>
                    <input
                      type="text"
                      value={hrCandidateRole}
                      onChange={(e) => setHrCandidateRole(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">Compensation / Package</label>
                    <input
                      type="text"
                      value={hrOfferedSalary}
                      onChange={(e) => setHrOfferedSalary(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-slate-900"
                    />
                  </div>
                </div>

                {/* Right: Live A4 Preview Card */}
                <div className="lg:col-span-7 bg-white text-slate-900 rounded-xl p-5 shadow-xs border border-slate-200 text-xs">
                  <div className="flex items-center justify-between border-b-2 border-slate-900 pb-2 mb-3">
                    <div>
                      <h5 className="font-extrabold text-xs text-slate-900 tracking-wide uppercase">ENTERPRISE OPERATIONS CORP</h5>
                      <p className="text-[9px] text-slate-500">ISO 9001:2015 Certified • Corporate Operations</p>
                    </div>
                    <div className="text-right">
                      <span className="font-mono text-[9px] bg-slate-100 border border-slate-300 px-2 py-0.5 rounded font-bold">
                        REF: EOC/HR/OFF/2026/0149
                      </span>
                    </div>
                  </div>

                  <p className="font-semibold text-slate-900 mb-1">Date: {new Date().toLocaleDateString('en-IN')}</p>
                  <p className="font-semibold text-slate-900">To: {hrCandidateName || 'Candidate Name'}</p>
                  <p className="text-[11px] text-slate-600 mb-2">Subject: Official Offer of Employment for the position of {hrCandidateRole}</p>

                  <p className="text-[11px] text-slate-700 leading-relaxed mb-3">
                    We are pleased to offer you employment with our organization. Your proposed monthly gross remuneration will be <strong>{hrOfferedSalary}</strong>. You will be reporting to the Head of Operations.
                  </p>

                  {/* Dual Signatures */}
                  <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200 text-[10px]">
                    <div className="border border-slate-200 p-2 rounded bg-slate-50">
                      <p className="font-medium text-slate-700">Candidate Acceptance:</p>
                      <div className="border-b border-slate-300 h-5 mt-1.5"></div>
                      <p className="mt-1 text-slate-500">{hrCandidateName}</p>
                    </div>
                    <div className="border border-slate-200 p-2 rounded bg-slate-50">
                      <div className="flex justify-between items-center">
                        <p className="font-medium text-slate-700">Authorized Signatory:</p>
                        <span className="text-[8px] bg-blue-50 text-blue-700 px-1 rounded font-bold">SEAL VERIFIED</span>
                      </div>
                      <div className="border-b border-slate-300 h-5 mt-1.5"></div>
                      <p className="mt-1 text-slate-500">Head of Human Resources</p>
                    </div>
                  </div>
                </div>

              </div>
            )}

          </div>

        </div>
      </section>

      {/* ── ENTERPRISE MODULES SHOWCASE ── */}
      <section id="modules" className="py-16 px-4 sm:px-8 border-b border-slate-200/70 bg-white">
        <div className="max-w-6xl mx-auto space-y-10">
          
          <div className="text-center space-y-2 max-w-2xl mx-auto">
            <span className="text-blue-600 font-mono text-xs font-bold uppercase tracking-wider">All-in-One Engine</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Every Department Powered by a Single Brain
            </h2>
            <p className="text-sm text-slate-600">
              Simply Useful links Sales, Warehouse, Production, Finance, and HR in real time.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            <div className="bg-slate-50/70 border border-slate-200 p-5 rounded-xl space-y-3">
              <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Sales &amp; Distribution</h3>
              <ul className="text-xs text-slate-600 space-y-2">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-600 shrink-0" /> Fast Sales Order Booking with GST Auto-calc</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-600 shrink-0" /> Dealer / Distributor Credit Limit Enforcement</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-600 shrink-0" /> Pro-Forma Estimates to Order 1-Click Conversion</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-blue-600 shrink-0" /> Party Onboarding with Document Upload &amp; KYC</li>
              </ul>
            </div>

            <div className="bg-slate-50/70 border border-slate-200 p-5 rounded-xl space-y-3">
              <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Factory className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Supply Chain &amp; Stock</h3>
              <ul className="text-xs text-slate-600 space-y-2">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" /> Multi-Warehouse Real-Time Stock Ledger</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" /> Automated Bill of Materials (BOM) Deductions</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" /> Dispatch Order Verification &amp; Packing Slips</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" /> Returned Batches &amp; Damaged Stock Isolation</li>
              </ul>
            </div>

            <div className="bg-slate-50/70 border border-slate-200 p-5 rounded-xl space-y-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
                <Receipt className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-sm text-slate-900">Finance &amp; HR Suite</h3>
              <ul className="text-xs text-slate-600 space-y-2">
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Payment Approvals (Cheque, RTGS, Cash)</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Party Financial Statement of Accounts (SOA)</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Multi-Tiered Sales Incentive Calculations</li>
                <li className="flex items-center gap-2"><Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" /> Single-Page Executive Letterhead Issuance</li>
              </ul>
            </div>

          </div>

        </div>
      </section>

      {/* ── SECURITY & MULTI-TENANT ARCHITECTURE ── */}
      <section id="security" className="py-16 px-4 sm:px-8 border-b border-slate-200/70 bg-slate-50/40">
        <div className="max-w-4xl mx-auto space-y-8">
          
          <div className="text-center space-y-2">
            <span className="text-blue-600 font-mono text-xs font-bold uppercase tracking-wider">Enterprise Security</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Sovereign Multi-Tenant Isolation
            </h2>
            <p className="text-sm text-slate-600">
              Your trade secrets, margins, dealer pricing, and formulas never mix with another company.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-center">
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
              <Database className="w-5 h-5 text-blue-600 mx-auto mb-2" />
              <h4 className="font-bold text-slate-900 text-xs">Schema Isolation</h4>
              <p className="text-[11px] text-slate-500 mt-1">Dedicated Postgres schema per company tenant.</p>
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
              <Lock className="w-5 h-5 text-indigo-600 mx-auto mb-2" />
              <h4 className="font-bold text-slate-900 text-xs">End-to-End Encryption</h4>
              <p className="text-[11px] text-slate-500 mt-1">TLS 1.3 in transit and AES-256 at rest.</p>
            </div>
            <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-xs">
              <ShieldCheck className="w-5 h-5 text-emerald-600 mx-auto mb-2" />
              <h4 className="font-bold text-slate-900 text-xs">Granular RBAC</h4>
              <p className="text-[11px] text-slate-500 mt-1">Strict role-based access for Sales, Stock, HR &amp; Admin.</p>
            </div>
          </div>

        </div>
      </section>

      {/* ── CLEAN CTA BANNER ── */}
      <section className="py-16 px-4 sm:px-8 bg-white border-b border-slate-200/70">
        <div className="max-w-2xl mx-auto text-center space-y-5">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
            High-Performance Operations Engine
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Every layer is architected for sub-150ms response times, rigorous audit trails, and zero data leaks.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-1">
            <Button
              size="lg"
              onClick={() => {
                const el = document.getElementById('sandbox');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
              className="bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm px-6 h-11 shadow-xs cursor-pointer"
            >
              <Zap className="w-4 h-4 mr-2 text-amber-300" /> Explore Feature Sandbox
            </Button>
            <Link to="/login">
              <Button
                size="lg"
                variant="outline"
                className="border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm px-6 h-11 cursor-pointer"
              >
                Client Portal Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── MINIMALIST LIGHT FOOTER ── */}
      <footer className="bg-slate-50 py-8 px-4 sm:px-8 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-slate-900 flex items-center justify-center font-bold text-white text-[10px]">
              SU
            </div>
            <span className="font-semibold text-slate-700">SIMPLY USEFUL OPERATIONS OS</span>
            <span>• © {new Date().getFullYear()} Software Platform</span>
          </div>

          <div className="flex items-center gap-5">
            <a href="#concept" className="hover:text-slate-900 transition-colors">Architecture</a>
            <a href="#sandbox" className="hover:text-slate-900 transition-colors">Feature Sandbox</a>
            <a href="#modules" className="hover:text-slate-900 transition-colors">Modules</a>
            <Link to="/login" className="hover:text-slate-900 transition-colors font-semibold text-blue-600">Portal Login</Link>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default PublicLandingPage;
