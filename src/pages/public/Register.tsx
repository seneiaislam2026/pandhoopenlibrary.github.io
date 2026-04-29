import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { BookOpen, AlertCircle, ArrowRight, CheckCircle2, ShieldCheck } from 'lucide-react';
import { motion } from 'motion/react';

export default function Register() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, phone, address, username, password })
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Registration failed');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full bg-white p-10 rounded-[24px] shadow-[0_2px_40px_rgba(0,0,0,0.04)] border border-emerald-100 text-center"
        >
          <div className="mx-auto w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 mb-2">Registration Complete!</h2>
          <p className="text-slate-600 mb-8 leading-relaxed">
            Your account is currently <strong className="text-slate-900">pending admin approval</strong> 😊. Please ensure you have paid the membership fee as instructed.
          </p>
          <Link
            to="/login"
            className="inline-flex justify-center items-center py-3 px-6 border border-slate-200 shadow-sm text-sm font-semibold rounded-xl text-slate-900 bg-white hover:bg-slate-50 transition-all w-full"
          >
            Go to Login
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[85vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full space-y-6 bg-white p-8 sm:p-10 rounded-[24px] shadow-[0_2px_40px_rgba(0,0,0,0.04)] border border-slate-100"
      >
        <div className="text-center">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-900">
            Join the Library
          </h2>
          <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto">
            Become a part of Pandhoa Open Library and access thousands of books.
          </p>
        </div>

        {/* Payment Instruction Box */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 mt-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-semibold text-indigo-900">Membership Fee Required</h4>
              <p className="mt-1 text-sm text-indigo-700 leading-relaxed font-medium flex items-center gap-2">
                <span>01570206953</span>
                <span className="font-bold bg-indigo-200 px-2 py-1 rounded text-xs cursor-pointer hover:bg-indigo-300 transition">Make Payment</span>
              </p>
            </div>
          </div>
        </div>
        
        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-rose-50 text-rose-600 p-4 rounded-xl flex items-start gap-3 text-sm font-medium">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="name">
              Full Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 focus:bg-white transition-colors sm:text-sm"
              placeholder="Minhazul Islam"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="phone">
              Phone Number
            </label>
            <input
              id="phone"
              name="phone"
              type="text"
              required
              className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 focus:bg-white transition-colors sm:text-sm"
              placeholder="01XXXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="address">
              Address
            </label>
            <textarea
              id="address"
              name="address"
              required
              rows={2}
              className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 focus:bg-white transition-colors sm:text-sm"
              placeholder="Your full address..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

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
              placeholder="minhaz2026"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 focus:bg-white transition-colors sm:text-sm"
              placeholder="Create a strong password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center items-center py-3.5 px-4 border border-transparent text-sm font-semibold rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 focus:ring-offset-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? 'Submitting...' : 'Register as Reader'}
              {!loading && <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center text-sm">
          <p className="text-slate-500">
            Already a member?{' '}
            <Link to="/login" className="font-semibold text-indigo-600 hover:text-indigo-500 transition-colors">
              Log in instead
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
