import React, { useEffect, useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { 
  UserCircle2, 
  Calendar, 
  BookmarkCheck, 
  CreditCard, 
  Send, 
  CheckCircle2, 
  Camera, 
  AlertCircle, 
  ShieldAlert, 
  Pencil, 
  BookOpen, 
  Bell, 
  MessageSquare, 
  ArrowRight, 
  BadgeCheck, 
  Download, 
  X,
  Plus
} from 'lucide-react';
import { onSnapshot, collection, doc, updateDoc, query, where, serverTimestamp, setDoc, addDoc, limit, getDocs, getDoc, getDocsFromCache, getDocsFromServer, documentId } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import toast from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

export default function UserProfile() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [payments, setPayments] = useState<any[]>([]);
  const [prebookings, setPrebookings] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [issues, setIssues] = useState<any[]>([]);
  const [dues, setDues] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewFormData, setReviewFormData] = useState({ title: '', content: '' });

  const isSubscriptionGiftedAndActive = user?.hasGiftSubscription && (!user.giftSubscriptionExpiry || new Date(user.giftSubscriptionExpiry).getTime() > Date.now());
  const totalPaid = payments.filter((p:any) => p.status === 'Approved' || p.status === 'Paid' || !p.status).reduce((acc, p) => acc + Number(p.amount), 0);
  const totalDues = isSubscriptionGiftedAndActive ? 0 : dues.filter(d => d.userId === user?.id && d.status === 'Unpaid').reduce((acc, d) => acc + Number(d.amount), 0);

  const [messages, setMessages] = useState<any[]>([]);
  const [notices, setNotices] = useState<any[]>([]);

  const [donorRecord, setDonorRecord] = useState<any>(null);
  const [donorPayments, setDonorPayments] = useState<any[]>([]);
  const [eventBanners, setEventBanners] = useState<string[]>([]);
  const [dismissedBanners, setDismissedBanners] = useState<string[]>([]);
  const [myEvents, setMyEvents] = useState<any[]>([]);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [profileFormData, setProfileFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    address: user?.address || ''
  });

  useEffect(() => {
    if (!user) return;
    
    const fetchProfileData = async () => {
      try {
        const cacheKey = 'up_fresh_' + user.id;
        const lastFetch = sessionStorage.getItem(cacheKey);
        const now = Date.now();
        const needsRefresh = !lastFetch || (now - parseInt(lastFetch)) > 60000;

        const cachedBooks = sessionStorage.getItem('pub_books_cache');
        const cachedNotices = sessionStorage.getItem('main_notices_cache');
        const cachedProfile = sessionStorage.getItem('usr_profile_' + user.id);

        if (cachedProfile && cachedBooks && cachedNotices && !needsRefresh) {
           const parsed = JSON.parse(cachedProfile);
           setDonorRecord(parsed.donorRecord);
           setDonorPayments(parsed.donorPayments);
           setPayments(parsed.payments);
           setPrebookings(parsed.prebookings);
           setIssues(parsed.issues);
           setPurchases(parsed.purchases);
           setMessages(parsed.messages);
           setDues(parsed.dues || []);
           if (parsed.eventBanners) setEventBanners(parsed.eventBanners);
           setMyEvents(parsed.myEvents || []);
           setBooks(JSON.parse(cachedBooks));
           setNotices(JSON.parse(cachedNotices));
           return;
        }

        const safeGetDocs = async (q: any) => {
          try {
            return await getDocsFromCache(q);
          } catch (e) {
            return await getDocsFromServer(q);
          }
        };

        const donorSnap = await safeGetDocs(query(collection(db, "donor-members"), where("phone", "==", user.phone || '')));
        
        let donor = null;
        let dPayments: any[] = [];
        
        if (!donorSnap.empty) {
            donor = { id: donorSnap.docs[0].id, ...(donorSnap.docs[0].data() as object) };
            const dPaySnap = await safeGetDocs(query(collection(db, 'donor-payments'), where('donorId', '==', donor.id)));
            dPayments = dPaySnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) }));
        }

        const [paySnap, preSnap, issuesSnap, purchSnap, msgSnap, notSnap, duesSnap, settingsSnap, eventsSnap] = await Promise.all([
          safeGetDocs(query(collection(db, "payments"), where("userId", "==", user.id))),
          safeGetDocs(query(collection(db, "pre-bookings"), where("userId", "==", user.id))),
          safeGetDocs(query(collection(db, "issues"), where("userId", "==", user.id))),
          safeGetDocs(query(collection(db, "purchases"), where("userId", "==", user.id))),
          safeGetDocs(query(collection(db, 'messages'), where('toUserId', '==', user.id))),
          safeGetDocs(query(collection(db, 'notices'), limit(20))),
          safeGetDocs(query(collection(db, 'dues'), where('userId', '==', user.id))),
          getDoc(doc(db, "settings", "general")),
          safeGetDocs(query(collection(db, 'events'), where('status', '!=', 'Closed')))
        ]);

        const paymentsData = paySnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) }));
        const preData = preSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) }));
        const issuesData = issuesSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) }));
        const purchData = purchSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) }));
        const msgData = msgSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) }));
        const notData = notSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) }));
        const duesData = duesSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) }));
        const settingsData = settingsSnap.exists() ? (settingsSnap.data() as any) : {};
        
        const neededBookIds = new Set<string>();
        issuesData.forEach((i: any) => i.bookId && neededBookIds.add(i.bookId));
        preData.forEach((p: any) => p.bookId && neededBookIds.add(p.bookId));
        
        let booksData: any[] = [];
        if (neededBookIds.size > 0) {
          const idsArray = Array.from(neededBookIds).slice(0, 30);
          const bSnap = await getDocs(query(collection(db, 'books'), where(documentId(), 'in', idsArray)));
          booksData = bSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) }));
        }

        let eventsList = eventsSnap.docs.map(doc => ({ id: doc.id, ...(doc.data() as object) }));
        if (user.role !== 'admin') {
           eventsList = eventsList.filter((ev: any) => !ev.targetUserPhone || ev.targetUserPhone === user.phone);
        }
        setMyEvents(eventsList);

        setDonorRecord(donor);
        setDonorPayments(dPayments);
        setPayments(paymentsData);
        setPrebookings(preData);
        setBooks(booksData);
        setIssues(issuesData);
        setPurchases(purchData);
        setMessages(msgData);
        setNotices(notData);
        setDues(duesData);

        const fetchedBanners = settingsData?.eventBanners || (settingsData?.eventBanner ? [settingsData.eventBanner] : []);
        setEventBanners(fetchedBanners);

        const profileData = {
           donorRecord: donor,
           donorPayments: dPayments,
           payments: paymentsData,
           prebookings: preData,
           issues: issuesData,
           purchases: purchData,
           messages: msgData,
           dues: duesData,
           myEvents: eventsList,
           eventBanners: fetchedBanners
        };

        try {
          sessionStorage.setItem('usr_profile_' + user.id, JSON.stringify(profileData));
          sessionStorage.setItem('pub_books_cache', JSON.stringify(booksData));
          sessionStorage.setItem('main_notices_cache', JSON.stringify(notData));
          sessionStorage.setItem(cacheKey, now.toString());
        } catch (storageErr) {
          console.warn("Storage limit exceeded when caching user profile", storageErr);
        }

      } catch (err) {
        console.error("Error fetching user profile:", err);
      }
    };

    fetchProfileData();
  }, [user]);

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("ছবি ২ মেগাবাইটের কম হতে হবে।");
      return;
    }

    setUploadingImage(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 400;
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
        
        const base64String = canvas.toDataURL('image/jpeg', 0.6);
        try {
          await updateDoc(doc(db, "users", user.id), { avatar: base64String });
          updateUser({ ...user, avatar: base64String });
          toast.success('প্রোফাইল ছবি আপডেট হয়েছে');
        } catch (err) {
          console.error(err);
          toast.error('ছবি আপডেট করতে সমস্যা হয়েছে');
        } finally {
          setUploadingImage(false);
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaveLoading(true);
    try {
      await updateDoc(doc(db, "users", user.id), {
        ...profileFormData,
        updatedAt: serverTimestamp()
      });
      updateUser({ ...user, ...profileFormData });
      toast.success('প্রোফাইল সফলভাবে আপডেট হয়েছে');
      setIsEditingProfile(false);
    } catch (err) {
      console.error(err);
      toast.error('আপডেট করতে সমস্যা হয়েছে');
    } finally {
      setSaveLoading(false);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addDoc(collection(db, "reviews"), {
        userId: user.id,
        userName: user.name,
        userAvatar: user.avatar || null,
        title: reviewFormData.title,
        content: reviewFormData.content,
        status: "Pending",
        createdAt: serverTimestamp()
      });
      toast.success('রিভিও সফলভাবে পাঠানো হয়েছে। অ্যাডমিন অ্যাপ্রুভ করলে এটি পাবলিকলি দেখা যাবে।');
      setReviewFormData({ title: '', content: '' });
      setShowReviewModal(false);
    } catch (err) {
      console.error(err);
      toast.error('রিভিও পাঠাতে সমস্যা হয়েছে');
    }
  };

  const downloadLibraryCard = () => {
    toast.success('লাইব্রেরি কার্ড জেনারেট হচ্ছে...');
    // Implement actual PDF generation logic if needed, or just link to a static design
  };

  const lateReturnCount = issues.filter(i => i.isLateReturn).length;
  const hasOverdueBooks = issues.some(i => String(i.status).toLowerCase() === 'issued' && new Date(i.expectedReturnDate).getTime() < Date.now());
  const isBorrowBlocked = user?.borrowBlocked || (lateReturnCount >= 10) || hasOverdueBooks;
  const isActiveProfile = user?.status !== 'Inactive' && user?.status !== 'Paused';

  const [bannerIndex, setBannerIndex] = useState(0);
  useEffect(() => {
    if (eventBanners.length > 0) {
      const timer = setInterval(() => {
        setBannerIndex(prev => (prev + 1) % eventBanners.length);
      }, 5000);
      return () => clearInterval(timer);
    }
  }, [eventBanners]);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-24 font-bengali">
       {/* Page Header */}
       <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">আমার প্রোফাইল</h2>
          <p className="text-slate-500 font-medium text-sm mt-2 opacity-80">আপনার তথ্য এবং পাঠাভ্যাস পরিচালনা করুন</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/buy-books" className="inline-flex items-center gap-2 bg-rose-500 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl shadow-rose-200/50 hover:bg-rose-600 transition-all hover:-translate-y-0.5 active:scale-95">
             <BookmarkCheck className="w-4 h-4" />
             বই কিনুন
          </Link>
          <button onClick={() => setIsEditingProfile(true)} className="inline-flex items-center gap-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-6 py-3 rounded-2xl font-black text-sm shadow-lg shadow-slate-100 dark:shadow-none border border-slate-100 dark:border-slate-700 hover:bg-slate-50 transition-all active:scale-95">
             <Pencil className="w-4 h-4" />
             ইডিট প্রোফাইল
          </button>
        </div>
      </div>

      {/* Main Profile Info Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         <div className="lg:col-span-1 space-y-8">
            {/* Identity Card */}
            <div className="bg-white dark:bg-slate-900/40 rounded-[2.5rem] p-8 shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 relative overflow-hidden group">
               <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl opacity-50 group-hover:opacity-100 transition-opacity"></div>
               
               <div className="relative z-10 flex flex-col items-center text-center">
                  <div className="relative mb-6">
                    <div className="w-32 h-32 rounded-[2.5rem] bg-slate-50 p-1.5 border-2 border-indigo-100/50 group-hover:border-indigo-600 transition-colors duration-500 overflow-hidden shadow-2xl">
                       {user?.avatar ? (
                          <img src={user.avatar} alt="Profile" className="w-full h-full rounded-[2.1rem] object-cover" />
                       ) : (
                          <div className="w-full h-full rounded-[2.1rem] bg-indigo-50 flex items-center justify-center text-indigo-300">
                             <UserCircle2 className="w-16 h-16" />
                          </div>
                       )}
                    </div>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-2 -right-2 p-3 bg-indigo-600 text-white rounded-2xl shadow-xl hover:bg-indigo-700 transition-all active:scale-90 border-4 border-white"
                    >
                       {uploadingImage ? <X className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                    </button>
                    <input type="file" ref={fileInputRef} onChange={handleAvatarChange} accept="image/*" className="hidden" />
                  </div>

                  <h3 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tight">{user?.name}</h3>
                  <div className="flex items-center gap-2 mt-2">
                     <span className="text-[11px] font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100 uppercase tracking-widest">
                        {user?.role === 'reader' ? 'পাঠক সদস্য' : user?.role === 'donor' ? 'দাতা সদস্য' : user?.role}
                     </span>
                     <span className="text-[11px] font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-100 tracking-tighter">
                        ID: {user?.memberId || 'N/A'}
                     </span>
                  </div>

                  <div className="w-full h-px bg-slate-100 dark:bg-slate-800 my-6"></div>

                  <div className="w-full space-y-4">
                     <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-sans">Phone</span>
                        <span className="text-sm font-black text-slate-700 dark:text-slate-300 font-mono">{user?.phone || 'Not set'}</span>
                     </div>
                     <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-sans">Status</span>
                        <span className={cn(
                          "text-[10px] sm:text-xs font-black px-3 py-0.5 rounded-full uppercase tracking-widest border",
                          isActiveProfile ? "bg-emerald-50 text-emerald-600 border-emerald-100" : "bg-rose-50 text-rose-600 border-rose-100"
                        )}>
                           {isActiveProfile ? 'Active' : 'Inactive'}
                        </span>
                     </div>
                  </div>
               </div>
            </div>

            {/* Stats Bento */}
            <div className="grid grid-cols-2 gap-4">
               <div className="bg-indigo-600 p-6 rounded-[2rem] text-white shadow-xl shadow-indigo-200">
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">মোট জমা</p>
                  <p className="text-2xl font-black">৳{totalPaid}</p>
                  <div className="mt-4 flex justify-end opacity-30"><CreditCard className="w-6 h-6" /></div>
               </div>
               <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">পঠিত বই</p>
                    <p className="text-2xl font-black text-slate-800">{issues.filter(i => String(i.status).toLowerCase() === 'returned').length}</p>
                  </div>
                  <div className="flex justify-end text-emerald-500 opacity-50"><BadgeCheck className="w-6 h-6" /></div>
               </div>
               <div className="bg-rose-50 p-6 rounded-[2rem] border border-rose-100 flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-rose-400 mb-1">বকেয়া</p>
                    <p className="text-2xl font-black text-rose-600">৳{totalDues}</p>
                  </div>
                  <div className="flex justify-end text-rose-300"><AlertCircle className="w-6 h-6" /></div>
               </div>
               <div className="bg-amber-50 p-6 rounded-[2rem] border border-amber-100 flex flex-col justify-between">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-1">অ্যাক্টিভ বই</p>
                    <p className="text-2xl font-black text-amber-600">{issues.filter(i => String(i.status).toLowerCase() === 'issued').length}</p>
                  </div>
                  <div className="flex justify-end text-amber-300"><BookOpen className="w-6 h-6" /></div>
               </div>
            </div>
         </div>

         <div className="lg:col-span-2 space-y-8">
            {/* Warning Banners */}
            {isBorrowBlocked && (
              <div className="bg-rose-50 border border-rose-200 p-6 rounded-[2rem] shadow-sm flex items-start gap-4">
                 <ShieldAlert className="w-8 h-8 text-rose-600 shrink-0 mt-1" />
                 <div>
                    <h4 className="text-rose-800 font-black font-bengali text-lg leading-tight mb-1">বই নেওয়া সাময়িকভাবে স্থগিত</h4>
                    <p className="text-rose-700 text-sm font-semibold opacity-90 font-bengali">
                      {user?.borrowBlocked ? 'অ্যাডমিন আপনার মেম্বারশিপ সাময়িকভাবে স্থগিত করেছে।' : 
                       hasOverdueBooks ? 'আপনার কাছে ফেরত দেওয়ার সময় পার হওয়া বই রয়েছে। বই ফেরত দিয়ে পুনরায় বই নিতে পারবেন।' : 
                       'অতিরিক্ত লেট রিটার্নের কারণে আপনার প্রোফাইলটি ডিঅ্যাক্টিভেট করা হয়েছে।'}
                    </p>
                 </div>
              </div>
            )}

            {/* Current Books */}
            <div className="bg-white dark:bg-slate-900/40 p-8 rounded-[2.5rem] shadow-xl shadow-slate-100 dark:shadow-none border border-slate-100 dark:border-slate-800">
               <div className="flex items-center justify-between mb-8">
                  <h3 className="text-xl font-black text-slate-800 dark:text-white font-bengali flex items-center gap-3">
                     <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600"><BookOpen className="w-6 h-6" /></div>
                     বর্তমান পঠিত বইসমূহ
                  </h3>
                  <Link to="/books" className="text-sm font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-all font-bengali">নতুন বই খুঁজুন</Link>
               </div>

               {issues.filter(i => String(i.status).toLowerCase() === 'issued').length === 0 ? (
                  <div className="py-16 text-center bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">
                     <p className="text-slate-400 font-bold font-bengali">বর্তমানে কোন বই ইস্যু করা নেই</p>
                  </div>
               ) : (
                  <div className="space-y-6">
                     {issues.filter(i => String(i.status).toLowerCase() === 'issued').map(i => {
                        const book = books.find(b => b.id === i.bookId);
                        return (
                           <div key={i.id} className="relative group">
                              <div className="bg-white dark:bg-slate-800 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all">
                                 <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                                    <div className="flex gap-4">
                                       <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-300 font-black text-xl font-mono uppercase">
                                          {book?.title?.charAt(0)}
                                       </div>
                                       <div>
                                          <h4 className="text-lg font-black text-slate-800 dark:text-white leading-tight mb-1">{book?.title}</h4>
                                          <p className="text-[11px] font-black text-indigo-400 font-mono uppercase tracking-widest">{book?.bookCode}</p>
                                          <p className="text-xs text-slate-400 font-bold mt-1 font-bengali">ফেরত তারিখ: {new Date(i.expectedReturnDate).toLocaleDateString('bn-BD')}</p>
                                       </div>
                                    </div>
                                    
                                    <div className="flex flex-col items-end gap-3 shrink-0">
                                       {i.returnRequested ? (
                                          <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 uppercase tracking-widest font-bengali">অনুরোধ পাঠানো হয়েছে</span>
                                       ) : (
                                          <button 
                                            onClick={async () => {
                                              if (!confirm('আপনি কি বইটি ফেরত দেওয়ার জন্য অনুরোধ দিতে চান?')) return;
                                              try {
                                                await updateDoc(doc(db, 'issues', i.id), { returnRequested: true });
                                                toast.success('অনুরোধ পাঠানো হয়েছে');
                                              } catch (err) { toast.error('এরর হয়েছে'); }
                                            }}
                                            className="w-full sm:w-auto px-6 py-2.5 bg-slate-900 text-white rounded-xl font-black text-xs hover:bg-slate-800 transition-all font-bengali shadow-lg active:scale-95 flex items-center justify-center gap-2"
                                          >
                                            <Send className="w-3.5 h-3.5" /> ফেরত দিন
                                          </button>
                                       )}

                                       {!i.extendRequested && (
                                          <button 
                                            onClick={async () => {
                                              if (!confirm('আপনি কি বই ফেরতের সময় বাড়ানোর জন্য অনুরোধ দিতে চান?')) return;
                                              try {
                                                await updateDoc(doc(db, 'issues', i.id), { extendRequested: true });
                                                toast.success('অনুরোধ পাঠানো হয়েছে');
                                              } catch (err) { toast.error('এরর হয়েছে'); }
                                            }}
                                            className="w-full sm:w-auto text-[11px] font-black text-indigo-600 bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-all font-bengali"
                                          >
                                            সময় বৃদ্ধি
                                          </button>
                                       )}
                                    </div>
                                 </div>
                              </div>
                           </div>
                        )
                     })}
                  </div>
               )}
            </div>

            {/* Lower Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
               {/* Quick Actions */}
               <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                  <h3 className="text-xl font-black text-slate-800 font-bengali flex items-center gap-3">
                     <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600"><Plus className="w-6 h-6" /></div>
                     অ্যাকশনস
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                     <button onClick={() => setShowReviewModal(true)} className="p-6 bg-slate-50 hover:bg-indigo-600 hover:text-white rounded-[2rem] transition-all group border border-slate-100 flex flex-col items-center gap-3 text-center">
                        <Pencil className="w-8 h-8 opacity-40 group-hover:opacity-100 transition-opacity" />
                        <span className="text-[11px] font-black uppercase tracking-widest font-bengali">রিভিও লিখুন</span>
                     </button>
                     <button onClick={downloadLibraryCard} className="p-6 bg-slate-50 hover:bg-emerald-600 hover:text-white rounded-[2rem] transition-all group border border-slate-100 flex flex-col items-center gap-3 text-center">
                        <Download className="w-8 h-8 opacity-40 group-hover:opacity-100 transition-opacity" />
                        <span className="text-[11px] font-black uppercase tracking-widest font-bengali">আইডি কার্ড</span>
                     </button>
                  </div>
               </div>

               {/* Prebookings */}
               <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                  <h3 className="text-xl font-black text-slate-800 font-bengali flex items-center justify-between">
                     <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-600"><Calendar className="w-6 h-6" /></div>
                        সংরক্ষিত বই
                     </div>
                     <span className="text-xs font-black text-slate-400 font-mono tracking-widest">{prebookings.length}</span>
                  </h3>
                  <div className="space-y-4">
                     {prebookings.length === 0 ? (
                        <p className="text-slate-400 font-bold font-bengali text-sm py-4">কোন বই সংরক্ষিত নেই</p>
                     ) : (
                        prebookings.slice(0, 3).map(p => (
                           <div key={p.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                              <span className="text-sm font-black text-slate-700 font-bengali truncate max-w-[150px]">{books.find(b => b.id === p.bookId)?.title || 'Book'}</span>
                              <span className="text-[9px] font-black bg-amber-100 text-amber-700 px-3 py-1 rounded-full uppercase tracking-tighter">{p.status}</span>
                           </div>
                        ))
                     )}
                  </div>
               </div>
            </div>
         </div>
      </div>

      {/* Banner Carousel (Bottom) - As requested */}
      {eventBanners.length > 0 && (
        <div className="relative h-48 md:h-64 w-full rounded-[2.5rem] overflow-hidden shadow-2xl border border-white dark:border-slate-800 group">
          <AnimatePresence mode="wait">
            <motion.img
              key={bannerIndex}
              src={eventBanners[bannerIndex]}
              initial={{ opacity: 0, scale: 1.1 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="absolute inset-0 w-full h-full object-cover"
            />
          </AnimatePresence>
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          <div className="absolute bottom-10 left-10 text-white">
             <h4 className="text-2xl font-black font-bengali drop-shadow-lg">পাঠাগারের বিশেষ আয়োজন</h4>
             <p className="text-sm font-bold font-bengali opacity-80 mt-1">সব সময় সাথে থাকুন আমাদের উদ্যোগে</p>
          </div>
          
          <div className="absolute bottom-6 right-10 flex gap-2">
            {eventBanners.map((_, i) => (
              <div 
                key={i} 
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-500",
                  bannerIndex === i ? "bg-white w-8" : "bg-white/40"
                )}
              />
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      {isEditingProfile && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-md p-10 shadow-2xl border border-slate-100 dark:border-slate-800"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
                <Pencil className="w-6 h-6" />
              </div>
              <h3 className="text-2xl font-black text-slate-800 dark:text-white font-bengali">প্রোফাইল আপডেট</h3>
            </div>
            
            <form onSubmit={handleUpdateProfile} className="space-y-5 font-bengali">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">পুরো নাম</label>
                  <input 
                    type="text" 
                    required
                    value={profileFormData.name}
                    onChange={e => setProfileFormData({...profileFormData, name: e.target.value})}
                    className="w-full border border-slate-200 rounded-2xl px-5 py-4 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none font-bold"
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">মোবাইল নাম্বার</label>
                  <input 
                    type="text" 
                    value={profileFormData.phone}
                    onChange={e => setProfileFormData({...profileFormData, phone: e.target.value})}
                    className="w-full border border-slate-200 rounded-2xl px-5 py-4 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none font-mono font-bold"
                  />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ঠিকানা</label>
                  <textarea 
                    value={profileFormData.address}
                    onChange={e => setProfileFormData({...profileFormData, address: e.target.value})}
                    className="w-full border border-slate-200 rounded-2xl px-5 py-4 bg-slate-50 focus:bg-white focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none min-h-[120px] font-bold"
                  />
               </div>
               
               <div className="flex gap-4 pt-6 mt-4">
                  <button type="button" onClick={() => setIsEditingProfile(false)} className="flex-1 px-4 py-4 font-black text-slate-400 hover:text-slate-600 transition tracking-widest uppercase text-xs">বাতিল</button>
                  <button type="submit" disabled={saveLoading} className="flex-2 px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition active:scale-95 disabled:opacity-50">
                    {saveLoading ? 'সেভ হচ্ছে...' : 'সেভ করুন'}
                  </button>
               </div>
            </form>
          </motion.div>
        </div>
      )}

      {showReviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white dark:bg-slate-900 rounded-[2.5rem] w-full max-w-2xl p-10 shadow-2xl relative border border-slate-100"
          >
            <h3 className="text-2xl font-black mb-8 tracking-tight text-slate-900 dark:text-white font-bengali">বুক রিভিও পোস্ট করুন</h3>
            <form onSubmit={handleReviewSubmit} className="space-y-6 font-bengali">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">বই ও লেখকের নাম</label>
                <input 
                  type="text" 
                  autoFocus
                  required 
                  value={reviewFormData.title} 
                  onChange={e=>setReviewFormData({...reviewFormData, title: e.target.value})} 
                  className="w-full border border-slate-200 p-4 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 shadow-sm outline-none font-bold" 
                  placeholder="যেমন: প্যারাডক্সিক্যাল সাজিদ - আরিফ আজাদ" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-500 uppercase tracking-widest">আপনার রিভিও</label>
                <textarea 
                  required 
                  rows={8}
                  value={reviewFormData.content} 
                  onChange={e=>setReviewFormData({...reviewFormData, content: e.target.value})} 
                  className="w-full border border-slate-200 p-4 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 shadow-sm outline-none resize-none font-bold min-h-[250px]" 
                  placeholder="বইটি সম্পর্কে আপনার মূল্যবান মতামত এখানে লিখুন..." 
                ></textarea>
              </div>
              
              <div className="flex gap-4 pt-8">
                 <button type="button" onClick={() => setShowReviewModal(false)} className="flex-1 px-6 py-4 font-black text-slate-400 hover:bg-slate-50 rounded-2xl transition tracking-widest uppercase text-xs">বাতিল</button>
                 <button type="submit" className="flex-2 px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition active:scale-95">পাবলিশ করুন</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
