import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../store/AuthContext";
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
} from "lucide-react";

export default function DashboardHome() {
  const { user, token } = useAuth();
  const [stats, setStats] = useState({
    users: 0,
    books: 0,
    issues: 0,
    income: 0,
    expense: 0,
  });

  useEffect(() => {
    if (user?.role === "admin" && token) {
      Promise.all([
        fetch("/api/users", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/books"),
        fetch("/api/issues", { headers: { Authorization: `Bearer ${token}` } }),
        fetch("/api/finances", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ])
        .then(async ([usersRes, booksRes, issuesRes, financesRes]) => {
          const [users, books, issues, finances] = await Promise.all([
            usersRes.json(),
            booksRes.json(),
            issuesRes.json(),
            financesRes.json(),
          ]);

          const income = Array.isArray(finances)
            ? finances
                .filter((f) => f.type === "income")
                .reduce((acc, curr) => acc + Number(curr.amount), 0)
            : 0;
          const expense = Array.isArray(finances)
            ? finances
                .filter((f) => f.type === "expense")
                .reduce((acc, curr) => acc + Number(curr.amount), 0)
            : 0;

          setStats({
            users: Array.isArray(users) ? users.length : 0,
            books: Array.isArray(books) ? books.length : 0,
            issues: Array.isArray(issues)
              ? issues.filter((i) => i.status === "Issued").length
              : 0,
            income,
            expense,
          });
        })
        .catch(console.error);
    }
  }, [user]);

  if (user?.role !== "admin") {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        <h2 className="text-2xl font-semibold mb-4 text-slate-900 tracking-tight">
          স্বাগতম, {user?.name}!
        </h2>
        <p className="text-slate-600 mb-8">
          আপনি পানধোয়া উন্মুক্ত পাঠাগারের মেম্বার পোর্টালে লগইন করেছেন।
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Link
            to="/dashboard/profile"
            className="bg-indigo-50 rounded-2xl p-6 border border-indigo-100 hover:bg-indigo-100 transition shadow-sm group"
          >
            <UserCircle2 className="w-8 h-8 text-indigo-600 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-indigo-900 mb-2">My Profile</h3>
            <p className="text-indigo-700 text-sm">
              View your personal details, book codes, and payment history.
            </p>
          </Link>
          <Link
            to="/dashboard/my-books"
            className="bg-emerald-50 rounded-2xl p-6 border border-emerald-100 hover:bg-emerald-100 transition shadow-sm group"
          >
            <Library className="w-8 h-8 text-emerald-600 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-emerald-900 mb-2">My Books</h3>
            <p className="text-emerald-700 text-sm">
              Check your currently issued books, return dates and codes.
            </p>
          </Link>
          <Link
            to="/books"
            className="bg-amber-50 rounded-2xl p-6 border border-amber-100 hover:bg-amber-100 transition shadow-sm group"
          >
            <Library className="w-8 h-8 text-amber-600 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-semibold text-amber-900 mb-2">
              Browse Catalog
            </h3>
            <p className="text-amber-700 text-sm">
              Explore our library catalog and pre-book books.
            </p>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <Link
            to="/dashboard/notice-board"
            className="bg-indigo-600 rounded-2xl p-6 border border-indigo-700 hover:bg-indigo-700 transition shadow-lg group text-white"
          >
            <Activity className="w-8 h-8 text-indigo-200 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-bold text-xl mb-2">Notice Board</h3>
            <p className="text-white/80 text-sm">
              Stay updated with the latest library announcements and news.
            </p>
          </Link>
          <Link
            to="/dashboard/inbox"
            className="bg-slate-900 rounded-2xl p-6 border border-slate-800 hover:bg-black transition shadow-lg group text-white"
          >
            <Activity className="w-8 h-8 text-indigo-400 mb-3 group-hover:scale-110 transition-transform" />
            <h3 className="font-bold text-xl mb-2">My Inbox</h3>
            <p className="text-white/80 text-sm">
              Check your private messages from admins and curators.
            </p>
          </Link>
        </div>
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
          <h2 className="text-2xl sm:text-3xl font-black mb-3 flex flex-col sm:flex-row items-center gap-4 justify-center md:justify-start text-white">
            <div className="p-3.5 bg-white/5 rounded-2xl backdrop-blur-md border border-white/10 shadow-inner">
              <BookmarkMinus className="w-8 h-8 text-indigo-400" />
            </div>
            Book Issue & Return
          </h2>
          <p className="text-slate-400 max-w-md text-sm sm:text-base leading-relaxed mt-2">
            Manage your daily library operations. Issue books to members or
            process returns quickly and efficiently.
          </p>
        </div>

        <div className="relative z-10 flex flex-col sm:flex-row w-full md:w-auto gap-4">
          <Link
            to="/dashboard/issues?action=issue"
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-500/25 active:scale-95 whitespace-nowrap"
          >
            <BookPlus className="w-5 h-5" />
            Issue a Book
          </Link>
          <Link
            to="/dashboard/issues"
            className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 text-white border border-white/10 px-8 py-4 rounded-2xl font-bold transition-all active:scale-95 whitespace-nowrap backdrop-blur-sm"
          >
            <CheckCircle2 className="w-5 h-5" />
            Process Returns
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
            <div className="bg-slate-50 dark:bg-slate-800 text-slate-400 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase">
              Users
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">
              Total Registered
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
            <div className="bg-slate-50 dark:bg-slate-800 text-slate-400 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase">
              Books
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">
              Books in Catalog
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
            <div className="bg-slate-50 dark:bg-slate-800 text-slate-400 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase">
              Issues
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">
              Active Checkouts
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
            <div className="bg-slate-50 dark:bg-slate-800 text-slate-400 px-3 py-1 rounded-full text-xs font-bold tracking-widest uppercase">
              Finances
            </div>
          </div>
          <div className="relative z-10">
            <p className="text-sm font-bold text-slate-500 dark:text-slate-400 mb-1">
              Current Balance
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
              Quick Actions (দ্রুত পদক্ষেপ)
            </h3>
          </div>

          <div className="space-y-6">
            {/* User Management */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm transition-colors">
              <h4 className="font-bengali font-bold text-slate-600 dark:text-slate-300 mb-4 text-sm flex items-center gap-2">
                <Users className="w-4 h-4" /> User Management
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  to="/dashboard/users"
                  className="flex items-center gap-3 p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600/50 rounded-xl shadow-sm hover:shadow-md hover:border-indigo-300 hover:text-indigo-700 dark:hover:border-indigo-500/50 dark:text-slate-200 transition-all font-bengali font-bold text-slate-700 group"
                >
                  <div className="p-2 bg-indigo-50 dark:bg-indigo-500/10 rounded-lg group-hover:bg-indigo-100 transition-colors">
                    <UserCircle2 className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <span>
                    Review Users
                    <br />
                    <span className="text-[10px] text-slate-400 font-normal">
                      ব্যবহারকারী পর্যালোচনা
                    </span>
                  </span>
                </Link>
                <Link
                  to="/dashboard/manageteam"
                  className="flex items-center gap-3 p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600/50 rounded-xl shadow-sm hover:shadow-md hover:border-emerald-300 hover:text-emerald-700 dark:hover:border-emerald-500/50 dark:text-slate-200 transition-all font-bengali font-bold text-slate-700 group"
                >
                  <div className="p-2 bg-emerald-50 dark:bg-emerald-500/10 rounded-lg group-hover:bg-emerald-100 transition-colors">
                    <Users className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span>
                    Manage Team
                    <br />
                    <span className="text-[10px] text-slate-400 font-normal">
                      টিম পরিচালনা
                    </span>
                  </span>
                </Link>
              </div>
            </div>

            {/* Book Management */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm transition-colors">
              <h4 className="font-bengali font-bold text-slate-600 dark:text-slate-300 mb-4 text-sm flex items-center gap-2">
                <Library className="w-4 h-4" /> Book Management
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
                    Add New Book
                    <br />
                    <span className="text-[10px] text-slate-400 font-normal">
                      নতুন বই যোগ করুন
                    </span>
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
                    Buy Requests
                    <br />
                    <span className="text-[10px] text-slate-400 font-normal">
                      বই ক্রয়ের অনুরোধ
                    </span>
                  </span>
                </Link>
              </div>
            </div>

            {/* Content/Notice */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-100 dark:border-slate-700/50 shadow-sm transition-colors">
              <h4 className="font-bengali font-bold text-slate-600 dark:text-slate-300 mb-4 text-sm flex items-center gap-2">
                <Activity className="w-4 h-4" /> Content & Notice
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  to="/dashboard/manageblog"
                  className="flex items-center gap-3 p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600/50 rounded-xl shadow-sm hover:shadow-md hover:border-purple-300 hover:text-purple-700 dark:hover:border-purple-500/50 dark:text-slate-200 transition-all font-bengali font-bold text-slate-700 group"
                >
                  <div className="p-2 bg-purple-50 dark:bg-purple-500/10 rounded-lg group-hover:bg-purple-100 transition-colors">
                    <FileText className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <span>
                    Publish Blog
                    <br />
                    <span className="text-[10px] text-slate-400 font-normal">
                      ব্লগ প্রকাশ করুন
                    </span>
                  </span>
                </Link>
                <Link
                  to="/dashboard/notices"
                  className="flex items-center gap-3 p-3.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600/50 rounded-xl shadow-sm hover:shadow-md hover:border-rose-300 hover:text-rose-700 dark:hover:border-rose-500/50 dark:text-slate-200 transition-all font-bengali font-bold text-slate-700 group"
                >
                  <div className="p-2 bg-rose-50 dark:bg-rose-500/10 rounded-lg group-hover:bg-rose-100 transition-colors">
                    <Bell className="w-5 h-5 text-rose-600 dark:text-rose-400" />
                  </div>
                  <span>
                    Post Notice
                    <br />
                    <span className="text-[10px] text-slate-400 font-normal">
                      নোটিশ পোস্ট করুন
                    </span>
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
                Open Messenger (ম্যাসেঞ্জার খুলুন)
              </Link>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col transition-colors">
          <h3 className="text-xl font-black font-bengali text-slate-800 dark:text-white tracking-tight mb-4">
            Recent Activity
          </h3>
          <div className="flex-1 flex items-center justify-center text-center py-12 text-slate-500 dark:text-slate-400 font-bengali text-sm bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-600 transition-colors">
            Activity timeline will populate as actions are taken. <br />{" "}
            (কার্যকলাপের টাইমলাইন এখানে প্রদর্শিত হবে)
          </div>
        </div>
      </div>
    </div>
  );
}
