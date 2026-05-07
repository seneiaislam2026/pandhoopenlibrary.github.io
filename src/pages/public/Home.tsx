import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Users, Banknote, ShoppingCart, CalendarHeart, Sparkles, Star, Zap } from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { Helmet } from 'react-helmet-async';

export default function Home() {
  const { t } = useTranslation();

  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const item = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0 }
  };

  return (
    <div className="bg-slate-50 font-sans selection:bg-indigo-100 selection:text-indigo-900 relative overflow-hidden">
      <Helmet>
        <title>পানধোয়া উন্মুক্ত পাঠাগার - জ্ঞানের আলোয় আলোকিত সমাজ</title>
        <meta name="description" content="একটি আধুনিক সামাজিক পাঠাগার যেখানে আপনি বই পড়তে পারেন, ইভেন্টে যোগ দিতে পারেন এবং সমাজের উন্নয়নে অবদান রাখতে পারেন।" />
      </Helmet>

      {/* Hero Section */}
      <section className="relative pt-32 pb-40 px-6 overflow-hidden">
        {/* Abstract Background Shapes */}
        <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-indigo-500/5 rounded-full blur-[120px] -mr-96 -mt-96 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-emerald-500/5 rounded-full blur-[100px] -ml-64 -mb-64 opacity-50"></div>
        
        <div className="max-w-7xl mx-auto relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-3 bg-white/80 backdrop-blur-md px-6 py-2.5 rounded-full border border-slate-200 shadow-xl shadow-slate-200/50 mb-12"
          >
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
            <span className="text-xs font-black text-slate-500 uppercase tracking-[0.2em] font-bengali">একটি আধুনিক ডিজিটাল পাঠাগার</span>
          </motion.div>

          <motion.h1 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-6xl md:text-8xl lg:text-9xl font-black text-slate-900 mb-10 font-bengali tracking-tight leading-[0.95]"
          >
            জ্ঞানের আলোয় <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-400">সমাজ গড়ি</span>
          </motion.h1>
          
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-xl md:text-2xl text-slate-500 font-bengali max-w-2xl mx-auto mb-16 font-medium leading-relaxed"
          >
            আপনার পছন্দের বইটি এখন এক ক্লিকেই। লাইব্রেরির সদস্য হোন, ইভেন্টে অংশগ্রহণ করুন এবং নিজেকে বিকশিত করুন।
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6 flex-wrap"
          >
            <Link
              to="/register"
              className="w-full sm:w-auto bg-slate-900 text-white px-10 py-5 rounded-[2rem] font-black font-bengali text-xl hover:bg-indigo-600 shadow-2xl shadow-slate-900/20 hover:shadow-indigo-500/20 transition-all active:scale-95 group flex items-center justify-center gap-3"
            >
              সদস্য হতে আবেদন করুন
              <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
            </Link>
            <Link
              to="/login"
              className="w-full sm:w-auto bg-indigo-600 text-white px-10 py-5 rounded-[2rem] font-black font-bengali text-xl hover:bg-indigo-700 shadow-xl shadow-indigo-600/20 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              লগইন করুন
            </Link>
            <Link
              to="/books"
              className="w-full sm:w-auto bg-white text-slate-900 px-10 py-5 rounded-[2rem] font-black font-bengali text-xl border-2 border-slate-100 hover:border-indigo-600 shadow-xl shadow-slate-200/50 hover:text-indigo-600 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              বই ব্রাউজ করুন
            </Link>
            <Link
              to="/buy-books"
              className="w-full sm:w-auto bg-rose-50 text-rose-600 px-10 py-5 rounded-[2rem] font-black font-bengali text-xl border-2 border-rose-100 hover:bg-rose-600 hover:text-white shadow-xl shadow-rose-200/50 transition-all active:scale-95 flex items-center justify-center gap-3"
            >
              <ShoppingCart className="w-6 h-6" />
              বই কিনুন
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
            {[
              { icon: BookOpen, title: 'ডিজিটাল ক্যাটালগ', desc: 'হাজারো বইয়ের সংগ্রহ অনলাইনে দেখে নিন এবং আপনার পছন্দের বইটি খুঁজুন।', color: 'indigo' },
              { icon: CalendarHeart, title: 'ইভেন্ট ও প্রতিযোগিতা', desc: 'বৃত্তি পরীক্ষা এবং সাংস্কৃতিক প্রতিযোগিতায় অংশ নিন যা আপনার দক্ষতা বাড়াবে।', color: 'emerald' },
              { icon: ShoppingCart, title: 'অনলাইন বুক শপ', desc: 'সাশ্রয়ী মূল্যে পছন্দের বইগুলো অর্ডার করুন সরাসরি আপনার ঠিকানায়।', color: 'rose' }
            ].map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-white p-12 rounded-[3.5rem] shadow-2xl shadow-slate-200/50 border border-slate-50 group hover:shadow-indigo-500/10 transition-all"
              >
                <div className={`w-20 h-20 bg-${f.color}-50 text-${f.color}-600 rounded-[2rem] flex items-center justify-center mb-10 group-hover:scale-110 transition-transform`}>
                  <f.icon size={36} />
                </div>
                <h3 className="text-3xl font-black text-slate-900 mb-6 font-bengali">{f.title}</h3>
                <p className="text-slate-500 font-bengali text-lg leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-slate-900 rounded-[4rem] p-16 md:p-32 text-center relative overflow-hidden">
             <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-500/20 rounded-full blur-[150px] -mr-64 -mt-64"></div>
             
             <div className="relative z-10">
               <h2 className="text-4xl md:text-7xl font-black text-white mb-10 font-bengali tracking-tight leading-[1.1]">
                 আমাদের অগ্রযাত্রার <br /> অংশ হতে চান?
               </h2>
               <p className="text-slate-400 font-bengali text-xl md:text-2xl mb-16 max-w-2xl mx-auto leading-relaxed">
                 সদস্য আবেদন থেকে শুরু করে যেকোনো প্রয়োজনে আমাদের সাথেই থাকুন। জ্ঞানের আলো সবার মাঝে ছড়িয়ে দেই।
               </p>
               <div className="flex flex-col sm:flex-row justify-center gap-6">
                 <Link to="/register" className="bg-white text-slate-900 px-12 py-6 rounded-[2rem] font-black font-bengali text-xl hover:bg-indigo-400 hover:text-white transition-all shadow-2xl active:scale-95">সদস্য হতে আবেদন করুন</Link>
                 <Link to="/donors" className="bg-slate-800 text-white border border-slate-700 px-12 py-6 rounded-[2rem] font-black font-bengali text-xl hover:bg-slate-700 transition-all shadow-xl active:scale-95">দাতা সদস্যদের তালিকা</Link>
               </div>
             </div>
          </div>
        </div>
      </section>
    </div>
  );
}
