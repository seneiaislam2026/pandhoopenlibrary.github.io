import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, addDoc, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Calendar, Clock, MapPin, Printer, CheckCircle, ArrowRight, Sparkles, Zap, Award } from 'lucide-react';
import { useAuth } from '../../store/AuthContext';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { useReactToPrint } from 'react-to-print';
import { Helmet } from 'react-helmet-async';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  deadline: string;
  status: 'Active' | 'Closed' | 'Upcoming';
  type: string;
  image?: string;
}

export default function Events() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<Event | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [hasRegistered, setHasRegistered] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    date: '',
    deadline: '',
    type: 'সাংস্কৃতিক',
    status: 'Active' as const,
    image: ''
  });
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `লাইব্রেরি-ইভেন্ট-স্লিপ-${selectedEvent?.title}`,
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const q = query(collection(db, 'events'), where('status', 'in', ['Active', 'Upcoming']), orderBy('date', 'asc'));
      const querySnapshot = await getDocs(q);
      const fetchedEvents = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Event[];
      setEvents(fetchedEvents);
    } catch (error) {
      console.error("Error fetching events:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    try {
      await addDoc(collection(db, 'events'), {
        ...newEvent,
        creatorId: user.id,
        createdAt: serverTimestamp()
      });
      toast.success("ইভেন্ট সফলভাবে তৈরি হয়েছে!");
      setShowCreateModal(false);
      fetchEvents();
    } catch (error) {
      toast.error("ইভেন্ট তৈরি করতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast.error("রেজিস্ট্রেশন করতে দয়া করে লগইন করুন");
      return;
    }
    if (!selectedEvent) return;

    setRegistering(true);
    try {
      await addDoc(collection(db, 'event_registrations'), {
        eventId: selectedEvent.id,
        userId: user.id,
        userName: user.name,
        userPhone: user.phone || '',
        registeredAt: serverTimestamp(),
        createdAt: serverTimestamp(),
      });
      toast.success("রেজিস্ট্রেশন সফল হয়েছে!");
      setHasRegistered(true);
    } catch (error) {
      console.error("Registration error:", error);
      toast.error("রেজিস্ট্রেশন করতে সমস্যা হয়েছে");
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="bg-white min-h-screen">
      <Helmet>
        <title>ইভেন্ট ও প্রতিযোগিতা - পানধোয়া উন্মুক্ত পাঠাগার</title>
        <meta name="description" content="লাইব্রেরির সকল আসন্ন ইভেন্ট, প্রতিযোগিতা এবং বৃত্তি পরীক্ষার তথ্য এখানে দেখুন। অনলাইনে রেজিস্ট্রেশন করুন।" />
      </Helmet>

      {/* Header Area */}
      <div className="bg-slate-50 border-b border-slate-100 pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-black text-slate-900 mb-6 font-bengali tracking-tight"
          >
            ইভেন্ট ও প্রতিযোগিতা
          </motion.h1>
          <p className="text-xl text-slate-500 font-bengali max-w-2xl mx-auto font-medium">লাইব্রেরির আগামী সকল ইভেন্ট, সাংস্কৃতিক প্রতিযোগিতা এবং বৃত্তি পরীক্ষার বিস্তারিত তথ্য এখানে পাবেন।</p>
          
          {user && (
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              onClick={() => setShowCreateModal(true)}
              className="mt-10 bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black font-bengali text-lg shadow-xl shadow-indigo-200 hover:bg-slate-900 transition-all active:scale-95 flex items-center gap-3 mx-auto"
            >
               নতুন ইভেন্ট তৈরি করুন <Sparkles size={24} />
            </motion.button>
          )}
        </div>
      </div>

      {/* Events Grid */}
      <div className="max-w-7xl mx-auto px-6 py-20">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse bg-slate-50 rounded-3xl h-96"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {events.map((event, index) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden hover:shadow-2xl transition-all group flex flex-col h-full"
              >
                <div className="relative h-56">
                  <img src={event.image || 'https://images.unsplash.com/photo-1544928147-79a2dbc1f389?q=80&w=1974&auto=format&fit=crop'} alt={event.title} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-6 left-6">
                    <span className="bg-white/90 backdrop-blur px-4 py-2 rounded-xl text-xs font-black text-indigo-600 font-bengali tracking-[0.15em] shadow-sm uppercase">{event.type}</span>
                  </div>
                </div>

                <div className="p-10 flex flex-col flex-1">
                   <h3 className="text-2xl font-black text-slate-900 mb-4 font-bengali group-hover:text-indigo-600 transition-colors leading-tight">{event.title}</h3>
                   <p className="text-slate-500 font-bengali mb-8 line-clamp-3 leading-relaxed font-medium">{event.description}</p>
                   
                   <div className="mt-auto space-y-4">
                      <div className="flex items-center gap-4 text-slate-500 text-sm font-bold">
                         <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                            <Calendar size={18} />
                         </div>
                         <span className="font-bengali">তারিখ: {new Date(event.date).toLocaleDateString('bn-BD')}</span>
                      </div>
                      <div className="flex items-center gap-4 text-rose-600 text-sm font-bold">
                         <div className="p-2 bg-rose-50 rounded-lg">
                            <Clock size={18} />
                         </div>
                         <span className="font-bengali">ডেডলাইন: {new Date(event.deadline).toLocaleDateString('bn-BD')}</span>
                      </div>
                   </div>

                   <button
                    onClick={() => {
                      setSelectedEvent(event);
                      setHasRegistered(false);
                    }}
                    className="mt-10 w-full py-5 rounded-2xl font-black font-bengali text-lg transition-all flex items-center justify-center gap-3 bg-slate-900 text-white hover:bg-indigo-600 shadow-xl shadow-slate-100 group-hover:shadow-indigo-100 active:scale-[0.98]"
                  >
                    রেজিস্ট্রেশন করুন <ArrowRight size={22} />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {!loading && events.length === 0 && (
          <div className="text-center py-32 bg-slate-50 rounded-[3.5rem] border-2 border-dashed border-slate-200">
             <Calendar size={64} className="mx-auto mb-6 text-slate-300" />
             <h3 className="text-2xl font-black text-slate-900 font-bengali mb-3">আপাতত নতুন কোনো ইভেন্ট নেই</h3>
             <p className="text-slate-500 font-bengali text-lg">পরবর্তীতে আবার দেখুন অথবা আমাদের ফেসবুক পেজে চোখ রাখুন।</p>
          </div>
        )}
      </div>

      {/* Create Event Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCreateModal(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl p-10 md:p-16 overflow-y-auto max-h-[90vh]">
               <h2 className="text-3xl font-black text-slate-900 mb-8 font-bengali">নতুন ইভেন্ট তৈরি করুন</h2>
               <form onSubmit={handleCreateEvent} className="space-y-8">
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest font-bengali">ইভেন্টের নাম</label>
                    <input type="text" required value={newEvent.title} onChange={e=>setNewEvent({...newEvent, title: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 transition-all font-bengali font-bold" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest font-bengali">বিস্তারিত বিবরণ</label>
                    <textarea required value={newEvent.description} onChange={e=>setNewEvent({...newEvent, description: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-indigo-50 transition-all font-bengali font-bold h-32" />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest font-bengali">ইভেন্টের তারিখ</label>
                      <input type="date" required value={newEvent.date} onChange={e=>setNewEvent({...newEvent, date: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none transition-all font-sans font-bold" />
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest font-bengali">রেজিস্ট্রেশন ডেডলাইন</label>
                      <input type="date" required value={newEvent.deadline} onChange={e=>setNewEvent({...newEvent, deadline: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none transition-all font-sans font-bold" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest font-bengali">ইভেন্টের ধরন</label>
                      <select value={newEvent.type} onChange={e=>setNewEvent({...newEvent, type: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none transition-all font-bengali font-bold">
                        <option>সাংস্কৃতিক</option>
                        <option>বৃত্তি পরীক্ষা</option>
                        <option>রচনা প্রতিযোগিতা</option>
                        <option>সেমিনার</option>
                        <option>অন্যান্য</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest font-bengali">কভার ইমেজ লিংক</label>
                      <input type="url" value={newEvent.image} onChange={e=>setNewEvent({...newEvent, image: e.target.value})} placeholder="https://..." className="w-full px-6 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none transition-all font-sans font-bold text-sm" />
                    </div>
                  </div>
                  <div className="flex gap-4 pt-6">
                    <button type="submit" disabled={loading} className="flex-1 bg-slate-900 text-white py-5 rounded-2xl font-black font-bengali text-xl shadow-xl shadow-slate-200">ইভেন্ট পাবলিশ করুন</button>
                    <button type="button" onClick={()=>setShowCreateModal(false)} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-2xl font-black font-bengali">বাতিল</button>
                  </div>
               </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Registration Modal - Bold Redesign */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 40 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 40 }}
              className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="p-10 md:p-16 overflow-y-auto max-h-[90vh]">
                {!hasRegistered ? (
                  <form onSubmit={handleRegister}>
                    <div className="mb-12 text-center">
                       <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-6">
                         <Zap size={36} className="fill-indigo-100" />
                       </div>
                      <h2 className="text-3xl font-black text-slate-900 mb-3 font-bengali">{selectedEvent.title}</h2>
                      <p className="text-slate-500 font-bengali text-lg font-medium">অংশগ্রহণের জন্য তথ্যগুলো নিশ্চিত করুন</p>
                    </div>

                    <div className="space-y-8">
                       <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 space-y-6">
                          <div className="flex justify-between items-center pb-4 border-b border-slate-200/60">
                             <span className="text-sm font-black text-slate-400 uppercase tracking-widest font-bengali">আপনার নাম:</span>
                             <span className="font-black text-slate-900 font-bengali text-lg text-right">{user?.name}</span>
                          </div>
                          <div className="flex justify-between items-center pb-4 border-b border-slate-200/60">
                             <span className="text-sm font-black text-slate-400 uppercase tracking-widest font-bengali">ইভেন্টের ধরন:</span>
                             <span className="font-black text-indigo-600 font-bengali">{selectedEvent.type}</span>
                          </div>
                          <div className="flex justify-between items-center">
                             <span className="text-sm font-black text-slate-400 uppercase tracking-widest font-bengali">তারিখ:</span>
                             <span className="font-black text-slate-900 font-sans text-lg">{new Date(selectedEvent.date).toLocaleDateString('bn-BD')}</span>
                          </div>
                       </div>
                      
                      <div className="bg-emerald-50 p-8 rounded-[2rem] border border-emerald-100">
                        <h4 className="font-black text-emerald-700 mb-3 font-bengali flex items-center gap-3 text-lg">
                          <Clock size={22} /> ইভেন্ট গাইডলাইনসমূহ
                        </h4>
                        <ul className="space-y-3 text-emerald-600 font-bengali font-bold text-sm">
                          <li className="flex items-start gap-3">
                            <CheckCircle size={18} className="mt-0.5 flex-shrink-0" />
                            <span>নির্দিষ্ট সময়ের ৩০ মিনিট আগে উপস্থিত থাকতে হবে</span>
                          </li>
                          <li className="flex items-start gap-3">
                            <CheckCircle size={18} className="mt-0.5 flex-shrink-0" />
                            <span>রেজিস্ট্রেশন স্লিপটি অবশ্যই সাথে আনতে হবে (পিডিএফ)</span>
                          </li>
                        </ul>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-4 pt-4">
                        <button
                          type="submit"
                          disabled={registering}
                          className="flex-1 bg-indigo-600 text-white py-5 rounded-[2rem] font-bengali font-black text-xl disabled:opacity-50 hover:bg-slate-900 transition-all shadow-xl shadow-indigo-100 active:scale-95"
                        >
                          {registering ? 'প্রসেস হচ্ছে...' : 'রেজিস্ট্রেশন নিশ্চিত করুন'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedEvent(null)}
                          className="px-10 py-5 bg-slate-100 text-slate-500 rounded-[2rem] font-bengali font-black border border-slate-200 hover:bg-slate-200"
                        >
                          বাতিল
                        </button>
                      </div>
                    </div>
                  </form>
                ) : (
                  <div className="text-center py-10">
                    <motion.div 
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="w-24 h-24 bg-emerald-500 text-white rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-emerald-200"
                    >
                      <CheckCircle size={48} />
                    </motion.div>
                    <h2 className="text-4xl font-black text-slate-900 mb-4 font-bengali">স্বাগতম! সফলভাবে নিবন্ধিত</h2>
                    <p className="text-slate-500 font-bengali font-medium mb-12 text-lg">
                      আপনার রেজিস্ট্রেশন স্লিপটি ডাউনলোড করে নিন। ইভেন্টের দিন এটি প্রদর্শন বাধ্যতামূলক।
                    </p>
                    
                    {/* Printable area */}
                    <div className="hidden">
                      <div ref={printRef} className="p-16 font-bengali text-center bg-white">
                        <div className="border-[12px] border-slate-900 p-16 rounded-[4rem] relative">
                          <h1 className="text-5xl font-black text-slate-900 mb-3 tracking-tighter">PAN dhoA LIBRARY</h1>
                          <p className="text-slate-400 font-black uppercase tracking-[0.4em] mb-16 text-xs">Event Registration Slip</p>
                          
                          <div className="space-y-10 text-left max-w-sm mx-auto">
                            <div className="border-b-2 border-slate-100 pb-4">
                              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">EVENT TITLE</span>
                              <p className="text-2xl font-black text-slate-900">{selectedEvent.title}</p>
                            </div>
                            <div className="border-b-2 border-slate-100 pb-4">
                               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">PARTICIPANT NAME</span>
                               <p className="text-2xl font-black text-slate-900">{user?.name}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-8">
                               <div>
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">DATE</span>
                                  <p className="text-xl font-bold font-sans">{new Date(selectedEvent.date).toLocaleDateString()}</p>
                               </div>
                               <div>
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">SECURE ID</span>
                                  <p className="text-xl font-bold font-sans">#E-{Math.random().toString(36).substr(2, 6).toUpperCase()}</p>
                                </div>
                            </div>
                          </div>
                          
                          <div className="mt-24 pt-10 border-t border-dashed border-slate-200">
                             <p className="text-slate-400 font-black uppercase tracking-[0.5em] text-[10px] text-center">Identity Verified Digital Access</p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-6">
                      <button
                        onClick={() => handlePrint()}
                        className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-bengali font-black text-xl flex items-center justify-center gap-4 shadow-2xl hover:bg-slate-800 transition-all active:scale-95"
                      >
                        <Printer size={28} /> স্লিপ ডাউনলোড করুন
                      </button>
                      <button
                        onClick={() => setSelectedEvent(null)}
                        className="w-full py-4 text-slate-400 font-bengali font-black hover:text-indigo-600 transition-colors text-lg"
                      >
                        বন্ধ করুন
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
