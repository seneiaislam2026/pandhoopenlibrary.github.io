import React, { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { UserCircle2, Calendar, BookmarkCheck, CreditCard, Send, CheckCircle2, Camera, AlertCircle, ShieldAlert } from 'lucide-react';

export default function UserProfile() {
  const { user, token, updateUser } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [prebookings, setPrebookings] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [dues, setDues] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [payFormData, setPayFormData] = useState({ month: '', amount: '50', trxId: '' });
  const [payLoading, setPayLoading] = useState(false);

  const totalPaid = payments.reduce((acc, p) => acc + Number(p.amount), 0);
  const totalDues = dues.filter(d => d.userId === user?.id && d.status === 'Unpaid').reduce((acc, d) => acc + Number(d.amount), 0);

  useEffect(() => {
    if (!token) return;
    Promise.all([
        fetch('/api/my-payments', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        fetch('/api/my-pre-bookings', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        fetch('/api/books').then(r => r.json()),
        fetch('/api/issues', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        fetch('/api/my-dues', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        fetch('/api/my-purchases', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
        fetch('/api/my-profile', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json())
    ]).then(([payData, preData, bookData, issueData, dueData, purchaseData, profileData]) => {
        setPayments(payData || []);
        setPrebookings(preData || []);
        setBooks(bookData || []);
        setIssues(issueData || []);
        setDues(dueData || []);
        setPurchases(purchaseData || []);
        if (profileData && profileData.id) {
           updateUser(profileData);
        }
    }).catch(err => {
        console.error('Profile fetch error:', err);
    });
  }, [token]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      alert("Please choose an image smaller than 2MB.");
      return;
    }

    setUploadingImage(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      try {
        const res = await fetch('/api/my-profile', {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ avatar: base64String })
        });
        if (res.ok) {
            const updatedUser = await res.json();
            updateUser(updatedUser);
        } else {
            alert('Failed to update avatar');
        }
      } catch (err) {
        console.error(err);
      } finally {
        setUploadingImage(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleBkashCheckout = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!payFormData.month || !payFormData.amount) {
          alert('Please select month and enter Amount');
          return;
      }
      setPayLoading(true);
      try {
          const res = await fetch('/api/bkash/create', {
              method: 'POST',
              headers: { 
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                  amount: payFormData.amount,
                  month: payFormData.month
              })
          });
          if (res.ok) {
              const data = await res.json();
              if (data.bkashURL) {
                  window.location.href = data.bkashURL;
              }
          } else {
              const err = await res.json();
              alert(err.error || 'Failed to initialize payment');
          }
      } catch (err) {
          console.error(err);
          alert('Network error connecting to bKash');
      } finally {
          setPayLoading(false);
      }
  };

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentYear = new Date().getFullYear();

  const lateReturnCount = issues.filter(i => i.status === 'Returned' && new Date(i.returnDate || i.issueDate) > new Date(i.expectedReturnDate)).length;
  const hasOverdueBooks = issues.some(i => i.status === 'Issued' && new Date() > new Date(i.expectedReturnDate));
  const isBorrowBlocked = user?.borrowBlocked || hasOverdueBooks || lateReturnCount >= 5;
  
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12 font-bengali">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-3xl font-extrabold tracking-tight text-slate-900">My Profile & Activity</h2>
        <Link to="/books" className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-full font-bold text-sm shadow-md hover:bg-indigo-700 transition transform hover:-translate-y-0.5">
           <BookmarkCheck className="w-5 h-5" />
           Browse & Pre-book Books
        </Link>
      </div>

      {lateReturnCount >= 5 && !isBorrowBlocked && (
        <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl shadow-sm">
            <div className="flex items-start gap-4">
              <AlertCircle className="w-6 h-6 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-amber-800 uppercase tracking-widest mb-1">
                  Warning: Frequent Late Returns
                </p>
                <p className="text-sm font-semibold text-amber-700 leading-relaxed">
                  You have returned books late {lateReturnCount} times. You are at risk of having your borrowing privileges suspended. Please ensure you return books on time.
                </p>
              </div>
            </div>
        </div>
      )}

      {isBorrowBlocked && (
         <div className="bg-rose-50 border border-rose-200 p-5 rounded-2xl shadow-sm">
            <div className="flex items-start gap-4">
              <ShieldAlert className="w-6 h-6 text-rose-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-bold text-rose-800 uppercase tracking-widest mb-1">Borrowing System Blocked</p>
                <p className="text-sm font-semibold text-rose-700 leading-relaxed">
                   {user?.borrowBlocked ? 'Your borrowing privileges have been suspended by an administrator.' : 
                    hasOverdueBooks ? 'You have currently overdue books that must be returned before borrowing new ones.' :
                    `You have exceeded the maximum number of late returns (${lateReturnCount}). Your borrowing privileges are suspended.`}
                </p>
              </div>
            </div>
         </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-8">
           <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 text-center relative overflow-hidden">
             
             {/* Decorative Background */}
             <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-indigo-500 to-purple-600 opacity-10"></div>
             
             {/* Avatar Box */}
             <div className="relative w-32 h-32 mx-auto mb-6 z-10">
               {user?.avatar ? (
                 <img src={user.avatar} alt="Profile" className="w-32 h-32 rounded-full object-cover border-4 border-white shadow-xl" />
               ) : (
                 <div className="w-32 h-32 rounded-full bg-gradient-to-br from-indigo-100 to-indigo-50 flex items-center justify-center border-4 border-white shadow-xl text-indigo-300">
                    <UserCircle2 className="w-16 h-16" />
                 </div>
               )}
               
               <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="absolute bottom-0 right-0 p-2.5 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 hover:scale-105 transition-all disabled:opacity-50 border-2 border-white ring-2 ring-transparent focus:ring-indigo-200"
                title="Update Profile Picture"
               >
                 <Camera className="w-4 h-4" />
               </button>
               <input 
                 type="file" 
                 ref={fileInputRef} 
                 onChange={handleAvatarChange} 
                 accept="image/*" 
                 className="hidden" 
               />
             </div>

             <h3 className="text-2xl font-bold text-slate-900 tracking-tight">{user?.name}</h3>
             <p className="text-slate-500 font-medium mb-6">@{user?.username}</p>
             
             <div className="space-y-4 pt-6 border-t border-slate-100 text-left">
               <div>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Member ID</p>
                  <p className="font-black text-indigo-700 bg-indigo-50/50 border border-indigo-100 px-3 py-1.5 rounded-lg inline-block text-lg tracking-wider">#{user?.memberId || 'N/A'}</p>
               </div>
               <div>
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Status</p>
                 <div className="flex flex-col gap-2">
                   <span className="w-fit inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/50 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                      Active Member
                   </span>
                   {user?.borrowBlocked && (
                     <span className="w-fit inline-flex items-center gap-1.5 bg-rose-50 text-rose-700 border border-rose-200/50 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
                        Borrowing Blocked
                     </span>
                   )}
                 </div>
               </div>
               {user?.phone && (
                 <div>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Phone</p>
                   <p className="font-semibold text-slate-800 text-sm">{user.phone}</p>
                 </div>
               )}
               {user?.address && (
                 <div>
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Address</p>
                   <p className="font-semibold text-slate-800 text-sm">{user.address}</p>
                 </div>
               )}
               <div>
                 <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Role</p>
                 <p className="font-semibold text-slate-900 capitalize text-sm">{user?.role}</p>
               </div>
               <div className="grid grid-cols-2 gap-4 mt-6">
                 <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                   <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Total Paid</p>
                   <p className="font-bold text-indigo-600 text-lg">৳{totalPaid}</p>
                 </div>
                 <div className="bg-rose-50/50 p-3 rounded-2xl border border-rose-100">
                   <p className="text-[10px] text-rose-400 font-bold uppercase tracking-widest mb-1">Unpaid Dues</p>
                   <p className="font-bold text-rose-600 text-lg">৳{totalDues}</p>
                 </div>
               </div>
             </div>

             <div className="mt-8 pt-8 border-t border-slate-100">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-pink-500" />
                    Pay Monthly Fee
                </h4>
                <div className="bg-pink-50/50 p-4 rounded-xl border border-pink-100 mb-4 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-[10px] font-bold text-pink-700 mb-1">Make Payment via bKash</p>
                            <p className="text-lg font-black text-slate-900 tracking-wider">01570206953</p>
                        </div>
                        <img src="https://scripts.sandbox.bka.sh/resources/img/bkash_logo.png" alt="bKash" className="h-8" />
                    </div>
                </div>
                <form onSubmit={handleBkashCheckout} className="space-y-3 text-left">
                    <select 
                      value={payFormData.month} 
                      onChange={e => setPayFormData({...payFormData, month: e.target.value})}
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                      required
                    >
                        <option value="">Select Month</option>
                        {months.map(m => (
                            <option key={m} value={`${m} ${currentYear}`}>{m} {currentYear}</option>
                        ))}
                    </select>
                    <input 
                        type="number" 
                        min="1"
                        placeholder="Amount (৳)"
                        value={payFormData.amount}
                        onChange={e => setPayFormData({...payFormData, amount: e.target.value})}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm shadow-sm"
                        required
                    />
                    <button 
                        type="submit" 
                        disabled={payLoading}
                        className="w-full bg-[#E2136E] text-white font-bold py-2.5 rounded-lg text-sm hover:bg-[#c91162] transition shadow-lg flex items-center justify-center gap-2"
                    >
                        {payLoading ? 'Processing...' : <><CreditCard className="w-3.5 h-3.5" /> Pay with bKash</>}
                    </button>
                </form>
             </div>
           </div>
        </div>

        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold tracking-tight text-slate-900 mb-6 flex items-center gap-2">
               <Calendar className="w-5 h-5 text-indigo-600" />
               Payment History
            </h3>
            {payments.length === 0 ? (
              <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                No payment history found.
              </div>
            ) : (
              <div className="space-y-3">
                 {payments.sort((a,b) => b.month.localeCompare(a.month)).map(p => (
                   <div key={p.id} className="flex items-center justify-between p-4 hover:bg-slate-50 transition rounded-xl border border-slate-100">
                      <div className="flex items-center gap-4">
                         <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center font-bold text-sm">
                           {p.month.substring(0,3)}
                         </div>
                         <div>
                           <p className="font-bold text-slate-900">{p.month}</p>
                           <p className="text-[10px] text-slate-400 font-mono uppercase">{new Date(p.date).toLocaleDateString()}</p>
                         </div>
                      </div>
                      <div className="text-lg font-black text-emerald-600">৳{p.amount}</div>
                   </div>
                 ))}
              </div>
            )}
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold tracking-tight text-slate-900 mb-6 flex items-center gap-2">
               <BookmarkCheck className="w-5 h-5 text-indigo-500" />
               Current Issued Books
            </h3>
            {issues.filter(i => i.status === 'Issued').length === 0 ? (
              <div className="py-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-sm">
                No books currently issued.
              </div>
            ) : (
                <div className="space-y-4">
                    {issues.filter(i => i.status === 'Issued').map(i => {
                        const book = books.find(b => b.id === i.bookId);
                        return (
                            <div key={i.id} className="p-4 bg-indigo-50/50 border border-indigo-100 rounded-xl">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-bold text-slate-900">{book?.title}</p>
                                    <p className="text-xs font-mono text-indigo-600 font-bold">CODE: {book?.bookCode}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[10px] text-indigo-500 font-semibold">RETURN BY: {new Date(i.expectedReturnDate).toLocaleDateString()}</p>
                                  </div>
                                </div>
                                {i.adminNote && (
                                   <div className="mt-3 p-2 bg-rose-50 border border-rose-100 rounded-lg text-rose-700 text-xs font-bold animate-pulse">
                                      {i.adminNote}
                                   </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold tracking-tight text-slate-900 mb-6 flex items-center gap-2">
               <Calendar className="w-5 h-5 text-indigo-500" />
               Borrow History & Previous Issues
            </h3>
            {issues.filter(i => i.status === 'Returned').length === 0 ? (
              <div className="py-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-sm">
                No borrowing history found.
              </div>
            ) : (
                <div className="space-y-4">
                    {issues.filter(i => i.status === 'Returned').sort((a,b)=>new Date(b.returnDate||b.issueDate).getTime()-new Date(a.returnDate||a.issueDate).getTime()).map(i => {
                        const book = books.find(b => b.id === i.bookId);
                        return (
                            <div key={i.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <p className="font-bold text-slate-900 line-through text-slate-600">{book?.title}</p>
                                    <p className="text-xs font-mono text-slate-400 font-bold">CODE: {book?.bookCode}</p>
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[10px] text-emerald-600 font-bold uppercase">RETURNED: {new Date(i.returnDate || i.issueDate).toLocaleDateString()}</p>
                                  </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
          </div>
          
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold tracking-tight text-slate-900 mb-6 flex items-center gap-2">
               <BookmarkCheck className="w-5 h-5 text-pink-500" />
               Purchase History
            </h3>
            {purchases.length === 0 ? (
              <div className="py-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-sm">
                No purchases yet.
              </div>
            ) : (
                <div className="space-y-4">
                    {purchases.sort((a,b)=>new Date(b.date).getTime()-new Date(a.date).getTime()).map(p => (
                        <div key={p.id} className="p-4 bg-pink-50/50 border border-pink-100 rounded-xl">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-bold text-slate-900">{p.bookTitle}</p>
                                <p className="text-[10px] text-pink-600 font-bold uppercase">Price: ৳{p.price}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] text-slate-400 font-bold">{new Date(p.date).toLocaleDateString()}</p>
                              </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
            <h3 className="text-lg font-bold tracking-tight text-slate-900 mb-6 flex items-center gap-2">
               <BookmarkCheck className="w-5 h-5 text-amber-500" />
               My Pre-bookings & Reservations
            </h3>
            {prebookings.length === 0 ? (
              <div className="py-12 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                You have no pending requests.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {prebookings.map(p => {
                    const book = books.find(b => b.id === p.bookId);
                    return (
                        <div key={p.id} className="p-5 border border-slate-100 rounded-2xl bg-white shadow-sm">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <p className="font-bold text-slate-900">{book?.title || 'Book'}</p>
                                    <p className="text-[10px] font-mono text-indigo-600 font-bold uppercase tracking-tighter">CODE: {book?.bookCode || 'N/A'}</p>
                                </div>
                                <span className={`text-[10px] px-3 py-1 rounded-full font-black uppercase tracking-widest ${
                                    p.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                                    p.status === 'Cancelled' ? 'bg-rose-100 text-rose-700' :
                                    'bg-amber-100 text-amber-700 animate-bounce'
                                }`}>
                                    {p.status}
                                </span>
                            </div>
                            
                            {(p.adminNote || p.collectDate) && (
                               <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2">
                                  {p.collectDate && (
                                     <div className="flex items-center gap-2 text-blue-700">
                                        <Calendar className="w-4 h-4" />
                                        <span className="text-xs font-bold">Collect Date: {p.collectDate}</span>
                                     </div>
                                  )}
                                  {p.adminNote && (
                                     <div className="text-indigo-600 bg-indigo-50 p-2 rounded-lg text-sm font-semibold border border-indigo-100">
                                        📢 {p.adminNote}
                                     </div>
                                  )}
                               </div>
                            )}

                            <div className="mt-4 pt-4 border-t border-slate-50 text-right">
                                <span className="text-[10px] text-slate-400 font-medium">Requested on: {new Date(p.date).toLocaleDateString()}</span>
                            </div>
                        </div>
                    );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
