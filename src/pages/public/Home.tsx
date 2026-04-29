import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Users, Banknote, Star } from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { cn } from "../../lib/utils"; // Keep import for utility if needed later

export default function Home() {
  const { t } = useTranslation();

  return (
    <div className="bg-[#fafafa] font-sans">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-28 lg:pt-32 lg:pb-36 bg-white border-b border-slate-100">
        {/* Background Effects */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-b from-indigo-50 to-transparent rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 opacity-70"></div>
          <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-t from-emerald-50 to-transparent rounded-full blur-3xl translate-y-1/3 -translate-x-1/3 opacity-70"></div>
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="flex flex-col items-center"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20 bg-emerald-50 mb-8"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              {t('home.badge')}
            </motion.div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-slate-900 mb-6 max-w-4xl mx-auto leading-[1.15]">
              {t('home.heading1')}
            </h1>
            
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-emerald-600 mb-8 inline-block">
              {t('home.heading2')}
            </h2>

            <p className="max-w-2xl mx-auto text-lg md:text-xl leading-relaxed text-slate-600 font-medium mb-12">
              {t('home.description')}
            </p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="flex flex-col sm:flex-row items-stretch justify-center gap-4 w-full max-w-3xl mx-auto"
            >
              <Link
                to="/register"
                className="flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-8 py-4 text-base sm:text-lg font-bold text-white shadow-xl shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5 active:translate-y-0 transition-all group w-full sm:w-auto"
              >
                {t('home.becomeMember')}
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/books"
                className="flex items-center justify-center gap-2 rounded-xl bg-white border-2 border-slate-200 text-slate-700 px-8 py-4 text-base sm:text-lg font-bold shadow-sm hover:border-slate-300 hover:bg-slate-50 hover:-translate-y-0.5 active:translate-y-0 transition-all w-full sm:w-auto"
              >
                <BookOpen className="w-5 h-5 text-slate-400" />
                {t('home.browseBooks')}
              </Link>
              <Link
                to="/login"
                className="flex items-center justify-center gap-2 rounded-xl bg-emerald-50 text-emerald-700 border-2 border-transparent px-8 py-4 text-base sm:text-lg font-bold hover:bg-emerald-100 hover:-translate-y-0.5 active:translate-y-0 transition-all w-full sm:w-auto"
              >
                <Users className="w-5 h-5 opacity-70" />
                {t('home.loginPortal')}
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Feature Section */}
      <section className="py-24 sm:py-32 bg-[#fafafa]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              {t('home.features.title')}
            </h2>
            <p className="mt-4 text-lg text-slate-500">
              {t('home.features.subtitle')}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="bg-white rounded-3xl p-8 sm:p-10 shadow-sm border border-slate-200/60 hover:shadow-md transition-shadow relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <BookOpen className="w-32 h-32 transform rotate-12 translate-x-4 -translate-y-4" />
              </div>
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-8 ring-1 ring-inset ring-indigo-600/10">
                <BookOpen className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-semibold text-slate-900 mb-4 tracking-tight">
                {t('home.features.col1Title')}
              </h3>
              <p className="text-slate-500 leading-relaxed">
                {t('home.features.col1Desc')}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-3xl p-8 sm:p-10 shadow-sm border border-slate-200/60 hover:shadow-md transition-shadow relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Users className="w-32 h-32 transform -rotate-12 translate-x-4 -translate-y-4" />
              </div>
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-8 ring-1 ring-inset ring-indigo-600/10">
                <Users className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-semibold text-slate-900 mb-4 tracking-tight">
                {t('home.features.col2Title')}
              </h3>
              <p className="text-slate-500 leading-relaxed">
                {t('home.features.col2Desc')}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-3xl p-8 sm:p-10 shadow-sm border border-slate-200/60 hover:shadow-md transition-shadow relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <Banknote className="w-32 h-32 transform rotate-12 translate-x-4 -translate-y-4" />
              </div>
              <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 mb-8 ring-1 ring-inset ring-indigo-600/10">
                <Banknote className="w-7 h-7" />
              </div>
              <h3 className="text-2xl font-semibold text-slate-900 mb-4 tracking-tight">
                {t('home.features.col3Title')}
              </h3>
              <p className="text-slate-500 leading-relaxed">
                {t('home.features.col3Desc')}
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Testimonial / Social Proof */}
      <section className="py-32 bg-slate-950 text-white text-center relative overflow-hidden">
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_var(--tw-gradient-stops))] from-indigo-900/40 via-slate-950 to-slate-950"></div>
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
        </div>
        <div className="max-w-4xl mx-auto px-4 z-10 relative">
          <div className="flex justify-center mb-10">
            <div className="flex gap-1 bg-white/5 p-3 rounded-full backdrop-blur-md border border-white/10">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className="w-6 h-6 text-amber-400 fill-amber-400"
                />
              ))}
            </div>
          </div>
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-semibold mb-8 tracking-tight font-serif italic text-slate-200 leading-tight">
            {t('home.testimonial')}
          </h2>
          <p className="text-indigo-300 font-bold tracking-widest uppercase text-sm mb-2">
            {t('home.since')}
          </p>
          <p className="text-slate-500 font-medium">
            {t('home.members')}
          </p>
        </div>
      </section>
    </div>
  );
}
