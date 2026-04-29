import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './store/AuthContext';

// Basic layouts for the app
import MainLayout from './layouts/MainLayout';
import DashboardLayout from './layouts/DashboardLayout';

// Public Pages
import Home from './pages/public/Home';
import Books from './pages/public/Books';
import BuyBooks from './pages/public/BuyBooks';
import Donors from './pages/public/Donors';
import Team from './pages/public/Team';
import Blog from './pages/public/Blog';
import Contact from './pages/public/Contact';
import Login from './pages/public/Login';
import Register from './pages/public/Register';
import MonthlyDonors from './pages/public/MonthlyDonors';
import BkashMockPayment from './pages/public/BkashMockPayment';

// Admin / Reader pages
import DashboardHome from './pages/dashboard/DashboardHome';
import ManageUsers from './pages/dashboard/ManageUsers';
import ManageBooks from './pages/dashboard/ManageBooks';
import Finances from './pages/dashboard/Finances';
import ManageIssues from './pages/dashboard/ManageIssues';
import ManageDues from './pages/dashboard/ManageDues';
import ManageTeam from './pages/dashboard/ManageTeam';
import ManageBlog from './pages/dashboard/ManageBlog';
import ManagePreBookings from './pages/dashboard/ManagePreBookings';
import ManagePurchases from './pages/dashboard/ManagePurchases';
import ManageDonors from './pages/dashboard/ManageDonors';
import ManageNotices from './pages/dashboard/ManageNotices';
import ManageMessages from './pages/dashboard/ManageMessages';
import UserNotices from './pages/dashboard/UserNotices';
import UserMessages from './pages/dashboard/UserMessages';
import UserProfile from './pages/dashboard/UserProfile';
import UserBooks from './pages/dashboard/UserBooks';
import BookRequests from './pages/dashboard/BookRequests';
import ManageResetRequests from './pages/dashboard/ManageResetRequests';
import DeleteUsers from './pages/dashboard/DeleteUsers';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="h-screen w-full flex items-center justify-center">Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};

function AppRoutes() {
  return (
    <Routes>
      {/* Public Pages grouped under MainLayout */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/books" element={<Books />} />
        <Route path="/buy-books" element={<BuyBooks />} />
        <Route path="/donors" element={<Donors />} />
        <Route path="/monthly-donors" element={<MonthlyDonors />} />
        <Route path="/team" element={<Team />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/bkash-mock-payment" element={<BkashMockPayment />} />
      </Route>

      {/* Dashboard Routes grouped under DashboardLayout */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<DashboardHome />} />
        
        {/* Admin only */}
        <Route path="users" element={<ProtectedRoute allowedRoles={['admin']}><ManageUsers /></ProtectedRoute>} />
        <Route path="donors" element={<ProtectedRoute allowedRoles={['admin']}><ManageDonors /></ProtectedRoute>} />
        <Route path="books" element={<ProtectedRoute allowedRoles={['admin']}><ManageBooks /></ProtectedRoute>} />
        <Route path="finances" element={<ProtectedRoute allowedRoles={['admin']}><Finances /></ProtectedRoute>} />
        <Route path="issues" element={<ProtectedRoute allowedRoles={['admin']}><ManageIssues /></ProtectedRoute>} />
        <Route path="dues" element={<ProtectedRoute allowedRoles={['admin']}><ManageDues /></ProtectedRoute>} />
        <Route path="manageteam" element={<ProtectedRoute allowedRoles={['admin']}><ManageTeam /></ProtectedRoute>} />
        <Route path="manageblog" element={<ProtectedRoute allowedRoles={['admin']}><ManageBlog /></ProtectedRoute>} />
        <Route path="delete-users" element={<ProtectedRoute allowedRoles={['admin']}><DeleteUsers /></ProtectedRoute>} />
        <Route path="notices" element={<ProtectedRoute allowedRoles={['admin']}><ManageNotices /></ProtectedRoute>} />
        <Route path="messages" element={<ProtectedRoute allowedRoles={['admin']}><ManageMessages /></ProtectedRoute>} />
        <Route path="reset-requests" element={<ProtectedRoute allowedRoles={['admin']}><ManageResetRequests /></ProtectedRoute>} />
        <Route path="pre-bookings" element={<ProtectedRoute allowedRoles={['admin']}><ManagePreBookings /></ProtectedRoute>} />
        <Route path="purchases" element={<ProtectedRoute allowedRoles={['admin']}><ManagePurchases /></ProtectedRoute>} />
        
        {/* Reader & Admin */}
        <Route path="profile" element={<UserProfile />} />
        <Route path="my-books" element={<UserBooks />} />
        <Route path="notice-board" element={<UserNotices />} />
        <Route path="inbox" element={<UserMessages />} />
        <Route path="book-requests" element={<BookRequests />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
