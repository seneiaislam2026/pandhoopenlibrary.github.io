import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { BookOpen, AlertCircle, ArrowRight, CheckCircle2, ShieldCheck, Mail, Phone, Lock, User, Send } from 'lucide-react';
import { Logo } from '../../components/Logo';
import { motion, AnimatePresence } from 'motion/react';

import { setDoc, doc, getDocs, collection, query, where, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';

declare global {
  interface Window {
    recaptchaVerifier: any;
    confirmationResult: any;
  }
}

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = location.state?.prefill;

  const [name, setName] = useState(prefill?.name || "");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [username, setUsername] = useState(prefill?.username || "");
  const [password, setPassword] = useState("");
  const [payAtLibrary, setPayAtLibrary] = useState(false);
  const [paymentNumber, setPaymentNumber] = useState("");
  const [trxId, setTrxId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (prefill?.name) setName(prefill.name);
    if (prefill?.email) setUsername(prefill.email.split("@")[0]);
  }, [prefill]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const email = prefill?.email || `${username.toLowerCase()}@library.com`;
      
      // Generate sequential memberId
      const usersSnap = await getDocs(collection(db, "users")).catch(err => handleFirestoreError(err, OperationType.LIST, "users"));
      let maxId = 0;
      if (usersSnap) {
        usersSnap.forEach((d) => {
          const mid = parseInt(d.data().memberId, 10);
          if (!isNaN(mid) && mid > maxId) {
            maxId = mid;
          }
        });
      }
      const memberId = String(maxId + 1).padStart(3, '0');
      
      let userId = prefill?.googleUid;
      if (!userId) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        userId = userCredential.user.uid;
      }

      const newUser = {
        id: userId,
        name: name,
        username: username,
        password: password, // For manual login fallback
        role: 'reader',
        status: 'pending',
        phone: phone,
        address: address,
        createdAt: new Date().toISOString(),
        serverCreatedAt: serverTimestamp(),
        memberId: memberId,
        email: email,
        verified: true,
        paymentMethod: payAtLibrary ? 'library' : 'online',
        paymentNumber: payAtLibrary ? null : paymentNumber,
        trxId: payAtLibrary ? null : trxId,
        feeAmount: 50
      };

      await setDoc(doc(db, 'users', newUser.id), newUser).catch(err => handleFirestoreError(err, OperationType.WRITE, `users/${newUser.id}`));
      
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
          <div className="flex justify-center mb-4">
            <Logo className="h-16 w-16" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-slate-900 font-bengali">
            পাঠাগারের সদস্য হোন
          </h2>
          <p className="mt-2 text-sm text-slate-500 max-w-sm mx-auto font-bengali">
            পানধোয়া উন্মুক্ত পাঠাগারের সদস্য হয়ে হাজার হাজার বই পড়ার সুযোগ নিন।
          </p>
        </div>

        {/* Payment Section */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 mt-6 space-y-4">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-slate-900">Registration Fee: ৳50</h4>
              <p className="mt-1 text-xs text-slate-500 font-bengali leading-relaxed">
                সদস্য হওয়ার জন্য ৫০ টাকা ফি প্রযোজ্য। আপনি চাইলে লাইব্রেরিতে এসে জমা দিতে পারেন অথবা অনলাইনে পাঠাতে পারেন।
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mt-3">
            <button
              type="button"
              onClick={() => setPayAtLibrary(false)}
              className={`p-3 rounded-xl border text-sm font-semibold transition-all flex flex-col items-center justify-center gap-2 ${!payAtLibrary ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
            >
              <Send className="w-5 h-5" />
              Online Payment
            </button>
            <button
              type="button"
              onClick={() => setPayAtLibrary(true)}
              className={`p-3 rounded-xl border text-sm font-semibold transition-all flex flex-col items-center justify-center gap-2 ${payAtLibrary ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm' : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'}`}
            >
              <User className="w-5 h-5" />
              Pay at Library
            </button>
          </div>

          {!payAtLibrary && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="pt-3 border-t border-slate-200 space-y-4 overflow-hidden"
            >
              <div className="bg-white border border-slate-100 p-4 rounded-xl text-center">
                <p className="text-xs text-slate-500 uppercase tracking-widest font-black mb-1">Make Payment To</p>
                <div className="font-mono text-lg font-bold text-slate-900">01570206953 <span className="text-xs text-slate-400 font-sans tracking-normal ml-1">(bKash/Nagad/Rocket)</span></div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="paymentNumber">
                    Sender Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="paymentNumber"
                    type="text"
                    required={!payAtLibrary}
                    value={paymentNumber}
                    onChange={(e) => setPaymentNumber(e.target.value)}
                    className="block w-full px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 sm:text-sm font-mono"
                    placeholder="01XXXXXXXXX"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5" htmlFor="trxId">
                    Transaction ID (TrxID) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="trxId"
                    type="text"
                    required={!payAtLibrary}
                    value={trxId}
                    onChange={(e) => setTrxId(e.target.value)}
                    className="block w-full px-4 py-2 border border-slate-200 rounded-lg bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 sm:text-sm font-mono uppercase"
                    placeholder="8NXXXXXX..."
                  />
                </div>
              </div>
            </motion.div>
          )}
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
              className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 focus:bg-white transition-colors sm:text-sm font-bengali"
              placeholder="আপনার পূর্ণ নাম"
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
              className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 focus:bg-white transition-colors sm:text-sm font-bengali"
              placeholder="উদা: 01XXXXXXXXX"
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
              className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 focus:bg-white transition-colors sm:text-sm font-bengali"
              placeholder="আপনার পূর্ণ ঠিকানা..."
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
              className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 focus:bg-white transition-colors sm:text-sm font-bengali"
              placeholder="উদা: minhaz2026"
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
              className="appearance-none block w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 focus:bg-white transition-colors sm:text-sm font-bengali"
              placeholder="একটি শক্তিশালী পাসওয়ার্ড দিন"
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
