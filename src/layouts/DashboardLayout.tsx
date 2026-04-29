import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
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
  Sun
} from 'lucide-react';
import { useAuth } from '../store/AuthContext';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);
  
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, token } = useAuth();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [messagesCount, setMessagesCount] = useState(0);
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user?.role === 'admin') {
      fetch('/api/notifications', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => {
            if(Array.isArray(d)) {
              let notifs = [...d];
              const autoMarkIds: string[] = [];
              if (location.pathname === '/dashboard/pre-bookings') {
                notifs.forEach(n => {
                  if (!n.read && n.type === 'prebooking') {
                    n.read = true;
                    autoMarkIds.push(n.id);
                  }
                });
              } else if (location.pathname === '/dashboard/users') {
                notifs.forEach(n => {
                  if (!n.read && n.type === 'registration') {
                    n.read = true;
                    autoMarkIds.push(n.id);
                  }
                });
              }
              setNotifications(notifs);
              
              // Only call API if we auto-marked any
              autoMarkIds.forEach(id => {
                fetch(`/api/notifications/${id}/read`, {
                  method: 'PATCH',
                  headers: { Authorization: `Bearer ${token}` }
                }).catch(console.error);
              });
            }
        })
        .catch(console.error);
    }
  }, [user, token, location.pathname]);

  useEffect(() => {
    // Fetch unread messages count for any user (both admin and reader can have inbox)
    fetch('/api/messages', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          const unread = data.filter((m: any) => !m.isRead && String(m.toUserId) === String(user?.id)).length;
          setMessagesCount(unread);
        }
      })
      .catch(console.error);
  }, [user, token, location.pathname]);


  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownRef]);

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    await fetch(`/api/notifications/${id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` }
    });
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const adminLinks = [
    { name: 'My Profile', path: '/dashboard/profile', icon: UserCircle },
    { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Manage Users', path: '/dashboard/users', icon: Users },
    { name: 'Add New Member', path: '/dashboard/users?add=true', icon: Plus },
    { name: 'Delete Members', path: '/dashboard/delete-users', icon: UserX },
    { name: 'Books Inventory', path: '/dashboard/books', icon: Library },
    { name: 'Issue / Return', path: '/dashboard/issues', icon: ClipboardList },
    { name: 'Buy Requests', path: '/dashboard/purchases', icon: ShoppingCart },
    { name: 'Member Dues', path: '/dashboard/dues', icon: DollarSign },
    { name: 'Donor Members', path: '/dashboard/donors', icon: DollarSign },
    { name: 'Finances', path: '/dashboard/finances', icon: DollarSign },
    { name: 'Manage Team', path: '/dashboard/manageteam', icon: Users },
    { name: 'Manage Blog', path: '/dashboard/manageblog', icon: FileText },
    { name: 'Notices', path: '/dashboard/notices', icon: Bell },
    { name: 'Messenger', path: '/dashboard/messages', icon: MessageSquare },
    { name: 'Book Requests', path: '/dashboard/book-requests', icon: BookOpen },
    { name: 'Reset Requests', path: '/dashboard/reset-requests', icon: ShieldAlert },
    { name: 'Pre-bookings', path: '/dashboard/pre-bookings', icon: Clock },
  ];

  const readerLinks = [
    { name: 'My Profile', path: '/dashboard/profile', icon: UserCircle },
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Browse Books', path: '/books', icon: Library },
    { name: 'Buy Books', path: '/buy-books', icon: Library },
    { name: 'Notice Board', path: '/dashboard/notice-board', icon: Bell },
    { name: 'My Inbox', path: '/dashboard/inbox', icon: MessageSquare },
    { name: 'My Books', path: '/dashboard/my-books', icon: BookmarkCheck },
    { name: 'Request a Book', path: '/dashboard/book-requests', icon: BookOpen },
  ];

  const links = user?.role === 'admin' ? adminLinks : readerLinks;
  const filteredLinks = links.filter(l => l.name.toLowerCase().includes(sidebarSearch.toLowerCase()));

  const handleLogout = () => {
    logout();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
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
        <div className="h-20 flex items-center px-6 border-b border-[#1B253B]/60 bg-[#0A0F1C] shrink-0 sticky top-0 z-10">
          <Link to="/" className="flex items-center gap-3 w-full group">
             <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
               <Library className="w-5 h-5 text-white" />
             </div>
             <div className="flex flex-col flex-1 min-w-0">
               <span className="font-bold text-white tracking-wide truncate text-sm">Pandhoa Library</span>
               <span className="text-[10px] text-indigo-300/80 font-medium uppercase tracking-widest truncate">{user?.role === 'admin' ? 'Admin Gateway' : 'Member Portal'}</span>
             </div>
          </Link>
          <button 
            onClick={() => setSidebarOpen(false)}
            className="md:hidden text-slate-500 hover:text-white p-2"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card */}
        <div className="px-6 py-5 border-b border-[#1B253B]/60">
           <div className="flex items-center gap-4 bg-[#111827] p-3 rounded-2xl border border-[#1F2937]">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full object-cover border-2 border-indigo-500/30" />
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
              if (link.name === 'Pre-bookings') {
                badgeCount = notifications.filter(n => !n.read && n.type === 'prebooking').length;
              } else if (link.name === 'Manage Users') {
                badgeCount = notifications.filter(n => !n.read && n.type === 'registration').length;
              }
            }
            if (link.name === 'My Inbox') {
               badgeCount = messagesCount;
            }

            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => {
                  setSidebarOpen(false);
                  if (badgeCount > 0 && link.name !== 'My Inbox') {
                     const toMark = notifications.filter(n => !n.read && (
                        (link.name === 'Pre-bookings' && n.type === 'prebooking') ||
                        (link.name === 'Manage Users' && n.type === 'registration')
                     ));
                     toMark.forEach(n => markAsRead(n.id));
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
        {/* Mobile header */}
        <div className="h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 md:hidden shadow-sm z-30 transition-colors">
          <div className="flex items-center">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 -ml-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
            >
              <Menu className="w-6 h-6" />
            </button>
            <span className="font-semibold text-slate-900 dark:text-white ml-2">Dashboard</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsDarkMode(!isDarkMode)}
              className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-slate-700 rounded-full transition-colors"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            {location.pathname !== '/dashboard' && (
              <button 
                onClick={() => navigate('/dashboard')}
                className="p-2 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-full transition-colors flex items-center justify-center border border-slate-200 dark:border-slate-600"
                aria-label="Go back"
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
                aria-label="Go back to dashboard"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <h1 className="text-xl font-semibold text-slate-800 dark:text-white tracking-tight">
              {links.find(l => l.path === location.pathname)?.name || 'Dashboard'}
            </h1>
          </div>
          <div className="flex items-center gap-6">
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
                      className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 shadow-xl rounded-2xl overflow-hidden z-50"
                    >
                      <div className="bg-slate-50 border-b border-slate-100 p-3 flex items-center justify-between">
                        <span className="font-bold text-slate-800 text-sm">Notifications</span>
                        <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{unreadCount} New</span>
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
                              "p-4 border-b border-slate-50 hover:bg-slate-50 transition cursor-pointer flex gap-3",
                              !n.read ? "bg-indigo-50/30" : "opacity-75"
                            )}
                          >
                            <div className="flex-1 min-w-0">
                               <div className="flex items-center justify-between mb-1">
                                  <p className={cn("text-sm font-bold truncate", !n.read ? "text-slate-900" : "text-slate-600")}>{n.title}</p>
                                  <span className="text-[10px] text-slate-400 font-medium ml-2 shrink-0">
                                    {new Date(n.createdAt).toLocaleDateString()}
                                  </span>
                               </div>
                               <p className="text-xs text-slate-500 leading-relaxed max-w-[250px]">{n.message}</p>
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
            
            <div className="w-px h-6 bg-slate-200"></div>
            
            <div className="flex items-center gap-3">
              <div className="text-sm text-right">
                <p className="font-bold text-slate-900">{user?.name}</p>
                <p className="text-slate-500 text-xs font-medium capitalize tracking-wider">{user?.role}</p>
              </div>
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-black shadow-inner">
                {user?.name?.charAt(0) || 'U'}
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable area */}
        <main className="flex-1 overflow-y-auto bg-slate-50/50 p-4 md:p-8">
          <div className="max-w-6xl mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
