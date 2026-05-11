import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { Logo } from '../components/Logo';
import { 
  ShoppingBag,
  LayoutDashboard, 
  CalendarHeart,
  Users, 
  Library, 
  DollarSign, 
  ClipboardList, 
  UserCircle,
  BookmarkCheck,
  Bell,
  MessageSquare,
  LogOut,
  Home,
  Menu,
  X,
  Plus,
  FileText,
  Clock,
  BookOpen,
  ShieldAlert,
  UserX,
  CheckCircle2,
  ArrowLeft,
  ShoppingCart,
  Search,
  Moon,
  Sun,
  MapPin,
  Phone,
  Heart,
  Package,
  QrCode,
  Settings,
  Replace
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  const { user, logout, token } = useAuth();

  useEffect(() => {
    if (user?.role === 'visitor_admin') {
      const handleGlobalClick = (e: MouseEvent) => {
         let target = e.target as HTMLElement | null;
         
         // Whitelists for things visitor admin CAN do (like closing modals, searching, navigating tabs)
         const safeClasses = ['text-slate-400', 'hover:bg-slate-100', 'lucide-x', 'lucide-search'];
         
         while (target && target !== document.body) {
           if (target.tagName === 'BUTTON') {
              const buttonText = target.innerText?.toLowerCase() || '';
              const buttonTypes = target.getAttribute('type') || '';
              
              // If it's a pagination or safe navigation button, let it pass
              if (target.classList.contains('lucide-chevron-left') || 
                  target.classList.contains('lucide-chevron-right') ||
                  buttonText.includes('পরবর্তী') || buttonText.includes('পূর্ববর্তী') || buttonText.includes('cancel') || buttonText.includes('close')) {
                 return;
              }

              // Check if button is for submitting, editing, deleting, uploading
              if (buttonTypes === 'submit' || target.querySelector('.lucide-trash-2') || target.querySelector('.lucide-edit') || target.querySelector('.lucide-save') || target.querySelector('.lucide-plus') || target.querySelector('.lucide-upload') || buttonText.includes('save') || buttonText.includes('add') || buttonText.includes('delete') || buttonText.includes('update')) {
                 e.preventDefault();
                 e.stopPropagation();
                 toast.error('ভিজিটর অ্যাডমিন হিসেবে এডিট বা ডিলিট করার অনুমতি নেই।');
                 return;
              }
           }
           target = target.parentElement;
         }
      };

      document.addEventListener('click', handleGlobalClick, true); // true = capture phase
      
      const handleGlobalSubmit = (e: SubmitEvent) => {
         // Whitelist login or safe forms if any inside dashboard? Usually none.
         if (e.target instanceof HTMLFormElement && e.target.id === 'search-form') return;
         e.preventDefault();
         e.stopPropagation();
         toast.error('ভিজিটর অ্যাডমিন হিসেবে সেভ/এডিট করার অনুমতি নেই।');
      };
      
      document.addEventListener('submit', handleGlobalSubmit, true);

      return () => {
         document.removeEventListener('click', handleGlobalClick, true);
         document.removeEventListener('submit', handleGlobalSubmit, true);
      };
    }
  }, [user]);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);
  
  const location = useLocation();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [messagesCount, setMessagesCount] = useState(0);
  const [bookRequestsCount, setBookRequestsCount] = useState(0);
  const [resetRequestsCount, setResetRequestsCount] = useState(0);
  const [preBookingsCount, setPreBookingsCount] = useState(0);
  const [unreadNoticesCount, setUnreadNoticesCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [dynamicSubadminLinks, setDynamicSubadminLinks] = useState<any[]>([
    { name: 'আমার প্রোফাইল', path: '/dashboard/profile', icon: UserCircle },
    { name: 'ওভারভিউ', path: '/dashboard', icon: LayoutDashboard },
  ]);

  useEffect(() => {
    if (user?.role === 'admin') {
      const fetchAdminData = async () => {
        try {
          const cachedNotes = sessionStorage.getItem('dash_admin_notif');
          const cacheTime = sessionStorage.getItem('dash_admin_time');
          
          if (cachedNotes && cacheTime && (Date.now() - parseInt(cacheTime) < 2 * 60 * 1000)) {
            setNotifications(JSON.parse(cachedNotes));
            setBookRequestsCount(parseInt(sessionStorage.getItem('dash_admin_breq') || '0'));
            setResetRequestsCount(parseInt(sessionStorage.getItem('dash_admin_rreq') || '0'));
            setPreBookingsCount(parseInt(sessionStorage.getItem('dash_admin_pre') || '0'));
            return;
          }

          const { getDocs, limit } = await import('firebase/firestore');
          
          const qNotif = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(50));
          const qBookReq = query(collection(db, 'book-requests'), where('status', '==', 'Pending'));
          const qResetReq = query(collection(db, 'reset-requests'));
          const qPreBook = query(collection(db, 'pre-bookings'), where('status', '==', 'Pending'));

          const [notifSnap, bReqSnap, rReqSnap, pBookSnap] = await Promise.all([
            getDocs(qNotif),
            getDocs(qBookReq),
            getDocs(qResetReq),
            getDocs(qPreBook)
          ]);

          const notifs = notifSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setNotifications(notifs);
          
          const bReqCount = bReqSnap.docs.length;
          setBookRequestsCount(bReqCount);
          
          const rReqCount = rReqSnap.docs.filter(doc => doc.data().status === 'Pending').length;
          setResetRequestsCount(rReqCount);
          
          const pBookCount = pBookSnap.docs.length;
          setPreBookingsCount(pBookCount);

          sessionStorage.setItem('dash_admin_notif', JSON.stringify(notifs));
          sessionStorage.setItem('dash_admin_breq', bReqCount.toString());
          sessionStorage.setItem('dash_admin_rreq', rReqCount.toString());
          sessionStorage.setItem('dash_admin_pre', pBookCount.toString());
          sessionStorage.setItem('dash_admin_time', Date.now().toString());
        } catch (err) {
          if (err instanceof Error && err.message.includes('Quota')) return;
          console.error("Admin dashboard fetch error:", err);
        }
      };

      fetchAdminData();
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === 'subadmin' || user?.role === 'visitor_admin') {
      const accesses = user?.subadminAccess || [];
      const baseLinks = [
        { name: 'আমার প্রোফাইল', path: '/dashboard/profile', icon: UserCircle },
        { name: 'ওভারভিউ', path: '/dashboard', icon: LayoutDashboard }
      ];
      
      const allAdminLinks = [
        { name: 'সদস্য ব্যবস্থাপনা (Users)', path: '/dashboard/users', icon: Users },
        { name: 'বইয়ের তালিকা (Inventory)', path: '/dashboard/books', icon: Library },
        { name: 'ইস্যু ও ফেরত (Issues)', path: '/dashboard/issues', icon: ClipboardList },
        { name: 'সদস্যদের বকেয়া (Dues)', path: '/dashboard/dues', icon: DollarSign },
        { name: 'দাতা সদস্য (Donors)', path: '/dashboard/donors', icon: DollarSign },
        { name: 'হিসাব-নিকাশ (Finances)', path: '/dashboard/finances', icon: DollarSign },
        { name: 'নোটিশ', path: '/dashboard/notices', icon: Bell },
        { name: 'মেসেজসমূহ', path: '/dashboard/messages', icon: MessageSquare },
        { name: 'বইয়ের অনুরোধ (Requests)', path: '/dashboard/book-requests', icon: BookOpen },
        { name: 'প্রি-বুকিং', path: '/dashboard/pre-bookings', icon: Clock },
        { name: 'শপ বই ব্যবস্থাপনা', path: '/dashboard/shop-books', icon: Library },
        { name: 'বই বিক্রয় অর্ডার', path: '/dashboard/shop-orders', icon: Package },
        { name: 'স্টিকার ও QR (Stickers)', path: '/dashboard/stickers', icon: QrCode },
        { name: 'বুক রিভিও ম্যানেজমেন্ট', path: '/dashboard/manageblog', icon: FileText },
        { name: 'ইভেন্ট পরিচালনা', path: '/dashboard/events', icon: CalendarHeart }
      ];

      const newLinks = [...baseLinks];
      accesses.forEach((path: string) => {
        const linkObj = allAdminLinks.find(l => l.path === path);
        if (linkObj) newLinks.push(linkObj);
      });
      setDynamicSubadminLinks(newLinks);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const fetchUserData = async () => {
        try {
          const cachedMessages = sessionStorage.getItem('dash_user_msgs');
          const cachedNotices = sessionStorage.getItem('dash_user_notices');
          const cacheTime = sessionStorage.getItem('dash_user_time');
          
          let currentNotices: any[] = [];
          const updateUnreadCount = () => {
            const lastSeen = localStorage.getItem(`last_seen_notices_${user.id}`);
            if (lastSeen) {
               const unreadCount = currentNotices.filter(n => new Date(n.date) > new Date(lastSeen)).length;
               setUnreadNoticesCount(unreadCount);
            } else {
               setUnreadNoticesCount(currentNotices.length);
            }
          };

          window.addEventListener('notices_seen', updateUnreadCount);

          if (cachedMessages && cachedNotices && cacheTime && (Date.now() - parseInt(cacheTime) < 2 * 60 * 1000)) {
             setMessagesCount(parseInt(cachedMessages));
             currentNotices = JSON.parse(cachedNotices);
             updateUnreadCount();
             return;
          }

          const { getDocs } = await import('firebase/firestore');
          const qMsg = query(collection(db, 'messages'), where('toUserId', '==', user.id));
          const qNotices = query(collection(db, "notices"), orderBy("date", "desc"));
          
          const [msgSnap, noticeSnap] = await Promise.all([
            getDocs(qMsg),
            getDocs(qNotices)
          ]);

          const msgs = msgSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          const unreadMsgs = msgs.filter((m: any) => !m.isRead && m.toUserId === user.id).length;
          setMessagesCount(unreadMsgs);

          currentNotices = noticeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
          updateUnreadCount();

          sessionStorage.setItem('dash_user_msgs', unreadMsgs.toString());
          sessionStorage.setItem('dash_user_notices', JSON.stringify(currentNotices));
          sessionStorage.setItem('dash_user_time', Date.now().toString());

        } catch (err) {
          if (err instanceof Error && err.message.includes('Quota')) return;
          console.error("Dashboard user fast fetch error:", err);
        }
      };
      
      fetchUserData();

      return () => {
        window.removeEventListener('notices_seen', () => {});
      };
    }
  }, [user]);

  const markAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (err) {
      console.error('Error marking as read:', err);
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const adminLinks = [
    { name: 'আমার প্রোফাইল', path: '/dashboard/profile', icon: UserCircle },
    { name: 'ওভারভিউ (Overview)', path: '/dashboard', icon: LayoutDashboard },
    { name: 'সদস্য ব্যবস্থাপনা (Users)', path: '/dashboard/users', icon: Users },
    { name: 'গঠনতন্ত্র', path: '/dashboard/constitution', icon: FileText },
    { name: 'সদস্য ডিলিট করুন', path: '/dashboard/delete-users', icon: UserX },
    { name: 'বইয়ের তালিকা (Inventory)', path: '/dashboard/books', icon: Library },
    { name: 'স্টিকার ও QR (Stickers)', path: '/dashboard/stickers', icon: QrCode },
    { name: 'ইস্যু ও ফেরত (Issues)', path: '/dashboard/issues', icon: ClipboardList },
    { name: 'শপ বই ব্যবস্থাপনা', path: '/dashboard/shop-books', icon: Library },
    { name: 'বই বিক্রয় অর্ডার', path: '/dashboard/shop-orders', icon: Package },
    { name: 'সদস্যদের বকেয়া (Dues)', path: '/dashboard/dues', icon: DollarSign },
    { name: 'দাতা সদস্য (Donors)', path: '/dashboard/donors', icon: DollarSign },
    { name: 'হিসাব-নিকাশ (Finances)', path: '/dashboard/finances', icon: DollarSign },
    { name: 'পরিচালনা পর্ষদ', path: '/dashboard/manageteam', icon: Users },
    { name: 'বুক রিভিও ম্যানেজমেন্ট', path: '/dashboard/manageblog', icon: FileText },
    { name: 'নোটিশ', path: '/dashboard/notices', icon: Bell },
    { name: 'মেসেজসমূহ', path: '/dashboard/messages', icon: MessageSquare },
    { name: 'বইয়ের অনুরোধ (Requests)', path: '/dashboard/book-requests', icon: BookOpen },
    { name: 'রিসেট রিকোয়েস্ট', path: '/dashboard/reset-requests', icon: ShieldAlert },
    { name: 'প্রি-বুকিং', path: '/dashboard/pre-bookings', icon: Clock },
    { name: 'ইভেন্ট পরিচালনা', path: '/dashboard/events', icon: CalendarHeart },
    { name: 'ওয়েবসাইট সেটিংস', path: '/dashboard/settings', icon: Settings },
  ];

  const issueAdminLinks = [
    { name: 'আমার প্রোফাইল', path: '/dashboard/profile', icon: UserCircle },
    { name: 'ওভারভিউ', path: '/dashboard', icon: LayoutDashboard },
    { name: 'বইয়ের তালিকা', path: '/dashboard/books', icon: Library },
    { name: 'বই ইস্যু ও ফেরত', path: '/dashboard/issues', icon: Replace },
    { name: 'প্রি-বুকিং', path: '/dashboard/pre-bookings', icon: Clock },
  ];

  const readerLinks = [
    { name: 'আমার প্রোফাইল', path: '/dashboard/profile', icon: UserCircle },
    { name: 'ড্যাশবোর্ড', path: '/dashboard', icon: LayoutDashboard },
    { name: 'বইয়ের তালিকা', path: '/dashboard/books', icon: Library },
    { name: 'বই কিনুন', path: '/buy-books', icon: Library },
    { name: 'নোটিশ বোর্ড', path: '/dashboard/notice-board', icon: Bell },
    { name: 'আমার ইনবক্স', path: '/dashboard/inbox', icon: MessageSquare },
    { name: 'আমার বই ও প্রি-বুকিং', path: '/dashboard/my-books', icon: BookmarkCheck },
    { name: 'বইয়ের অনুরোধ', path: '/dashboard/book-requests', icon: BookOpen },
  ];

  const links = user?.role === 'admin' ? adminLinks : (user?.role === 'subadmin' || user?.role === 'visitor_admin') ? dynamicSubadminLinks : readerLinks;
  const filteredLinks = links.filter(l => l.name.toLowerCase().includes(sidebarSearch.toLowerCase()));

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="flex-1 flex">
        {/* Mobile sidebar backdrop */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-slate-900/50 md:hidden backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 bg-[#0A0F1C] text-slate-300 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 flex flex-col border-r border-[#1B253B] shadow-2xl",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex flex-col px-6 py-4 border-b border-[#1B253B]/60 bg-[#0A0F1C] shrink-0 sticky top-0 z-10 gap-3">
          <div className="flex justify-between items-center w-full">
            <Link to="/dashboard" className="flex items-center gap-3 group">
               <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform overflow-hidden shrink-0">
                 <Logo className="w-8 h-8" />
               </div>
               <div className="flex flex-col min-w-0">
                 <span className="font-bold text-white tracking-wide truncate text-sm">পানধোয়া উন্মুক্ত পাঠাগার</span>
                 <span className="text-[10px] text-indigo-300/80 font-medium uppercase tracking-widest truncate">{user?.role === 'admin' ? 'Admin Gateway' : 'Member Portal'}</span>
               </div>
            </Link>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="md:hidden text-slate-500 hover:text-white p-2 shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* User Card */}
        <div className="px-6 py-5 border-b border-[#1B253B]/60">
           <div className="flex items-center gap-4 bg-[#111827] p-3 rounded-2xl border border-[#1F2937]">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} referrerPolicy="no-referrer" className="w-12 h-12 rounded-full object-cover border-2 border-indigo-500/30" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-600/20 flex items-center justify-center border-2 border-indigo-500/30">
                  <UserCircle className="w-6 h-6 text-indigo-400" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                 <p className="text-sm font-bold text-white truncate">{user?.name}</p>
                 <p className="text-[11px] text-slate-400 truncate">@{user?.username}</p>
                 {user?.phone && (
                   <p className="text-[10px] text-slate-500 truncate mt-0.5">{user.phone}</p>
                 )}
              </div>
           </div>
           
           <div className="mt-4 relative">
             <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
             <input
               type="text"
               placeholder="Search..."
               value={sidebarSearch}
               onChange={e => setSidebarSearch(e.target.value)}
               className="w-full bg-[#111827] border border-[#1F2937] rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-medium"
             />
           </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto scrollbar-hide">
          {filteredLinks.map((link) => {
            const isActive = location.pathname === link.path;
            const Icon = link.icon;
            
            let badgeCount = 0;
            if (user?.role === 'admin') {
              if (link.name === 'প্রি-বুকিং') badgeCount = preBookingsCount;
              if (link.name === 'সদস্য ব্যবস্থাপনা (Users)') badgeCount = notifications.filter((n: any) => !n.read && n.type === 'registration').length;
              if (link.name === 'বইয়ের অনুরোধ (Requests)') badgeCount = bookRequestsCount;
              if (link.name === 'রিসেট রিকোয়েস্ট') badgeCount = resetRequestsCount;
              if (link.name === 'মেসেজসমূহ') badgeCount = messagesCount;
            }
            if (link.name === 'My Inbox' || link.name === 'আমার ইনবক্স') {
               badgeCount = messagesCount;
            }
            if (link.name === 'নোটিশ' || link.name === 'নোটিশ বোর্ড') {
               badgeCount = unreadNoticesCount;
            }

            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => {
                  setSidebarOpen(false);
                  if (badgeCount > 0 && link.name !== 'My Inbox') {
                     const toMark = notifications.filter((n: any) => !n.read && (
                        (link.name === 'প্রি-বুকিং' && n.type === 'prebooking') ||
                        (link.name === 'সদস্য ব্যবস্থাপনা (Users)' && n.type === 'registration')
                     ));
                     toMark.forEach((n: any) => markAsRead(n.id));
                  }
                }}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all justify-between group",
                  isActive
                    ? "bg-indigo-600/15 text-indigo-400 border border-indigo-500/20"
                    : "text-slate-400 hover:bg-[#111827] hover:text-slate-200 border border-transparent hover:border-[#1F2937]"
                )}
              >
                <div className="flex items-center gap-3">
                  <Icon className={cn("w-5 h-5 transition-transform group-hover:scale-110", isActive ? "text-indigo-400" : "text-slate-500 group-hover:text-slate-400")} />
                  {link.name}
                </div>
                {badgeCount > 0 && (
                  <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                    {badgeCount > 99 ? '99+' : badgeCount}
                  </span>
                )}
              </Link>
            );
          })}
          {filteredLinks.length === 0 && (
             <div className="text-center py-6 text-sm text-slate-500">
               No matching menus.
             </div>
          )}
        </nav>

        {/* Footer actions */}
        <div className="p-4 border-t border-[#1B253B]/60 space-y-2 bg-[#05080E]/50">
          <Link 
            to="/" 
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-slate-400 hover:bg-[#111827] border border-transparent hover:border-[#1F2937] hover:text-slate-200 transition-all group"
          >
            <Home className="w-5 h-5 text-slate-500 group-hover:text-slate-400 transition-colors" />
            Back to Site
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-rose-400/90 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 hover:text-rose-400 transition-all group"
          >
            <LogOut className="w-5 h-5 opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 dark:bg-slate-900 transition-colors">
      {/* Mobile Topbar */}
        <div className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 md:hidden shadow-sm z-30 transition-colors shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-slate-700 rounded-xl transition-colors"
            >
              <Menu className="w-6 h-6" />
            </button>
            <div className="flex flex-col ml-1">
              <span className="font-bold text-slate-900 dark:text-white leading-tight text-sm">Dashboard</span>
              <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider">{user?.role}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-slate-700 rounded-full transition-colors border border-slate-200 dark:border-slate-600"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {user?.role === 'admin' && (
              <button 
                onClick={() => navigate('/dashboard/messages')}
                className="relative p-2 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 rounded-full transition-colors border border-slate-200 dark:border-slate-600"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border border-white">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
            )}
            {location.pathname !== '/dashboard' && (
              <button 
                onClick={() => navigate('/dashboard')}
                className="p-2 text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-700 rounded-full transition-colors border border-slate-200 dark:border-slate-600"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Topbar for Desktop */}
        <header className="hidden md:flex h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 items-center justify-between px-8 z-30 shadow-sm relative transition-colors">
          <div className="flex items-center gap-3">
            {location.pathname !== '/dashboard' && (
              <button 
                onClick={() => navigate('/dashboard')}
                className="p-2 -ml-2 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-full transition-colors flex items-center justify-center border border-slate-200 dark:border-slate-600"
                aria-label="Go back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h1 className="text-xl font-semibold text-slate-800 dark:text-white tracking-tight">
              {links.find(l => l.path === location.pathname)?.name || 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-6">
            <Link
              to="/books"
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 rounded-full transition-colors border border-indigo-100 dark:border-indigo-500/20 font-bengali text-sm font-bold"
            >
              <Search className="w-4 h-4" />
              বই ব্রাউজ করুন
            </Link>
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white bg-slate-50 dark:bg-slate-700 rounded-full transition-colors"
              title="Toggle Dark Mode"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            {user?.role === 'admin' && (
              <div className="relative" ref={dropdownRef}>
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 text-slate-500 hover:text-slate-800 transition-colors rounded-full hover:bg-slate-100"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center rounded-full border-2 border-white">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-2xl overflow-hidden z-50"
                    >
                      <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 p-3 flex items-center justify-between">
                        <span className="font-bold text-slate-800 dark:text-white text-sm">Notifications</span>
                        <span className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 px-2 py-0.5 rounded-full">{unreadCount} New</span>
                      </div>
                      <div className="max-h-[70vh] overflow-y-auto">
                        {notifications.length === 0 && (
                           <div className="p-8 text-center text-slate-400 text-sm font-medium">No notifications yet.</div>
                        )}
                        {notifications.map((n: any) => (
                          <div 
                            key={n.id} 
                            onClick={() => !n.read && markAsRead(n.id)}
                            className={cn(
                              "p-4 border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition cursor-pointer flex gap-3",
                              !n.read ? "bg-indigo-50/30 dark:bg-indigo-500/5" : "opacity-75"
                            )}
                          >
                            <div className="flex-1 min-w-0">
                               <div className="flex items-center justify-between mb-1">
                                  <p className={cn("text-sm font-bold truncate", !n.read ? "text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400")}>{n.title}</p>
                                  <span className="text-[10px] text-slate-400 font-medium ml-2 shrink-0">
                                    {new Date(n.createdAt).toLocaleDateString()}
                                  </span>
                               </div>
                               <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-[250px]">{n.message}</p>
                            </div>
                            {!n.read && <div className="w-2 h-2 rounded-full bg-indigo-500 self-center shrink-0 shadow-sm" />}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
            
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700"></div>
            
            <div className="flex items-center gap-3">
              <div className="text-sm text-right">
                <p className="font-bold text-slate-900 dark:text-white">{user?.name}</p>
                <p className="text-slate-500 dark:text-slate-400 text-xs font-medium capitalize tracking-wider">{user?.role}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 flex items-center justify-center font-black shadow-inner border border-indigo-100 dark:border-indigo-500/20">
                {user?.name?.charAt(0) || 'U'}
              </div>
            </div>
          </div>
        </header>

        {user?.status === 'pending' && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-500/20 px-4 flex items-center justify-center gap-2 py-3 z-20 relative">
            <ShieldAlert className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-400 font-bold font-bengali text-center">
              আপনার একাউন্টটি বর্তমানে পাঠাগার কর্তৃপক্ষের অনুমোদনের অপেক্ষায় আছে। পাঠাগার কর্তৃপক্ষ এপ্রুভ না করলে মেম্বার হওয়া যাবে না।
            </p>
          </div>
        )}

        {/* Scrollable area */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50 p-4 md:p-8 pb-24 md:pb-8">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 md:hidden flex items-center justify-around px-2 z-40 shadow-[0_-4px_20px_rgba(0,0,0,0.05)]">
           {user?.role === 'admin' ? (
             <>
               <Link to="/dashboard/books" className={cn("flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all", location.pathname === '/dashboard/books' ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400")}>
                  <Library className="w-5 h-5" />
                  <span className="text-[10px] font-black uppercase tracking-tighter">বই তালিকা</span>
               </Link>
               <Link to="/dashboard/donors" className={cn("flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all relative", location.pathname === '/dashboard/donors' ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400")}>
                  <Heart className="w-5 h-5" />
                  <span className="text-[10px] font-black uppercase tracking-tighter">দাতা সদস্য</span>
               </Link>
               <Link to="/dashboard/pre-bookings" className={cn("flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all relative", location.pathname === '/dashboard/pre-bookings' ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400")}>
                  <Clock className="w-5 h-5" />
                  <span className="text-[10px] font-black uppercase tracking-tighter">প্রি বুকিং</span>
                  {preBookingsCount > 0 && (
                    <span className="absolute top-0 right-2 w-4 h-4 bg-amber-500 text-white text-[8px] font-black flex items-center justify-center rounded-full border border-white">
                      {preBookingsCount}
                    </span>
                  )}
               </Link>
               <Link to="/dashboard/users" className={cn("flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all relative", location.pathname === '/dashboard/users' ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400")}>
                  <Users className="w-5 h-5" />
                  <span className="text-[10px] font-black uppercase tracking-tighter whitespace-nowrap">সদস্য ব্যবস্থাপনা</span>
                  {notifications.filter((n: any) => !n.read && n.type === 'registration').length > 0 && (
                    <span className="absolute top-0 right-0 w-4 h-4 bg-rose-500 text-white text-[8px] font-black flex items-center justify-center rounded-full border border-white">
                      {notifications.filter((n: any) => !n.read && n.type === 'registration').length}
                    </span>
                  )}
               </Link>
               <Link to="/dashboard" className={cn("flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all", location.pathname === '/dashboard' ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400")}>
                  <LayoutDashboard className="w-5 h-5" />
                  <span className="text-[10px] font-black uppercase tracking-tighter">ওভারভিউ</span>
               </Link>
             </>
           ) : (
             <>
               <Link to="/books" className={cn("flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all", location.pathname === '/books' ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400")}>
                  <Library className="w-5 h-5" />
                  <span className="text-[10px] font-black uppercase tracking-tighter">বই তালিকা</span>
               </Link>
               <Link to="/dashboard/notice-board" className={cn("flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all relative", location.pathname === '/dashboard/notice-board' ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400")}>
                  <Bell className="w-5 h-5" />
                  <span className="text-[10px] font-black uppercase tracking-tighter">নোটিশ</span>
                  {unreadNoticesCount > 0 && (
                    <span className="absolute top-0 right-2 w-4 h-4 bg-rose-500 text-white text-[8px] font-black flex items-center justify-center rounded-full border border-white">
                      {unreadNoticesCount}
                    </span>
                  )}
               </Link>
               <Link to="/buy-books" className={cn("flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all relative", location.pathname === '/buy-books' ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400")}>
                  <ShoppingBag className="w-5 h-5" />
                  <span className="text-[10px] font-black uppercase tracking-tighter">বই কিনুন</span>
               </Link>
               <Link to="/dashboard/book-requests" className={cn("flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all relative", location.pathname === '/dashboard/book-requests' ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400")}>
                  <BookOpen className="w-5 h-5" />
                  <span className="text-[10px] font-black uppercase tracking-tighter">বই অনুরোধ</span>
               </Link>
               <Link to="/dashboard/profile" className={cn("flex flex-col items-center gap-1 px-3 py-1 rounded-xl transition-all", location.pathname === '/dashboard/profile' ? "text-indigo-600 dark:text-indigo-400" : "text-slate-500 dark:text-slate-400")}>
                  <UserCircle className="w-5 h-5" />
                  <span className="text-[10px] font-black uppercase tracking-tighter">প্রোফাইল</span>
               </Link>
             </>
           )}
        </div>
      </div>
    </div>
    </div>
  );
}
