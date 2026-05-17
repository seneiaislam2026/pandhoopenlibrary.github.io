import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { BookOpen, AlertCircle, ArrowRight, CheckCircle2, ShieldCheck, Mail, Phone, Lock, User, Send } from 'lucide-react';
import { Logo } from '../../components/Logo';
import { motion, AnimatePresence } from 'motion/react';

import { setDoc, doc, getDocs, collection, query, where, serverTimestamp } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { useAuth } from '../../store/AuthContext';

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
  const [paymentNumber, setPaymentNumber] = useState("");
  const [trxId, setTrxId] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const { user, loading: authLoading } = useAuth();
  
  useEffect(() => {
    if (user && !authLoading) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, authLoading, navigate]);

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
      
      // No longer listing all users to generate ID (security risk + permission denied for regular users)
      // memberId will be assigned by admin upon activation
      const memberId = ""; 
      
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
        paymentMethod: 'online',
        paymentNumber: paymentNumber,
        trxId: trxId,
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
          <h2 className="text-2xl font-semibold tracking-tight text-slate-900 mb-2">রেজিস্ট্রেশন সম্পন্ন হয়েছে!</h2>
          <p className="text-slate-600 mb-8 leading-relaxed">
            আপনার একাউন্টটি বর্তমানে পাঠাগার কর্তৃপক্ষের অনুমোদনের অপেক্ষায় আছে 😊। পাঠাগার কর্তৃপক্ষ এপ্রুভ না করলে মেম্বার হওয়া যাবে না। দয়া করে নিয়ম অনুযায়ী মেম্বারশিপ ফি পরিশোধ নিশ্চিত করুন।
          </p>
          <Link
            to="/login"
            className="inline-flex justify-center items-center py-3 px-6 border border-slate-200 shadow-sm text-sm font-semibold rounded-xl text-slate-900 bg-white hover:bg-slate-50 transition-all w-full"
          >
            লগইন পেজে যান
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

        {/* Payment Section (Bkash Only) */}
        <div className="mt-8">
          <div className="bg-gradient-to-br from-[#E2136E]/10 to-white border border-[#E2136E]/20 rounded-[1.5rem] p-5 shadow-sm relative overflow-hidden">
             
             {/* Decorative Background */}
             <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#E2136E]/5 rounded-full blur-2xl"></div>

             <div className="relative z-10">
                <div className="flex items-center gap-3 mb-5">
                   <div className="w-12 h-12 bg-[#E2136E] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-[#E2136E]/20">
                      <ShieldCheck size={24} />
                   </div>
                   <div>
                     <h4 className="font-black text-[#E2136E] text-lg font-bengali">সদস্য নিবন্ধন ফি: ৫০ টাকা</h4>
                     <p className="text-xs font-bold text-slate-500 font-bengali mt-0.5" style={{ lineHeight: '1.6' }}>বিকাশ সেন্ড মানি (Personal) করে ফর্মটি পূরণ করুন</p>
                   </div>
                </div>

                <div className="bg-white border border-[#E2136E]/10 p-4 rounded-xl flex items-center justify-between mb-5 shadow-sm">
                   <div>
                      <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mb-1 font-bengali">বিকাশ নম্বর</p>
                      <p className="text-xl font-black text-slate-800 font-mono tracking-wider">01570206953</p>
                   </div>
                   <div className="bg-[#E2136E]/10 text-[#E2136E] px-3 py-1 rounded-lg text-xs font-black tracking-widest">
                      bKash
                   </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-black text-slate-600 mb-1.5 font-bengali" htmlFor="paymentNumber">
                      যে নম্বর থেকে পাঠিয়েছেন <span className="text-[#E2136E]">*</span>
                    </label>
                    <input
                      id="paymentNumber"
                      type="text"
                      required
                      value={paymentNumber}
                      onChange={(e) => setPaymentNumber(e.target.value)}
                      className="block w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E2136E]/20 focus:border-[#E2136E] text-sm font-mono transition-all"
                      placeholder="01XXXXXXXXX"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-black text-slate-600 mb-1.5 font-bengali" htmlFor="trxId">
                      ট্রানজেকশন আইডি <span className="text-[#E2136E]">*</span>
                    </label>
                    <input
                      id="trxId"
                      type="text"
                      required
                      value={trxId}
                      onChange={(e) => setTrxId(e.target.value)}
                      className="block w-full px-4 py-3 border border-slate-200 rounded-xl bg-white text-slate-900 placeholder-slate-300 focus:outline-none focus:ring-2 focus:ring-[#E2136E]/20 focus:border-[#E2136E] text-sm font-mono transition-all uppercase"
                      placeholder="8X0XXXXXXX"
                    />
                  </div>
                </div>
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
            <label className="block text-xs font-black text-slate-700 mb-1.5 font-bengali" htmlFor="name">
              পূর্ণ নাম
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="appearance-none block w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 focus:bg-white transition-colors text-sm font-bengali font-bold"
              placeholder="আপনার পূর্ণ নাম"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5 font-bengali" htmlFor="phone">
              মোবাইল নম্বর
            </label>
            <input
              id="phone"
              name="phone"
              type="text"
              required
              className="appearance-none block w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 focus:bg-white transition-colors text-sm font-mono font-bold"
              placeholder="01XXXXXXXXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5 font-bengali" htmlFor="address">
              ঠিকানা
            </label>
            <textarea
              id="address"
              name="address"
              required
              rows={2}
              className="appearance-none block w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 focus:bg-white transition-colors text-sm font-bengali font-bold resize-none"
              placeholder="আপনার পূর্ণ ঠিকানা..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5 font-bengali" htmlFor="username">
              ইউজারনেম (ইংরেজিতে)
            </label>
            <input
              id="username"
              name="username"
              type="text"
              required
              className="appearance-none block w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 focus:bg-white transition-colors text-sm font-mono font-bold"
              placeholder="minhaz2026"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5 font-bengali" htmlFor="password">
              পাসওয়ার্ড
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              className="appearance-none block w-full px-4 py-2.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 focus:bg-white transition-colors text-sm font-mono font-bold"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading}
              className="group w-full flex justify-center items-center py-3.5 px-4 rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-600 focus:ring-offset-white disabled:opacity-50 disabled:cursor-not-allowed transition-all font-bengali font-bold tracking-wide shadow-md hover:shadow-lg active:scale-95"
            >
              {loading ? 'অপেক্ষা করুন...' : 'সদস্য হিসেবে রেজিস্ট্রেশন করুন'}
              {!loading && <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />}
            </button>
          </div>
        </form>

        <div className="mt-8 text-center text-sm font-bengali">
          <p className="text-slate-500 font-medium tracking-wide">
            ইতিমধ্যেই সদস্য?{' '}
            <Link to="/login" className="font-bold text-indigo-600 hover:text-indigo-500 transition-colors">
              লগইন করুন
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
