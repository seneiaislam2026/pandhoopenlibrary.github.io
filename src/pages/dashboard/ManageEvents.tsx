import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Plus, Trash2, Calendar, FileText, CheckCircle, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'framer-motion';
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
    image: ''
  });

  useEffect(() => {
    fetchEvents();
  }, []);

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
        image: ''
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
          className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary-hover transition-colors font-bengali"
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
            <form onSubmit={handleCreate} className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full px-4 py-2 border rounded-lg outline-none"
                  >
                    <option value="Competition">প্রতিযোগিতা</option>
                    <option value="Scholarship">বৃত্তি</option>
                    <option value="Workshop">ওয়ার্কশপ</option>
                    <option value="Other">অন্যান্য</option>
                  </select>
                </div>
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
                <div className="flex gap-4 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-primary text-white py-2 rounded-lg font-bengali font-bold"
                  >
                    ইভেন্ট পাবলিশ করুন
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-6 py-2 border rounded-lg font-bengali"
                  >
                    বাতিল
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {events.map((event) => (
            <motion.div
              layout
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
        </div>
      )}
    </div>
  );
}
