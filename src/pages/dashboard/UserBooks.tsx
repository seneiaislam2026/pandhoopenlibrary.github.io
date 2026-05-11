import React, { useEffect, useState } from 'react';
import { useAuth } from '../../store/AuthContext';
import { BookOpen } from 'lucide-react';
import { onSnapshot, collection, query, where, updateDoc, doc, serverTimestamp, setDoc, addDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';

export default function UserBooks() {
  const [issues, setIssues] = useState<any[]>([]);
  const [preBookings, setPreBookings] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    
    const fetchUserData = async () => {
      try {
        const cachedIssues = sessionStorage.getItem('usr_books_issues_'+user.id);
        const cachedPre = sessionStorage.getItem('usr_books_pre_'+user.id);
        const cachedBooks = sessionStorage.getItem('pub_books_cache');
        const cacheTime = sessionStorage.getItem('usr_books_time');

        if (cachedIssues && cachedPre && cachedBooks && cacheTime && (Date.now() - parseInt(cacheTime) < 5 * 60 * 1000)) {
          setIssues(JSON.parse(cachedIssues));
          setPreBookings(JSON.parse(cachedPre));
          setBooks(JSON.parse(cachedBooks));
          return;
        }

        const { getDocs } = await import('firebase/firestore');
        const [issuesSnap, preSnap, booksSnap] = await Promise.all([
          getDocs(query(collection(db, "issues"), where("userId", "==", user.id))),
          getDocs(query(collection(db, "pre-bookings"), where("userId", "==", user.id))),
          getDocs(collection(db, "books"))
        ]);

        const issuesData = issuesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const preData = preSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const booksData = booksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        setIssues(issuesData);
        setPreBookings(preData);
        setBooks(booksData);

        sessionStorage.setItem('usr_books_issues_'+user.id, JSON.stringify(issuesData));
        sessionStorage.setItem('usr_books_pre_'+user.id, JSON.stringify(preData));
        sessionStorage.setItem('pub_books_cache', JSON.stringify(booksData));
        sessionStorage.setItem('usr_books_time', Date.now().toString());

      } catch (err) {
        console.error("Error fetching user books:", err);
      }
    };

    fetchUserData();
  }, [user]);

  return (
    <div className="space-y-10">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 mb-6">কপি নেওয়া বইসমূহ (My Issued Books)</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {issues.length === 0 ? (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white">
              <BookOpen className="w-10 h-10 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 font-medium">আপনার নামে বর্তমানে কোনো বই ইস্যু করা নেই।</p>
            </div>
          ) : (
            issues.map(i => {
              const book = books.find(b => b.id === i.bookId);
              return (
                 <div key={i.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="font-bold text-slate-900 text-lg leading-tight">{book?.title || 'Unknown Book'}</p>
                        <p className="text-xs font-mono text-indigo-600 font-bold mb-2">CODE: {book?.bookCode || 'N/A'}</p>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">Issued: {new Date(i.issueDate).toLocaleDateString()}</p>
                      </div>
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${String(i.status).toLowerCase() === 'issued' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {i.status}
                      </span>
                    </div>
                    {String(i.status).toLowerCase() === 'issued' && (
                      <div className="space-y-3">
                        <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-sm text-slate-700 flex justify-between items-center">
                          <span><strong>Return by:</strong> {new Date(i.expectedReturnDate).toLocaleDateString()}</span>
                          {i.expectedReturnDate && new Date() > new Date(i.expectedReturnDate) && (
                            <span className="text-[10px] font-bold text-rose-600 uppercase animate-pulse">Overdue</span>
                          )}
                        </div>
                        {i.returnRequested ? (
                          <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 py-3 rounded-xl font-bold text-sm text-center">
                            ফেরতের অনুরোধ করা হয়েছে (Return Requested)
                          </div>
                        ) : (
                          <button 
                            onClick={async () => {
                              if (!confirm(`আপনি কি "${book?.title}" বইটি রিটার্ন দেওয়ার জন্য রিকোয়েস্ট করতে চান?`)) return;
                              try {
                                await updateDoc(doc(db, 'issues', i.id), {
                                  returnRequested: true,
                                  updatedAt: serverTimestamp()
                                });
                                await addDoc(collection(db, 'member-requests'), {
                                  userId: user?.id,
                                  type: 'return',
                                  issueId: i.id,
                                  bookId: i.bookId,
                                  createdAt: serverTimestamp(),
                                  status: 'pending'
                                });
                                setIssues(prev => prev.map(iss => iss.id === i.id ? { ...iss, returnRequested: true } : iss));
                                sessionStorage.removeItem('usr_books_issues_'+user?.id);
                                toast.success('বইটি রিটার্ন দেওয়ার অনুরোধ পাঠানো হয়েছে।');
                              } catch (err: any) {
                                toast.error('রিকোয়েস্ট পাঠাতে সমস্যা হয়েছে: ' + err.message);
                              }
                            }}
                            className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm hover:bg-indigo-700 transition shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
                          >
                            রিটার্ন রিকোয়েস্ট করুন
                          </button>
                        )}
                      </div>
                    )}
                 </div>
              );
            })
          )}
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-slate-900 mb-6">আমার প্রি-বুকিং রিকোয়েস্ট (My Pre-bookings)</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {preBookings.length === 0 ? (
            <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white">
              <BookOpen className="w-10 h-10 mx-auto text-slate-300 mb-4" />
              <p className="text-slate-500 font-medium">আপনার কোনো প্রি-বুকিং রিকোয়েস্ট নেই।</p>
            </div>
          ) : (
            preBookings.map(pb => {
              const book = books.find(b => b.id === pb.bookId);
              return (
                <div key={pb.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <p className="font-bold text-slate-900 text-lg leading-tight">{book?.title || 'Unknown Book'}</p>
                      <p className="text-xs font-mono text-indigo-600 font-bold mb-2 text-wrap break-all">CODE: {book?.bookCode || 'N/A'}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-widest">Requested: {new Date(pb.date).toLocaleDateString()}</p>
                    </div>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${
                      pb.status === 'Pending' ? 'bg-amber-100 text-amber-700 animate-pulse' : 
                      pb.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' : 
                      'bg-rose-100 text-rose-700'
                    }`}>
                      {pb.status}
                    </span>
                  </div>
                  
                  {(pb.adminNote || pb.collectDate) && (
                    <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl space-y-2">
                        {pb.adminNote && (
                          <p className="text-sm text-indigo-800">
                            <strong>এডমিন বার্তা:</strong> {pb.adminNote}
                          </p>
                        )}
                        {pb.collectDate && (
                          <p className="text-sm font-bold text-indigo-900">
                            <strong>বইটি সংগ্রহ করুন:</strong> {pb.collectDate}
                          </p>
                        )}
                    </div>
                  )}

                  {pb.status === 'Pending' && (
                    <button 
                      onClick={async () => {
                        if (!confirm('Cancel this pre-booking request?')) return;
                        try {
                          const { deleteDoc, doc } = await import('firebase/firestore');
                          await deleteDoc(doc(db, 'pre-bookings', pb.id));
                          toast.success('Request cancelled.');
                        } catch (err: any) {
                          toast.error('Error: ' + err.message);
                        }
                      }}
                      className="mt-4 w-full py-2 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition"
                    >
                      বাতিল করুন (Cancel)
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
