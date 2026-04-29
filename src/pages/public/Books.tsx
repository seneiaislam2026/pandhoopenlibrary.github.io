import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Search, Clock } from 'lucide-react';
import { useAuth } from '../../store/AuthContext';

interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  status: 'Available' | 'Issued';
  cover?: string;
  bookCode?: string;
}

export default function Books() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { user, token } = useAuth();
  const [prebooking, setPrebooking] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/books')
      .then(r => r.json())
      .then(data => {
        setBooks(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handlePreBook = async (bookId: string) => {
    if (!user) {
      alert('Please log in as a member to pre-book books.');
      return;
    }
    
    setPrebooking(bookId);
    try {
      const res = await fetch('/api/pre-book', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ bookId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert('Reserve request / Pre-booking request is successful!');
    } catch (err: any) {
      alert(err.message || 'Failed to pre-book book.');
    } finally {
      setPrebooking(null);
    }
  };

  const filtered = books.filter(b => 
    b.title.toLowerCase().includes(search.toLowerCase()) || 
    b.author.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Books Catalog</h1>
            <p className="mt-2 text-sm text-slate-500">Discover your next great read.</p>
          </div>
          <div className="mt-4 md:mt-0 relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title or author..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors shadow-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {filtered.map((book, i) => (
              <motion.div
                key={book.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group relative bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all flex flex-col"
              >
                <div className="aspect-[2/3] w-full rounded-xl bg-slate-100 flex items-center justify-center mb-4 overflow-hidden relative">
                  {book.cover ? (
                    <img src={book.cover} alt={book.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50">
                      <BookOpen className="w-8 h-8 mb-2 opacity-50" />
                      <span className="text-xs font-medium px-2 text-center line-clamp-2">{book.title}</span>
                    </div>
                  )}
                  {/* Status Badge */}
                  <div className="absolute top-2 right-2">
                     <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider shadow-sm backdrop-blur-md ${
                        book.status === 'Available' ? 'bg-emerald-500/90 text-white' : 'bg-rose-500/90 text-white'
                      }`}>
                        {book.status}
                      </span>
                  </div>
                </div>
                <div className="mt-auto">
                   <p className="text-xs text-indigo-600 font-semibold mb-1 uppercase tracking-wider">{book.category || 'General'}</p>
                   <h3 className="font-semibold text-slate-900 leading-tight line-clamp-2 mb-1">{book.title}</h3>
                   <p className="text-sm text-slate-500 line-clamp-1 mb-1">{book.author}</p>
                   <p className="text-[10px] font-mono text-slate-400 mb-4 font-bold">CODE: {book.bookCode || 'N/A'}</p>
                   
                   {user && (
                     <div className="flex flex-col gap-2">
                       <button
                         onClick={() => handlePreBook(book.id)}
                         disabled={prebooking === book.id}
                         className={`w-full flex items-center justify-center gap-2 py-2 px-3 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${
                           book.status === 'Available' 
                             ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700' 
                             : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700'
                         }`}
                       >
                         <Clock className="w-4 h-4" />
                         {prebooking === book.id ? 'Processing...' : (book.status === 'Available' ? 'Reserve Now' : 'Pre-Book Now')}
                       </button>
                     </div>
                   )}
                </div>
              </motion.div>
            ))}
            
            {filtered.length === 0 && (
              <div className="col-span-full py-20 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 border-dashed">
                <BookOpen className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p>No books found matching your search.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
