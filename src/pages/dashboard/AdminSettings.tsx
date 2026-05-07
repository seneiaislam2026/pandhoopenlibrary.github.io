import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarHeart, Users, FileText, Settings as SettingsIcon } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AdminSettings() {
  return (
    <div className="p-6">
      <div className="mb-8">
         <h1 className="text-2xl font-bold font-bengali text-slate-800 flex items-center gap-3">
           <SettingsIcon className="text-indigo-600" />
           অ্যাডমিন সেটিংস
         </h1>
         <p className="text-slate-500 font-bengali mt-2">ওয়েবসাইটের বিভিন্ন কনফিগারেশন এবং ইভেন্ট পরিচালনা করুন।</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
      </div>
    </div>
  );
}
