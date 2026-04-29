import React, { useEffect, useState } from 'react';
import { useAuth } from '../../store/AuthContext';
import { Search, Plus, Edit2, Trash2, BookOpen } from 'lucide-react';

interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  status: 'Available' | 'Issued';
  cover: string;
  bookCode?: string;
  price?: number;
}

export default function ManageBooks() {
  const [books, setBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState('');
  const { token } = useAuth();
  
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{ title: string; author: string; category: string; cover: string; status: 'Available' | 'Issued'; bookCode: string }>({ title: '', author: '', category: '', cover: '', status: 'Available', bookCode: '' });

  const fetchBooks = () => {
    fetch('/api/books')
      .then(r => r.json())
      .then(setBooks);
  };

  useEffect(() => {
    fetchBooks();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
        alert('Authentication error. Please log in again.');
        return;
    }

    const url = editingId ? `/api/books/${editingId}` : '/api/books';
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
            setFormData({ title: '', author: '', category: '', cover: '', status: 'Available', bookCode: '' });
            setEditingId(null);
            fetchBooks();
        } else {
            const err = await res.json().catch(() => ({ error: 'Unknown server error' }));
            alert(err.error || 'Failed to save book');
        }
    } catch (error) {
        console.error('Error saving book:', error);
        alert('Internal connection error. Please try again.');
    }
  };

  const handleEdit = (book: Book) => {
    setFormData(book);
    setEditingId(book.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    try {
        const res = await fetch(`/api/books/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
            fetchBooks();
        } else {
            const err = await res.json().catch(() => ({ error: 'Delete failed' }));
            alert(err.error || 'Failed to delete book');
        }
    } catch (error) {
        console.error('Delete error:', error);
        alert('Internal connection error. Please try again.');
    }
  };

  const filtered = books.filter(b => b.title.toLowerCase().includes(search.toLowerCase()) || b.author.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">Books Inventory</h2>
          <p className="text-slate-500 text-sm mt-1">Manage library catalog</p>
        </div>
        <div className="flex gap-4">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search catalog..." 
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
              value={search}
              onChange={e=>setSearch(e.target.value)}
            />
          </div>
          <button 
            onClick={() => { setFormData({ title: '', author: '', category: '', cover: '', status: 'Available', bookCode: '' }); setEditingId(null); setShowModal(true); }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" /> Add Book
          </button>
        </div>
      </div>

      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Cover</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Book Code</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Title & Author</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Category</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase">Status</th>
              <th className="p-4 text-xs font-semibold text-slate-500 uppercase text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(book => (
              <tr key={book.id} className="hover:bg-slate-50 transition">
                <td className="p-4">
                  <div className="w-10 h-14 bg-slate-100 rounded flex items-center justify-center overflow-hidden">
                    {book.cover ? <img src={book.cover} alt="" className="w-full h-full object-cover" /> : <BookOpen className="w-4 h-4 text-slate-400" />}
                  </div>
                </td>
                <td className="p-4 text-sm font-mono text-slate-600">{book.bookCode || 'N/A'}</td>
                <td className="p-4">
                  <div className="font-semibold text-slate-900">{book.title}</div>
                  <div className="text-sm text-slate-500">{book.author}</div>
                </td>
                <td className="p-4 text-sm text-slate-600">{book.category}</td>
                <td className="p-4">
                  <span className={`inline-flex px-2 py-1 rounded text-xs font-bold uppercase ${book.status === 'Available' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                    {book.status}
                  </span>
                </td>
                <td className="p-4 flex gap-2 justify-end">
                  {book.status === 'Issued' && (
                     <button
                        onClick={async () => {
                           console.log('[DEBUG] Returning book from ManageBooks');
                           const res = await fetch(`/api/issues`, { headers: { Authorization: `Bearer ${token}` } });
                           if (res.ok) {
                               const issues = await res.json();
                               const activeIssue = issues.find((i: any) => String(i.bookId) === String(book.id) && i.status === 'Issued');
                               if (activeIssue) {
                                   await fetch(`/api/issues/${activeIssue.id}/return`, {
                                       method: 'PATCH',
                                       headers: { Authorization: `Bearer ${token}` }
                                   });
                                   fetchBooks();
                               } else {
                                   console.error('[DEBUG] Active issue record not found for this book');
                               }
                           }
                        }}
                        className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold uppercase hover:bg-emerald-200 transition"
                     >
                        Return Book
                     </button>
                  )}
                  <button onClick={() => handleEdit(book)} className="p-2 text-slate-400 hover:text-indigo-600 transition" title="Edit Book"><Edit2 className="w-4 h-4"/></button>
                  <button onClick={() => handleDelete(book.id)} className="p-2 text-slate-400 hover:text-rose-600 transition" title="Delete Book"><Trash2 className="w-4 h-4"/></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
            <h3 className="text-xl font-semibold mb-4">{editingId ? 'Edit Book' : 'Add New Book'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Book Code No.</label>
                  <input type="text" required value={formData.bookCode} onChange={e=>setFormData({...formData, bookCode: e.target.value})} className="w-full border p-2 rounded-lg" placeholder="e.g. LIB-2024-001" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input type="text" required value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} className="w-full border p-2 rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Author</label>
                <input type="text" required value={formData.author} onChange={e=>setFormData({...formData, author: e.target.value})} className="w-full border p-2 rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Category</label>
                  <input type="text" value={formData.category} onChange={e=>setFormData({...formData, category: e.target.value})} className="w-full border p-2 rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Status</label>
                  <select value={formData.status} onChange={e=>setFormData({...formData, status: e.target.value as any})} className="w-full border p-2 rounded-lg">
                    <option>Available</option>
                    <option>Issued</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Cover Image</label>
                <div className="flex items-center gap-4">
                  {formData.cover && (
                    <div className="w-16 h-20 bg-slate-100 rounded-md overflow-hidden flex-shrink-0">
                      <img src={formData.cover} alt="Cover preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <input 
                    type="file" 
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setFormData({ ...formData, cover: reader.result as string });
                        };
                        reader.readAsDataURL(file);
                      }
                    }} 
                    className="w-full border p-2 rounded-lg text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" 
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 font-medium text-slate-600 hover:text-slate-900">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700">Save Book</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

