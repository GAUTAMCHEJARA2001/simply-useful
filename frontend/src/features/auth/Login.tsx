import React, { useState } from 'react';
import { useAuth, getRoleDashboard } from '@/contexts/AuthContext';
import { Navigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Lock, Mail, Eye, EyeOff, ArrowRight, ArrowLeft, 
  CheckCircle2, ShieldCheck, Sparkles, AlertCircle 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const { login, isAuthenticated, user, loading: authLoading } = useAuth();

  const isLoggedOut = searchParams.get('logged_out') === 'true' || searchParams.get('logout') === 'true';

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-[#0b1536] border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated && user) {
    return <Navigate to={getRoleDashboard(user.role)} replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password);
      if (!result.success) {
        setError(result.error || 'Invalid email or password. Please verify credentials.');
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 flex flex-col justify-between selection:bg-blue-600 selection:text-white relative overflow-hidden">
      
      {/* ── TOP ANNOUNCEMENT BAR (MATCHES AFTER-LOGIN NAVY BANNER) ── */}
      <div className="bg-[#0b1536] text-[11px] text-slate-300 py-2 px-4 sm:px-8 relative z-20 border-b border-[#14234b]">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 font-semibold text-white">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Simply Useful Enterprise Platform
            </span>
            <span className="hidden sm:inline text-slate-600">•</span>
            <span className="hidden sm:inline text-slate-300/80">PostgreSQL Isolated Tenant Schemas</span>
          </div>

          <Link to="/" className="text-slate-300 hover:text-white transition-colors font-medium flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Back to Platform Overview
          </Link>
        </div>
      </div>

      {/* ── CRISP EXECUTIVE HEADER ── */}
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200/80 relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-[#0b1536] flex items-center justify-center font-bold text-white text-sm shadow-sm shadow-[#0b1536]/20 transition-transform group-hover:scale-105 border border-[#14234b]">
              SU
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base text-slate-900 tracking-tight">SIMPLY USEFUL</span>
                <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded border border-blue-200">
                  ERP &amp; OTS
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">Operations OS for Manufacturing &amp; Distribution</p>
            </div>
          </Link>

          <Link to="/">
            <Button variant="outline" size="sm" className="text-xs border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 cursor-pointer transition-colors shadow-2xs">
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Home
            </Button>
          </Link>
        </div>
      </header>

      {/* ── MAIN AUTH CONTAINER ── */}
      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 relative">
        {/* Subtle, refined corporate ambient mesh — zero oversaturated blue fog */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_50%_-10%,rgba(11,21,54,0.06),transparent_70%)] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="relative z-10 w-full max-w-md"
        >
          {/* Dedicated Logged-Out Notification Banner */}
          {isLoggedOut && (
            <motion.div 
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5 shadow-sm"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <div>
                <p className="font-semibold text-emerald-900">Logged Out Successfully</p>
                <p className="text-[11px] text-emerald-700 mt-0.5">Your session has ended securely. Please sign in below to continue.</p>
              </div>
            </motion.div>
          )}

          {/* Elevated Executive Login Card */}
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xl shadow-slate-200/60 p-7 sm:p-9 space-y-6 relative overflow-hidden">
            {/* Top Corporate Accent Bar matching the Director Overview & Sidebar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0b1536] via-[#2563eb] to-[#0b1536]" />
            
            {/* Card Header */}
            <div className="text-center space-y-2 pt-1">
              <div className="w-12 h-12 rounded-xl bg-[#0b1536] text-white font-extrabold text-base flex items-center justify-center mx-auto shadow-md shadow-[#0b1536]/25 border border-[#14234b] ring-4 ring-slate-100">
                SU
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Operator Portal Sign In</h1>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                Authorized access for sales field force, warehouse depot controllers &amp; administration.
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-700">
                  Work Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="username"
                    placeholder="operator@company.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="pl-10 h-11 bg-slate-50/70 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 rounded-xl text-sm transition-all shadow-2xs"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold text-slate-700">
                    Password
                  </Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11 bg-slate-50/70 border-slate-200 text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 rounded-xl text-sm transition-all shadow-2xs"
                    required
                    minLength={4}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{error}</span>
                </motion.div>
              )}

              {/* Submit Button (Authoritative Corporate Midnight Navy & Blue Accent) */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-gradient-to-r from-[#0b1536] via-[#102354] to-[#0b1536] hover:from-[#081028] hover:via-[#0c1c45] hover:to-[#081028] text-white font-semibold text-sm rounded-xl shadow-md shadow-[#0b1536]/25 hover:shadow-lg hover:shadow-[#0b1536]/30 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 group border border-[#14234b]"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Dashboard</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </>
                )}
              </Button>
            </form>

            {/* Security Architecture Badge */}
            <div className="pt-1">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/90 text-[11px] text-slate-600 flex items-center justify-between">
                <div className="flex items-center gap-1.5 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>PostgreSQL Tenant Schema Isolated</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono bg-white border border-slate-200 px-1.5 py-0.5 rounded font-semibold">TLS 1.3</span>
              </div>
            </div>

            {/* Back link */}
            <div className="pt-3 border-t border-slate-100 text-center">
              <Link 
                to="/" 
                className="text-xs text-slate-500 hover:text-slate-800 transition-colors inline-flex items-center gap-1.5 font-medium group cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" /> 
                Return to Simply Useful Home
              </Link>
            </div>
          </div>
        </motion.div>
      </main>

      {/* ── CRISP FOOTER ── */}
      <footer className="py-6 px-4 border-t border-slate-200/80 bg-white text-center text-xs text-slate-500 relative z-20">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} Simply Useful ERP. Enterprise Operations Operating System.</p>
          <div className="flex items-center gap-4 text-xs">
            <Link to="/" className="hover:text-slate-800 transition-colors">Platform Overview</Link>
            <span>•</span>
            <span className="text-slate-600 font-medium">Schema-Isolated Cloud Architecture</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Login;
