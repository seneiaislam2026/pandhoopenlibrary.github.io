import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { BookOpen, AlertCircle, ArrowRight, X, Send, Lock } from 'lucide-react';
import { cn } from '../../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);
  const [forgotData, setForgotData] = useState({ username: '', phone: '' });
  const [forgotLoading, setForgotLoading] = useState(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      
      if (!res.ok) {
        if (res.status === 403 && data.error?.includes('pending')) {
            throw new Error('Account is pending approval. Please wait for the admin to approve your account.');
        }
        throw new Error(data.error || 'Login failed');
      }

      login(data.token, data.user);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-8 bg-white p-10 rounded-[24px] shadow-[0_2px_40px_rgba(0,0,0,0.04)] border border-slate-100"
      >
        <div>
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center">
              <BookOpen className="h-8 w-8 text-indigo-600" />
            </div>
          </div>
          <h2 className="mt-6 text-center text-3xl font-semibold tracking-tight text-slate-900">
            Welcome back
          </h2>
          <p className="mt-2 text-center text-sm text-slate-500">
            Enter your credentials to access your Admin or Member account
          </p>
        </div>
        
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-rose-50 text-rose-600 p-4 rounded-xl flex items-start gap-3 text-sm font-medium">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                required
                className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 focus:bg-white transition-colors sm:text-sm"
                placeholder="Library2026"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div>
              <div className="flex items-center justify-between mt-1.5">
                <label className="block text-sm font-medium text-slate-700" htmlFor="password">
                  Password
                </label>
                <button 
                  type="button"
                  onClick={() => setShowForgot(true)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                >
                  Forgot password?
                </button>
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 focus:bg-white transition-colors sm:text-sm"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center items-center py-3.5 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 focus:ring-offset-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Signing in...' : 'Sign in'}
              {!loading && <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center text-sm">
          <p className="text-slate-500">
            Don't have an account?{' '}
            <Link to="/register" className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">
              Become a member
            </Link>
          </p>
        </div>
      </motion.div>

      <AnimatePresence>
        {showForgot && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-100"
            >
              <div className="bg-amber-500 p-6 text-white flex justify-between items-center">
                <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                  <Lock className="w-5 h-5" />
                  Request Password Reset
                </h3>
                <button onClick={() => setShowForgot(false)} className="p-2 hover:bg-white/10 rounded-xl transition">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={async (e) => {
                  e.preventDefault();
                  setForgotLoading(true);
                  try {
                      const res = await fetch('/api/auth/forgot-password', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(forgotData)
                      });
                      if (res.ok) {
                          alert('Reset request sent! Please wait for administrator approval.');
                          setShowForgot(false);
                      } else {
                          const err = await res.json();
                          alert(err.error || 'Failed to send request');
                      }
                  } finally {
                      setForgotLoading(false);
                  }
              }} className="p-8 space-y-6">
                <p className="text-sm text-slate-600 font-medium leading-relaxed">
                  Enter your username and registered phone number. An administrator will review your request and reset your password.
                </p>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Username</label>
                  <input
                    required
                    type="text"
                    value={forgotData.username}
                    onChange={e => setForgotData({ ...forgotData, username: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500 transition font-medium"
                    placeholder="e.g. AlMahmud"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Phone Number</label>
                  <input
                    required
                    type="text"
                    value={forgotData.phone}
                    onChange={e => setForgotData({ ...forgotData, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500 transition font-medium"
                    placeholder="e.g. 017..."
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={forgotLoading}
                  className="w-full bg-slate-900 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-slate-800 transition shadow-lg flex items-center justify-center gap-2"
                >
                  {forgotLoading ? 'Sending...' : <><Send className="w-4 h-4" /> Send Request</>}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
