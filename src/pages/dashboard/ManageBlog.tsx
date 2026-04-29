import React, { useEffect, useState } from 'react';
import { useAuth } from '../../store/AuthContext';
import { Plus, Edit2, Trash2, FileText } from 'lucide-react';

interface BlogPost {
  id: string;
  title: string;
  content: string;
  date: string;
}

export default function ManageBlog() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const { token } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ title: '', content: '' });

  const fetchPosts = () => {
    fetch('/api/posts')
      .then(r => r.json())
      .then(data => setPosts(data || []))
      .catch(() => setPosts([]));
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
        alert('Authentication error. Please log in again.');
        return;
    }
    const url = editingId ? `/api/posts/${editingId}` : '/api/posts';
    const method = editingId ? 'PUT' : 'POST';

    try {
        const res = await fetch(url, {
          method,
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(formData)
        });
        
        if (res.ok) {
            setShowModal(false);
            setFormData({ title: '', content: '' });
            setEditingId(null);
            fetchPosts();
        } else {
            const err = await res.json().catch(() => ({ error: 'Unknown server error' }));
            alert(err.error || 'Failed to publish post');
        }
    } catch (error) {
        console.error('Error publishing post:', error);
        alert('Internal connection error.');
    }
  };

  const handleEdit = (post: BlogPost) => {
    setFormData({ title: post.title, content: post.content });
    setEditingId(post.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {

    const res = await fetch(`/api/posts/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
        fetchPosts();
    } else {
        alert('Failed to delete post');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Manage Blog</h2>
          <p className="text-slate-500 text-sm mt-1">Write and manage news and articles.</p>
        </div>
        <button 
          onClick={() => { setFormData({ title: '', content: '' }); setEditingId(null); setShowModal(true); }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-indigo-700"
        >
          <Plus className="w-4 h-4" /> New Post
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden text-left">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase border-b">Date</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase border-b">Title</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase border-b text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {posts.map(post => (
              <tr key={post.id} className="hover:bg-slate-50 transition">
                <td className="p-4 text-sm text-slate-500">{new Date(post.date).toLocaleDateString()}</td>
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
        {posts.length === 0 && <div className="p-12 text-center text-slate-400">No blog posts yet.</div>}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-6 shadow-xl">
            <h3 className="text-xl font-semibold mb-4 text-slate-900">{editingId ? 'Edit Post' : 'New Blog Post'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Post Title</label>
                <input type="text" required value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} className="w-full border border-slate-200 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 shadow-sm" placeholder="Title of the article" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-slate-700">Content</label>
                <textarea 
                   required 
                   rows={10}
                   value={formData.content} 
                   onChange={e=>setFormData({...formData, content: e.target.value})} 
                   className="w-full border border-slate-200 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 shadow-sm resize-none" 
                   placeholder="Write your content here..."
                ></textarea>
              </div>
              <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 font-medium text-slate-600 hover:text-slate-900">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">Publish Post</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
