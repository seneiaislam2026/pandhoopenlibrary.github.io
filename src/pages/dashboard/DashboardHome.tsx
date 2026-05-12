import React, { useEffect, useState, useCallback } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "../../store/AuthContext";
import { firebaseService } from "../../services/firebaseService";
import { db, handleFirestoreError, OperationType } from "../../lib/firebase";
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc, addDoc, serverTimestamp, getDocs } from "firebase/firestore";
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
  Plus,
  ImageIcon,
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import toast from 'react-hot-toast';
import { getDoc } from "firebase/firestore";

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
  const [eventBanners, setEventBanners] = useState<string[]>([]);
  const [dismissedBanners, setDismissedBanners] = useState<string[]>([]);

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestFormData, setRequestFormData] = useState({
    type: 'Issue',
    bookName: '',
    bookId: '',
    note: ''
  });
  const [isSubmittingForm, setIsSubmittingForm] = useState(false);

  useEffect(() => {
    if (user) {
      const fetchBanners = async () => {
        try {
          const cacheKey = 'dash_banners_cache';
          const cacheTimeKey = 'dash_banners_time';
          const cached = sessionStorage.getItem(cacheKey);
          const lastTime = sessionStorage.getItem(cacheTimeKey);
          
          if (cached && lastTime && (Date.now() - parseInt(lastTime) < 1 * 60 * 1000)) {
            setEventBanners(JSON.parse(cached));
            return;
          }

          const docRef = doc(db, 'settings', 'general');
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            let banners: string[] = [];
            if (Array.isArray(data.eventBanners)) {
              banners = data.eventBanners;
            } else if (data.eventBanner) {
              banners = [data.eventBanner];
            }
            setEventBanners(banners);
            sessionStorage.setItem(cacheKey, JSON.stringify(banners));
            sessionStorage.setItem(cacheTimeKey, Date.now().toString());
          }
        } catch (err) {
          if (err instanceof Error && err.message.includes('Quota')) return;
          console.error("Error fetching banners:", err);
        }
      };
      fetchBanners();
    }
  }, [user]);

  useEffect(() => {
    if (user && user.role !== 'admin') {
      const fetchMemberData = async () => {
        try {
          const cachedIssues = sessionStorage.getItem('dash_home_issues_'+user.id);
          const cachedBooks = sessionStorage.getItem('dash_home_books');
          const cacheTime = sessionStorage.getItem('dash_home_time');

          if (cachedIssues && cachedBooks && cacheTime && (Date.now() - parseInt(cacheTime) < 1 * 60 * 1000)) {
            setMemberStats(JSON.parse(cachedIssues));
            setAvailableBooks(JSON.parse(cachedBooks));
            return;
          }

          const qIssues = query(collection(db, 'issues'), where('userId', '==', user.id));
          const [issuesSnap, booksSnap] = await Promise.all([
             getDocs(qIssues),
             getDocs(collection(db, 'books'))
          ]);

          let active = 0;
          let returned = 0;
          issuesSnap.docs.forEach(doc => {
            const data = doc.data();
            if (data.status === 'Issued') active++;
            if (data.status === 'Returned') returned++;
          });
          
          const stats = { activeIssues: active, totalReturned: returned };
          setMemberStats(stats);

          const books = booksSnap.docs
            .map(doc => ({ id: doc.id, title: doc.data().title || '', bookCode: doc.data().bookCode || '', status: doc.data().status }))
            .filter(b => !b.status || String(b.status).toLowerCase() === "available" || String(b.status).toLowerCase() === "");
          setAvailableBooks(books);

          sessionStorage.setItem('dash_home_issues_'+user.id, JSON.stringify(stats));
          sessionStorage.setItem('dash_home_books', JSON.stringify(books));
          sessionStorage.setItem('dash_home_time', Date.now().toString());

        } catch (error) {
          if (error instanceof Error && (error.message.includes('Quota') || error.message.includes('Quota limit exceeded'))) return;
          handleFirestoreError(error, OperationType.GET, 'dashboard_home');
        }
      };

      fetchMemberData();
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

  const hasAccess = useCallback((path: string) => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.role === 'visitor_admin' || user.role === 'subadmin') {
      return user.subadminAccess?.includes(path) || false;
    }
    return false;
  }, [user]);

  useEffect(() => {
    if (user?.role === "admin" || user?.role === "subadmin" || user?.role === "visitor_admin") {
      const fetchStats = async () => {
        try {
          const cacheKey = 'admin_dash_stats';
          const cacheTimeKey = 'admin_dash_stats_time';
          const cached = sessionStorage.getItem(cacheKey);
          const lastTime = sessionStorage.getItem(cacheTimeKey);

          if (cached && lastTime && (Date.now() - parseInt(lastTime) < 1 * 60 * 1000)) {
            setStats(JSON.parse(cached));
            return;
          }

          const statsPromises = [];
          
          let usersPromise = Promise.resolve([]);
          let booksPromise = Promise.resolve([]);
          let issuesPromise = Promise.resolve([]);
          let financesPromise = Promise.resolve([]);

          if (hasAccess('/dashboard/users')) {
            usersPromise = firebaseService.getCollection("users");
          }
          if (hasAccess('/dashboard/books')) {
            booksPromise = firebaseService.getCollection("books");
          }
          if (hasAccess('/dashboard/issues')) {
            issuesPromise = firebaseService.getCollection("issues");
          }
          if (hasAccess('/dashboard/finances')) {
            financesPromise = firebaseService.getCollection("finances");
          }

          const [users, books, issues, finances] = await Promise.all([
            usersPromise,
            booksPromise,
            issuesPromise,
            financesPromise,
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

          const newStats = {
            users: filteredUsers.length,
            books: Array.isArray(books) ? books.length : 0,
            issues: Array.isArray(issues)
              ? issues.filter((i: any) => String(i.status).toLowerCase() === "issued").length
              : 0,
            income,
            expense,
          };
          setStats(newStats);
          sessionStorage.setItem('admin_dash_stats', JSON.stringify(newStats));
          sessionStorage.setItem('admin_dash_stats_time', Date.now().toString());
        } catch (error) {
          if (error instanceof Error && error.message.includes('Quota')) return;
          console.error("Error fetching stats:", error);
        }
      };

      fetchStats();
    }
  }, [user, hasAccess]);

  if (!user) return null;

  if (user.role !== "admin" && user.role !== "visitor_admin" && user.role !== "subadmin") {
    return <Navigate to="/dashboard/books" replace />;
  }

  // Admin Dashboard
  return (
    <div className="space-y-8">
      {eventBanners.filter(b => !dismissedBanners.includes(b)).map((banner, idx) => (
        <motion.div 
          key={idx} 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full rounded-2xl overflow-hidden shadow-lg border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 relative"
        >
           <button 
             onClick={() => setDismissedBanners(prev => [...prev, banner])} 
             className="absolute top-3 right-3 bg-black/50 text-white p-1.5 rounded-full hover:bg-black/70 transition-colors backdrop-blur-sm z-10"
           >
             <X className="w-4 h-4" />
           </button>
           <img src={banner} alt={`Event Banner ${idx + 1}`} className="w-full h-auto max-h-[350px] object-cover" />
        </motion.div>
      ))}

      {/* Primary Quick Action for Admin */}
      {(hasAccess('/dashboard/users') || hasAccess('/dashboard/issues')) && (
      <div className="bg-slate-900 dark:bg-[#0B1120] rounded-[2rem] p-6 sm:p-10 shadow-2xl border border-slate-800 relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-8 transition-colors group">
        <div className="absolute -right-20 -top-20 w-96 h-96 bg-indigo-500/20 rounded-full blur-[80px] pointer-events-none transition-all duration-700 group-hover:bg-indigo-500/30"></div>
        <div className="absolute -left-20 -bottom-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-[80px] pointer-events-none transition-all duration-700 group-hover:bg-emerald-500/20"></div>
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]"></div>

        <div className="relative z-10 text-center md:text-left">
          <h2 className="text-2xl sm:text-3xl font-black mb-3 flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start text-white font-bengali">
            <div className="p-3.5 bg-white/5 rounded-2xl backdrop-blur-md border border-white/10 shadow-inner">
              <BookmarkMinus className="w-8 h-8 text-indigo-400" />
            </div>
            হালনাগাদ ও পরিচালনা
          </h2>
          <p className="text-slate-400 max-w-md text-sm sm:text-base leading-relaxed mt-2 font-bengali">
            আপনার দৈনন্দিন পাঠাগারের কার্যক্রম পরিচালনা করুন। সদস্যদের ব্যবস্থাপনা এবং বই ইস্যু/রিটার্ন করুন।
          </p>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row w-full md:w-auto gap-4">
            <>
              {hasAccess('/dashboard/users') && (
                <Link
                  to="/dashboard/users"
                  className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-6 py-4 rounded-2xl font-bold transition-all shadow-lg active:scale-95 font-bengali"
                >
                  <Users className="w-5 h-5" />
                  সদস্যগণ
                </Link>
              )}
              {hasAccess('/dashboard/issues') && (
                <>
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
                </>
              )}
            </>
        </div>
      </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 hover:*:shadow-2xl hover:*:border-slate-200 dark:hover:*:border-slate-700 transition-all">
        {/* Total Users Card */}
        {hasAccess('/dashboard/users') && (
        <Link to="/dashboard/users" className="block bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group flex flex-col justify-between">
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
        </Link>
        )}

        {/* Total Books Card */}
        {hasAccess('/dashboard/books') && (
        <Link to="/dashboard/books" className="block bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group flex flex-col justify-between">
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
        </Link>
        )}

        {/* Active Issues Card */}
        <Link to={hasAccess('/dashboard/issues') ? "/dashboard/issues" : "/dashboard/my-books"} className="bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group flex flex-col justify-between">
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
        </Link>

        {/* Balance Card */}
        {hasAccess('/dashboard/finances') && (
        <Link to="/dashboard/finances" className="block bg-white dark:bg-slate-900 rounded-[2rem] p-8 shadow-sm border border-slate-100 dark:border-slate-800 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden group flex flex-col justify-between">
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
        </Link>
        )}
      </div>
    </div>
  );
}
