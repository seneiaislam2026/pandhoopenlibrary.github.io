import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Search, ShoppingCart } from 'lucide-react';
import { useAuth } from '../../store/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  status: 'Available' | 'Issued';
  cover?: string;
  bookCode?: string;
  price?: number;
}

export default function BuyBooks() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [buying, setBuying] = useState<string | null>(null);

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

  const handleBuyBook = async (book: Book) => {
    if (!user) {
      alert('Please log in as a member to buy books.');
      return;
    }
    const bookPrice = book.price || 200;
    const confirmPurchase = window.confirm(`Are you sure you want to buy this book for ৳${bookPrice}? The purchase will be recorded. Please ensure you Make Payment via your profile to complete the process.`);
    if (!confirmPurchase) return;
    
    setBuying(book.id);
    try {
      const res = await fetch(`/api/books/${book.id}/buy`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        alert('Book purchase recorded! Proceeding to "Make Payment" in your profile.');
        navigate('/dashboard');
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to buy book');
      }
    } catch (err: any) {
      alert('Server error while buying book.');
    } finally {
      setBuying(null);
    }
  };

  const filtered = books.filter(b => 
    (b.title.toLowerCase().includes(search.toLowerCase()) || 
    b.author.toLowerCase().includes(search.toLowerCase())) &&
    (b.price === undefined || b.price > 0)
  );

  return (
    <div className="min-h-screen bg-pink-50/30 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="md:flex md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Buy Books Corner</h1>
            <p className="mt-2 text-sm text-slate-500">Purchase manuals and exclusive books.</p>
          </div>
          <div className="mt-4 md:mt-0 relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search to buy..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-full bg-white focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-colors shadow-sm"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-pink-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {filtered.map((book, i) => (
              <motion.div
                key={book.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group relative bg-white border border-slate-200 rounded-2xl p-4 hover:shadow-[0_8px_30px_rgb(226,19,110,0.08)] hover:border-pink-200 transition-all flex flex-col"
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
                  {/* Price Tag Overlay */}
                  <div className="absolute bottom-2 left-2 right-2">
                     <div className="bg-white/90 backdrop-blur-md rounded-lg p-2 text-center shadow-sm border border-white/50">
                        <span className="font-black text-pink-600 text-lg">৳{book.price || 200}</span>
                     </div>
                  </div>
                </div>
                <div className="mt-auto">
                   <p className="text-xs text-indigo-600 font-semibold mb-1 uppercase tracking-wider">{book.category || 'General'}</p>
                   <h3 className="font-semibold text-slate-900 leading-tight line-clamp-2 mb-1">{book.title}</h3>
                   <p className="text-[10px] font-mono text-slate-400 mb-4 font-bold">CODE: {book.bookCode || 'N/A'}</p>
                   
                   {user && (
                     <div className="flex flex-col gap-2">
                       <button
                         onClick={() => handleBuyBook(book)}
                         disabled={buying === book.id}
                         className="w-full flex items-center justify-center gap-2 py-2.5 px-3 text-sm font-bold bg-[#E2136E] text-white rounded-lg hover:bg-[#c91162] disabled:opacity-50 disabled:bg-slate-300 transition-colors shadow-md"
                       >
                         <ShoppingCart className="w-4 h-4" />
                         {buying === book.id ? 'Processing...' : 'Buy Now'}
                       </button>
                     </div>
                   )}
                   {!user && (
                      <div className="text-center p-2 bg-slate-50 rounded-lg">
                        <p className="text-[10px] text-slate-500 font-medium">Log in to buy books</p>
                      </div>
                   )}
                </div>
              </motion.div>
            ))}
            
            {filtered.length === 0 && (
              <div className="col-span-full py-20 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 border-dashed">
                <ShoppingCart className="w-12 h-12 mx-auto text-slate-300 mb-4" />
                <p>No books found to buy.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
