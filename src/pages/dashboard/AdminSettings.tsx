import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CalendarHeart, Users, FileText, Settings as SettingsIcon, Image as ImageIcon, CheckCircle, UploadCloud, Shield, Trash2, Bell, MessageSquare, ShieldAlert, UserX, Clock, LayoutGrid, Tags } from 'lucide-react';
import { motion } from 'framer-motion';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';

const availableSubadminRoutes = [
  { name: 'সদস্য ব্যবস্থাপনা (Users)', path: '/dashboard/users' },
  { name: 'বইয়ের তালিকা (Inventory)', path: '/dashboard/books' },
  { name: 'শেল্ফ ব্যবস্থাপনা (Shelves)', path: '/dashboard/manage-shelves' },
  { name: 'ক্যাটাগরি ব্যবস্থাপনা (Categories)', path: '/dashboard/manage-categories' },
  { name: 'ইস্যু ও ফেরত (Issues)', path: '/dashboard/issues' },
  { name: 'সদস্যদের বকেয়া (Dues)', path: '/dashboard/dues' },
  { name: 'দাতা সদস্য (Donors)', path: '/dashboard/donors' },
  { name: 'হিসাব-নিকাশ (Finances)', path: '/dashboard/finances' },
  { name: 'নোটিশ', path: '/dashboard/notices' },
  { name: 'মেসেজসমূহ', path: '/dashboard/messages' },
  { name: 'বইয়ের অনুরোধ (Requests)', path: '/dashboard/book-requests' },
  { name: 'প্রি-বুকিং', path: '/dashboard/pre-bookings' },
  { name: 'শপ বই ব্যবস্থাপনা', path: '/dashboard/shop-books' },
  { name: 'বই বিক্রয় অর্ডার', path: '/dashboard/shop-orders' },
  { name: 'স্টিকার ও QR', path: '/dashboard/stickers' },
  { name: 'বুক রিভিও', path: '/dashboard/manageblog' },
  { name: 'ইভেন্ট পরিচালনা', path: '/dashboard/events' }
];

export default function AdminSettings() {
  const [eventBanners, setEventBanners] = useState<string[]>([]);
  const [subadminAccess, setSubadminAccess] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'general');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          // Support both legacy single banner and new multiple banners
          if (Array.isArray(data.eventBanners)) {
            setEventBanners(data.eventBanners);
          } else if (data.eventBanner) {
            setEventBanners([data.eventBanner]);
          } else {
            setEventBanners([]);
          }
          setSubadminAccess(data.subadminAccess || []);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchSettings();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('ছবির সাইজ ২ এমবি এর নিচে হতে হবে।');
        return;
      }
      setLoading(true);
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800;
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          setEventBanners(prev => [...prev, dataUrl]);
          setLoading(false);
        };
        img.src = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const removeBanner = (index: number) => {
    setEventBanners(prev => prev.filter((_, i) => i !== index));
    toast.success('ব্যানার সরানো হয়েছে (সেভ করতে ভুলবেন না)');
  };

  const handleToggleAccess = (path: string) => {
    if (subadminAccess.includes(path)) {
      setSubadminAccess(subadminAccess.filter(p => p !== path));
    } else {
      setSubadminAccess([...subadminAccess, path]);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      await setDoc(doc(db, 'settings', 'general'), { eventBanners, subadminAccess }, { merge: true });
      toast.success('সেটিংস সেভ করা হয়েছে!');
    } catch (err) {
      toast.error('সেভ করতে সমস্যা হয়েছে।');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
         <h1 className="text-2xl font-bold font-bengali text-slate-800 flex items-center gap-3">
           <SettingsIcon className="text-indigo-600" />
           অ্যাডমিন সেটিংস
         </h1>
         <p className="text-slate-500 font-bengali mt-2">ওয়েবসাইটের বিভিন্ন কনফিগারেশন এবং ইভেন্ট পরিচালনা করুন।</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
         <Link to="/dashboard/events" className="group p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:-translate-y-1 transition-transform">
               <CalendarHeart size={28} />
            </div>
            <h3 className="text-xl font-bold font-bengali text-slate-800 mb-2">ইভেন্ট তৈরি ও পরিচালনা</h3>
            <p className="text-sm font-bengali text-slate-500">নতুন ইভেন্ট তৈরি করুন, আপডেট বা মুছে ফেলুন।</p>
         </Link>

         <Link to="/dashboard/manageblog" className="group p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-6 group-hover:-translate-y-1 transition-transform">
               <FileText size={28} />
            </div>
            <h3 className="text-xl font-bold font-bengali text-slate-800 mb-2">বুক রিভিও ও ব্লগ</h3>
            <p className="text-sm font-bengali text-slate-500">সদস্যদের ব্লগ এবং বুক রিভিও পরিচালনা করুন।</p>
         </Link>

         <Link to="/dashboard/manageteam" className="group p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-rose-200 transition-all">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-6 group-hover:-translate-y-1 transition-transform">
               <Users size={28} />
            </div>
            <h3 className="text-xl font-bold font-bengali text-slate-800 mb-2">পরিচালনা পর্ষদ</h3>
            <p className="text-sm font-bengali text-slate-500">টিম মেম্বার এবং কার্যকরী পরিষদ পরিচালনা করুন।</p>
         </Link>

         <Link to="/dashboard/constitution" className="group p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-amber-200 transition-all">
            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-6 group-hover:-translate-y-1 transition-transform">
               <FileText size={28} />
            </div>
            <h3 className="text-xl font-bold font-bengali text-slate-800 mb-2">গঠনতন্ত্র সেটিংস</h3>
            <p className="text-sm font-bengali text-slate-500">পাঠাগারের গঠনতন্ত্র এবং নীতিসমূহ আপডেট করুন।</p>
         </Link>

         <Link to="/dashboard/notices" className="group p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:-translate-y-1 transition-transform">
               <Bell size={28} />
            </div>
            <h3 className="text-xl font-bold font-bengali text-slate-800 mb-2">নোটিশ বোর্ড</h3>
            <p className="text-sm font-bengali text-slate-500">সকল প্রকার নোটিশ আপডেট এবং পরিচালনা করুন।</p>
         </Link>

         <Link to="/dashboard/messages" className="group p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-cyan-200 transition-all">
            <div className="w-14 h-14 bg-cyan-50 text-cyan-600 rounded-xl flex items-center justify-center mb-6 group-hover:-translate-y-1 transition-transform">
               <MessageSquare size={28} />
            </div>
            <h3 className="text-xl font-bold font-bengali text-slate-800 mb-2">মেসেজসমূহ</h3>
            <p className="text-sm font-bengali text-slate-500">ইউজারদের মেসেজ এবং টেক্সট দেখুন।</p>
         </Link>

         <Link to="/dashboard/reset-requests" className="group p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-purple-200 transition-all">
            <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:-translate-y-1 transition-transform">
               <ShieldAlert size={28} />
            </div>
            <h3 className="text-xl font-bold font-bengali text-slate-800 mb-2">রিসেট রিকোয়েস্ট</h3>
            <p className="text-sm font-bengali text-slate-500">পাসওয়ার্ড এবং ইনফরমেশন রিসেট রিকোয়েস্ট ম্যানেজ করুন।</p>
         </Link>

         <Link to="/dashboard/book-requests" className="group p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:-translate-y-1 transition-transform">
               <FileText size={28} />
            </div>
            <h3 className="text-xl font-bold font-bengali text-slate-800 mb-2">বইয়ের অনুরোধ রিকোয়েস্ট</h3>
            <p className="text-sm font-bengali text-slate-500">ইউজারদের নতুন বইয়ের অনুরোধগুলো দেখুন।</p>
         </Link>

         <Link to="/dashboard/pre-bookings" className="group p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-amber-200 transition-all">
            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-6 group-hover:-translate-y-1 transition-transform">
               <Clock size={28} />
            </div>
            <h3 className="text-xl font-bold font-bengali text-slate-800 mb-2">প্রি-বুকিং ব্যবস্থাপনা</h3>
            <p className="text-sm font-bengali text-slate-500">বইয়ের প্রি-বুকিং তালিকা এবং স্ট্যাটাস দেখুন।</p>
         </Link>

         <Link to="/dashboard/manage-shelves" className="group p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:-translate-y-1 transition-transform">
               <LayoutGrid size={28} />
            </div>
            <h3 className="text-xl font-bold font-bengali text-slate-800 mb-2">শেল্ফ ব্যবস্থাপনা</h3>
            <p className="text-sm font-bengali text-slate-500">বই সিলেক্ট করে ম্যানুয়ালি শেল্ফে অর্গানাইজ করুন।</p>
         </Link>

         <Link to="/dashboard/manage-categories" className="group p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-6 group-hover:-translate-y-1 transition-transform">
               <Tags size={28} />
            </div>
            <h3 className="text-xl font-bold font-bengali text-slate-800 mb-2">ক্যাটাগরি ব্যবস্থাপনা</h3>
            <p className="text-sm font-bengali text-slate-500">একসাথে অনেকগুলো বইয়ের ক্যাটাগরি আপডেট করুন।</p>
         </Link>

         <Link to="/dashboard/delete-users" className="group p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-red-200 transition-all">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mb-6 group-hover:-translate-y-1 transition-transform">
               <UserX size={28} />
            </div>
            <h3 className="text-xl font-bold font-bengali text-slate-800 mb-2">সদস্য ডিলিট করুন</h3>
            <p className="text-sm font-bengali text-slate-500">ওয়েবসাইট থেকে যেকোনো সদস্য রিমুভ বা ডিলিট করুন।</p>
         </Link>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 overflow-hidden relative">
         <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] -mr-32 -mt-32"></div>
         
         <div className="relative z-10 flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100">
               <ImageIcon size={24} />
            </div>
            <div>
               <h2 className="text-2xl font-black font-bengali text-slate-800">ইভেন্ট ফটো কার্ড</h2>
               <p className="text-slate-500 font-bengali text-sm mt-1">সব ইউজারদের প্রোফাইলে শো করানোর জন্য ইভেন্ট কার্ড আপলোড করুন। সাইজ: ২ এমবি এর নিচে।</p>
            </div>
         </div>

         <div className="grid md:grid-cols-2 gap-8 relative z-10">
            <div>
               <div className="border-2 border-dashed border-indigo-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-indigo-50/50 hover:bg-indigo-50 transition-colors">
                  <UploadCloud className="w-12 h-12 text-indigo-400 mb-4" />
                  <p className="font-bengali font-bold text-slate-700 mb-2">ছবি সিলেক্ট করুন</p>
                  <p className="text-xs text-slate-500 mb-6">(MAX: 2MB, Format: JPG/PNG)</p>
                  <label className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bengali font-black cursor-pointer hover:bg-indigo-700 transition shadow-lg shadow-indigo-200">
                     আপলোড করুন
                     <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
               </div>
               
               <button 
                  onClick={saveSettings} 
                  disabled={saving || loading}
                  className="mt-6 w-full py-4 rounded-xl font-bengali font-black text-white bg-slate-900 hover:bg-slate-800 transition shadow-xl shadow-slate-200 flex items-center justify-center gap-2 disabled:bg-slate-300"
               >
                  {saving ? 'সেভ করা হচ্ছে...' : 'সেটিং সেভ করুন'}
                  {!saving && <CheckCircle className="w-5 h-5" />}
               </button>
            </div>

            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 min-h-[250px]">
               {loading ? (
                  <div className="flex items-center justify-center h-full min-h-[200px]">
                     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  </div>
               ) : eventBanners.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     {eventBanners.map((banner, idx) => (
                        <div key={idx} className="relative group">
                           <img src={banner} alt={`Banner ${idx + 1}`} className="w-full h-40 object-cover rounded-xl shadow-md bg-white border border-slate-200" />
                           <button 
                              onClick={() => removeBanner(idx)}
                              className="absolute top-2 right-2 bg-rose-500 text-white p-1.5 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-600"
                              title="সরিয়ে ফেলুন"
                           >
                              <Trash2 className="w-4 h-4" />
                           </button>
                        </div>
                     ))}
                  </div>
               ) : (
                  <div className="flex items-center justify-center h-full min-h-[200px]">
                     <p className="font-bengali text-slate-400 font-bold">কোন ছবি সিলেক্ট করা হয়নি</p>
                  </div>
               )}
            </div>
         </div>
      </div>

      <div className="mt-8 bg-white rounded-3xl border border-slate-200 shadow-sm p-8 relative overflow-hidden">
         <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] -ml-32 -mt-32"></div>
         
         <div className="relative z-10 flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100">
               <Shield size={24} />
            </div>
            <div>
               <h2 className="text-2xl font-black font-bengali text-slate-800">সাব-অ্যাডমিন ওয়েব এক্সেস</h2>
               <p className="text-slate-500 font-bengali text-sm mt-1">কাস্টমাইজ করুন কোন কোন মেনু সাব-অ্যাডমিন ব্যবহার করতে পারবে।</p>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10 mb-8">
            {availableSubadminRoutes.map((route, idx) => (
                <label key={idx} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${subadminAccess.includes(route.path) ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}>
                   <input
                     type="checkbox"
                     checked={subadminAccess.includes(route.path)}
                     onChange={() => handleToggleAccess(route.path)}
                     className="w-5 h-5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                   />
                   <span className="font-bold text-slate-700 font-bengali text-sm select-none">{route.name}</span>
                </label>
            ))}
         </div>
         
         <div className="relative z-10 flex justify-end">
             <button 
                onClick={saveSettings} 
                disabled={saving || loading}
                className="py-3 px-8 rounded-xl font-bengali font-black text-white bg-slate-900 hover:bg-slate-800 transition shadow-xl flex items-center justify-center gap-2 disabled:bg-slate-300"
             >
                {saving ? 'সেভ করা হচ্ছে...' : 'সেটিং সেভ করুন'}
                {!saving && <CheckCircle className="w-5 h-5" />}
             </button>
         </div>
      </div>
    </div>
  );
}
