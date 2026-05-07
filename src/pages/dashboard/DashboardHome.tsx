import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../store/AuthContext";
import { firebaseService } from "../../services/firebaseService";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, addDoc, serverTimestamp } from "firebase/firestore";
import {
  Users,
  Library,
  DollarSign,
  Activity,
  UserCircle2,
  BookPlus,
  FileText,
  Bell,
  MessageSquare,
  ShoppingCart,
  BookmarkMinus,
  CheckCircle2,
  Loader2,
  Send,
  X,
  Search,
  Plus
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import toast from 'react-hot-toast';

export default function DashboardHome() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    users: 0,
    books: 0,
    issues: 0,
    income: 0,
    expense: 0,
  });

  const [memberStats, setMemberStats] = useState({
    activeIssues: 0,
    totalReturned: 0
  });

  const [availableBooks, setAvailableBooks] = useState<{id: string; title: string; bookCode: string}[]>([]);
  const [bookSearchText, setBookSearchText] = useState("");

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestFormData, setRequestFormData] = useState({
    type: 'Issue',
    bookName: '',
    bookId: '',
    note: ''
  });
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      const unsubIssues = onSnapshot(query(collection(db, 'issues'), where('userId', '==', user.id)), (snapshot) => {
        let active = 0;
        let returned = 0;
        snapshot.docs.forEach(doc => {
          const data = doc.data();
          if (data.status === 'Issued') active++;
          if (data.status === 'Returned') returned++;
        });
        setMemberStats({ activeIssues: active, totalReturned: returned });
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'issues');
      });

      const unsubBooks = onSnapshot(collection(db, 'books'), (snapshot) => {
        const books = snapshot.docs
          .map(doc => ({ id: doc.id, title: doc.data().title || '', bookCode: doc.data().bookCode || '', status: doc.data().status }))
          .filter(b => !b.status || String(b.status).toLowerCase() === "available" || String(b.status).toLowerCase() === "");
        setAvailableBooks(books);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, 'books');
      });

      return () => {
        unsubIssues();
        unsubBooks();
      };
    }
  }, [user]);

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSubmittingForm(true);
    try {
      await addDoc(collection(db, "member-requests"), {
        userId: user.id,
        userName: user.name,
        type: requestFormData.type,
        bookName: requestFormData.bookName,
        bookId: requestFormData.bookId || null,
        note: requestFormData.note,
        status: "Pending",
        createdAt: serverTimestamp()
      });
      toast.success("রিকোয়েস্ট সফলভাবে পাঠানো হয়েছে। (Request sent successfully!)");
      setShowRequestModal(false);
      setRequestFormData({ type: 'Issue', bookName: '', bookId: '', note: '' });
      setBookSearchText('');
    } catch (error) {
      console.error(error);
      toast.error("Error submitting request.");
    } finally {
      setIsSubmittingForm(false);
    }
  };

  useEffect(() => {
    if (user?.role === "admin") {
      const fetchStats = async () => {
        try {
          const [users, books, issues, finances] = await Promise.all([
            firebaseService.getCollection("users"),
            firebaseService.getCollection("books"),
            firebaseService.getCollection("issues"),
            firebaseService.getCollection("finances"),
          ]);

          const income = Array.isArray(finances)
            ? finances
                .filter((f: any) => f.type === "income")
                .reduce((acc, curr: any) => acc + Number(curr.amount), 0)
            : 0;
          const expense = Array.isArray(finances)
            ? finances
                .filter((f: any) => f.type === "expense")
                .reduce((acc, curr: any) => acc + Number(curr.amount), 0)
            : 0;

          const filteredUsers = Array.isArray(users) ? users.filter((u: any) => {
            const name = (u.name || "").toLowerCase().trim();
            const email = (u.email || "").toLowerCase().trim();
            const isExclude = name === "system admin" || name === "seneia islam" || name === "seneiya islam" || email === "seneiaislam@gmail.com";
            return !isExclude;
          }) : [];

          setStats({
            users: filteredUsers.length,
            books: Array.isArray(books) ? books.length : 0,
            issues: Array.isArray(issues)
              ? issues.filter((i: any) => String(i.status).toLowerCase() === "issued").length
              : 0,
            income,
            expense,
          });
        } catch (error) {
          console.error("Error fetching stats:", error);
        }
      };

      fetchStats();
    }
  }, [user]);

  if (user?.role !== "admin") {
    return (
      <div className="space-y-6 animate-in fade-in duration-700 max-w-5xl mx-auto">
        {/* Welcome & Action Banner */}
        <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50 rounded-full blur-[80px] -mr-32 -mt-32 pointer-events-none"></div>
          <div className="relative z-10">
            <p className="text-slate-500 font-semibold font-bengali mb-1">স্বাগতম,</p>
            <h2 className="text-3xl font-black tracking-tight text-slate-900">{user?.name} 👋</h2>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/books"
              className="relative z-10 bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-sm hover:shadow-md transition-all hover:scale-[1.02] active:scale-[0.98] text-center font-bengali"
            >
              <Search className="w-5 h-5 text-slate-500 shrink-0" />
              বইয়ের তালিকা এবং এভেইলেবল বই দেখুন
            </Link>
            <button
              onClick={() => setShowRequestModal(true)}
              className="relative z-10 bg-slate-900 hover:bg-black text-white px-6 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-slate-900/20 transition-all hover:scale-[1.02] active:scale-[0.98] text-center font-bengali"
            >
              <Library className="w-5 h-5 text-indigo-400 shrink-0" /> 
              বই গ্রহণের আবেদন
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          <Link
            to="/dashboard/profile"
            className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all group flex flex-col items-center text-center"
          >
            <div className="w-16 h-16 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform group-hover:bg-indigo-50 group-hover:text-indigo-600">
              <UserCircle2 className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-slate-900 mb-2 font-bengali">আমার প্রোফাইল</h3>
            <p className="text-slate-500 text-xs font-medium font-bengali leading-relaxed">
              আপনার ব্যক্তিগত তথ্য, বইয়ের কোড এবং পেমেন্ট হিস্ট্রি।
            </p>
          </Link>
          <Link
            to="/dashboard/my-books"
            className="bg-white rounded-3xl p-6 border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] hover:-translate-y-1 transition-all group flex flex-col items-center text-center"
          >
            <div className="w-16 h-16 bg-slate-50 text-slate-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform group-hover:bg-emerald-50 group-hover:text-emerald-600">
              <Library className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-slate-900 mb-2 font-bengali">আমার বইসমূহ</h3>
            <p className="text-slate-500 text-xs font-medium font-bengali leading-relaxed">
              আপনার বর্তমান বই এবং ফেরতের তারিখ চেক করুন।
            </p>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
          {/* Running Books Stat */}
          <div className="bg-indigo-50/50 rounded-3xl p-8 border border-indigo-100/50 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white text-indigo-600 rounded-2xl flex items-center justify-center shadow-sm">
                <BookPlus size={24} />
              </div>
            </div>
            <div>
              <h3 className="text-5xl font-black text-indigo-900 tracking-tight">{memberStats.activeIssues}</h3>
              <p className="text-indigo-700 font-bold mt-2 font-bengali text-sm opacity-80 uppercase tracking-widest">বর্তমানে আছে (Running Books)</p>
            </div>
          </div>

          {/* Returned Books Stat */}
          <div className="bg-emerald-50/50 rounded-3xl p-8 border border-emerald-100/50 flex flex-col justify-between shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-white text-emerald-600 rounded-2xl flex items-center justify-center shadow-sm">
                <CheckCircle2 size={24} />
              </div>
            </div>
            <div>
              <h3 className="text-5xl font-black text-emerald-900 tracking-tight">{memberStats.totalReturned}</h3>
              <p className="text-emerald-700 font-bold mt-2 font-bengali text-sm opacity-80 uppercase tracking-widest">বই ফেরত দিয়েছেন (Total Returned)</p>
            </div>
          </div>
        </div>
        
        <AnimatePresence>
          {showRequestModal && (
            <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
              <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} exit={{scale:0.9,opacity:0}} className="bg-white rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl border border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600"></div>
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center"><Library className="w-6 h-6" /></div>
                  <h3 className="text-2xl font-black text-slate-900 tracking-tight font-bengali">বই গ্রহণের আবেদন</h3>
                </div>
                <form onSubmit={handleRequestSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1 font-bengali">রিকোয়েস্টের ধরন</label>
                    <select value={requestFormData.type} onChange={e => setRequestFormData({...requestFormData, type: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bengali font-medium">
                      <option value="Issue">নতুন বই রিকোয়েস্ট (Request Book)</option>
                      <option value="Return">বই ফেরত (Return Book)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1 font-bengali">বইয়ের নাম বা কোড</label>
                    {requestFormData.type === 'Issue' ? (
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Users className="h-4 w-4 text-slate-400" />
                        </div>
                        <input 
                          type="text" 
                          value={bookSearchText} 
                          onChange={e => {
                            setBookSearchText(e.target.value);
                            setRequestFormData({...requestFormData, bookName: e.target.value});
                          }} 
                          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bengali" 
                          placeholder="বই খুঁজুন (Search among available books)..." 
                        />
                        {bookSearchText && !availableBooks.some(b => (b.title + (b.bookCode ? ` (${b.bookCode})` : '')) === bookSearchText) && (
                          <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-y-auto">
                            {availableBooks.filter(b => (b.title || '').toLowerCase().includes((bookSearchText || '').toLowerCase()) || (b.bookCode || '').toLowerCase().includes((bookSearchText || '').toLowerCase())).length === 0 ? (
                              <div className="p-4 text-center">
                                 <p className="text-slate-500 text-sm font-bengali mb-2">কোন বই খুঁজে পাওয়া যায়নি</p>
                                 <button 
                                    type="button" 
                                    onClick={() => {
                                        // Update form data and clear search so dropdown hides but input shows required text. 
                                        // Wait, clearing search text means input will go blank because input uses value={bookSearchText}!
                                        // So we shouldn't clear it. We can just blur the input, but React doesn't easily do it without ref.
                                        // Instead, we will add a small state to hide dropdown, or just let them click outside!
                                        // Let's just focus the next input (Note field) via a small hack
                                        document.getElementById('note-field')?.focus();
                                    }} 
                                    className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg text-sm font-bold w-full"
                                 >
                                     এই নামেই রিকোয়েস্ট করুন
                                 </button>
                              </div>
                            ) : (
                              availableBooks.filter(b => (b.title || '').toLowerCase().includes((bookSearchText || '').toLowerCase()) || (b.bookCode || '').toLowerCase().includes((bookSearchText || '').toLowerCase())).slice(0, 10).map(b => (
                                <button
                                  key={b.id}
                                  type="button"
                                  onClick={() => {
                                    setBookSearchText(b.title + (b.bookCode ? ` (${b.bookCode})` : ''));
                                    setRequestFormData({...requestFormData, bookName: b.title + (b.bookCode ? ` (${b.bookCode})` : ''), bookId: b.id});
                                  }}
                                  className="w-full text-left px-4 py-2 hover:bg-indigo-50 transition-colors font-bengali border-b border-slate-100 last:border-0"
                                >
                                  <div className="font-bold text-slate-800">{b.title}</div>
                                  {b.bookCode && <div className="text-xs text-slate-500 font-mono">Code: {b.bookCode}</div>}
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <input 
                        type="text" 
                        required 
                        value={requestFormData.bookName} 
                        onChange={e => setRequestFormData({...requestFormData, bookName: e.target.value})} 
                        className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bengali" 
                        placeholder="বইয়ের নাম লিখুন" 
                      />
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-1 font-bengali">নোট (ঐচ্ছিক)</label>
                    <textarea id="note-field" value={requestFormData.note} onChange={e => setRequestFormData({...requestFormData, note: e.target.value})} className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 font-bengali" placeholder="কিছু বলার থাকলে লিখুন" rows={3}></textarea>
                  </div>
                  <div className="flex justify-end gap-3 pt-6">
                    <button type="button" onClick={() => setShowRequestModal(false)} className="font-bengali px-5 py-3 text-slate-500 hover:bg-slate-50 rounded-xl font-bold">বাতিল</button>
                    <button type="submit" disabled={isSubmittingForm} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-sm shadow-indigo-200 font-bengali disabled:opacity-75">
                      {isSubmittingForm ? 'পাঠানো হচ্ছে...' : 'রিকোয়েস্ট পাঠান'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Admin Dashboard
  return (
    <div className="space-y-8">
      {/* Primary Quick Action for Admin */}
      <div className="bg-slate-900 dark:bg-[#0B1120] rounded-[2rem] p-6 sm:p-10 shadow-2xl border border-slate-800 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 transition-colors group">
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none transition-all duration-700 group-hover:bg-indigo-500/30"></div>
        <div className="absolute -left-20 -bottom-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none transition-all duration-700 group-hover:bg-emerald-500/20"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]"></div>

        <div className="relative z-10 text-center md:text-left">
          <h2 className="text-2xl sm:text-3xl font-black mb-3 flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start text-white font-bengali">
            <div className="p-3.5 bg-white/5 rounded-2xl backdrop-blur-md border border-white/10 shadow-inner">
              <BookmarkMinus className="w-8 h-8 text-indigo-400" />
            </div>
            বই ইস্যু ও ফেরত
          </h2>
          <p className="text-slate-400 max-w-md text-sm sm:text-base leading-relaxed mt-2 font-bengali">
            আপনার দৈনন্দিন পাঠাগারের কার্যক্রম পরিচালনা করুন। সদস্যদের বই ইস্যু করুন অথবা দ্রুত রিটার্ন প্রসেস করুন।
          </p>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row w-full md:w-auto gap-4">
          <Link
            to="/dashboard/users"
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-6 py-4 rounded-2xl font-bold transition-all shadow-lg active:scale-95 font-bengali"
          >
            <Users className="w-5 h-5" />
            সদস্যগণ
          </Link>
          <Link
            to="/dashboard/issues?action=issue"
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-500/25 active:scale-95 whitespace-nowrap font-bengali"
          >
            <BookPlus className="w-5 h-5" />
            বই প্রদান
          </Link>
          <Link
            to="/dashboard/issues"
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 px-8 py-4 rounded-2xl font-bold transition-all active:scale-95 whitespace-nowrap backdrop-blur-sm font-bengali"
          >
            <CheckCircle2 className="w-5 h-5" />
            বই ফেরত
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 hover:*:shadow-2xl hover:*:border-slate-200 dark:hover:*:border-slate-700 transition-all">
        {/* Total Users Card */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group flex flex-col justify-between">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-blue-500/10 rounded-full blur-[40px] pointer-events-none group-hover:bg-blue-500/20 transition-colors duration-500"></div>
          <div className="relative z-10 flex items-start justify-between mb-8">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-sm border border-blue-100/50 dark:border-blue-500/20 group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
              <Users className="w-7 h-7" />
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 text-slate-400 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase font-bengali">
              সদস্য
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1 font-bengali">
              নিবন্ধিত সদস্য
            </p>
            <p className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">
              {stats.users}
            </p>
          </div>
        </div>

        {/* Total Books Card */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group flex flex-col justify-between">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-indigo-500/10 rounded-full blur-[40px] pointer-events-none group-hover:bg-indigo-500/20 transition-colors duration-500"></div>
          <div className="relative z-10 flex items-start justify-between mb-8">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-sm border border-indigo-100/50 dark:border-indigo-500/20 group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
              <Library className="w-7 h-7" />
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 text-slate-400 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase font-bengali">
              বই
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1 font-bengali">
              ক্যাটালগে বই
            </p>
            <p className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">
              {stats.books}
            </p>
          </div>
        </div>

        {/* Active Issues Card */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group flex flex-col justify-between">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-amber-500/10 rounded-full blur-[40px] pointer-events-none group-hover:bg-amber-500/20 transition-colors duration-500"></div>
          <div className="relative z-10 flex items-start justify-between mb-8">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-sm border border-amber-100/50 dark:border-amber-500/20 group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
              <Activity className="w-7 h-7" />
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 text-slate-400 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase font-bengali">
              ইস্যু
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1 font-bengali">
              সক্রিয় ইস্যু
            </p>
            <p className="text-5xl font-black text-slate-900 dark:text-white tracking-tighter">
              {stats.issues}
            </p>
          </div>
        </div>

        {/* Balance Card */}
        <div className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group flex flex-col justify-between">
          <div className="absolute -right-8 -top-8 w-40 h-40 bg-emerald-500/10 rounded-full blur-[40px] pointer-events-none group-hover:bg-emerald-500/20 transition-colors duration-500"></div>
          <div className="relative z-10 flex items-start justify-between mb-8">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-sm border border-emerald-100/50 dark:border-emerald-500/20 group-hover:scale-110 group-hover:shadow-md transition-all duration-300">
              <DollarSign className="w-7 h-7" />
            </div>
            <div className="bg-slate-50 dark:bg-slate-800 text-slate-400 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase font-bengali">
              ফান্ড
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1 font-bengali">
              বর্তমান ব্যালেন্স
            </p>
            <p className="text-5xl font-black text-emerald-600 dark:text-emerald-400 tracking-tighter">
              ৳{stats.income - stats.expense}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-black font-bengali text-slate-800 dark:text-white tracking-tight">
              দ্রুত পদক্ষেপ
            </h3>
          </div>

          <div className="space-y-6">
            {/* Book Management */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm transition-colors">
              <h4 className="font-bengali font-bold text-slate-600 dark:text-slate-300 mb-4 text-sm flex items-center gap-2">
                <Library className="w-4 h-4" /> বই ব্যবস্থাপনা
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  to="/dashboard/books"
                  className="flex items-center gap-3 p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600/50 rounded-xl shadow-sm hover:shadow-md hover:border-amber-300 hover:text-amber-700 dark:hover:border-amber-500/50 dark:text-slate-200 transition-all font-bengali font-bold text-slate-700 group"
                >
                  <div className="p-2 bg-amber-50 dark:bg-amber-500/10 rounded-lg group-hover:bg-amber-100 transition-colors">
                    <BookPlus className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                  </div>
                  <span>
                    নতুন বই যোগ করুন
                  </span>
                </Link>
                <Link
                  to="/dashboard/purchases"
                  className="flex items-center gap-3 p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600/50 rounded-xl shadow-sm hover:shadow-md hover:border-pink-300 hover:text-pink-700 dark:hover:border-pink-500/50 dark:text-slate-200 transition-all font-bengali font-bold text-slate-700 group"
                >
                  <div className="p-2 bg-pink-50 dark:bg-pink-500/10 rounded-lg group-hover:bg-pink-100 transition-colors">
                    <ShoppingCart className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                  </div>
                  <span>
                    বই ক্রয়ের অনুরোধ
                  </span>
                </Link>
              </div>
            </div>

            {/* Special Button */}
            <div className="pt-2">
              <Link
                to="/dashboard/messages"
                className="flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white font-bengali font-bold text-lg rounded-xl shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20 hover:shadow-xl hover:shadow-indigo-300 hover:scale-[1.02] active:scale-[0.98] transition-all bg-[length:200%_auto] hover:bg-right duration-500"
              >
                <MessageSquare className="w-6 h-6 text-pink-200" />
                ম্যাসেঞ্জার খুলুন
              </Link>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col transition-colors">
          <h3 className="text-xl font-black font-bengali text-slate-800 dark:text-white tracking-tight mb-4">
            সাম্প্রতিক কার্যকলাপ
          </h3>
          <div className="flex-1 flex items-center justify-center text-center py-12 text-slate-500 dark:text-slate-400 font-bengali text-sm bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-600 transition-colors">
            কার্যকলাপের টাইমলাইন এখানে প্রদর্শিত হবে
          </div>
        </div>
      </div>
    </div>
  );
}
