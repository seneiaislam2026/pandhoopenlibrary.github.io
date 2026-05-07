import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy, where } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Plus, Trash2, Calendar, FileText, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../store/AuthContext';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  deadline: string;
  status: 'Active' | 'Closed' | 'Upcoming';
  type: string;
  image?: string;
  creatorId?: string;
  isScholarship?: boolean;
  requiredDocuments?: string[];
  customQuestions?: string[];
}

export default function ManageEvents() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    deadline: '',
    status: 'Upcoming' as const,
    type: 'Competition',
    image: '',
    isScholarship: false,
    requiredDocuments: ['মার্কশিট', 'প্রত্যয়নপত্র'],
    customQuestions: ['কেন আপনার এই বৃত্তি প্রয়োজন?']
  });
  const [viewApplicants, setViewApplicants] = useState<string | null>(null);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  useEffect(() => {
    if (viewApplicants) {
      fetchApplicants(viewApplicants);
    }
  }, [viewApplicants]);

  const fetchApplicants = async (eventId: string) => {
    setLoadingApplicants(true);
    try {
      const q = query(collection(db, 'event_registrations'), where('eventId', '==', eventId));
      const querySnapshot = await getDocs(q);
      const fetchedApplicants = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setApplicants(fetchedApplicants);
    } catch (error) {
      console.error("Error fetching applicants:", error);
      toast.error("আবেদনকারী লোড করতে সমস্যা হয়েছে");
    } finally {
      setLoadingApplicants(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const q = query(collection(db, 'events'), orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      const fetchedEvents = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Event[];
      setEvents(fetchedEvents);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("ইভেন্ট লোড করতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error("অনুগ্রহ করে লগইন করুন");
    
    try {
      await addDoc(collection(db, 'events'), {
        ...formData,
        creatorId: user.id,
        createdAt: new Date().toISOString()
      });
      toast.success("ইভেন্ট সফলভাবে তৈরি হয়েছে");
      setFormData({
        title: '',
        description: '',
        date: '',
        deadline: '',
        status: 'Upcoming',
        type: 'Competition',
        image: '',
        isScholarship: false,
        requiredDocuments: ['মার্কশিট', 'প্রত্যয়নপত্র'],
        customQuestions: ['কেন আপনার এই বৃত্তি প্রয়োজন?']
      });
      setShowAddForm(false);
      fetchEvents();
    } catch (error) {
      console.error("Error creating event:", error);
      toast.error("ইভেন্ট তৈরি করতে সমস্যা হয়েছে");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("আপনি কি নিশ্চিতভাবে এই ইভেন্টটি ডিলিট করতে চান?")) return;
    try {
      await deleteDoc(doc(db, 'events', id));
      toast.success("ইভেন্টটি ডিলিট করা হয়েছে");
      fetchEvents();
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("ইভেন্ট ডিলিট করতে সমস্যা হয়েছে");
    }
  };

  const updateStatus = async (id: string, newStatus: Event['status']) => {
    try {
      await updateDoc(doc(db, 'events', id), { status: newStatus });
      toast.success("স্ট্যাটাস আপডেট করা হয়েছে");
      fetchEvents();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 font-bengali">ইভেন্ট ম্যানেজমেন্ট</h1>
          <p className="text-gray-600 font-bengali">বৃত্তি, প্রতিযোগিতা এবং অন্যান্য ইভেন্ট তৈরি করুন</p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-900 transition-all font-bengali shadow-lg shadow-indigo-100 active:scale-95"
        >
          <Plus size={20} /> নতুন ইভেন্ট যোগ করুন
        </button>
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8"
          >
            <form id="event-create-form" onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 font-bengali mb-1">ইভেন্ট টাইটেল</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                    placeholder="উদাঃ বৃত্তি পরীক্ষা ২০২৪"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 font-bengali mb-1">বিস্তারিত</label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none h-32"
                    placeholder="ইভেন্টের বিস্তারিত তথ্য এখানে লিখুন..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 font-bengali mb-1">ইভেন্ট টাইপ</label>
                  <select
                    value={formData.type}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData({ 
                        ...formData, 
                        type: val,
                        isScholarship: val === 'Scholarship'
                      });
                    }}
                    className="w-full px-4 py-2 border rounded-lg outline-none"
                  >
                    <option value="Competition">প্রতিযোগিতা</option>
                    <option value="Scholarship">বৃত্তি</option>
                    <option value="Workshop">ওয়ার্কশপ</option>
                    <option value="Other">অন্যান্য</option>
                  </select>
                </div>

                {formData.isScholarship && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="space-y-4 pt-4 border-t"
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700 font-bengali mb-1">প্রয়োজনীয় নথিপত্র (কমা দিয়ে লিখুন)</label>
                      <input
                        type="text"
                        value={formData.requiredDocuments.join(', ')}
                        onChange={(e) => setFormData({ ...formData, requiredDocuments: e.target.value.split(',').map(s => s.trim()) })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                        placeholder="উদাঃ মার্কশিট, আইডি কার্ড, প্রত্যয়নপত্র"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 font-bengali mb-1">কাস্টম প্রশ্ন (কমা দিয়ে লিখুন)</label>
                      <input
                        type="text"
                        value={formData.customQuestions.join(', ')}
                        onChange={(e) => setFormData({ ...formData, customQuestions: e.target.value.split(',').map(s => s.trim()) })}
                        className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 outline-none"
                        placeholder="উদাঃ কেন আপনি এই বৃত্তির যোগ্য?, আপনার ভবিষ্যৎ পরিকল্পনা কি?"
                      />
                    </div>
                  </motion.div>
                )}
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 font-bengali mb-1">ইভেন্ট তারিখ</label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 font-bengali mb-1">রেজিস্ট্রেশন ডেডলাইন</label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.deadline}
                      onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                      className="w-full px-4 py-2 border rounded-lg outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 font-bengali mb-1">ইমেজ ইউআরএল (ঐচ্ছিক)</label>
                  <input
                    type="url"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg outline-none"
                    placeholder="https://images.unsplash.com/..."
                  />
                </div>
              </div>
            </form>
            <div className="flex flex-col sm:flex-row gap-3 pt-8 border-t mt-8">
              <button
                type="submit"
                form="event-create-form"
                className="flex-[2] bg-indigo-600 text-white py-4 rounded-2xl font-bengali font-black text-xl hover:bg-slate-900 shadow-xl shadow-indigo-100 transition-all active:scale-[0.98] flex items-center justify-center gap-3"
              >
                <CheckCircle size={24} />
                ইভেন্ট পাবলিশ করুন
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="flex-1 bg-slate-100 text-slate-600 py-4 rounded-2xl font-bengali font-black text-xl hover:bg-slate-200 transition-all active:scale-[0.98]"
              >
                বাতিল করুন
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <motion.div 
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1
              }
            }
          }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {events.map((event) => (
            <motion.div
              layout
              variants={{
                hidden: { opacity: 0, y: 20, scale: 0.95 },
                show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5 } }
              }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              key={event.id}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="h-40 bg-gray-100 flex items-center justify-center relative overflow-hidden">
                {event.image ? (
                  <img src={event.image} alt={event.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                ) : (
                  <Calendar className="text-gray-300" size={48} />
                )}
                <div className="absolute top-4 right-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold font-bengali ${
                    event.status === 'Active' ? 'bg-green-100 text-green-600' :
                    event.status === 'Closed' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {event.status === 'Active' ? 'চলমান' : event.status === 'Closed' ? 'বন্ধ' : 'আসন্ন'}
                  </span>
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-xl font-bold text-gray-800 mb-2 font-bengali">{event.title}</h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2 font-bengali">{event.description}</p>
                <div className="space-y-2 mb-6">
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Calendar size={16} />
                    <span className="font-bengali">{new Date(event.date).toLocaleDateString('bn-BD')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Clock size={16} />
                    <span className="font-bengali">ডেডলাইন: {new Date(event.deadline).toLocaleDateString('bn-BD')}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewApplicants(event.id)}
                      className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-lg text-xs font-bold font-bengali transition-colors"
                    >
                      আবেদনকারী দেখুন
                    </button>
                    <select
                      value={event.status}
                      onChange={(e) => updateStatus(event.id, e.target.value as any)}
                      className="text-xs border rounded px-2 py-1 outline-none font-bengali"
                    >
                      <option value="Upcoming">আসন্ন</option>
                      <option value="Active">চলমান</option>
                      <option value="Closed">বন্ধ</option>
                    </select>
                  </div>
                  <button
                    onClick={() => handleDelete(event.id)}
                    className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
          {events.length === 0 && (
            <div className="col-span-full py-20 text-center text-gray-500 font-bengali">
              কোন ইভেন্ট পাওয়া যায়নি
            </div>
          )}
        </motion.div>
      )}

      {/* Applicant View Modal */}
      <AnimatePresence>
        {viewApplicants && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewApplicants(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative bg-white w-full max-w-4xl rounded-[2rem] shadow-2xl p-8 overflow-y-auto max-h-[90vh]">
               <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-black text-slate-800 font-bengali">আবেদনকারীদের তালিকা</h2>
                  <button onClick={() => setViewApplicants(null)} className="text-slate-400 hover:text-slate-600">বন্ধ করুন</button>
               </div>

               {loadingApplicants ? (
                 <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
               ) : applicants.length === 0 ? (
                 <div className="text-center py-10 text-slate-500 font-bengali">কোন আবেদনকারী পাওয়া যায়নি</div>
               ) : (
                 <div className="space-y-6">
                   {applicants.map((app) => (
                     <div key={app.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex justify-between mb-4">
                           <div>
                              <h4 className="font-bold text-slate-800 font-bengali">{app.userName}</h4>
                              <p className="text-sm text-slate-500">{app.userPhone}</p>
                           </div>
                           <span className="text-xs text-slate-400">{new Date(app.registeredAt?.seconds * 1000).toLocaleString('bn-BD')}</span>
                        </div>
                        
                        {app.answers && (
                          <div className="mb-4 space-y-2">
                             <p className="text-xs font-bold text-indigo-600 uppercase font-bengali">প্রশ্নোত্তর:</p>
                             {Object.entries(app.answers).map(([q, a]: any) => (
                               <div key={q} className="bg-white p-3 rounded-lg border border-slate-100">
                                  <p className="text-xs text-slate-400 font-bengali">{q}</p>
                                  <p className="text-sm font-bold text-slate-700 font-bengali">{a}</p>
                               </div>
                             ))}
                          </div>
                        )}

                        {app.documents && (
                           <div className="flex flex-wrap gap-2">
                              {Object.entries(app.documents).map(([name, url]: any) => (
                                <a
                                  key={name}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-slate-900 transition-colors"
                                >
                                  <FileText size={14} /> {name} (ডাউনলোড)
                                </a>
                              ))}
                           </div>
                        )}
                     </div>
                   ))}
                 </div>
               )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
