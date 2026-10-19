import React, { useState } from 'react';
import { useAuth, getRoleDashboard } from '@/contexts/AuthContext';
import { Navigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Lock, Mail, User, Shield, Eye, EyeOff, ArrowRight, ArrowLeft, 
  Sparkles, AlertCircle, ShieldCheck 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import type { UserRole } from '@/types';

export const Signup: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('SALES');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register, isAuthenticated, user, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-slate-900 border-t-transparent" />
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
      const result = await register({ name, email, password, role });
      if (result.success) {
        toast.success("Account created successfully!");
      } else {
        setError(result.error || 'Registration failed');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/60 text-slate-800 flex flex-col justify-between selection:bg-slate-900 selection:text-white">
      
      {/* ── TOP ANNOUNCEMENT BAR ── */}
      <div className="bg-slate-50 border-b border-slate-200/80 text-[11px] text-slate-600 py-2 px-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" /> Simply Useful Enterprise Platform
            </span>
            <span className="hidden sm:inline text-slate-300">•</span>
            <span className="hidden sm:inline text-slate-500">PostgreSQL Isolated Tenant Schemas</span>
          </div>

          <Link to="/login" className="text-slate-900 hover:text-blue-600 transition-colors font-semibold flex items-center gap-1">
            Already have an account? Sign In →
          </Link>
        </div>
      </div>

      {/* ── CLEAN HEADER ── */}
      <header className="bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between gap-4">
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

          <Link to="/login">
            <Button variant="outline" size="sm" className="text-xs border-slate-200 text-slate-700 hover:bg-slate-50 cursor-pointer">
              Sign In
            </Button>
          </Link>
        </div>
      </header>

      {/* ── MAIN SIGNUP CONTAINER ── */}
      <main className="flex-1 flex items-center justify-center py-12 px-4 sm:px-6 relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(59,130,246,0.05),transparent_70%)] pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="relative z-10 w-full max-w-md"
        >
          <div className="bg-white border border-slate-200/90 rounded-2xl shadow-xl shadow-slate-200/60 p-7 sm:p-9 space-y-6">
            
            {/* Card Header */}
            <div className="text-center space-y-2">
              <div className="w-12 h-12 rounded-xl bg-slate-900 text-white font-extrabold text-base flex items-center justify-center mx-auto shadow-sm">
                SU
              </div>
              <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Create Operator Account</h1>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                Register a new operator profile within Simply Useful ERP.
              </p>
            </div>

            {/* Signup Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-semibold text-slate-700">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    id="name" 
                    type="text" 
                    placeholder="Full Name" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                    className="pl-10 h-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 rounded-xl text-sm" 
                    required 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-700">Work Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="operator@company.com" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    className="pl-10 h-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 rounded-xl text-sm" 
                    required 
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="role" className="text-xs font-semibold text-slate-700">Functional Role</Label>
                <div className="relative">
                  <Shield className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 z-10" />
                  <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
                    <SelectTrigger className="pl-10 h-11 bg-white border-slate-200 text-slate-900 rounded-xl text-sm">
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SALES">Sales Officer</SelectItem>
                      <SelectItem value="INVENTORY">Inventory Manager</SelectItem>
                      <SelectItem value="PRODUCTION">Production Manager</SelectItem>
                      <SelectItem value="HR">HR Manager</SelectItem>
                      <SelectItem value="ADMIN">Operations Admin</SelectItem>
                      <SelectItem value="SUPERADMIN">Super Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold text-slate-700">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input 
                    id="password" 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="••••••••••••" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    className="pl-10 pr-10 h-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/10 rounded-xl text-sm" 
                    required 
                    minLength={6} 
                  />
                  <button 
                    type="button" 
                    onClick={() => setShowPassword(!showPassword)} 
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

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

              <Button 
                type="submit" 
                disabled={loading} 
                className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
              >
                {loading ? 'Creating account...' : (
                  <>
                    <span>Complete Registration</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>

            <div className="pt-2">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/70 text-[11px] text-slate-500 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Multi-Tenant Schema Protection</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">TLS 1.3</span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 text-center text-xs text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="text-slate-900 hover:text-blue-600 font-semibold transition-colors">
                Sign in to portal
              </Link>
            </div>
          </div>
        </motion.div>
      </main>

      {/* ── CLEAN FOOTER ── */}
      <footer className="py-6 px-4 border-t border-slate-200 bg-white text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} Simply Useful ERP. Enterprise Operations Operating System.</p>
          <div className="flex items-center gap-4 text-xs">
            <Link to="/" className="hover:text-slate-900 transition-colors">Platform Overview</Link>
            <span className="text-slate-300">•</span>
            <span className="text-slate-400">Schema-Isolated Cloud Architecture</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Signup;
