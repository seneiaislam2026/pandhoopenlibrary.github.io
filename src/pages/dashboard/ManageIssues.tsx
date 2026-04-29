import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { BookmarkMinus, CheckCircle2, Trash2, ShieldAlert, FileDown } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import Select from 'react-select';

export default function ManageIssues() {
  const [issues, setIssues] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const { token } = useAuth();
  const location = useLocation();
  
  const [showIssueForm, setShowIssueForm] = useState(false);
  
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'issue') {
      setShowIssueForm(true);
    }
  }, [location]);

  const [formData, setFormData] = useState({ bookId: '', userId: '', expectedReturnDate: '' });

  const [editId, setEditId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  const fetchData = () => {
    Promise.all([
      fetch('/api/issues', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/api/books'),
      fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } })
    ]).then(async ([iRes, bRes, uRes]) => {
      setIssues(await iRes.json());
      setBooks(await bRes.json());
      setUsers(await uRes.json());
    });
  };

  useEffect(() => { fetchData(); }, []);

  const handleUpdateNote = async (id: string, text: string = note) => {
    await fetch(`/api/issues/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ adminNote: text })
    });
    setEditId(null);
    fetchData();
  };

  const handleAlert = async (id: string, userPhone: string) => {
    alert(`Alert sent to phone number: ${userPhone || 'N/A'}`);
    await handleUpdateNote(id, 'ALERT SENT (Overdue)');
  };

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if(!formData.userId || !formData.bookId || !formData.expectedReturnDate) {
        alert("Please complete the form");
        return;
    }
    await fetch('/api/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...formData, issueDate: new Date().toISOString() })
    });
    setShowIssueForm(false);
    fetchData();
  };

  const downloadOverdueReport = () => {
    const doc = new jsPDF();
    doc.text('Overdue Books Report', 14, 15);
    
    const overdueIssues = issues.filter(i => {
      if (i.status !== 'Issued') return false;
      const expected = new Date(i.expectedReturnDate);
      return expected < new Date();
    });

    const tableData = overdueIssues.map(i => {
      const book = books.find(b => b.id === i.bookId);
      const user = users.find(u => u.id === i.userId);
      return [
        user?.memberId || 'N/A',
        user?.name || 'Unknown',
        user?.phone || 'N/A',
        book?.title || 'Unknown',
        new Date(i.expectedReturnDate).toLocaleDateString()
      ];
    });

    autoTable(doc, {
      head: [['Member ID', 'Name', 'Phone', 'Book Title', 'Due Date']],
      body: tableData,
      startY: 25,
    });

    doc.save('overdue_report.pdf');
  };

  const handleReturn = async (id: string) => {
    console.log('[DEBUG] Attempting to mark issue as returned. issueId:', id);
    try {
        const res = await fetch(`/api/issues/${id}/return`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            console.log('[DEBUG] Issue marked as returned successfully');
            fetchData();
        } else {
            const data = await res.json();
            console.error('[DEBUG] Error returning book:', data);
        }
    } catch (err) {
        console.error('[DEBUG] Failed to connect to the server for return:', err);
    }
  };

  const handleDeleteIssue = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this issue record?")) return;
    try {
        const res = await fetch(`/api/issues/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (res.ok) {
            console.log('[DEBUG] Issue record deleted successfully');
            fetchData();
        } else {
            const data = await res.json();
            console.error('[DEBUG] Error deleting issue:', data);
        }
    } catch (err) {
        console.error('[DEBUG] Failed to connect to the server for delete:', err);
    }
  };

  const userOptions = users.filter(u => u.status === 'active').map(u => ({
    value: u.id,
    label: `${u.name} (@${u.username})`
  }));

  const bookOptions = books.filter(b => b.status === 'Available').map(b => ({
    value: b.id,
    label: `${b.title} [${b.bookCode || 'N/A'}]`
  }));

  const selectStyles = {
    control: (base: any, state: any) => ({
      ...base,
      border: state.isFocused ? '2px solid #6366f1' : '2px solid #e2e8f0',
      borderRadius: '0.75rem',
      padding: '0.25rem',
      boxShadow: 'none',
      fontFamily: 'inherit',
      fontSize: '0.875rem',
      fontWeight: '500',
      color: '#334155',
      backgroundColor: 'white',
      '&:hover': {
        border: state.isFocused ? '2px solid #6366f1' : '2px solid #cbd5e1'
      }
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isSelected ? '#4f46e5' : state.isFocused ? '#e0e7ff' : 'transparent',
      color: state.isSelected ? 'white' : '#334155',
      cursor: 'pointer',
      fontFamily: 'inherit',
      fontSize: '0.875rem',
      fontWeight: state.isSelected ? '700' : '500',
      padding: '0.75rem 1rem',
      '&:active': {
        backgroundColor: '#4338ca'
      }
    }),
    placeholder: (base: any) => ({
      ...base,
      color: '#94a3b8',
      fontFamily: 'inherit'
    }),
    menu: (base: any) => ({
      ...base,
      borderRadius: '0.75rem',
      border: '1px solid #e2e8f0',
      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      overflow: 'hidden',
      zIndex: 50,
      fontFamily: 'inherit'
    })
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-bengali">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div>
           <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Issue / Return</h2>
           <p className="text-slate-500 font-medium text-sm mt-1 mb-0">Manage book rentals and returns for the library.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <input 
             type="text" 
             placeholder="Search code or user..." 
             className="border border-slate-200 px-4 py-2.5 rounded-xl text-sm w-full md:w-auto shadow-inner bg-slate-50 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium"
             value={search}
             onChange={e => setSearch(e.target.value)}
          />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="border border-slate-200 px-4 py-2.5 rounded-xl text-sm w-full md:w-auto shadow-inner bg-slate-50 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-700"
          >
            <option value="all">All Issues</option>
            <option value="issued">Currently Issued</option>
            <option value="overdue">Overdue Books</option>
            <option value="returned">Returned Books</option>
          </select>
          <button onClick={downloadOverdueReport} className="flex-1 md:flex-none justify-center bg-rose-50/50 text-rose-600 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-rose-100 transition shadow-sm border border-rose-200/50 hover:border-rose-300">
            <FileDown className="w-5 h-5" /> Overdue Report
          </button>
          <button onClick={() => setShowIssueForm(true)} className="flex-1 md:flex-none justify-center bg-indigo-600 shadow-lg shadow-indigo-600/20 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 hover:-translate-y-0.5 transition-all">
            Issue Book
          </button>
        </div>
      </div>

      {showIssueForm && (
        <form onSubmit={handleIssue} className="bg-white p-8 border border-slate-200 rounded-2xl space-y-6 shadow-xl shadow-slate-200/40 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-100 to-transparent -mr-16 -mt-16 rounded-full blur-2xl"></div>
          
          <h3 className="text-xl font-bold tracking-tight text-slate-900 mb-2">New Book Issue</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">Book <span className="text-rose-500">*</span></label>
              <Select
                options={bookOptions}
                onChange={(option: any) => setFormData({...formData, bookId: option?.value || ''})}
                placeholder="Search Book..."
                styles={selectStyles}
                classNamePrefix="react-select"
                className="text-sm font-medium focus:outline-none font-bengali"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">User <span className="text-rose-500">*</span></label>
              <Select
                options={userOptions}
                onChange={(option: any) => setFormData({...formData, userId: option?.value || ''})}
                placeholder="Search User..."
                styles={selectStyles}
                classNamePrefix="react-select"
                className="text-sm font-medium focus:outline-none font-bengali"
              />
              {formData.userId && (
                <div className="mt-3 p-4 bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl flex items-center justify-between shadow-sm">
                  <div>
                    <p className="text-sm font-extrabold text-slate-800">{users.find(u => u.id === formData.userId)?.name}</p>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">@{users.find(u => u.id === formData.userId)?.username}</p>
                  </div>
                  <div className="bg-white text-indigo-700 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest border border-indigo-200 shadow-sm">
                    ID: #{users.find(u => u.id === formData.userId)?.memberId || 'N/A'}
                  </div>
                </div>
              )}
            </div>
            
            <div className="space-y-1.5">
              <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider">Expected Return <span className="text-rose-500">*</span></label>
              <input type="date" required onChange={e=>setFormData({...formData, expectedReturnDate: new Date(e.target.value).toISOString()})} className="w-full border-2 border-slate-200 px-4 py-2 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-medium text-slate-700 transition" />
            </div>
          </div>
          
          <div className="flex justify-end gap-3 pt-6 border-t border-slate-100">
            <button type="button" onClick={() => setShowIssueForm(false)} className="px-6 py-2.5 font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition">Cancel</button>
            <button type="submit" className="bg-slate-900 shadow-xl shadow-slate-900/10 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-black transition-all hover:-translate-y-0.5">Confirm Issue</button>
          </div>
        </form>
      )}

      <div className="bg-white border text-center md:text-left border-slate-200 rounded-2xl md:rounded-3xl shadow-sm overflow-hidden md:overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[800px]">
          <thead className="bg-[#f8fafc] border-b border-slate-200">
            <tr>
              <th className="p-5 text-xs font-black tracking-widest text-[#64748B] uppercase">Issue / Status</th>
              <th className="p-5 text-xs font-black tracking-widest text-[#64748B] uppercase">Book Details</th>
              <th className="p-5 text-xs font-black tracking-widest text-[#64748B] uppercase">User Details</th>
              <th className="p-5 text-xs font-black tracking-widest text-[#64748B] uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {issues.filter(i => {
                if (filterStatus === 'returned' && i.status !== 'Returned') return false;
                if (filterStatus === 'issued' && i.status !== 'Issued') return false;
                if (filterStatus === 'overdue') {
                   if (i.status !== 'Issued') return false;
                   if (new Date(i.expectedReturnDate) >= new Date()) return false;
                }

                const book = books.find(b => b.id === i.bookId);
                const user = users.find(u => u.id === i.userId);
                const term = search.toLowerCase();
                return (book?.bookCode?.toLowerCase()?.includes(term) || book?.title?.toLowerCase()?.includes(term) || user?.memberId?.toLowerCase()?.includes(term) || user?.name?.toLowerCase()?.includes(term));
            }).map(i => (
              <tr key={i.id} className="hover:bg-slate-50 transition-colors group">
                <td className="p-5">
                   <div className="text-xs font-mono font-bold text-slate-500 uppercase">#{i.id.slice(-5)}</div>
                   <div className="mt-2">
                       {i.status === 'Issued' ? (
                          <div className="flex flex-col gap-1.5 items-start">
                             <span className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border ${new Date(i.expectedReturnDate) < new Date() ? 'bg-rose-50 text-rose-600 border-rose-200 animate-pulse' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                                {new Date(i.expectedReturnDate) < new Date() ? 'Overdue' : 'Active'}
                             </span>
                             {i.adminNote && <span className="text-indigo-700 font-bold text-[9px] bg-indigo-50 px-2 py-1 rounded border border-indigo-200">MSG: {i.adminNote}</span>}
                          </div>
                       ) : (
                          <span className="text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-widest border border-slate-200">Returned</span>
                       )}
                   </div>
                </td>
                <td className="p-5">
                  <div className="font-exrabold text-slate-900 text-sm">{books.find(b => b.id === i.bookId)?.title || 'Unknown'}</div>
                  <div className="text-[10px] mt-1 inline-blockbg-slate-100 px-2 py-0.5 rounded text-slate-500 font-bold uppercase tracking-widest border border-slate-200">Code: {books.find(b => b.id === i.bookId)?.bookCode || 'N/A'}</div>
                </td>
                <td className="p-5">
                  <div className="font-bold text-slate-900 text-sm mb-1">{users.find(u => u.id === i.userId)?.name || 'Unknown'}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-indigo-700 font-black bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 tracking-wider">
                      ID: #{users.find(u => u.id === i.userId)?.memberId || 'N/A'}
                    </span>
                    <span className="text-[11px] font-medium text-slate-500">@{users.find(u => u.id === i.userId)?.username}</span>
                  </div>
                </td>
                
                <td className="p-5 text-right align-top">
                  <div className="flex flex-col items-end gap-2 relative z-0 group-hover:z-10">
                    <div className="flex items-center gap-2">
                        {i.status === 'Issued' && (
                            <>
                                {new Date(i.expectedReturnDate) < new Date() && (
                                    <button 
                                        onClick={() => handleAlert(i.id, users.find(u => u.id === i.userId)?.phone)}
                                        className="text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white px-2.5 py-1.5 rounded-lg shadow-md shadow-rose-600/20 hover:bg-rose-700 transition flex items-center gap-1.5"
                                        title="Send Alert"
                                    >
                                        <ShieldAlert className="w-3.5 h-3.5" /> Alert
                                    </button>
                                )}
                                <button 
                                    onClick={() => {
                                        setEditId(i.id);
                                        setNote(i.adminNote || '');
                                    }}
                                    className="text-[10px] font-black uppercase tracking-wider bg-white text-slate-700 shadow-sm px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
                                >
                                    Msg
                                </button>
                                <button onClick={() => { handleReturn(i.id); }} className="text-xs bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold tracking-tight shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition flex items-center justify-center gap-1.5">
                                    <CheckCircle2 className="w-4 h-4" /> Return
                                </button>
                            </>
                        )}
                        <button onClick={() => handleDeleteIssue(i.id)} className="p-2 bg-white border border-slate-200 rounded-lg text-rose-500 shadow-sm hover:bg-rose-50 hover:text-rose-600 transition" title="Delete Record">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                    {editId === i.id && (
                       <div className="mt-2 flex gap-1 animate-in fade-in slide-in-from-top-2 absolute right-0 top-12 bg-white p-2 rounded-xl shadow-xl border border-slate-200 w-64 z-20">
                          <input 
                            className="text-xs font-medium border-2 border-slate-100 focus:border-indigo-500 focus:ring-0 p-2 rounded-lg w-full transition" 
                            placeholder="Add a message..."
                            value={note}
                            onChange={e=>setNote(e.target.value)}
                            autoFocus
                          />
                          <button onClick={() => handleUpdateNote(i.id)} className="bg-indigo-600 text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-indigo-700 transition">OK</button>
                          <button onClick={() => setEditId(null)} className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-2 rounded-lg hover:bg-slate-200 transition">X</button>
                       </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
