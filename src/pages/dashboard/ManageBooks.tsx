import React, { useEffect, useState } from 'react';
import { useAuth } from '../../store/AuthContext';
import { Search, Plus, Edit2, Trash2, BookOpen, ShieldAlert, Download } from 'lucide-react';
import { onSnapshot, collection, doc, setDoc, deleteDoc, updateDoc, query, where, getDocs, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../../lib/firebase';
import { firebaseService } from '../../services/firebaseService';
import toast from 'react-hot-toast';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';

export const reactSelectCustomStyles = {
  control: (base: any, state: any) => ({
    ...base,
    border: state.isFocused ? '2px solid #6366f1' : '1px solid #e2e8f0',
    borderRadius: '1rem', // rounded-2xl roughly
    padding: '0.4rem',
    boxShadow: 'none',
    backgroundColor: '#f8fafc',
    minHeight: '54px'
  }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isSelected ? '#e0e7ff' : state.isFocused ? '#f1f5f9' : 'white',
    color: state.isSelected ? '#4f46e5' : '#334155',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontWeight: state.isSelected ? 'bold' : 'normal',
    padding: '0.75rem 1rem'
  }),
  menu: (base: any) => ({
    ...base,
    borderRadius: '1rem',
    overflow: 'hidden',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    zIndex: 9999
  })
};

interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  status: string;
  cover: string;
  bookCode?: string;
  shelfNo?: string;
  price?: number;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, userId?: string | null, email?: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: userId || 'Not Authenticated',
      email: email || 'No Email',
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  if (operationType === OperationType.WRITE || operationType === OperationType.DELETE || operationType === OperationType.UPDATE) {
      toast.error(`অ্যাকশন ব্যর্থ হয়েছে: আপনার মেম্বারশিপ স্ট্যাটাস চেক করুন অথবা এডমিনের সাথে যোগাযোগ করুন। (Permission Error)`);
  }
}

// Helpers for cross language numbers
const engToBdNum = (str: string) => {
  const bdNumbers = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' };
  return str.replace(/[0-9]/g, (w) => (bdNumbers as any)[w] || w);
};
const bdToEngNum = (str: string) => {
  const engNumbers = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' };
  return str.replace(/[০-৯]/g, (w) => (engNumbers as any)[w] || w);
};

export const BOOK_CATEGORIES = [
  "ইতিহাস ও মুক্তিযুদ্ধ", "উপন্যাস", "ছোটগল্প", "কবিতা", "প্রবন্ধ ও গবেষণা", 
  "জীবনী", "সায়েন্স ফিকশন", "ধর্ম ও দর্শন", "ইসলামী বই", "শিশু-কিশোর", 
  "নাটক", "ফিকশন বা রোমান্স", "থ্রিলার ও অ্যাডভেঞ্চার", "বিজ্ঞান ও প্রযুক্তি", 
  "রাজনীতি ও অর্থনীতি", "আত্মউন্নয়ন ও মোটিভেশন", "কমিকস ও গ্রাফিক্স নোভেল", 
  "অনুবাদ সাহিত্য", "ভ্রমণ কাহিনী", "ম্যাগাজিন ও সাময়িকী", "একাডেমিক", "অন্যান্য"
];

const generateBookCode = (category: string) => {
  let prefix = 'B';
  if (category === 'ইতিহাস ও মুক্তিযুদ্ধ') prefix = 'HIS';
  else if (category === 'উপন্যাস') prefix = 'NOV';
  else if (category === 'ছোটগল্প') prefix = 'SST';
  else if (category === 'কবিতা') prefix = 'POE';
  else if (category === 'প্রবন্ধ ও গবেষণা') prefix = 'RES';
  else if (category === 'জীবনী') prefix = 'BIO';
  else if (category === 'সায়েন্স ফিকশন') prefix = 'SCI';
  else if (category === 'ধর্ম ও দর্শন') prefix = 'REL';
  else if (category === 'ইসলামী বই') prefix = 'ISL';
  else if (category === 'শিশু-কিশোর') prefix = 'CHI';
  else if (category === 'নাটক') prefix = 'DRA';
  else if (category === 'ফিকশন বা রোমান্স') prefix = 'ROM';
  else if (category === 'থ্রিলার ও অ্যাডভেঞ্চার') prefix = 'THR';
  else if (category === 'বিজ্ঞান ও প্রযুক্তি') prefix = 'TEC';
  else if (category === 'রাজনীতি ও অর্থনীতি') prefix = 'POL';
  else if (category === 'আত্মউন্নয়ন ও মোটিভেশন') prefix = 'MOT';
  else if (category === 'কমিকস ও গ্রাফিক্স নোভেল') prefix = 'COM';
  else if (category === 'অনুবাদ সাহিত্য') prefix = 'TRA';
  else if (category === 'ভ্রমণ কাহিনী') prefix = 'TRAV';
  else if (category === 'ম্যাগাজিন ও সাময়িকী') prefix = 'MAG';
  else if (category === 'একাডেমিক') prefix = 'ACA';
  else prefix = 'GEN';
  
  const randomNum = Math.floor(10000 + Math.random() * 90000);
  return `${prefix}-${randomNum}`;
};

export default function ManageBooks() {
  const [books, setBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const { user, token } = useAuth();
  
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{ title: string; author: string; category: string; cover: string; status: string; bookCode: string; shelfNo: string }>({ 
    title: '', 
    author: '', 
    category: '', 
    cover: '', 
    status: 'Available', 
    bookCode: '',
    shelfNo: ''
  });
  const [coverInputType, setCoverInputType] = useState<'upload' | 'link'>('upload');

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'books'), (snapshot) => {
      const booksData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Book[];
      setBooks(booksData);
    }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'books', user?.id, user?.email);
    });

    return () => unsubscribe();
  }, [user]);

  const handleDownloadPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const today = new Date().toLocaleDateString('bn-BD', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const sortedBooks = [...books].sort((a, b) => (a.bookCode || '').localeCompare(b.bookCode || ''));

    const html = `
      <html>
        <head>
          <title>বই তালিকা রিপোর্ট</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;500;600;700;800&family=Outfit:wght@400;500;600;700;800;900&display=swap');
            body { 
              font-family: 'Hind Siliguri', sans-serif; 
              color: #1a1a1a;
              margin: 0;
              padding: 15mm;
              background-color: #fff;
            }
            .header {
              text-align: center;
              margin-bottom: 25px;
              border-bottom: 2.5px solid #000;
              padding-bottom: 15px;
            }
            .header h1 {
              color: #000;
              margin: 0;
              font-size: 34px;
              font-weight: 800;
              letter-spacing: -0.5px;
            }
            .header .address {
              margin: 5px 0 0;
              font-size: 16px;
              font-weight: 600;
              color: #334155;
            }
            .report-title {
              text-align: center;
              margin: 20px 0;
              font-size: 22px;
              font-weight: 950;
              text-decoration: underline;
              text-underline-offset: 8px;
            }
            .meta {
              display: flex;
              justify-content: space-between;
              margin-bottom: 10px;
              font-size: 14px;
              font-weight: 700;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              padding: 10px 12px;
              text-align: left;
              border: 1.5px solid #000;
              line-height: 1.4;
            }
            th {
              background-color: #f8fafc;
              font-weight: 950;
              font-size: 14px;
              text-align: center;
              text-transform: uppercase;
            }
            td {
              font-size: 15px;
              font-weight: 600;
            }
            .text-center { text-align: center; }
            .sl-col { width: 50px; }
            .code-col { width: 110px; font-family: 'Outfit', sans-serif; font-weight: 800; }
            .shelf-col { width: 80px; font-family: 'Outfit', sans-serif; font-weight: 800; }
            @media print {
              .no-print { display: none; }
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="text-align: center; padding: 20px; background: #fff; border-bottom: 1px solid #e2e8f0; margin-bottom: 30px;">
            <button onclick="window.print()" style="font-family: 'Hind Siliguri', sans-serif; padding: 12px 35px; background: #4f46e5; color: #fff; border: none; font-size: 16px; font-weight: 700; cursor: pointer; border-radius: 12px; box-shadow: 0 4px 10px rgba(79, 70, 229, 0.4);">তালিকা প্রিন্ট করুন</button>
          </div>
          <div class="header">
            <h1>পানধোয়া উন্মুক্ত পাঠাগার</h1>
            <p class="address">পানধোয়া, সেনওয়ালিয়া-১৩৪৪, আশুলিয়া, সাভার, ঢাকা।</p>
          </div>
          <div class="report-title">লাইব্রেরি বই তালিকা রিপোর্ট</div>
          <div class="meta">
            <div>মোট বই: ${sortedBooks.length.toString().replace(/[0-9]/g, w => String.fromCharCode(w.charCodeAt(0) + 2486))} টি</div>
            <div>তারিখ: ${today}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th class="sl-col">ক্রমিক</th>
                <th>বইয়ের নাম</th>
                <th>বই ক্যাটাগরি</th>
                <th>লেখকের নাম</th>
                <th class="code-col">বই কোড নং</th>
                <th class="shelf-col">সেল্ফ নং</th>
              </tr>
            </thead>
            <tbody>
              ${sortedBooks.map((book, index) => `
                <tr>
                  <td class="text-center">${(index + 1).toString().replace(/[0-9]/g, w => String.fromCharCode(w.charCodeAt(0) + 2486))}</td>
                  <td>${book.title}</td>
                  <td class="text-center">${book.category || '---'}</td>
                  <td>${book.author}</td>
                  <td class="text-center code-col">${book.bookCode || '---'}</td>
                  <td class="text-center shelf-col">${book.shelfNo || '---'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
        if (!user) {
          throw new Error('User context missing. Are you logged in?');
        }

        if (formData.bookCode) {
          const q = query(collection(db, 'books'), where('bookCode', '==', formData.bookCode.trim()));
          const querySnapshot = await getDocs(q);
          const duplicate = querySnapshot.docs.find(d => d.id !== editingId);
          if (duplicate) {
            toast.error('এই বইয়ের কোডটি ইতিপূর্বে ব্যবহার করা হয়েছে। দয়া করে ভিন্ন কোড ব্যবহার করুন।');
            return;
          }
        }

        if (editingId) {
            await updateDoc(doc(db, 'books', editingId), {
              ...formData,
              updatedAt: serverTimestamp()
            });
            setShowModal(false);
            setFormData({ title: '', author: '', category: '', cover: '', status: 'Available', bookCode: '', shelfNo: '' });
            setEditingId(null);
            toast.success('সফলভাবে বই আপডেট করা হয়েছে!');
        } else {
            const newDocRef = doc(collection(db, 'books'));
            const finalBookCode = formData.bookCode || generateBookCode(formData.category || '');
            await setDoc(newDocRef, { 
              ...formData, 
              bookCode: finalBookCode,
              id: newDocRef.id,
              createdAt: serverTimestamp()
            });
            toast.success('সফলভাবে বই যুক্ত করা হয়েছে!');
            setFormData(prev => ({ title: '', author: '', category: prev.category, cover: '', status: 'Available', bookCode: generateBookCode(prev.category || ''), shelfNo: prev.shelfNo }));
        }
    } catch (error: any) {
        if (error.message?.includes('permission-denied') || error.code === 'permission-denied') {
            toast.error(`এক্সেস ডিনাইড: আপনার এডমিন পারমিশন নেই অথবা সেশন এক্সপায়ার হয়েছে। (Permission Denied)`);
        } else {
            toast.error(`সেভ করতে ব্যর্থ হয়েছে: ${error.message || 'Unknown error'}`);
        }
        handleFirestoreError(error, OperationType.WRITE, editingId ? `books/${editingId}` : 'books', user?.id, user?.email);
    }
  };

  const handleEdit = (book: Book) => {
    setFormData({
      title: book.title || '',
      author: book.author || '',
      category: book.category || '',
      cover: book.cover || '',
      status: book.status || 'Available',
      bookCode: book.bookCode || '',
      shelfNo: book.shelfNo || ''
    });
    setEditingId(book.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (user?.role !== 'admin' && user?.email !== 'seneiaislam@gmail.com' && user?.username !== 'admin') {
      toast.error('Permission Denied: Only administrators can delete books.');
      return;
    }
    if (!confirm('Are you sure you want to delete this book?')) {
      return;
    }
    try {
        await deleteDoc(doc(db, 'books', id));
    } catch (error: any) {
        if (error.message?.includes('permission-denied') || error.message?.includes('Missing or insufficient permissions')) {
            toast.error('Delete failed: You do not have permission.');
        } else {
            toast.error(`Delete failed: ${error.message || 'Unknown error'}`);
        }
        handleFirestoreError(error, OperationType.DELETE, `books/${id}`, user?.id, user?.email);
    }
  };

  const filtered = books.filter(b => {
    const term = search.toLowerCase();
    const bdTerm = engToBdNum(term);
    const engTerm = bdToEngNum(term);
    const bookCode = (b.bookCode || '').toLowerCase();
    const searchMatch = bookCode.includes(term) || bookCode.includes(bdTerm) || bookCode.includes(engTerm) || b.title.toLowerCase().includes(term) || b.author.toLowerCase().includes(term);

    const categoryMatch = categoryFilter === '' || b.category === categoryFilter;

    return searchMatch && categoryMatch;
  });

  const isActuallyAdmin = user?.role === 'admin' || user?.username === 'admin' || user?.email === 'seneiaislam@gmail.com' || user?.email === 'admin@library.com';

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {!isActuallyAdmin && (
        <div className="bg-rose-50 border border-rose-200 p-4 rounded-xl flex items-center gap-3 text-rose-700 font-bold font-bengali">
          <ShieldAlert className="w-5 h-5" />
          সতর্কবার্তা: আপনাকে এডমিন হিসেবে শনাক্ত করা যায়নি। আপনি বই পরিবর্তন করতে পারবেন না।
        </div>
      )}

      {/* Header & Stats Bento */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-slate-900 rounded-[2.5rem] p-8 sm:p-10 text-white relative overflow-hidden flex flex-col justify-between shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[100px] -ml-32 -mb-32"></div>
          
          <div className="relative z-10 flex flex-col xl:flex-row xl:items-start justify-between gap-6">
            <div>
              <h2 className="text-4xl font-black tracking-tighter mb-2 font-bengali">বই <span className="text-indigo-400">ব্যবস্থাপনা</span></h2>
              <p className="text-slate-400 font-bold font-bengali">লাইব্রেরির বইয়ের ক্যাটালগ পরিচালনা করুন।</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={handleDownloadPDF}
                className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-5 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 border border-white/20 transition-all active:scale-95 whitespace-nowrap min-w-[140px]"
              >
                <Download className="w-5 h-5 text-indigo-300" />
                তালিকা ডাউনলোড
              </button>
              <button
                onClick={() => { setFormData({ title: '', author: '', category: '', cover: '', status: 'Available', bookCode: '', shelfNo: '' }); setEditingId(null); setShowModal(true); }}
                className="bg-indigo-500 hover:bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/20 transition-all active:scale-95 group whitespace-nowrap min-w-[160px]"
              >
                <Plus className="w-5 h-5" /> 
                বই যুক্ত করুন 
              </button>
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">মোট বই</p>
              <p className="text-2xl font-black">{books.length}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">এভেইলেবল</p>
              <p className="text-2xl font-black text-emerald-400">{books.filter(b => String(b.status).toLowerCase() === 'available').length}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">ইস্যু করা</p>
              <p className="text-2xl font-black text-indigo-400">{books.filter(b => String(b.status).toLowerCase() === 'issued').length}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">বর্তমানে নেই</p>
              <p className="text-2xl font-black text-rose-400">{books.filter(b => String(b.status).toLowerCase() === 'not available' || String(b.status).toLowerCase() === 'not_available').length}</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Search className="w-5 h-5" />
              </div>
              <h3 className="font-black text-lg text-slate-800">দ্রুত খুঁজুন</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="বই, লেখক বা কোড দিয়ে খুঁজুন..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 px-5 py-4 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bengali"
                />
                <Select
                  value={categoryFilter ? { value: categoryFilter, label: categoryFilter } : null}
                  onChange={(selected: any) => setCategoryFilter(selected ? selected.value : '')}
                  options={[
                    { value: '', label: 'সব ক্যাটাগরি' },
                    ...BOOK_CATEGORIES.map(cat => ({ value: cat, label: cat }))
                  ]}
                  placeholder="ক্যাটাগরি ফিল্টার..."
                  styles={{
                    ...reactSelectCustomStyles,
                    control: (base: any, state: any) => ({
                       ...reactSelectCustomStyles.control(base, state),
                       minHeight: '54px',
                       borderRadius: '1rem',
                    })
                  }}
                  className="sm:w-64 font-bengali text-sm"
                  classNamePrefix="react-select"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-max">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="p-4 text-xs font-bold text-slate-500 uppercase font-bengali">কভার</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase font-bengali">বই ও সেল্ফ কোড</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase font-bengali">নাম ও লেখক</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase font-bengali">ক্যাটাগরি</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase font-bengali">অবস্থা</th>
              <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right font-bengali">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map(book => (
              <tr key={book.id} className="hover:bg-slate-50 transition">
                <td className="p-4">
                  <div className="w-10 h-14 bg-slate-100 rounded flex items-center justify-center overflow-hidden border border-slate-200">
                    {book.cover ? <img src={book.cover} alt="" referrerPolicy="no-referrer" className="w-full h-full object-cover" /> : <BookOpen className="w-4 h-4 text-slate-400" />}
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex flex-col gap-1.5">
                    <span className="font-black text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-md text-[10px] border border-indigo-100 tracking-wider">
                      কোড: {book.bookCode || 'N/A'}
                    </span>
                    <span className="font-black text-amber-700 bg-amber-50 px-2.5 py-1 rounded-md text-[10px] border border-amber-100 tracking-wider">
                      সেল্ফ: {book.shelfNo || 'N/A'}
                    </span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="font-bold text-slate-900 font-bengali text-base">{book.title}</div>
                  <div className="text-sm text-slate-500 font-bengali">{book.author}</div>
                </td>
                <td className="p-4 text-sm font-bold text-slate-600 font-bengali">{book.category}</td>
                <td className="p-4">
                  <span className={`inline-flex px-2 py-1 rounded text-[10px] font-black uppercase font-bengali ${String(book.status).toLowerCase() === 'available' ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-rose-100 text-rose-700 border border-rose-200'}`}>
                    {String(book.status).toLowerCase() === 'available' ? 'এভেইলেবল' : String(book.status).toLowerCase() === 'issued' ? 'ইস্যু করা' : String(book.status).toLowerCase() === 'not_available' || String(book.status).toLowerCase() === 'not available' ? 'বর্তমানে নেই' : book.status}
                  </span>
                </td>
                <td className="p-4">
                  <div className="flex gap-2 justify-end">
                    {(book.status === 'Issued' || book.status === 'ISSUED') && (
                       <button
                          onClick={async () => {
                             try {
                                 const q = query(collection(db, 'issues'), where('bookId', '==', book.id));
                                 const snapshot = await getDocs(q);
                                 if (snapshot && !snapshot.empty) {
                                     const activeIssues = snapshot.docs.filter(d => d.data().status === 'Issued' || d.data().status === 'ISSUED');
                                     if (activeIssues.length > 0) {
                                         const issueDoc = activeIssues[0];
                                         await updateDoc(doc(db, 'issues', issueDoc.id), {
                                             status: 'Returned',
                                             returnDate: new Date().toISOString()
                                         });
                                     }
                                     await updateDoc(doc(db, 'books', book.id), { status: 'Available' });
                                     toast.success('বই সফলভাবে রিটার্ন করা হয়েছে।');
                                 }
                             } catch (err) {
                                 toast.error('ত্রুটি: ' + (err instanceof Error ? err.message : String(err)));
                             }
                          }}
                          className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded font-bold uppercase hover:bg-emerald-200 transition font-bengali"
                       >
                          রিটার্ন
                       </button>
                    )}
                    <button onClick={() => handleEdit(book)} className="p-2 text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition" title="এডিট">
                      <Edit2 className="w-4 h-4"/>
                    </button>
                    <button onClick={() => handleDelete(book.id)} className="p-2 text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 rounded-lg transition" title="ডিলিট">
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-lg p-8 shadow-2xl relative my-8">
            <h3 className="text-2xl font-black mb-6 font-bengali text-slate-800 border-b border-slate-100 pb-4">
              {editingId ? 'বই এডিট করুন (Edit Book)' : 'নতুন বই যোগ করুন (Add Book)'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-5 font-bengali">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">বইয়ের কোড</label>
                  <input type="text" value={formData.bookCode || ''} onChange={e=>setFormData({...formData, bookCode: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm" placeholder="LIB-001" />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">সেল্ফ নং (Shelf No)</label>
                  <input type="text" value={formData.shelfNo || ''} onChange={e=>setFormData({...formData, shelfNo: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm" placeholder="A1, B2..." />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">বইয়ের নাম</label>
                <input type="text" required value={formData.title || ''} onChange={e=>setFormData({...formData, title: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" placeholder="বইয়ের নাম লিখুন" />
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">লেখকের নাম</label>
                <input type="text" required value={formData.author || ''} onChange={e=>setFormData({...formData, author: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" placeholder="লেখকের নাম লিখুন" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">ক্যাটাগরি</label>
                  <CreatableSelect
                    isClearable
                    value={formData.category ? { value: formData.category, label: formData.category } : null}
                    onChange={(selected: any) => {
                      const newCategory = selected ? selected.value : '';
                      setFormData({
                        ...formData, 
                        category: newCategory, 
                        bookCode: generateBookCode(newCategory)
                      });
                    }}
                    options={BOOK_CATEGORIES.map(cat => ({ value: cat, label: cat }))}
                    placeholder="টাইপ করুন বা সিলেক্ট করুন..."
                    formatCreateLabel={(inputValue) => `নতুন যোগ করুন: "${inputValue}"`}
                    styles={{
                      ...reactSelectCustomStyles,
                      control: (base: any, state: any) => ({
                        ...reactSelectCustomStyles.control(base, state),
                        minHeight: '48px',
                        borderRadius: '0.75rem' // xl
                      })
                    }}
                    className="font-bengali text-sm"
                    classNamePrefix="react-select"
                  />
                </div>
                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">অবস্থা</label>
                  <Select
                    value={{ value: formData.status, label: formData.status === 'Available' ? 'এভেইলেবল' : 'ইস্যুকৃত' }}
                    onChange={(selected: any) => setFormData({...formData, status: selected.value})}
                    options={[
                      { value: 'Available', label: 'এভেইলেবল' },
                      { value: 'Issued', label: 'ইস্যুকৃত' }
                    ]}
                    styles={{
                      ...reactSelectCustomStyles,
                      control: (base: any, state: any) => ({
                        ...reactSelectCustomStyles.control(base, state),
                        minHeight: '48px',
                        borderRadius: '0.75rem'
                      })
                    }}
                    className="font-bengali text-sm font-bold"
                    classNamePrefix="react-select"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">কভার ইমেজ (ঐচ্ছিক - Optional)</label>
                
                <div className="flex gap-2 mb-4 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                  <button 
                    type="button" 
                    onClick={() => setCoverInputType('upload')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-black transition-all ${coverInputType === 'upload' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    আপলোড (Upload)
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setCoverInputType('link')}
                    className={`flex-1 py-2 px-3 rounded-lg text-xs font-black transition-all ${coverInputType === 'link' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    লিঙ্ক (URL Link)
                  </button>
                </div>

                <div className="flex gap-4">
                  {formData.cover ? (
                    <div className="w-20 h-28 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-sm relative group">
                      <img src={formData.cover} alt="Preview" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => setFormData({...formData, cover: ''})} className="absolute inset-0 bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center font-bold text-[10px]">REMOVE</button>
                    </div>
                  ) : (
                    <div className="w-20 h-28 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center">
                      <BookOpen className="w-6 h-6 text-slate-300" />
                    </div>
                  )}
                  <div className="flex-1">
                    {coverInputType === 'upload' ? (
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 5 * 1024 * 1024) {
                              toast.error('File size must be less than 5MB');
                              return;
                            }
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              const img = new Image();
                              img.onload = () => {
                                const canvas = document.createElement('canvas');
                                const MAX_WIDTH = 400;
                                const MAX_HEIGHT = 600;
                                let width = img.width;
                                let height = img.height;

                                if (width > height) {
                                  if (width > MAX_WIDTH) {
                                    height *= MAX_WIDTH / width;
                                    width = MAX_WIDTH;
                                  }
                                } else {
                                  if (height > MAX_HEIGHT) {
                                    width *= MAX_HEIGHT / height;
                                    height = MAX_HEIGHT;
                                  }
                                }

                                canvas.width = width;
                                canvas.height = height;
                                const ctx = canvas.getContext('2d');
                                ctx?.drawImage(img, 0, 0, width, height);
                                
                                // Compress as webp/jpeg to save space, aiming for < 100kb
                                const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                                setFormData({ ...formData, cover: dataUrl });
                              };
                              img.src = reader.result as string;
                            };
                            reader.readAsDataURL(file);
                          }
                        }} 
                        className="w-full text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                      />
                    ) : (
                      <input 
                        type="text" 
                        placeholder="https://example.com/image.jpg"
                        value={formData.cover?.startsWith('data:') ? '' : (formData.cover || '')}
                        onChange={(e) => setFormData({ ...formData, cover: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-xs"
                      />
                    )}
                    <p className="text-[10px] text-slate-400 mt-2">Maximum 500KB. 2:3 aspect ratio recommended.</p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 border-t border-slate-100 mt-8">
                <button type="button" onClick={() => setShowModal(false)} className="px-6 py-2.5 font-bold text-slate-500 hover:text-slate-700 transition">বাতিল</button>
                <button type="submit" className="px-10 py-2.5 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 shadow-lg transition active:scale-95">
                  {editingId ? 'আপডেট (Update)' : 'সেভ (Save)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

