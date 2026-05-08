import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Search, Clock, CheckCircle2, Star, Sparkles, Filter, X, Info, Tag, User as UserIcon, Book as BookIcon } from 'lucide-react';
import { useAuth } from '../../store/AuthContext';
import { getDocs, collection, addDoc, serverTimestamp, query, where } from 'firebase/firestore';
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
  shelfNo?: string;
  description?: string;
  review?: string;
}

export default function Books() {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const { user } = useAuth();
  const [prebooking, setPrebooking] = useState<string | null>(null);
  const [requestedBooks, setRequestedBooks] = useState<string[]>([]);
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [activeIssues, setActiveIssues] = useState<Record<string, string>>({});

  useEffect(() => {
    let isMounted = true;
    const fetchBooks = async () => {
      try {
        const snapshot = await getDocs(collection(db, 'books'));
        const issuesSnapshot = await getDocs(query(collection(db, 'issues'), where('status', 'in', ['ISSUED', 'Issued'])));
        
        if (!isMounted) return;
        
        const issuesMap: Record<string, string> = {};
        issuesSnapshot.forEach(doc => {
          const data = doc.data();
          if (data.bookId && data.expectedReturnDate) {
            issuesMap[data.bookId] = data.expectedReturnDate;
          }
        });
        setActiveIssues(issuesMap);
        
        const booksData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Book[];
        setBooks(booksData);
        setLoading(false);
      } catch (error) {
        if (!isMounted) return;
        handleFirestoreError(error, OperationType.LIST, 'books');
        setLoading(false);
      }
    };
    fetchBooks();
    return () => { isMounted = false; };
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 sm:gap-10">
            {[1, 2, 3, 4, 10].map(i => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[3/4] bg-slate-50 rounded-[2.5rem] mb-6 border border-slate-100"></div>
                <div className="h-6 bg-slate-50 rounded-full w-3/4 mb-4"></div>
                <div className="h-4 bg-slate-50 rounded-full w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 sm:gap-10">
            {filtered.map((book, index) => (
              <motion.div
                key={book.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                whileHover={{ y: -5 }}
                className="bg-white rounded-[2rem] sm:rounded-[2.5rem] border border-slate-100 p-3 sm:p-4 hover:shadow-2xl transition-all group flex flex-col h-full cursor-pointer"
                onClick={() => setSelectedBook(book)}
              >
                <div className="relative aspect-[3/4] rounded-2xl sm:rounded-3xl overflow-hidden mb-4 sm:mb-6 bg-slate-50">
                  {book.cover ? (
                    <img src={book.cover} alt={book.title} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 text-slate-200">
                      <BookOpen size={48} className="mb-4 opacity-10" />
                      <span className="text-[10px] font-black text-center font-bengali opacity-30">{book.title}</span>
                    </div>
                  )}
                  <div className="absolute top-2 right-2 sm:top-4 sm:right-4">
                    <span className={`px-2 py-1 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl text-[8px] sm:text-[10px] font-black font-bengali shadow-xl ${
                      book.status === 'Available' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'
                    }`}>
                      {book.status === 'Available' ? 'এভেইলেবল' : 'বুকড'}
                    </span>
                  </div>
                </div>

                <div className="flex-1 px-1 sm:px-4 flex flex-col">
                  <p className="text-[8px] sm:text-[10px] font-black text-indigo-600 uppercase tracking-[0.1em] sm:tracking-[0.2em] mb-1 sm:mb-2 font-bengali">{book.category || 'সাধারণ'}</p>
                  <h3 className="text-sm sm:text-lg font-black text-slate-900 font-bengali leading-snug group-hover:text-indigo-600 transition-colors flex-1">{book.title}</h3>
                  <p className="text-[10px] sm:text-sm text-slate-400 font-bengali font-bold mt-1 sm:mt-2">{book.author}</p>
                </div>

                <button
                  onClick={(e) => { e.stopPropagation(); handlePreBook(book.id); }}
                  disabled={book.status !== 'Available' || prebooking === book.id || requestedBooks.includes(book.id)}
                  className="mt-4 sm:mt-8 w-full py-3 sm:py-5 rounded-xl sm:rounded-2xl font-black font-bengali text-[10px] sm:text-sm transition-all flex items-center justify-center gap-2 sm:gap-3 bg-slate-900 text-white hover:bg-indigo-600 shadow-lg shadow-slate-100 disabled:bg-slate-50 disabled:text-slate-300 disabled:shadow-none active:scale-[0.98]"
                >
                  {requestedBooks.includes(book.id) ? (
                    <CheckCircle2 size={16} />
                  ) : book.status === 'Available' ? (
                    <Clock size={16} />
                  ) : null}
                  <span className="hidden sm:inline">
                    {requestedBooks.includes(book.id) ? 'অনুরোধ পাঠানো হয়েছে' : book.status === 'Available' ? 'প্রিবুক করুন' : 'বইটি এখন অন্য পাঠকের কাছে আছে'}
                  </span>
                  <span className="sm:hidden">
                    {requestedBooks.includes(book.id) ? 'অনুরোধ' : book.status === 'Available' ? 'প্রিবুক' : 'সংগ্রহে নেই'}
                  </span>
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

      {/* Book Details Modal */}
      <AnimatePresence>
        {selectedBook && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 drop-shadow-2xl">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedBook(null)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-4xl bg-white rounded-3xl md:rounded-[3rem] overflow-hidden shadow-2xl flex flex-col md:flex-row max-h-[85vh] md:max-h-[90vh]"
            >
              <button 
                onClick={() => setSelectedBook(null)}
                className="absolute top-4 right-4 md:top-6 md:right-6 p-2 md:p-3 bg-white/50 backdrop-blur-md border border-slate-200 hover:bg-slate-100 text-slate-500 hover:text-slate-900 rounded-full transition-all z-20"
              >
                <X size={20} />
              </button>

              <div className="w-full md:w-2/5 bg-slate-50 p-6 md:p-12 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-100 shrink-0">
                <div className="w-1/2 sm:w-2/5 md:w-full max-w-[160px] md:max-w-[280px] aspect-[3/4] rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl shadow-indigo-500/20">
                  {selectedBook.cover ? (
                    <img src={selectedBook.cover} alt={selectedBook.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-white border border-slate-100">
                      <BookOpen size={64} className="text-slate-100" />
                    </div>
                  )}
                </div>
              </div>

              <div className="w-full md:w-3/5 p-6 md:p-16 flex flex-col overflow-y-auto custom-scrollbar">
                <div className="mb-8 md:mb-10 shrink-0">
                  <div className="flex flex-wrap items-center gap-3 mb-4">
                    <span className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest font-bengali inline-block">
                      {selectedBook.category || 'সাধারণ'}
                    </span>
                    <span className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest font-bengali flex items-center gap-1.5 ${
                      selectedBook.status === 'Available' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                    }`}>
                      {selectedBook.status === 'Available' ? <CheckCircle2 size={16} /> : <Clock size={16} />}
                      {selectedBook.status === 'Available' ? 'এভেইলেবল' : 'বুকড'}
                    </span>
                  </div>
                  <h2 className="text-3xl md:text-5xl font-black text-slate-900 font-bengali leading-tight mb-4">{selectedBook.title}</h2>
                  <div className="flex items-center gap-3 text-slate-500">
                    <UserIcon size={20} className="text-indigo-400" />
                    <p className="text-xl font-bold font-bengali">{selectedBook.author}</p>
                  </div>
                </div>

                <div className="space-y-8">
                  {selectedBook.description && (
                    <div>
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Info size={14} /> বিবরণ
                      </h4>
                      <p className="text-slate-600 font-bengali leading-relaxed text-lg">{selectedBook.description}</p>
                    </div>
                  )}
                  
                  {selectedBook.review && (
                     <div className="p-8 bg-amber-50/50 border border-amber-100 rounded-3xl">
                        <h4 className="text-xs font-black text-amber-600 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <Star size={14} fill="currentColor" /> বই সমালোচনা/রিভিউ
                        </h4>
                        <p className="text-slate-700 font-bengali italic leading-relaxed text-lg">"{selectedBook.review}"</p>
                     </div>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                    <div className="p-3 md:p-6 bg-slate-50 rounded-2xl flex flex-col justify-center">
                       <h5 className="text-[10px] md:text-xs font-black text-slate-400 uppercase mb-1 md:mb-2">বই কোড</h5>
                       <p className="text-sm md:text-base font-black text-slate-700 break-all">{selectedBook.bookCode || 'N/A'}</p>
                    </div>
                    <div className="p-3 md:p-6 bg-slate-50 rounded-2xl flex flex-col justify-center">
                       <h5 className="text-[10px] md:text-xs font-black text-slate-400 uppercase mb-1 md:mb-2">সেল্ফ নং</h5>
                       <p className="text-sm md:text-base font-black text-slate-700 break-all font-bengali">{selectedBook.shelfNo || 'N/A'}</p>
                    </div>
                    <div className="p-3 md:p-6 bg-slate-50 rounded-2xl col-span-2 md:col-span-1 flex flex-col justify-center">
                       <h5 className="text-[10px] md:text-xs font-black text-slate-400 uppercase mb-1 md:mb-2">ক্যাটাগরি</h5>
                       <p className="text-sm md:text-base font-black text-slate-700 font-bengali">{selectedBook.category || 'সাধারণ'}</p>
                    </div>
                  </div>
                </div>

                <div className="mt-12 flex flex-col gap-4">
                  <button
                    onClick={() => handlePreBook(selectedBook.id)}
                    disabled={selectedBook.status !== 'Available' || prebooking === selectedBook.id || requestedBooks.includes(selectedBook.id)}
                    className="w-full bg-slate-900 text-white py-6 rounded-[2rem] font-black font-bengali text-xl hover:bg-indigo-600 shadow-2xl transition-all flex items-center justify-center gap-4 disabled:bg-slate-100 disabled:text-slate-300 active:scale-[0.98]"
                  >
                    {requestedBooks.includes(selectedBook.id) ? (
                      <><CheckCircle2 /> অনুরোধ পাঠানো হয়েছে</>
                    ) : selectedBook.status === 'Available' ? (
                      <><Clock /> প্রিবুক করুন</>
                    ) : (
                      <><Clock /> বইটি অন্য সদস্যের কাছে আছে</>
                    )}
                  </button>
                  
                  {selectedBook.status !== 'Available' && activeIssues[selectedBook.id] && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center p-6 bg-indigo-50/50 border-2 border-dashed border-indigo-100 rounded-[2rem]"
                    >
                      <p className="text-sm font-bengali text-slate-600 font-bold mb-1">পাঠাগারে আসার সম্ভাব্য তারিখ:</p>
                      <p className="text-2xl font-black text-indigo-600 font-bengali">
                        {new Date(activeIssues[selectedBook.id]).toLocaleDateString('bn-BD', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </motion.div>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

