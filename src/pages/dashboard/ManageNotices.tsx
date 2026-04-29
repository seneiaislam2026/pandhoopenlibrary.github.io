import React, { useEffect, useState } from 'react';
import { useAuth } from '../../store/AuthContext';
import { Bell, Plus, Trash2, X, AlertCircle, Info, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Notice {
  id: string;
  title: string;
  content: string;
  priority: 'low' | 'medium' | 'high';
  date: string;
}

export default function ManageNotices() {
  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', content: '', priority: 'medium' as 'low' | 'medium' | 'high' });
  const { token } = useAuth();

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      const res = await fetch('/api/notices');
      setNotices(await res.json());
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/notices', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(formData)
    });
    if (res.ok) {
      setShowAddModal(false);
      setFormData({ title: '', content: '', priority: 'medium' });
      fetchNotices();
    }
  };

  const handleDelete = async (id: string) => {

    const res = await fetch(`/api/notices/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) fetchNotices();
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Notice Management</h2>
          <p className="text-slate-500 text-sm">Post and manage announcements for library members.</p>
        </div>
        <button 
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg shadow-indigo-100"
        >
          <Plus className="w-5 h-5" />
          Post Notice
        </button>
      </div>

      <div className="grid gap-4">
        {loading ? (
          <div className="p-20 text-center text-slate-400">Loading notices...</div>
        ) : notices.length === 0 ? (
          <div className="bg-white p-16 rounded-2xl border border-dashed border-slate-200 text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
              <Bell className="w-8 h-8 text-slate-300" />
            </div>
            <p className="text-slate-400 font-medium tracking-tight">No notices posted yet.</p>
          </div>
        ) : (
          notices.map((notice) => (
            <motion.div 
              layout
              key={notice.id} 
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 group hover:border-indigo-200 transition relative"
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-xl ${
                  notice.priority === 'high' ? 'bg-rose-100 text-rose-600' : 
                  notice.priority === 'medium' ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'
                }`}>
                  {notice.priority === 'high' ? <AlertCircle className="w-6 h-6" /> : <Info className="w-6 h-6" />}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg leading-tight mb-1">{notice.title}</h3>
                      <p className="text-xs font-bold font-mono text-slate-400 uppercase">
                        {new Date(notice.date).toLocaleDateString(undefined, { dateStyle: 'long' })}
                      </p>
                    </div>
                    <button 
                      onClick={() => handleDelete(notice.id)}
                      className="p-2 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="mt-4 text-slate-600 leading-relaxed whitespace-pre-wrap">{notice.content}</p>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl border border-slate-100"
            >
              <div className="bg-slate-900 p-6 text-white flex justify-between items-center">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Send className="w-5 h-5 text-indigo-400" />
                  Post New Notice
                </h3>
                <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-white/10 rounded-xl transition">
                  <X className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleAdd} className="p-8 space-y-6">
                <div>
                  <label className="block text-sm font-black text-slate-400 uppercase tracking-widest mb-2">Title</label>
                  <input
                    required
                    type="text"
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 transition font-medium"
                    placeholder="Notice Heading"
                  />
                </div>
                <div>
                  <label className="block text-sm font-black text-slate-400 uppercase tracking-widest mb-2">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={e => setFormData({ ...formData, priority: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 transition font-medium"
                  >
                    <option value="low">Low Priority (Green)</option>
                    <option value="medium">Medium Priority (Amber)</option>
                    <option value="high">High Priority (Red)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-black text-slate-400 uppercase tracking-widest mb-2">Message Content</label>
                  <textarea
                    required
                    value={formData.content}
                    onChange={e => setFormData({ ...formData, content: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 transition h-32 resize-none font-medium text-sm leading-relaxed"
                    placeholder="Enter announcement details..."
                  />
                </div>
                <button 
                  type="submit" 
                  className="w-full bg-indigo-600 text-white py-4 rounded-xl font-black uppercase tracking-widest hover:bg-indigo-700 transition shadow-lg shadow-indigo-100"
                >
                  Publish Notice
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
