import React, { useEffect, useState } from 'react';
import { useAuth } from '../../store/AuthContext';
import { BookOpen, Send, Clock, CheckCircle, Trash2, Library } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface BookRequest {
  id: string;
  userId: string;
  userName: string;
  bookTitle: string;
  authorName: string;
  status: string;
  date: string;
}

export default function BookRequests() {
  const [requests, setRequests] = useState<BookRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [formData, setFormData] = useState({ bookTitle: '', authorName: '' });
  const { token, user } = useAuth();
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    fetchRequests();
  }, [token]);

  const fetchRequests = async () => {
    const res = await fetch('/api/book-requests', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    setRequests(data);
    setLoading(false);
  };

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/book-requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(formData)
    });
    if (res.ok) {
        setFormData({ bookTitle: '', authorName: '' });
        fetchRequests();
        alert('Book request submitted!');
    }
  };

  const deleteRequest = async (id: string) => {

      const res = await fetch(`/api/book-requests/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchRequests();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20">
      <div className="bg-slate-900 text-white p-10 rounded-3xl shadow-xl relative overflow-hidden group">
          <div className="absolute right-0 top-0 w-64 h-64 bg-indigo-500/10 rounded-full translate-x-20 -translate-y-20 group-hover:scale-110 transition-transform duration-700" />
          <div className="relative z-10 space-y-4">
              <h2 className="text-3xl font-black tracking-tighter">Book Requests</h2>
              <p className="text-indigo-200 max-w-md font-medium">Which book would you like to see in our library? Suggest books and we'll try to add them to our collection.</p>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm sticky top-8">
            <h3 className="text-xl font-black text-slate-800 mb-6">Add New Book Request</h3>
            <form onSubmit={handleRequest} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Book Title</label>
                <input 
                    type="text" 
                    required 
                    value={formData.bookTitle} 
                    onChange={e => setFormData({...formData, bookTitle: e.target.value})} 
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 transition font-medium" 
                    placeholder="e.g. Atomic Habits"
                />
              </div>
              <div>
                <label className="block text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Author (Optional)</label>
                <input 
                    type="text" 
                    value={formData.authorName} 
                    onChange={e => setFormData({...formData, authorName: e.target.value})} 
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 transition font-medium" 
                    placeholder="e.g. James Clear"
                />
              </div>
              <button 
                  type="submit" 
                  className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl hover:bg-indigo-700 transition shadow-lg shadow-indigo-100 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" /> SUBMIT REQUEST
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
           {loading ? (
               <div className="p-20 text-center text-slate-300">Loading requests...</div>
           ) : requests.length === 0 ? (
               <div className="bg-white p-20 rounded-3xl border border-dashed border-slate-200 text-center">
                   <BookOpen className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                   <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No requests yet</p>
               </div>
           ) : (
               requests.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(req => (
                   <motion.div 
                        layout 
                        key={req.id} 
                        className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-4 group hover:border-indigo-200 transition"
                   >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                                <Library className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900">{req.bookTitle}</h4>
                                <p className="text-sm text-slate-500 font-medium">By {req.authorName || 'Unknown Author'}</p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] text-slate-300 font-bold uppercase tracking-tighter">{new Date(req.date).toLocaleDateString()}</span>
                                    {isAdmin && (
                                        <span className="text-[10px] text-indigo-400 font-black uppercase">REQ BY: {req.userName}</span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                req.status === 'Approved' ? 'bg-emerald-100 text-emerald-700' : 
                                req.status === 'Pending' ? 'bg-amber-100 text-amber-700 animate-pulse' :
                                'bg-rose-100 text-rose-700'
                            }`}>
                                {req.status}
                            </span>
                            {(isAdmin || req.status === 'Pending') && (
                                <button 
                                    onClick={() => deleteRequest(req.id)}
                                    className="p-2 text-rose-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                   </motion.div>
               ))
           )}
        </div>
      </div>
    </div>
  );
}
