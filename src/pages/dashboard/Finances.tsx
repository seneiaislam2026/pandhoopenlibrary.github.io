import React, { useEffect, useState } from 'react';
import { useAuth } from '../../store/AuthContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { DollarSign, ArrowUpRight, ArrowDownRight, Plus, Edit2, Trash2 } from 'lucide-react';
import { onSnapshot, collection, doc, setDoc, deleteDoc, updateDoc, writeBatch, query, getDocs } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';

import { useLocation } from 'react-router-dom';

interface Finance {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  date: string;
}

export default function Finances() {
  const [finances, setFinances] = useState<Finance[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const location = useLocation();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    type: 'expense',
    amount: 0,
    description: ''
  });

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'finances'), (snapshot) => {
      setFinances(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Finance[]);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (editingId) {
        await updateDoc(doc(db, 'finances', editingId), formData);
      } else {
        const newDocRef = doc(collection(db, 'finances'));
        await setDoc(newDocRef, { 
          ...formData, 
          id: newDocRef.id,
          date: new Date().toISOString()
        });
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ type: 'expense', amount: 0, description: '' });
    } catch (error) {
      console.error('Error saving finance record:', error);
      toast.error('Failed to save record');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (f: Finance) => {
    setFormData({ type: f.type, amount: f.amount, description: f.description });
    setEditingId(f.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string, force: boolean = false) => {
    if (!force) {
      setDeletingId(id);
      return;
    }
    try {
      await deleteDoc(doc(db, 'finances', id));
      setDeletingId(null);
    } catch (error) {
      console.error('Failed to delete finance record:', error);
      toast.error('Failed to delete record');
    }
  };

  const handleResetAll = async (force: boolean = false) => {
    if (!force) {
      setResetting(true);
      return;
    }
    try {
      const q = query(collection(db, 'finances'));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.docs.forEach(doc => {
        batch.delete(doc.ref);
      });
      await batch.commit();
      setResetting(false);
    } catch (error) {
      console.error('Failed to reset records:', error);
      toast.error('Failed to reset records');
    }
  };

  const totalIncome = finances.filter(f => f.type === 'income').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalExpense = finances.filter(f => f.type === 'expense').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const balance = totalIncome - totalExpense;

  const isAdmin = user?.role === 'admin';
  const isDashboard = location.pathname.startsWith('/dashboard');

  const chartData = [
    { name: 'আয়', value: totalIncome },
    { name: 'ব্যয়', value: totalExpense }
  ];
  const COLORS = ['#10b981', '#f43f5e'];

  const content = (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold font-bengali text-slate-900 tracking-tight">হিসাব-নিকাশ</h2>
        {isAdmin && (
          <button 
            onClick={() => { setShowForm(!showForm); setEditingId(null); setFormData({ type: 'expense', amount: 0, description: '' }); }}
            className="bg-slate-900 text-white px-5 py-2.5 rounded-xl font-bold font-bengali hover:bg-slate-800 transition flex items-center gap-2 shadow-sm"
          >
            <Plus className="w-4 h-4" /> {editingId ? 'রেকর্ড এডিট করুন' : 'নতুন রেকর্ড যোগ করুন'}
          </button>
        )}
      </div>

      {showForm && isAdmin && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5 font-bengali">খাতের ধরণ</label>
            <select
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value as 'income' | 'expense' })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-bengali font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-colors"
            >
              <option value="income">আয়</option>
              <option value="expense">ব্যয়</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1.5 font-bengali">পরিমাণ (৳)</label>
            <input
              type="number"
              required
              min="0"
              value={formData.amount || ''}
              onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
              className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-mono font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-colors"
            />
          </div>
          <div className="md:col-span-2 flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-bold text-slate-700 mb-1.5 font-bengali">বিবরণ</label>
              <input
                type="text"
                required
                value={formData.description || ''}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl font-bengali font-bold text-slate-700 focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-colors"
              />
            </div>
            <button type="submit" disabled={isSubmitting} className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 h-[46px] self-end font-bengali shadow-sm disabled:opacity-50 flex items-center justify-center gap-2">
              {isSubmitting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              সংরক্ষণ
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-center">
          <div className="flex items-center gap-3 text-emerald-600 mb-3">
             <ArrowUpRight className="w-6 h-6 bg-emerald-100 rounded-full p-1" />
             <span className="font-bold tracking-widest text-[11px] uppercase font-bengali text-slate-500">মোট আয়</span>
          </div>
          <p className="text-4xl font-black text-slate-900 tracking-tight font-mono">৳{totalIncome}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-center transition-all hover:shadow-md">
          <div className="flex items-center gap-3 text-rose-600 mb-3">
             <ArrowDownRight className="w-6 h-6 bg-rose-100 rounded-full p-1" />
             <span className="font-bold tracking-widest text-[11px] uppercase font-bengali text-slate-500">মোট ব্যয়</span>
          </div>
          <p className="text-4xl font-black text-slate-900 tracking-tight font-mono">৳{totalExpense}</p>
        </div>

        <div className="bg-slate-900 rounded-2xl p-6 shadow-sm flex flex-col justify-center text-white transition-all hover:shadow-md border border-slate-800 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500 rounded-full blur-[80px] opacity-20 pointer-events-none"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 text-indigo-400 mb-3">
               <DollarSign className="w-6 h-6 bg-indigo-500/20 rounded-full p-1 text-indigo-400" />
               <span className="font-bold tracking-widest text-[11px] uppercase font-bengali text-slate-400">বর্তমান ব্যালেন্স</span>
            </div>
            <p className="text-4xl font-black text-white tracking-tight font-mono">৳{balance}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 lg:col-span-2 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-[#f8fafc]">
            <h3 className="font-bold text-lg font-bengali text-slate-800">লেনদেনের রেকর্ড</h3>
            {isAdmin && (
              resetting ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-rose-500 font-bold font-bengali">আপনি কি নিশ্চিত?</span>
                  <button onClick={() => handleResetAll(true)} className="text-xs bg-rose-600 text-white hover:bg-rose-700 px-4 py-2 rounded-xl font-bold transition whitespace-nowrap shadow-sm font-bengali">হ্যাঁ, মুছুন</button>
                  <button onClick={() => setResetting(false)} className="text-xs bg-slate-200 text-slate-700 hover:bg-slate-300 px-4 py-2 rounded-xl font-bold transition whitespace-nowrap font-bengali">বাতিল</button>
                </div>
              ) : (
                <button 
                  onClick={() => handleResetAll(false)} 
                  className="text-xs bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white px-4 py-2 rounded-xl font-bold border border-rose-100 transition whitespace-nowrap font-bengali active:scale-95"
                >
                  সব মুছুন
                </button>
              )
            )}
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left">
              <thead className="bg-[#f8fafc] border-b border-slate-200">
                <tr>
                  <th className="p-4 text-xs font-black text-[#64748B] uppercase tracking-widest font-bengali">তারিখ</th>
                  <th className="p-4 text-xs font-black text-[#64748B] uppercase tracking-widest font-bengali">বিবরণ</th>
                  <th className="p-4 text-xs font-black text-[#64748B] uppercase tracking-widest text-right font-bengali">পরিমাণ</th>
                  {isAdmin && <th className="p-4 text-xs font-black text-[#64748B] uppercase tracking-widest text-right font-bengali">অ্যাকশন</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {finances.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(f => (
                  <tr key={f.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 text-sm font-medium text-slate-500 font-mono">
                      {new Date(f.date).toLocaleDateString()}
                    </td>
                    <td className="p-4 font-bold text-slate-800 font-bengali">{f.description}</td>
                    <td className={`p-4 text-right font-black font-mono text-base ${f.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {f.type === 'income' ? '+' : '-'}৳{f.amount}
                    </td>
                    {isAdmin && (
                      <td className="p-4 text-right flex justify-end">
                         {deletingId === f.id ? (
                            <div className="flex justify-end gap-2 items-center">
                               <button onClick={() => handleDelete(f.id, true)} className="px-3 py-1.5 bg-rose-600 text-white text-xs rounded-lg font-bold shadow-sm font-bengali">নিশ্চিত</button>
                               <button onClick={() => setDeletingId(null)} className="px-3 py-1.5 bg-slate-200 text-slate-700 text-xs rounded-lg font-bold font-bengali">বাতিল</button>
                            </div>
                         ) : (
                            <div className="flex justify-end gap-1">
                              <button onClick={() => handleEdit(f)} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all active:scale-95"><Edit2 className="w-4 h-4" /></button>
                              <button onClick={() => handleDelete(f.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all active:scale-95"><Trash2 className="w-4 h-4" /></button>
                            </div>
                         )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
            {finances.length === 0 && <div className="text-center p-12 text-slate-400 font-bold font-bengali">কোনো লেনদেনের রেকর্ড পাওয়া যায়নি।</div>}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-center">
           <h3 className="font-bold text-lg mb-6 self-start font-bengali text-slate-800">আয় বনাম ব্যয়</h3>
           {totalIncome === 0 && totalExpense === 0 ? (
             <div className="text-slate-400 py-12 text-center font-bold font-bengali bg-slate-50 rounded-xl border border-dashed border-slate-200">কোনো ডেটা নেই</div>
           ) : (
             <div className="w-full h-72">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                   <Pie
                     data={chartData}
                     cx="50%"
                     cy="50%"
                     innerRadius={60}
                     outerRadius={80}
                     paddingAngle={5}
                     dataKey="value"
                   >
                     {chartData.map((entry, index) => (
                       <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                     ))}
                   </Pie>
                   <Tooltip formatter={(value) => `৳${value}`} />
                   <Legend verticalAlign="bottom" height={36} />
                 </PieChart>
               </ResponsiveContainer>
             </div>
           )}
        </div>
      </div>
    </div>
  );

  if (isDashboard) return content;

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
       <div className="max-w-7xl mx-auto">
          {content}
       </div>
    </div>
  );
}
