import React, { useEffect, useState } from 'react';
import { useAuth } from '../../store/AuthContext';
import { Clock, Check, X, Trash2 } from 'lucide-react';

interface PreBooking {
  id: string;
  userId: string;
  userName: string;
  bookId: string;
  status: 'Pending' | 'Completed' | 'Cancelled';
  date: string;
  adminNote?: string;
  collectDate?: string;
}

export default function ManagePreBookings() {
  const [bookings, setBookings] = useState<PreBooking[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editData, setEditData] = useState({ adminNote: '', collectDate: '' });
  const { token } = useAuth();

  const fetchData = () => {
    Promise.all([
      fetch('/api/pre-bookings', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/books').then(r => r.json())
    ]).then(([preData, bookData]) => {
      setBookings(preData || []);
      setBooks(bookData || []);
    });
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleUpdateNotes = async (id: string) => {
    try {
      const res = await fetch(`/api/pre-bookings/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(editData)
      });
      if (res.ok) {
        setEditId(null);
        fetchData();
        alert('Notes updated successfully!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStatus = async (id: string, status: string) => {
    try {
      const res = await fetch(`/api/pre-bookings/${id}`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ status })
      });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Remove this pre-booking record?')) return;
    try {
       const res = await fetch(`/api/pre-bookings/${id}`, {
         method: 'DELETE',
         headers: { Authorization: `Bearer ${token}` }
       });
       if (res.ok) {
           fetchData();
       } else {
           alert('Failed to delete pre-booking');
       }
    } catch (err) {
       console.error(err);
       alert('Connection error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Pre-bookings Requests</h2>
          <p className="text-slate-500 text-sm mt-1">Review and manage member requests for books.</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b">
              <tr>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">User</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Book</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Request Date</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {bookings.map(b => {
                const book = books.find(bk => String(bk.id) === String(b.bookId));
                return (
                  <tr key={b.id} className="hover:bg-slate-50 transition">
                    <td className="p-4">
                      <div className="font-semibold text-slate-900">{b.userName}</div>
                      <div className="text-[10px] text-slate-400 font-mono tracking-tighter">USER_ID: {b.userId}</div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-slate-700">{book?.title || 'Unknown Book'}</div>
                      <div className="text-xs font-mono text-indigo-600 font-bold">{book?.bookCode || 'NO_CODE'}</div>
                      {b.adminNote && (
                         <div className="mt-1 text-[10px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded inline-block">
                           Msg: {b.adminNote}
                         </div>
                      )}
                      {b.collectDate && (
                         <div className="mt-1 text-[10px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded inline-block block mt-1">
                           Collect Date: {b.collectDate}
                         </div>
                      )}
                    </td>
                    <td className="p-4 text-sm text-slate-500">
                      {new Date(b.date).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        b.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                        b.status === 'Cancelled' ? 'bg-rose-100 text-rose-700' :
                        'bg-amber-100 text-amber-700 animate-pulse'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                            {b.status === 'Pending' && (
                            <>
                                <button 
                                onClick={() => handleStatus(b.id, 'Completed')}
                                className="p-1.5 bg-emerald-50 text-emerald-600 rounded hover:bg-emerald-100 transition shadow-sm border border-emerald-100"
                                title="Mark as Completed"
                                >
                                <Check className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                onClick={() => handleStatus(b.id, 'Cancelled')}
                                className="p-1.5 bg-rose-50 text-rose-600 rounded hover:bg-rose-100 transition shadow-sm border border-rose-100"
                                title="Cancel Request"
                                >
                                <X className="w-3.5 h-3.5" />
                                </button>
                            </>
                            )}
                            <button 
                                onClick={() => {
                                    setEditId(b.id);
                                    setEditData({ adminNote: b.adminNote || '', collectDate: b.collectDate || '' });
                                }}
                                className="p-1.5 bg-slate-50 text-slate-600 rounded hover:bg-slate-100 transition border border-slate-200"
                                title="Edit Note/Date"
                            >
                                <Clock className="w-3.5 h-3.5" />
                            </button>
                            <button 
                            onClick={() => handleDelete(b.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                            title="Delete Record"
                            >
                            <Trash2 className="w-3.5 h-3.5" />
                            </button>
                        </div>
                        {editId === b.id && (
                           <div className="mt-2 p-3 bg-slate-50 border rounded-xl space-y-2 w-64 text-left shadow-lg scale-95 origin-top-right transition-all">
                              <input 
                                type="text" 
                                placeholder="Admin Message (e.g. Boiti collect korun)"
                                className="w-full p-2 text-xs border rounded bg-white"
                                value={editData.adminNote}
                                onChange={e => setEditData({...editData, adminNote: e.target.value})}
                              />
                              <input 
                                type="text" 
                                placeholder="Collect Date (e.g. 30 April)"
                                className="w-full p-2 text-xs border rounded bg-white"
                                value={editData.collectDate}
                                onChange={e => setEditData({...editData, collectDate: e.target.value})}
                              />
                              <div className="flex gap-2">
                                <button onClick={() => handleUpdateNotes(b.id)} className="flex-1 bg-indigo-600 text-white py-1.5 rounded text-[10px] font-bold">Save</button>
                                <button onClick={() => setEditId(null)} className="flex-1 bg-slate-200 py-1.5 rounded text-[10px] font-bold">Cancel</button>
                              </div>
                           </div>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {bookings.length === 0 && (
          <div className="p-12 text-center text-slate-400">
            <Clock className="w-12 h-12 mx-auto mb-4 opacity-10" />
            <p>No pre-bookings found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
