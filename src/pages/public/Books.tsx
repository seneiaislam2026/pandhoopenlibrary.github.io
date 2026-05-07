import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { BookOpen, Search, Clock, CheckCircle2, Star, Sparkles, Filter } from 'lucide-react';
import { useAuth } from '../../store/AuthContext';
import { onSnapshot, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import toast from 'react-hot-toast';
import Select from 'react-select';
import { Helmet } from 'react-helmet-async';

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
  const [categoryFilter, setCategoryFilter] = useState('All');
  const { user } = useAuth();
  const [prebooking, setPrebooking] = useState<string | null>(null);
  const [requestedBooks, setRequestedBooks] = useState<string[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'books'), (snapshot) => {
      const booksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Book[];
      setBooks(booksData);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'books');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handlePreBook = async (bookId: string) => {
    if (!user) {
      toast.error('বই প্রিবুক করতে দয়া করে লগইন করুন।');
      return;
    }

    if (user.status !== 'active') {
      toast.error('আপনার অ্যাকাউন্টটি এখনো সক্রিয় নয়। এডমিনের অনুমোদনের অপেক্ষা করুন।');
      return;
    }

    setPrebooking(bookId);
    try {
      await addDoc(collection(db, 'pre-bookings'), {
        bookId,
        userId: user.id,
        userName: user.name,
        date: serverTimestamp(),
        createdAt: serverTimestamp(),
        status: 'Pending'
      });
      toast.success('রিকুয়েষ্ট সম্পন্ন হয়েছে');
      setRequestedBooks(prev => [...prev, bookId]);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, 'pre-bookings');
    } finally {
      setPrebooking(null);
    }
  };

  const filtered = books.filter(b => {
    const term = search.toLowerCase();
    const matchesSearch = b.title.toLowerCase().includes(term) || b.author.toLowerCase().includes(term);
    const matchesCategory = categoryFilter === 'All' || b.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="bg-white min-h-screen">
      <Helmet>
        <title>বই সংগ্রহশালা - পানধোয়া উন্মুক্ত পাঠাগার</title>
        <meta name="description" content="আমাদের লাইব্রেরির হাজারো বইয়ের সংগ্রহশালা থেকে আপনার পছন্দের বইটি বেছে নিন।" />
      </Helmet>

      {/* Page Header */}
      <div className="bg-slate-50 border-b border-slate-100 pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-black text-slate-900 mb-6 font-bengali tracking-tight"
          >
            বই সংগ্রহশালা
          </motion.h1>
          <p className="text-xl text-slate-500 font-bengali max-w-2xl mx-auto font-medium">লাইব্রেরির সকল বইয়ের সংগ্রহ অনলাইন থেকে দেখে নিন এবং আপনার পছন্দের বইটি প্রিবুক করুন।</p>
          
          <div className="flex flex-col md:flex-row justify-center items-center gap-6 mt-12 max-w-3xl mx-auto">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
              <input 
                type="text" 
                placeholder="বইয়ের নাম বা লেখক দিয়ে খুঁজুন..." 
                className="w-full pl-16 pr-8 py-5 bg-white border border-slate-200 rounded-[2rem] outline-none focus:ring-4 focus:ring-indigo-50 transition-all font-bengali font-bold text-lg"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div className="w-full md:w-64">
              <Select
                options={['All', ...Array.from(new Set(books.map(b => b.category).filter(c => c)))].map(c => ({
                  value: c,
                  label: c === 'All' ? 'সকল বিভাগ' : c
                }))}
                value={{ 
                  value: categoryFilter, 
                  label: categoryFilter === 'All' ? 'সকল বিভাগ' : categoryFilter 
                }}
                onChange={(opt: any) => setCategoryFilter(opt?.value || 'All')}
                className="font-bengali"
                styles={{
                  control: (base) => ({
                    ...base,
                    borderRadius: '2rem',
                    padding: '0.6rem 1rem',
                    border: '1px solid #e2e8f0',
                    backgroundColor: 'white',
                    fontWeight: 'bold',
                    boxShadow: 'none'
                  })
                }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-20">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10">
            {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[3/4] bg-slate-50 rounded-[2.5rem] mb-6 border border-slate-100"></div>
                <div className="h-6 bg-slate-50 rounded-full w-3/4 mb-4"></div>
                <div className="h-4 bg-slate-50 rounded-full w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10">
            {filtered.map((book, index) => (
              <motion.div
                key={book.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-[2.5rem] border border-slate-100 p-4 hover:shadow-2xl transition-all group flex flex-col h-full"
              >
                <div className="relative aspect-[3/4] rounded-3xl overflow-hidden mb-6 bg-slate-50">
                  {book.cover ? (
                    <img src={book.cover} alt={book.title} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 text-slate-200">
                      <BookOpen size={64} className="mb-4 opacity-10" />
                      <span className="text-xs font-black text-center font-bengali opacity-30">{book.title}</span>
                    </div>
                  )}
                  <div className="absolute top-4 right-4">
                    <span className={`px-4 py-2 rounded-xl text-[10px] font-black font-bengali shadow-xl ${
                      book.status === 'Available' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                    }`}>
                      {book.status === 'Available' ? 'সহজলভ্য' : 'বুকড'}
                    </span>
                  </div>
                </div>

                <div className="flex-1 px-4">
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-2 font-bengali">{book.category || 'সাধারণ'}</p>
                  <h3 className="text-lg font-black text-slate-900 font-bengali line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors">{book.title}</h3>
                  <p className="text-sm text-slate-400 font-bengali font-bold mt-2">{book.author}</p>
                </div>

                <button
                  onClick={() => handlePreBook(book.id)}
                  disabled={book.status !== 'Available' || prebooking === book.id || requestedBooks.includes(book.id)}
                  className="mt-8 w-full py-5 rounded-2xl font-black font-bengali text-sm transition-all flex items-center justify-center gap-3 bg-slate-900 text-white hover:bg-indigo-600 shadow-xl shadow-slate-100 disabled:bg-slate-50 disabled:text-slate-300 disabled:shadow-none active:scale-[0.98]"
                >
                  {requestedBooks.includes(book.id) ? (
                    <><CheckCircle2 size={20} /> অনুরোধ পাঠানো হয়েছে</>
                  ) : book.status === 'Available' ? (
                    <><Clock size={20} /> প্রিবুক করুন</>
                  ) : (
                    'বইটি এখন নেই'
                  )}
                </button>
              </motion.div>
            ))}
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="text-center py-32 bg-slate-50 rounded-[4rem] border-2 border-dashed border-slate-200">
             <Search size={64} className="mx-auto mb-6 text-slate-200" />
             <h3 className="text-3xl font-black text-slate-900 font-bengali mb-4">দুঃখিত, কোনো বই পাওয়া যায়নি</h3>
             <p className="text-slate-500 font-bengali text-xl font-medium">ভিন্ন কোনো নাম বা বিভাগ দিয়ে চেষ্টা করুন</p>
          </div>
        )}
      </div>
    </div>
  );
}
