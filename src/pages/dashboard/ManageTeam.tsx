import React, { useEffect, useState } from 'react';
import { useAuth } from '../../store/AuthContext';
import { Plus, Edit2, Trash2, UserPlus } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  contact: string;
  image: string;
}

export default function ManageTeam() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const { token } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', role: '', contact: '', image: '' });

  const fetchTeam = () => {
    fetch('/api/team')
      .then(r => r.json())
      .then(setTeam);
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert('Image must be less than 2MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
        alert('Authentication error. Please log in again.');
        return;
    }
    const url = editingId ? `/api/team/${editingId}` : '/api/team';
    const method = editingId ? 'PUT' : 'POST';

    const finalData = {
        ...formData,
        image: formData.image || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=100&h=100&fit=crop'
    };

    try {
        const res = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(finalData)
        });
        
        if (res.ok) {
            setShowModal(false);
            setFormData({ name: '', role: '', contact: '', image: '' });
            setEditingId(null);
            fetchTeam();
        } else {
            const err = await res.json().catch(() => ({ error: 'Unknown server error' }));
            alert(err.error || 'Failed to save member');
        }
    } catch (error) {
        console.error('Error saving team member:', error);
        alert('Internal connection error.');
    }
  };

  const handleEdit = (member: TeamMember) => {
    const { id, ...data } = member;
    setFormData(data);
    setEditingId(member.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {

    try {
        const res = await fetch(`/api/team/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            fetchTeam();
        } else {
            const err = await res.json().catch(() => ({ error: 'Delete failed' }));
            alert(err.error || 'Failed to delete member');
        }
    } catch (error) {
        console.error('Delete error:', error);
        alert('Connection error.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Manage Team</h2>
          <p className="text-slate-500 text-sm mt-1">Add or update library committee members.</p>
        </div>
        <button 
          onClick={() => { setFormData({ name: '', role: '', contact: '', image: '' }); setEditingId(null); setShowModal(true); }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" /> Add Member
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {team.map(member => (
          <div key={member.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
            <img src={member.image} alt={member.name} className="w-16 h-16 rounded-full object-cover border-2 border-slate-100" />
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">{member.name}</h3>
              <p className="text-sm text-indigo-600 font-medium">{member.role}</p>
              <p className="text-xs text-slate-500 mt-1">{member.contact}</p>
              <div className="flex gap-2 mt-4">
                <button onClick={() => handleEdit(member)} className="text-xs font-medium text-slate-600 hover:text-indigo-600">Edit</button>
                <button onClick={() => handleDelete(member.id)} className="text-xs font-medium text-rose-600 hover:text-rose-700">Delete</button>
              </div>
            </div>
          </div>
        ))}
        {team.length === 0 && (
          <div className="col-span-full p-12 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400">
            No team members added yet.
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h3 className="text-xl font-semibold mb-4 text-slate-900">{editingId ? 'Edit Team Member' : 'Add Team Member'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Full Name</label>
                <input type="text" required value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="w-full border p-2.5 rounded-lg border-slate-200" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Role / Designation</label>
                <input type="text" required value={formData.role} onChange={e=>setFormData({...formData, role: e.target.value})} className="w-full border p-2.5 rounded-lg border-slate-200" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Contact Info</label>
                <input type="text" required value={formData.contact} onChange={e=>setFormData({...formData, contact: e.target.value})} className="w-full border p-2.5 rounded-lg border-slate-200" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Profile Image (Optional)</label>
                <div className="flex items-center gap-4">
                  {formData.image && (
                    <img src={formData.image} alt="Preview" className="w-12 h-12 rounded-full object-cover border border-slate-200" />
                  )}
                  <input type="file" accept="image/*" onChange={handleImageUpload} className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 font-medium text-slate-600 hover:text-slate-900">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">Save Member</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
