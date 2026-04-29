import React, { useEffect, useState } from 'react';
import { useAuth } from '../../store/AuthContext';
import { Search, UserX, Trash2, AlertTriangle } from 'lucide-react';
import { motion } from 'motion/react';

interface LibUser {
  id: string;
  name: string;
  username: string;
  role: string;
  status: string;
  memberId?: string;
  phone?: string;
}

export default function DeleteUsers() {
  const [users, setUsers] = useState<LibUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { token, user: currentUser } = useAuth();

  const fetchUsers = () => {
    fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setUsers(data);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchUsers();
  }, [token]);

  const handleDelete = async (id: string, name: string) => {
    if (id === currentUser?.id) {
        alert('You cannot delete your own account.');
        return;
    }

    try {
        const response = await fetch(`/api/users/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (response.ok) {
            setUsers(users.filter(u => String(u.id) !== String(id)));
        } else {
            const data = await response.json().catch(() => ({ error: 'Delete failed' }));
            alert(data.error || 'Failed to delete user');
        }
    } catch (error) {
        console.error('Error deleting user:', error);
        alert('Server connection error. Could not delete.');
    }
  };

  const filtered = users.filter(u => 
    u.name.toLowerCase().includes(search.toLowerCase()) || 
    (u.memberId && u.memberId.toString().includes(search)) ||
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      <div className="bg-rose-50 text-rose-900 border border-rose-200 p-8 rounded-3xl relative overflow-hidden shadow-sm">
        <div className="relative z-10">
          <h2 className="text-3xl font-black tracking-tight mb-2 flex items-center gap-3">
            <UserX className="w-8 h-8" />
            Delete Members
          </h2>
          <p className="text-rose-700 font-medium max-w-lg">
            Warning: This page allows you to permanently remove members from the library system. Proceed with caution.
          </p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        <input 
          type="text" 
          placeholder="Search members by name, id, or username to delete..." 
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-4 focus:outline-none focus:ring-2 focus:ring-rose-500 shadow-sm font-medium"
        />
      </div>

      <div className="space-y-4">
        {loading ? (
            <div className="p-10 text-center text-slate-400">Loading members...</div>
        ) : filtered.length === 0 ? (
            <div className="p-10 text-center bg-white rounded-2xl border border-dashed border-slate-200 text-slate-400 font-medium">
                No matching members found.
            </div>
        ) : (
            filtered.map((u, idx) => (
                <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    key={u.id} 
                    className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between"
                >
                    <div>
                        <div className="flex items-center gap-3">
                            <h3 className="font-bold text-slate-900 text-lg">{u.name}</h3>
                            <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold uppercase">
                                @{u.username}
                            </span>
                            {u.memberId && (
                                <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                                    ID: {u.memberId}
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                            <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded ${
                                u.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                            }`}>
                                {u.status}
                            </span>
                            <span className="text-xs text-slate-500 capitalize">{u.role}</span>
                            {u.phone && <span className="text-xs text-slate-400 ml-2">📞 {u.phone}</span>}
                        </div>
                    </div>
                    
                    <button
                        onClick={() => handleDelete(u.id, u.name)}
                        className="bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-colors flex items-center gap-2 shadow-sm"
                    >
                        <Trash2 className="w-4 h-4" />
                        Delete
                    </button>
                </motion.div>
            ))
        )}
      </div>
    </div>
  );
}
