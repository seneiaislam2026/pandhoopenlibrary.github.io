import React, { useEffect, useState } from 'react';
import { useAuth } from '../../store/AuthContext';
import { Plus, Edit2, Trash2, FileText } from 'lucide-react';
import { onSnapshot, collection, doc, query, orderBy, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';

interface BlogPost {
  id: string;
  title: string;
  content: string;
  date: string;
}

export default function ManageBlog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const { user } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', content: '' });

  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("date", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPosts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as BlogPost[]);
    });
    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateDoc(doc(db, "posts", editingId), {
          ...formData,
          updatedAt: serverTimestamp()
        });
      } else {
        const newDocRef = doc(collection(db, "posts"));
        await setDoc(newDocRef, {
          ...formData,
          id: newDocRef.id,
          date: new Date().toISOString(),
          createdAt: serverTimestamp()
        });
      }
      setShowModal(false);
      setFormData({ title: '', content: '' });
      setEditingId(null);
    } catch (error) {
      console.error('Error publishing post:', error);
      toast.error('Failed to publish post');
    }
  };

  const handleEdit = (post: BlogPost) => {
    setFormData({ title: post.title, content: post.content });
    setEditingId(post.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this post?")) return;
    try {
      await deleteDoc(doc(db, "posts", id));
    } catch (error) {
      console.error('Error deleting post:', error);
      toast.error('Failed to delete post');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight font-bengali">বুক রিভিও ম্যানেজমেন্ট</h2>
          <p className="text-slate-500 text-sm mt-1 font-bengali">ইউজারদের ও এডমিনদের বুক রিভিওসমূহ পরিচালনা করুন।</p>
        </div>
        <button 
          onClick={() => { setFormData({ title: '', content: '' }); setEditingId(null); setShowModal(true); }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-indigo-700 shadow-sm font-bengali"
        >
          <Plus className="w-4 h-4" /> রিভিও যুক্ত করুন
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden text-left">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase border-b">তারিখ</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase border-b">শিরোনাম</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase border-b text-right">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {posts.map(post => (
              <tr key={post.id} className="hover:bg-slate-50 transition">
                <td className="p-4 text-sm text-slate-500">{new Date(post.date).toLocaleDateString('bn-BD')}</td>
                <td className="p-4 font-medium text-slate-900">{post.title}</td>
                <td className="p-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => handleEdit(post)} className="p-1 text-slate-400 hover:text-indigo-600"><Edit2 className="w-4 h-4"/></button>
                    <button onClick={() => handleDelete(post.id)} className="p-1 text-slate-400 hover:text-rose-600"><Trash2 className="w-4 h-4"/></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {posts.length === 0 && <div className="p-12 text-center text-slate-400 font-bengali">এখনো কোনো বুক রিভিও যুক্ত করা হয়নি।</div>}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-8 shadow-xl animate-in zoom-in fade-in duration-200">
            <h3 className="text-xl font-bold mb-6 text-slate-900 font-bengali">{editingId ? 'রিভিও এডিট করুন' : 'নতুন বুক রিভিও'}</h3>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-bold mb-2 text-slate-700 font-bengali">বইয়ের নাম ও লেখকের নাম</label>
                <input type="text" required value={formData.title || ''} onChange={e=>setFormData({...formData, title: e.target.value})} className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 shadow-sm outline-none font-bengali" placeholder="বইয়ের নাম ও লেখকের নাম" />
              </div>
              <div>
                <label className="block text-sm font-bold mb-2 text-slate-700 font-bengali">রিভিওর বিস্তারিত</label>
                <textarea 
                   required 
                   rows={8}
                   value={formData.content || ''} 
                   onChange={e=>setFormData({...formData, content: e.target.value})} 
                   className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 shadow-sm resize-none outline-none font-bengali" 
                   placeholder="আপনার রিভিও এখানে লিখুন..."
                ></textarea>
              </div>
              <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-100">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition font-bengali">বাতিল</button>
                <button type="submit" className="px-8 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-md shadow-indigo-200 transition font-bengali">
                  {editingId ? 'আপডেট করুন' : 'পাবলিশ করুন'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
