import React, { useEffect, useState } from 'react';
import { useAuth } from '../../store/AuthContext';
import { Check, Search, Calendar, Plus, Trash2, Edit2, ShieldAlert, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DonorMember {
  id: string;
  name: string;
  phone: string;
  address?: string;
  createdAt: string;
}

interface DonorPayment {
  id: string;
  donorId: string;
  amount: number;
  month: string;
  status: string; // Paid, Unpaid
  date: string;
}

export default function ManageDonors() {
  const [donors, setDonors] = useState<DonorMember[]>([]);
  const [payments, setPayments] = useState<DonorPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterOption, setFilterOption] = useState<'all' | 'paid' | 'unpaid'>('all');
  const { token } = useAuth();
  
  const [showAddDonor, setShowAddDonor] = useState(false);
  const [donorForm, setDonorForm] = useState({ name: '', phone: '', address: '' });
  
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedDonorId, setSelectedDonorId] = useState('');
  const [amount, setAmount] = useState(500);
  const [paymentStatus, setPaymentStatus] = useState('Paid');
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const loadData = () => {
    Promise.all([
      fetch('/api/donor-members', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/donor-payments', { headers: { Authorization: `Bearer ${token}` } })
    ])
    .then(async ([dRes, pRes]) => {
      const dData = await dRes.json();
      const pData = await pRes.json();
      setDonors(dData);
      setPayments(pData);
      setLoading(false);
    });
  };

  useEffect(() => { loadData(); }, [token]);

  const handleAddDonor = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/donor-members', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(donorForm)
    });
    if (res.ok) {
      setShowAddDonor(false);
      setDonorForm({ name: '', phone: '', address: '' });
      loadData();
    } else {
      alert('Failed to add donor member');
    }
  };

  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteDonor = async (id: string, force: boolean = false) => {
    if (!force) {
      setDeletingId(id);
      return;
    }
    const res = await fetch(`/api/donor-members/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
       setDeletingId(null);
       loadData();
    } else {
       alert('Failed to delete donor member');
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDonorId) return alert('Select a donor');
    const res = await fetch('/api/donor-payments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ donorId: selectedDonorId, amount, month, status: paymentStatus })
    });
    if (res.ok) {
      setShowPaymentForm(false);
      loadData();
    } else {
      alert('Failed to record payment');
    }
  };

  const handleTogglePaymentStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'Paid' ? 'Unpaid' : 'Paid';
    const res = await fetch(`/api/donor-payments/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status: newStatus })
    });
    if (res.ok) loadData();
  };

  const [deletingPaymentId, setDeletingPaymentId] = useState<string | null>(null);

  const handleDeletePayment = async (id: string, force: boolean = false) => {
    if (!force) {
      setDeletingPaymentId(id);
      return;
    }
    const res = await fetch(`/api/donor-payments/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
       setDeletingPaymentId(null);
       loadData();
    }
  };

  const downloadReport = () => {
    const doc = new jsPDF();
    doc.text('Monthly Donor Members Report', 14, 15);
    
    // Total amounts currently filtered (or all time)
    const tableData = donors.map(d => {
      const p = payments.filter(pay => pay.donorId === d.id);
      const total = p.filter(pay => pay.status === 'Paid').reduce((sum, pay) => sum + Number(pay.amount), 0);
      return [
        d.name,
        d.phone,
        `৳${total}`
      ];
    });

    autoTable(doc, {
      head: [['Donor Name', 'Phone', 'Total Contribution']],
      body: tableData,
      startY: 25,
    });

    doc.save('donor_report.pdf');
  };

  const filtered = donors.filter(d => 
    d.name.toLowerCase().includes(search.toLowerCase()) || 
    d.phone.includes(search)
  ).filter(d => {
    if (filterOption === 'all') return true;
    const donorPayments = payments.filter(p => p.donorId === d.id);
    const hasUnpaid = donorPayments.some(p => p.status === 'Unpaid');
    const hasPaid = donorPayments.some(p => p.status === 'Paid');
    if (filterOption === 'unpaid') return hasUnpaid;
    if (filterOption === 'paid') return !hasUnpaid && hasPaid;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black font-bengali text-slate-900 tracking-tight">Donor Members</h2>
          <p className="text-sm text-slate-500 mt-1 font-bengali">Manage donor members and track monthly contributions.</p>
        </div>
        <div className="flex flex-wrap gap-3">
           <button onClick={downloadReport} className="flex-1 sm:flex-none items-center justify-center gap-2 bg-white text-slate-700 border border-slate-200 px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm hover:shadow-md hover:border-slate-300 transition-all font-bengali">
              <FileDown className="w-4 h-4" /> Report
           </button>
           <button onClick={() => { setShowPaymentForm(true); setShowAddDonor(false); }} className="flex-1 sm:flex-none items-center justify-center gap-2 bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm shadow-emerald-200 hover:shadow-md hover:bg-emerald-700 transition-all font-bengali">
              <Calendar className="w-4 h-4" /> Update Monthly Payment
           </button>
           <button onClick={() => { setShowAddDonor(true); setShowPaymentForm(false); }} className="flex-1 sm:flex-none items-center justify-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold shadow-sm shadow-indigo-200 hover:shadow-md hover:bg-indigo-700 transition-all font-bengali">
              <Plus className="w-4 h-4 text-indigo-200" /> Add Donor
           </button>
        </div>
      </div>

      {showAddDonor && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-lg mb-4 font-bengali">Add New Donor Member</h3>
          <form onSubmit={handleAddDonor} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1 font-bengali">Name</label>
              <input type="text" required value={donorForm.name} onChange={e => setDonorForm({...donorForm, name: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bengali" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1 font-bengali">Phone</label>
              <input type="text" required value={donorForm.phone} onChange={e => setDonorForm({...donorForm, phone: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-mono" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1 font-bengali">Address (Optional)</label>
              <input type="text" value={donorForm.address} onChange={e => setDonorForm({...donorForm, address: e.target.value})} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bengali" />
            </div>
            <div className="md:col-span-2 flex justify-end gap-3 mt-2">
               <button type="button" onClick={() => setShowAddDonor(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-50 rounded-xl text-sm font-bold border border-slate-200 font-bengali">Cancel</button>
               <button type="submit" className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-sm shadow-indigo-200 font-bengali">Save Donor</button>
            </div>
          </form>
        </div>
      )}

      {showPaymentForm && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-lg mb-4 font-bengali">Update Monthly Payment</h3>
          <form onSubmit={handleRecordPayment} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
            <div className="md:col-span-1">
              <label className="block text-sm font-bold text-slate-700 mb-1 font-bengali">Donor Member</label>
              <select value={selectedDonorId} onChange={e => setSelectedDonorId(e.target.value)} required className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bengali">
                <option value="">Select Donor</option>
                {donors.map(d => <option key={d.id} value={d.id}>{d.name} ({d.phone})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1 font-bengali">Month (YYYY-MM)</label>
              <input type="month" value={month} onChange={e => setMonth(e.target.value)} required className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-mono" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1 font-bengali">Amount (৳)</label>
              <input type="number" value={amount} onChange={e => setAmount(Number(e.target.value))} required className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-mono" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1 font-bengali">Status</label>
              <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bengali">
                <option value="Paid">Paid</option>
                <option value="Unpaid">Unpaid (Due)</option>
              </select>
            </div>
            <div className="md:col-span-4 flex justify-end gap-3 mt-2">
               <button type="button" onClick={() => setShowPaymentForm(false)} className="px-5 py-2.5 text-slate-600 hover:bg-slate-50 rounded-xl text-sm font-bold border border-slate-200 font-bengali">Cancel</button>
               <button type="submit" className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-sm shadow-emerald-200 font-bengali">Record Payment</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 md:px-6 md:py-4 border-b border-slate-100 flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-slate-50/50">
           <h3 className="font-bold text-slate-800">Donor Records</h3>
           <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
             <select 
               value={filterOption} 
               onChange={e => setFilterOption(e.target.value as any)}
               className="w-full sm:w-auto px-3 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
             >
               <option value="all">All Donors</option>
               <option value="unpaid">Has Unpaid Dues</option>
               <option value="paid">All Paid</option>
             </select>
             <div className="relative w-full sm:w-64">
               <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
               <input type="text" placeholder="Search donors..." value={search} onChange={e => setSearch(e.target.value)} className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm bg-white" />
             </div>
           </div>
        </div>

        {loading ? <div className="p-8 text-center text-slate-500">Loading...</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider font-bengali">Donor Profile</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider font-bengali">Payment Tracking (Recent)</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right font-bengali">Total</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right font-bengali">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((d, index) => {
                  const donorPayments = payments.filter(p => p.donorId === d.id).sort((a,b) => b.month.localeCompare(a.month));
                  const total = donorPayments.filter(p => p.status === 'Paid').reduce((sum, p) => sum + Number(p.amount), 0);
                  const hasUnpaid = donorPayments.some(p => p.status === 'Unpaid');
                  
                  return (
                    <tr key={d.id} className={`hover:bg-slate-50/50 transition-colors ${hasUnpaid ? 'bg-rose-50/30' : ''}`}>
                      <td className="p-4 align-top">
                        <div className="font-bengali font-bold text-slate-900 text-lg flex items-center gap-2">
                           {d.serial || index + 1}. {d.name}
                           {hasUnpaid && <span className="bg-rose-100 text-rose-700 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase animate-pulse shadow-sm shadow-rose-200">Unpaid Dues</span>}
                        </div>
                        <div className="text-xs text-slate-500 font-mono mt-1">📞 {d.phone}</div>
                        {d.address && <div className="text-[11px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">{d.address}</div>}
                      </td>
                      <td className="p-4 align-top">
                        <div className="flex flex-wrap gap-2">
                          {donorPayments.length === 0 && <span className="text-xs text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">No payment records.</span>}
                          {donorPayments.slice(0, 4).map(p => (
                             <div key={p.id} className="flex items-center gap-2 border border-slate-100 bg-white rounded-lg p-1.5 shadow-sm">
                                <span className="text-[10px] font-bold text-slate-600 bg-slate-50 px-2 py-1 rounded-md">{p.month}</span>
                                <span className={`text-[10px] font-bold px-2 py-1 rounded-md cursor-pointer transition ${p.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-rose-50 text-rose-600 hover:bg-rose-100'}`} onClick={() => handleTogglePaymentStatus(p.id, p.status)} title="Click to toggle status">
                                  {p.status}
                                </span>
                                <span className="text-xs font-bold text-slate-700 ml-1">৳{p.amount}</span>
                                {deletingPaymentId === p.id ? (
                                  <div className="flex items-center gap-1 ml-auto">
                                    <button onClick={() => handleDeletePayment(p.id, true)} className="text-[10px] bg-rose-600 text-white px-1.5 py-0.5 rounded font-bold">Del</button>
                                    <button onClick={() => setDeletingPaymentId(null)} className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-bold">X</button>
                                  </div>
                                ) : (
                                  <button onClick={() => handleDeletePayment(p.id)} className="text-slate-300 hover:text-rose-500 ml-1 p-1 rounded hover:bg-rose-50 transition" title="Delete Payment"><Trash2 className="w-3 h-3"/></button>
                                )}
                             </div>
                          ))}
                          {donorPayments.length > 4 && <span className="text-xs text-slate-400 italic flex items-center justify-center px-2">+{donorPayments.length - 4} older</span>}
                        </div>
                      </td>
                      <td className="p-4 text-right align-top">
                        <span className="font-black text-emerald-600 text-lg">৳{total}</span>
                      </td>
                      <td className="p-4 text-right align-top min-w-[120px]">
                         {deletingId === d.id ? (
                            <div className="flex items-center justify-end gap-2">
                               <button onClick={() => handleDeleteDonor(d.id, true)} className="px-2 py-1 bg-rose-600 text-white text-xs rounded font-bold shadow-sm">Delete</button>
                               <button onClick={() => setDeletingId(null)} className="px-2 py-1 bg-slate-200 text-slate-700 text-xs rounded font-bold">Cancel</button>
                            </div>
                         ) : (
                            <button onClick={() => handleDeleteDonor(d.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition shadow-sm border border-transparent hover:border-rose-100" title="Delete Donor">
                               <Trash2 className="w-4 h-4" />
                            </button>
                         )}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={4} className="p-12 text-center text-slate-500 font-bengali text-sm bg-slate-50/50">No donor members found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
