import React from 'react';
import { Phone, Mail, MapPin } from 'lucide-react';
import { motion } from 'motion/react';

export default function Contact() {
  return (
    <div className="bg-[#fafafa] min-h-[80vh] flex flex-col items-center justify-center py-16 px-4">
      <div className="max-w-4xl w-full">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 mb-4">Get in Touch</h1>
          <p className="text-slate-500 text-lg">We'd love to hear from you. Find us via our direct contact channels.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 text-center"
          >
             <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
               <Phone className="w-8 h-8" />
             </div>
             <h3 className="text-lg font-semibold mb-2">WhatsApp / Phone</h3>
             <p className="text-slate-500 font-medium mb-6">01570206953</p>
             <a href="https://wa.me/8801570206953" target="_blank" rel="noreferrer" className="inline-block bg-emerald-500 text-white px-6 py-2 rounded-full font-medium shadow-sm shadow-emerald-500/30 hover:bg-emerald-600 transition">
               Message on WhatsApp
             </a>
          </motion.div>

          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.1 }}
             className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 text-center"
          >
             <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
               <Mail className="w-8 h-8" />
             </div>
             <h3 className="text-lg font-semibold mb-2">Email</h3>
             <p className="text-slate-500 font-medium mb-6">contact@pandhoalibrary.org</p>
             <a href="mailto:contact@pandhoalibrary.org" className="inline-block bg-white border border-indigo-200 text-indigo-600 px-6 py-2 rounded-full font-medium hover:bg-indigo-50 transition">
               Send Email
             </a>
          </motion.div>

          <motion.div 
             initial={{ opacity: 0, y: 20 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ delay: 0.2 }}
             className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200 text-center md:col-span-2 lg:col-span-1"
          >
             <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
               <MapPin className="w-8 h-8" />
             </div>
             <h3 className="text-lg font-semibold mb-2">Location</h3>
             <p className="text-slate-500 font-medium mb-6">Pandhoa, Bangladesh</p>
             <button className="inline-block bg-white border border-slate-200 text-slate-600 px-6 py-2 rounded-full font-medium cursor-not-allowed opacity-50">
               Get Directions
             </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
