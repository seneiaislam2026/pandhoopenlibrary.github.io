import React, { useEffect, useState } from 'react';
import { useAuth } from '../../store/AuthContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { DollarSign, ArrowUpRight, ArrowDownRight, Plus, Edit2, Trash2 } from 'lucide-react';

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
  const { token } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    type: 'expense',
    amount: 0,
    description: ''
  });

  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);

  const loadData = () => {
    fetch('/api/finances', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setFinances(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const url = editingId ? `/api/finances/${editingId}` : '/api/finances';
    const method = editingId ? 'PUT' : 'POST';

    await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(formData)
    });
    setShowForm(false);
    setEditingId(null);
    loadData();
    setFormData({ type: 'expense', amount: 0, description: '' });
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
    const res = await fetch(`/api/finances/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
        setDeletingId(null);
        loadData();
    } else {
        alert('Failed to delete finance record');
    }
  };

  const handleResetAll = async (force: boolean = false) => {
    if (!force) {
      setResetting(true);
      return;
    }
    const res = await fetch('/api/finances/reset', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
        setResetting(false);
        loadData();
    } else {
        alert('Failed to reset records');
    }
  };

  const totalIncome = finances.filter(f => f.type === 'income').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const totalExpense = finances.filter(f => f.type === 'expense').reduce((acc, curr) => acc + Number(curr.amount), 0);
  const balance = totalIncome - totalExpense;

  const chartData = [
    { name: 'Income', value: totalIncome },
    { name: 'Expense', value: totalExpense }
  ];
  const COLORS = ['#10b981', '#f43f5e'];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Finances & Reports</h2>
        <button 
          onClick={() => { setShowForm(!showForm); setEditingId(null); setFormData({ type: 'expense', amount: 0, description: '' }); }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-indigo-700 transition flex items-center gap-2"
        >
          <Plus className="w-4 h-4" /> {editingId ? 'Editing Record' : 'Add Record'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Type</label>
            <select
              value={formData.type}
              onChange={e => setFormData({ ...formData, type: e.target.value as 'income' | 'expense' })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              <option value="income">Income</option>
              <option value="expense">Expense</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Amount (৳)</label>
            <input
              type="number"
              required
              min="0"
              value={formData.amount || ''}
              onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="md:col-span-2 flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <input
                type="text"
                required
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            <button type="submit" className="bg-slate-900 text-white px-6 py-2 rounded-lg font-medium hover:bg-slate-800 h-[42px] self-end">
              Save
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-center">
          <div className="flex items-center gap-3 text-emerald-600 mb-2">
             <ArrowUpRight className="w-5 h-5 bg-emerald-100 rounded-full p-0.5" />
             <span className="font-semibold tracking-wide">TOTAL INCOME</span>
          </div>
          <p className="text-4xl font-bold text-slate-900">৳{totalIncome}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col justify-center">
          <div className="flex items-center gap-3 text-rose-600 mb-2">
             <ArrowDownRight className="w-5 h-5 bg-rose-100 rounded-full p-0.5" />
             <span className="font-semibold tracking-wide">TOTAL EXPENSES</span>
          </div>
          <p className="text-4xl font-bold text-slate-900">৳{totalExpense}</p>
        </div>

        <div className="bg-slate-900 rounded-2xl p-6 shadow-sm flex flex-col justify-center text-white">
          <div className="flex items-center gap-3 text-slate-400 mb-2">
             <DollarSign className="w-5 h-5 bg-slate-800 rounded-full p-0.5" />
             <span className="font-semibold tracking-wide">NET BALANCE</span>
          </div>
          <p className="text-4xl font-bold text-white">৳{balance}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-lg">Transaction History</h3>
            {resetting ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-rose-500 font-medium">Are you sure?</span>
                <button onClick={() => handleResetAll(true)} className="text-xs bg-rose-600 text-white hover:bg-rose-700 px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap shadow-sm">Yes, Reset</button>
                <button onClick={() => setResetting(false)} className="text-xs bg-slate-200 text-slate-700 hover:bg-slate-300 px-3 py-1.5 rounded-lg font-bold transition whitespace-nowrap">Cancel</button>
              </div>
            ) : (
              <button 
                onClick={() => handleResetAll(false)} 
                className="text-xs bg-rose-50 text-rose-600 hover:bg-rose-100 px-3 py-1.5 rounded-lg font-bold border border-rose-100 transition whitespace-nowrap"
              >
                Reset All
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="border-b border-slate-100 p-3 text-xs font-semibold text-slate-500 uppercase">Date</th>
                  <th className="border-b border-slate-100 p-3 text-xs font-semibold text-slate-500 uppercase">Description</th>
                  <th className="border-b border-slate-100 p-3 text-xs font-semibold text-slate-500 uppercase text-right">Amount</th>
                  <th className="border-b border-slate-100 p-3 text-xs font-semibold text-slate-500 uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {finances.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(f => (
                  <tr key={f.id} className="hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors">
                    <td className="p-3 text-sm text-slate-500">
                      {new Date(f.date).toLocaleDateString()}
                    </td>
                    <td className="p-3 font-medium text-slate-900">{f.description}</td>
                    <td className={`p-3 font-semibold text-right ${f.type === 'income' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {f.type === 'income' ? '+' : '-'}৳{f.amount}
                    </td>
                    <td className="p-3 text-right">
                       {deletingId === f.id ? (
                          <div className="flex justify-end gap-2">
                             <button onClick={() => handleDelete(f.id, true)} className="px-2 py-1 bg-rose-600 text-white text-xs rounded font-bold shadow-sm">Delete</button>
                             <button onClick={() => setDeletingId(null)} className="px-2 py-1 bg-slate-200 text-slate-700 text-xs rounded font-bold">Cancel</button>
                          </div>
                       ) : (
                          <div className="flex justify-end gap-2">
                            <button onClick={() => handleEdit(f)} className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(f.id)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"><Trash2 className="w-4 h-4" /></button>
                          </div>
                       )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {finances.length === 0 && <div className="text-center p-8 text-slate-500">No records found.</div>}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 flex flex-col items-center justify-center">
           <h3 className="font-semibold text-lg mb-4 self-start">Income vs Expense</h3>
           {totalIncome === 0 && totalExpense === 0 ? (
             <div className="text-slate-400 py-12">No data to display</div>
           ) : (
             <div className="w-full h-64">
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
}
