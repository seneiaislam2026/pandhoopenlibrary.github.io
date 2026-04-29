import React from "react";
import { Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import {
  BookOpen,
  UserCircle,
  Menu,
  X,
  ArrowLeft,
  Home,
  Library,
  ShoppingCart,
  Heart,
  CalendarHeart,
  Users,
  FileText,
  Globe,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../store/AuthContext";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { useTranslation } from "react-i18next";

export default function MainLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, i18n } = useTranslation();

  const toggleLanguage = () => {
    i18n.changeLanguage(i18n.language === "en" ? "bn" : "en");
  };

  const links = [
    { name: t("nav.home"), path: "/", icon: Home },
    { name: t("nav.books"), path: "/books", icon: Library },
    { name: t("nav.buy"), path: "/buy-books", icon: ShoppingCart },
    { name: "Donors", path: "/donors", icon: Heart },
    { name: "Monthly Donors", path: "/monthly-donors", icon: CalendarHeart },
    { name: t("nav.team"), path: "/team", icon: Users },
    { name: "Blog", path: "/blog", icon: FileText },
  ];

  return (
    <div className="min-h-screen bg-[#fafafa] text-slate-900 font-sans tracking-tight">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center gap-3">
              {location.pathname !== "/" && (
                <button
                  onClick={() => navigate("/")}
                  className="p-2 -ml-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
                  aria-label="Go back"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}
              <Link to="/" className="flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-indigo-600" />
                <span className="font-semibold text-lg tracking-normal">
                  Pandhoa Open Library
                </span>
              </Link>
            </div>

            {/* Desktop Nav */}
            <div className="hidden md:flex items-center space-x-8">
              {links.map((link) => (
                <Link
                  key={link.path}
                  to={link.path}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-indigo-600",
                    location.pathname === link.path
                      ? "text-indigo-600"
                      : "text-slate-600",
                  )}
                >
                  {link.name}
                </Link>
              ))}

              <div className="pl-4 border-l border-slate-200 flex items-center gap-4">
                <button
                  onClick={toggleLanguage}
                  className="flex items-center gap-1 text-slate-600 hover:text-indigo-600 transition-colors px-2 py-1 rounded-md text-sm font-medium bg-slate-50"
                  title="Toggle Language"
                >
                  <Globe className="w-4 h-4" />
                  {i18n.language === "en" ? "BN" : "EN"}
                </button>
                <Link
                  to="/donors"
                  className="bg-rose-500 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-rose-600 transition-colors"
                >
                  Donate
                </Link>
                {user ? (
                  <Link
                    to="/dashboard"
                    className="flex items-center gap-2 text-sm font-medium text-slate-700 hover:text-indigo-600 transition-colors"
                  >
                    <UserCircle className="w-5 h-5" />
                    {t("nav.dashboard")}
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="text-sm font-medium text-slate-800 hover:text-indigo-600 transition-colors bg-slate-100 px-3 py-1.5 rounded-lg"
                    >
                      {t("nav.login")}
                    </Link>
                    <Link
                      to="/register"
                      className="bg-indigo-600 text-white px-4 py-2 rounded-full text-sm font-medium hover:bg-indigo-700 transition-colors"
                    >
                      Join Limitless
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Mobile menu button */}
            <div className="flex items-center md:hidden gap-2">
              <button
                onClick={toggleLanguage}
                className="flex items-center gap-1 text-slate-600 hover:text-indigo-600 transition-colors px-2 py-1 rounded-md text-sm font-medium bg-slate-50 mr-2"
                title="Toggle Language"
              >
                <Globe className="w-4 h-4" />
                {i18n.language === "en" ? "BN" : "EN"}
              </button>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="text-slate-600 hover:text-slate-900"
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden border-t border-slate-200 overflow-hidden bg-white shadow-xl"
            >
              <div className="px-4 pt-4 pb-6 space-y-2">
                {links.map((link) => {
                  const Icon = link.icon;
                  return (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl text-base font-semibold transition-all",
                        location.pathname === link.path
                          ? "text-indigo-700 bg-indigo-50 border border-indigo-100"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-transparent",
                      )}
                    >
                      <div
                        className={cn(
                          "p-2 rounded-lg",
                          location.pathname === link.path
                            ? "bg-indigo-100/50"
                            : "bg-slate-100",
                        )}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      {link.name}
                    </Link>
                  );
                })}

                <div className="pt-6 mt-6 border-t border-slate-200 flex flex-col gap-3">
                  <Link
                    to="/donors"
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="flex justify-center items-center gap-2 px-4 py-3.5 rounded-xl text-base font-bold bg-[#E2136E] text-white hover:bg-[#c91162] transition-colors shadow-md shadow-pink-200"
                  >
                    <Heart className="w-5 h-5" />
                    Donate Now
                  </Link>
                  {user ? (
                    <Link
                      to="/dashboard"
                      onClick={() => setIsMobileMenuOpen(false)}
                      className="flex justify-center items-center gap-2 px-4 py-3.5 rounded-xl text-base font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
                    >
                      <UserCircle className="w-6 h-6 text-slate-500" />
                      Go to Dashboard
                    </Link>
                  ) : (
                    <>
                      <Link
                        to="/login"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex justify-center items-center gap-2 px-4 py-3.5 rounded-xl text-base font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors"
                      >
                        <UserCircle className="w-5 h-5 text-slate-500" />
                        Login (Admin/Member)
                      </Link>
                      <Link
                        to="/register"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="flex justify-center items-center gap-2 px-4 py-3.5 rounded-xl text-base font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-colors"
                      >
                        Join Limitless
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      <main>
        <Outlet />
      </main>

      <footer className="bg-white border-t border-slate-200 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="col-span-1 md:col-span-2">
              <Link to="/" className="flex items-center gap-2 mb-4">
                <BookOpen className="h-6 w-6 text-indigo-600" />
                <span className="font-semibold text-lg">
                  Pandhoa Open Library
                </span>
              </Link>
              <p className="text-slate-500 text-sm max-w-sm">
                A community-driven library aimed at providing accessible
                knowledge for everyone. Support us with a donation.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-4 uppercase tracking-wider text-slate-900">
                Links
              </h3>
              <ul className="space-y-3">
                <li>
                  <Link
                    to="/books"
                    className="text-slate-500 hover:text-indigo-600 text-sm"
                  >
                    Books Catalog
                  </Link>
                </li>
                <li>
                  <Link
                    to="/donors"
                    className="text-slate-500 hover:text-indigo-600 text-sm"
                  >
                    Donors Wall
                  </Link>
                </li>
                <li>
                  <Link
                    to="/blog"
                    className="text-slate-500 hover:text-indigo-600 text-sm"
                  >
                    Blog & News
                  </Link>
                </li>
                <li>
                  <Link
                    to="/login"
                    className="text-slate-500 hover:text-indigo-600 text-sm font-medium"
                  >
                    Admin Portal (Login)
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-sm mb-4 uppercase tracking-wider text-slate-900">
                Contact
              </h3>
              <ul className="space-y-3">
                <li className="text-slate-500 text-sm">
                  WhatsApp: 01570206953
                </li>
                <li>
                  <a
                    href="https://wa.me/8801570206953"
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 hover:text-indigo-700 font-medium text-sm"
                  >
                    Click to Chat &rarr;
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-200 mt-12 pt-8 text-sm text-slate-400 flex justify-between items-center">
            <p>
              &copy; {new Date().getFullYear()} Pandhoa Open Library. All rights
              reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
