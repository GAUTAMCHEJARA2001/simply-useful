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
      <div className="min-h-screen flex items-center justify-center bg-[#071126]">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
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
    <div className="min-h-screen bg-gradient-to-b from-[#071126] via-[#0a193c] to-[#060e22] text-slate-100 flex flex-col justify-between selection:bg-blue-600 selection:text-white relative overflow-hidden">
      
      {/* ── TOP ANNOUNCEMENT BAR (MATCHES AFTER-LOGIN PALETTE) ── */}
      <div className="bg-[#050c1e]/80 backdrop-blur-md border-b border-blue-900/30 text-[11px] text-blue-200/70 py-2 px-4 sm:px-8 relative z-20">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 font-semibold text-white">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" /> Simply Useful Enterprise Platform
            </span>
            <span className="hidden sm:inline text-blue-900">•</span>
            <span className="hidden sm:inline text-blue-300/60">PostgreSQL Isolated Tenant Schemas</span>
          </div>

          <Link to="/" className="text-blue-300 hover:text-white transition-colors font-medium flex items-center gap-1">
            <ArrowLeft className="w-3 h-3" /> Back to Platform Overview
          </Link>
        </div>
      </div>

      {/* ── CLEAN HEADER (MATCHES AFTER-LOGIN PALETTE) ── */}
      <header className="bg-[#071126]/70 backdrop-blur-md border-b border-blue-900/30 relative z-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center font-bold text-white text-sm shadow-md shadow-blue-600/30 transition-transform group-hover:scale-105 border border-blue-400/20">
              SU
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-base text-white tracking-tight">SIMPLY USEFUL</span>
                <span className="text-[10px] bg-blue-950 text-blue-300 font-semibold px-1.5 py-0.5 rounded border border-blue-800/50">
                  ERP &amp; OTS
                </span>
              </div>
              <p className="text-[10px] text-blue-300/60 font-medium">Operations OS for Manufacturing &amp; Distribution</p>
            </div>
          </Link>

          <Link to="/">
            <Button variant="outline" size="sm" className="text-xs border-blue-800/50 bg-blue-950/40 text-blue-200 hover:bg-blue-900/50 hover:text-white cursor-pointer transition-colors">
              <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Back to Home
            </Button>
          </Link>
        </div>
      </header>

      {/* ── MAIN AUTH CONTAINER ── */}
      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 relative">
        {/* Ambient background glows matching after-login window */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(37,99,235,0.22),transparent_70%)] pointer-events-none" />
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="relative z-10 w-full max-w-md"
        >
          {/* Dedicated Logged-Out Notification Banner */}
          {isLoggedOut && (
            <motion.div 
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 shadow-lg backdrop-blur-md"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <div>
                <p className="font-semibold text-emerald-200">Logged Out Successfully</p>
                <p className="text-[11px] text-emerald-400/80 mt-0.5">Your session has ended securely. Please sign in below to continue.</p>
              </div>
            </motion.div>
          )}

          {/* Deep Navy Glass Login Card */}
          <div className="bg-[#0b1739]/95 backdrop-blur-xl border border-blue-800/40 rounded-2xl shadow-2xl shadow-blue-950/80 p-7 sm:p-9 space-y-6 relative overflow-hidden">
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-blue-500" />
            
            {/* Card Header */}
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white font-extrabold text-base flex items-center justify-center mx-auto shadow-lg shadow-blue-600/30 border border-blue-400/20">
                SU
              </div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">Operator Portal Sign In</h1>
              <p className="text-xs text-blue-200/70 max-w-xs mx-auto leading-relaxed">
                Authorized access for sales field force, warehouse depot controllers &amp; administration.
              </p>
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-blue-100">
                  Work Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400/70" />
                  <Input
                    id="email"
                    type="email"
                    autoComplete="username"
                    placeholder="operator@company.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    className="pl-10 h-11 bg-[#060e24]/80 border-blue-900/50 text-white placeholder:text-blue-300/40 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl text-sm transition-all"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold text-blue-100">
                    Password
                  </Label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400/70" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-11 bg-[#060e24]/80 border-blue-900/50 text-white placeholder:text-blue-300/40 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 rounded-xl text-sm transition-all"
                    required
                    minLength={4}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-blue-400/70 hover:text-blue-200 transition-colors cursor-pointer"
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
                  className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{error}</span>
                </motion.div>
              )}

              {/* Submit Button (Vibrant Blue & Indigo Gradient) */}
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold text-sm rounded-xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer mt-2 border border-blue-400/20"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Dashboard</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            {/* Security Architecture Badge */}
            <div className="pt-2">
              <div className="p-3 rounded-xl bg-[#060e24]/70 border border-blue-900/40 text-[11px] text-blue-200/70 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>PostgreSQL Tenant Schema Isolated</span>
                </div>
                <span className="text-[10px] text-blue-400/60 font-mono">TLS 1.3</span>
              </div>
            </div>

            {/* Back link */}
            <div className="pt-3 border-t border-blue-900/30 text-center">
              <Link 
                to="/" 
                className="text-xs text-blue-300 hover:text-white transition-colors inline-flex items-center gap-1.5 font-medium group cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" /> 
                Return to Simply Useful Home
              </Link>
            </div>
          </div>
        </motion.div>
      </main>

      {/* ── CLEAN FOOTER (MATCHES AFTER-LOGIN PALETTE) ── */}
      <footer className="py-6 px-4 border-t border-blue-900/30 bg-[#050c1e]/90 text-center text-xs text-blue-300/60 relative z-20">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} Simply Useful ERP. Enterprise Operations Operating System.</p>
          <div className="flex items-center gap-4 text-xs">
            <Link to="/" className="hover:text-blue-200 transition-colors">Platform Overview</Link>
            <span>•</span>
            <span className="text-blue-400/80">Schema-Isolated Cloud Architecture</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Login;
