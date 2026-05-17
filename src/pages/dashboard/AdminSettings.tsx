import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { CalendarHeart, Users, FileText, Settings as SettingsIcon, Image as ImageIcon, CheckCircle, UploadCloud, Shield, Trash2, Bell, MessageSquare, ShieldAlert, UserX, Clock, LayoutGrid, Tags, ScanFace, X, Camera as CameraIcon, Package, Download, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { doc, getDoc, setDoc, collection, addDoc, serverTimestamp, getDocs, query, where, orderBy } from 'firebase/firestore';
import { db, storage } from '../../lib/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import toast from 'react-hot-toast';
import Select from 'react-select';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { sendSMS } from '../../lib/sms';

const availableSubadminRoutes = [
  { name: 'সদস্য ব্যবস্থাপনা (Users)', path: '/dashboard/users' },
  { name: 'বইয়ের তালিকা (Inventory)', path: '/dashboard/books' },
  { name: 'শেল্ফ ব্যবস্থাপনা (Shelves)', path: '/dashboard/manage-shelves' },
  { name: 'ক্যাটাগরি ব্যবস্থাপনা (Categories)', path: '/dashboard/manage-categories' },
  { name: 'ইস্যু ও ফেরত (Issues)', path: '/dashboard/issues' },
  { name: 'সদস্যদের বকেয়া (Dues)', path: '/dashboard/dues' },
  { name: 'দাতা সদস্য (Donors)', path: '/dashboard/donors' },
  { name: 'হিসাব-নিকাশ (Finances)', path: '/dashboard/finances' },
  { name: 'নোটিশ', path: '/dashboard/notices' },
  { name: 'মেসেজসমূহ', path: '/dashboard/messages' },
  { name: 'বইয়ের অনুরোধ (Requests)', path: '/dashboard/book-requests' },
  { name: 'বারকোড স্ক্যানার (Scanner)', path: '/dashboard/barcode-scanner' },
  { name: 'প্রি-বুকিং', path: '/dashboard/pre-bookings' },
  { name: 'শপ বই ব্যবস্থাপনা', path: '/dashboard/shop-books' },
  { name: 'বই বিক্রয় অর্ডার', path: '/dashboard/shop-orders' },
  { name: 'বই কিনুন (Shop)', path: '/buy-books' },
  { name: 'স্টিকার ও QR', path: '/dashboard/stickers' },
  { name: 'বুক রিভিও', path: '/dashboard/manageblog' },
  { name: 'ইভেন্ট পরিচালনা', path: '/dashboard/events' }
];

export default function AdminSettings() {
  const [eventBanners, setEventBanners] = useState<string[]>([]);
  const [subadminAccess, setSubadminAccess] = useState<string[]>([]);
  const [aiToken, setAiToken] = useState<string>('');
  const [smsToken, setSmsToken] = useState<string>('');
  const [callToken, setCallToken] = useState<string>('');
  const [callSenderId, setCallSenderId] = useState<string>('');
  const [smsSenderId, setSmsSenderId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);
  const [exportingPdf, setExportingPdf] = useState<string | null>(null);
  const [customGreetingEnabled, setCustomGreetingEnabled] = useState(false);
  const [customGreetingTitle, setCustomGreetingTitle] = useState('');
  const [customGreetingSubtitle, setCustomGreetingSubtitle] = useState('');
  const [inaugurationEnabled, setInaugurationEnabled] = useState(false);
  const [inaugurationTitle, setInaugurationTitle] = useState('পানধোয়া উন্মুক্ত পাঠাগার');
  const [inaugurationSubtitle, setInaugurationSubtitle] = useState('শুভ উদ্বোধন');
  const [inaugurationMessage, setInaugurationMessage] = useState('জ্ঞান ও প্রযুক্তির আলোয় আলোকিত হোক আমাদের সমাজ। পাঠাগারের এই নতুন যাত্রায় আপনাকে স্বাগতম। আসুন, বইয়ের পাতায় খুঁজি নতুন এক পৃথিবী।');
  const [inaugurationButtonText, setInaugurationButtonText] = useState('অটোমেশন উদ্বোধন');
  const [inaugurationTargetUsers, setInaugurationTargetUsers] = useState<string[]>([]);
  const [allUsersList, setAllUsersList] = useState<{value: string, label: string, phone?: string}[]>([]);

  // Custom SMS State
  const [customSmsMessage, setCustomSmsMessage] = useState('');
  const [customSmsTargetUsers, setCustomSmsTargetUsers] = useState<string[]>([]);
  const [customSmsSending, setCustomSmsSending] = useState(false);
  const [customSmsTargetType, setCustomSmsTargetType] = useState<'all' | 'specific'>('specific');

  // AI Scanner State
  const [showAiScanner, setShowAiScanner] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Added newly mapped state for the book save
  const [scannedBookDetails, setScannedBookDetails] = useState<any>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'general');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (Array.isArray(data.eventBanners)) setEventBanners(data.eventBanners);
          else if (data.eventBanner) setEventBanners([data.eventBanner]);
          else setEventBanners([]);
          setSubadminAccess(data.subadminAccess || []);
          setAiToken(data.sysToken || '');
          setSmsToken(data.smsToken || '');
          setCallToken(data.callToken || '');
          setCallSenderId(data.callSenderId || '');
          setSmsSenderId(data.smsSenderId || '');
          setCustomGreetingEnabled(data.customGreetingEnabled || false);
          setCustomGreetingTitle(data.customGreetingTitle || '');
          setCustomGreetingSubtitle(data.customGreetingSubtitle || '');
          setInaugurationEnabled(data.inaugurationEnabled || false);
          setInaugurationTitle(data.inaugurationTitle || 'পানধোয়া উন্মুক্ত পাঠাগার');
          setInaugurationSubtitle(data.inaugurationSubtitle || 'শুভ উদ্বোধন');
          setInaugurationMessage(data.inaugurationMessage || 'আমাদের প্রতিষ্ঠাবার্ষিকী অনুষ্ঠানে সকল সম্মানিত অতিথিবৃন্দকে জানাই আন্তরিক শুভেচ্ছা ও স্বাগত। জ্ঞান ও প্রযুক্তির আলোয় আলোকিত হোক আমাদের সমাজ। আসুন, বইয়ের পাতায় খুঁজি নতুন এক পৃথিবী।');
          setInaugurationButtonText(data.inaugurationButtonText || 'অটোমেশন উদ্বোধন');
          setInaugurationTargetUsers(data.inaugurationTargetUsers || []);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchSettings();

    const fetchAllUsers = async () => {
      try {
        const usersSnap = await getDocs(collection(db, 'users'));
        const users = usersSnap.docs.map(doc => ({
          value: doc.id,
          label: `${doc.data().firstName || ''} ${doc.data().lastName || ''} - ${doc.data().phone || doc.data().memberId || ''}`.trim(),
          phone: doc.data().phone || ''
        }));
        setAllUsersList(users);
      } catch (err) {
        console.error(err);
      }
    };
    fetchAllUsers();

    const fetchCategories = async () => {
      try {
        const booksRef = collection(db, 'books');
        const querySnapshot = await getDocs(booksRef);
        const cats = new Set<string>();
        querySnapshot.forEach(doc => {
          const cat = doc.data().category;
          if (cat) cats.add(cat);
        });
        setCategories(Array.from(cats).sort());
      } catch (err) {
        console.error("Error fetching categories for export:", err);
      }
    };
    fetchCategories();
  }, []);

  const startCamera = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.play();
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      toast.error('ক্যামেরা চালু করতে সমস্যা হয়েছে।');
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const generateBookCode = async (categoryStr: string) => {
    try {
      const dbRef = collection(db, "books");
      const q = query(dbRef, where("category", "==", categoryStr));
      const res = await getDocs(q);
      const count = res.size + 1;
      const getPrefix = (cat: string) => {
        if (!cat) return "GEN";
        if (cat.includes("শিশু")) return "CHI";
        if (cat.includes("ইসলাম")) return "ISL";
        if (cat.includes("গল্প") || cat.includes("ফুটবল")) return "STO";
        if (cat.includes("ইতিহাস")) return "HIS";
        if (cat.includes("প্রবন্ধ")) return "ESS";
        if (cat.includes("কবিতা")) return "POE";
        if (cat.includes("জীবনী")) return "BIO";
        if (cat.includes("বিজ্ঞান")) return "SCI";
        if (cat.includes("উপন্যাস")) return "NOV";
        if (cat.includes("নাটক")) return "DRA";
        return cat.substring(0, 3).toUpperCase();
      };
      const r = Math.floor(100 + Math.random() * 900);
      return `${getPrefix(categoryStr)}-${count}${r}`;
    } catch {
      return `BOK-${Math.floor(1000 + Math.random() * 9000)}`;
    }
  };

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setIsAiProcessing(true);
    const toastId = toast.loading('Gemini বইয়ের কাভার থেকে তথ্য পড়ছে...', { style: { fontFamily: 'Hind Siliguri' } });

    try {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context not possible');
      
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const base64Image = canvas.toDataURL('image/jpeg', 0.5);
      const base64Data = base64Image.split(',')[1];

      const sysInstruction = `You are an AI assistant that extracts book details from book covers, specifically for Bengali and English books. Look at the image provided and extract the book's title, author, and likely category in Bengali text. Category must be one of: "শিশু-কিশোর", "ইসলামী বই", "গল্প", "ইতিহাস", "প্রবন্ধ", "কবিতা", "জীবনী ও স্মৃতিচারণ", "বিজ্ঞান", "উপন্যাস", "নাটক" or a fitting short Bengali label. Return a strict JSON object without markdown formatting, using these exact keys: "title", "author", "category". If you cannot identify the title, output "". Do the same for author and category. Example: {"title": "হিমু", "author": "হুমায়ূন আহমেদ", "category": "উপন্যাস"}`;

      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: sysInstruction,
          contents: [{
            role: "user",
            parts: [
              { text: "Extract the book info from this cover image." },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: base64Data
                }
              }
            ]
          }]
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'AI Failed');

      // Extract JSON from response text
      let text = data.text;
      
      // Attempt to clean markdown json blocks if any
      if (text.includes('```json')) {
        text = text.split('```json')[1].split('```')[0].trim();
      } else if (text.includes('```')) {
         text = text.split('```')[1].split('```')[0].trim();
      }

      const bookData = JSON.parse(text);
      if (!bookData.title) throw new Error('বইয়ের নাম পাওয়া যায়নি। আবার চেষ্টা করুন।');

      // Success
      toast.success('সফলভাবে তথ্য পাওয়া গেছে!', { id: toastId });
      stopCamera();
      
      const bookCode = await generateBookCode(bookData.category);

      setScannedBookDetails({
         ...bookData,
         cover: base64Image,
         bookCode,
         shelfNo: '',
         status: 'Available',
         review: '',
         description: ''
      });

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error parsing image, try again.', { id: toastId });
    } finally {
      setIsAiProcessing(false);
    }
  };

  const saveAiBook = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!scannedBookDetails) return;
     try {
       const toastId = toast.loading('বই সেভ করা হচ্ছে...');
       await addDoc(collection(db, "books"), {
         ...scannedBookDetails,
         createdAt: serverTimestamp(),
         updatedAt: serverTimestamp()
       });
       toast.success('বই সফলভাবে যুক্ত করা হয়েছে!', { id: toastId });
       setScannedBookDetails(null);
       startCamera();
     } catch (err) {
       toast.error('বই সেভ করতে সমস্যা হয়েছে।');
       console.error(err);
     }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('ছবির সাইজ ২ এমবি এর নিচে হতে হবে।');
        return;
      }
      setLoading(true);
      const toastId = toast.loading('ছবি আপলোড হচ্ছে...');
      try {
         const fileRef = ref(storage, `banners/${Date.now()}_${file.name}`);
         await uploadBytes(fileRef, file);
         const downloadUrl = await getDownloadURL(fileRef);
         setEventBanners(prev => [...prev, downloadUrl]);
         toast.success('ছবি আপলোড করা হয়েছে, এবার সেভ করুন।', { id: toastId });
      } catch (err) {
         toast.error('ছবি আপলোড করতে সমস্যা হয়েছে', { id: toastId });
         console.error(err);
      } finally {
         setLoading(false);
         if (e.target) e.target.value = '';
      }
    }
  };

  const removeBanner = (index: number) => {
    setEventBanners(prev => prev.filter((_, i) => i !== index));
    toast.success('ব্যানার সরানো হয়েছে (সেভ করতে ভুলবেন না)');
  };

  const handleToggleAccess = (path: string) => {
    if (subadminAccess.includes(path)) {
      setSubadminAccess(subadminAccess.filter(p => p !== path));
    } else {
      setSubadminAccess([...subadminAccess, path]);
    }
  };

  const saveSettings = async () => {
    try {
      setSaving(true);
      await setDoc(doc(db, 'settings', 'general'), { 
        eventBanners, 
        subadminAccess, 
        sysToken: aiToken, 
        smsToken, 
        callToken,
        callSenderId,
        smsSenderId,
        customGreetingEnabled,
        customGreetingTitle,
        customGreetingSubtitle,
        inaugurationEnabled,
        inaugurationTitle,
        inaugurationSubtitle,
        inaugurationMessage,
        inaugurationButtonText,
        inaugurationTargetUsers
      }, { merge: true });
      toast.success('সেটিংস সেভ করা হয়েছে!');
    } catch (err) {
      toast.error('সেভ করতে সমস্যা হয়েছে।');
    } finally {
      setSaving(false);
    }
  };

  const handleCustomSmsSend = async () => {
    if (!customSmsMessage.trim()) {
      return toast.error('দয়া করে এসএমএস এর বিষয়বস্তু লিখুন।');
    }
    
    let targetPhones: string[] = [];
    
    if (customSmsTargetType === 'all') {
      targetPhones = allUsersList.filter(u => u.phone).map(u => u.phone!);
    } else {
      if (customSmsTargetUsers.length === 0) {
        return toast.error('দয়া করে সদস্য নির্বাচন করুন।');
      }
      targetPhones = allUsersList
        .filter(u => customSmsTargetUsers.includes(u.value) && u.phone)
        .map(u => u.phone!);
    }
    
    if (targetPhones.length === 0) {
      return toast.error('নির্বাচিত সদস্যদের কোনো মোবাইল নম্বর পাওয়া যায়নি।');
    }

    const confirmSend = window.confirm(`আপনি কি সত্যিই ${targetPhones.length} জন সদস্যকে এসএমএস পাঠাতে চান?`);
    if (!confirmSend) return;

    setCustomSmsSending(true);
    const toastId = toast.loading(`${targetPhones.length} জনকে এসএমএস পাঠানো হচ্ছে...`);
    
    let successCount = 0;
    let failCount = 0;

    for (const phone of targetPhones) {
      try {
        const res = await sendSMS(phone, customSmsMessage);
        if (res) successCount++;
        else failCount++;
      } catch (err) {
        failCount++;
      }
    }
    
    setCustomSmsSending(false);
    toast.success(`এসএমএস পাঠানো সম্পন্ন হয়েছে। সফল: ${successCount}, ব্যর্থ: ${failCount}`, { id: toastId });
    if (successCount > 0) setCustomSmsMessage('');
  };

  const downloadBookListPDF = async (category: string | 'all') => {
    try {
      setExportingPdf(category);
      const toastId = toast.loading(`${category === 'all' ? 'সব' : category} বইয়ের তালিকা তৈরি হচ্ছে...`);
      
      const booksRef = collection(db, 'books');
      let q;
      if (category === 'all') {
        q = query(booksRef, orderBy('category'), orderBy('title'));
      } else {
        q = query(booksRef, where('category', '==', category), orderBy('title'));
      }
      
      const querySnapshot = await getDocs(q);
      const booksData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any)
      })) as any[];

      if (booksData.length === 0) {
        toast.error('কোনো বই পাওয়া যায়নি।', { id: toastId });
        setExportingPdf(null);
        return;
      }

      const doc = new jsPDF();
      
      // Add Bengali font support if possible, or use standard
      // Since standard jsPDF doesn't support Bengali well without custom fonts, 
      // we'll try to provide a clean layout. 
      // Note: For real Bengali support, we'd need to embed a .ttf font base64.
      // For now, we'll use standard headers but attempt to show the data.

      doc.setFontSize(18);
      doc.text(`Book List - ${category === 'all' ? 'All Categories' : category}`, 14, 20);
      doc.setFontSize(10);
      doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 28);

      const tableColumn = ["Book Code", "Title", "Author", "Category", "Shelf"];
      const tableRows: any[] = [];

      booksData.forEach(book => {
        const bookRows = [
          book.bookCode || 'N/A',
          book.title || 'N/A',
          book.author || 'N/A',
          book.category || 'N/A',
          book.shelfNo || 'N/A',
        ];
        tableRows.push(bookRows);
      });

      (doc as any).autoTable({
        head: [tableColumn],
        body: tableRows,
        startY: 35,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229] }, // indigo-600
        styles: { fontSize: 9 }, // Small font for better fitting
      });

      doc.save(`BookList_${category.replace(/\s+/g, '_')}_${new Date().getTime()}.pdf`);
      toast.success('পিডিএফ ডাউনলোড সফল হয়েছে!', { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error('পিডিএফ তৈরি করতে সমস্যা হয়েছে।');
    } finally {
      setExportingPdf(null);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
         <h1 className="text-2xl font-bold font-bengali text-slate-800 flex items-center gap-3">
           <SettingsIcon className="text-indigo-600" />
           অ্যাডমিন সেটিংস
         </h1>
         <p className="text-slate-500 font-bengali mt-2">ওয়েবসাইটের বিভিন্ন কনফিগারেশন, Gemini স্ক্যানার এবং ইভেন্ট পরিচালনা করুন।</p>
      </div>
      
      {/* AI Add Book Card */}
      <div className="mb-8 bg-gradient-to-r from-violet-600 to-indigo-600 rounded-3xl p-8 text-white relative overflow-hidden shadow-xl shadow-indigo-500/20">
         <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
         <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
            <div>
               <div className="flex items-center gap-3 mb-2">
                 <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
                   <ScanFace className="text-white w-6 h-6" />
                 </div>
                 <h2 className="text-2xl font-black font-bengali tracking-wide">Gemini (AI) স্ক্যানার দিয়ে বই যুক্ত করুন</h2>
               </div>
               <p className="text-indigo-100 font-bengali text-sm leading-relaxed max-w-xl">
                 বইয়ের কাভার স্ক্যান করলেই Gemini (Artificial Intelligence) অটোমেটিকভাবে বইয়ের লেখক, ক্যাটাগরি এবং অন্যান্য তথ্য এক্সট্র্যাক্ট করে নির্ভুলভাবে ডাটাবেসে সেভ করবে। এতে কোনো বানান ভুল হবে না।
               </p>
            </div>
            <button
               onClick={() => {
                 setShowAiScanner(true);
                 setScannedBookDetails(null);
                 startCamera();
               }}
               className="bg-white text-indigo-600 px-8 py-3.5 rounded-2xl font-black font-bengali shadow-lg hover:bg-slate-50 transition-all hover:scale-105 active:scale-95 whitespace-nowrap flex items-center gap-2"
            >
               Gemini স্ক্যানার চালু করুন
            </button>
         </div>
      </div>

      <AnimatePresence>
         {showAiScanner && (
           <motion.div 
             initial={{ opacity: 0 }} 
             animate={{ opacity: 1 }} 
             exit={{ opacity: 0 }}
             className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4"
           >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }} 
                animate={{ scale: 1, opacity: 1 }} 
                exit={{ scale: 0.95, opacity: 0 }}
                className="bg-white rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              >
                 <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-20">
                    <h3 className="text-xl font-black font-bengali text-slate-800 flex items-center gap-2">
                       <ScanFace className="text-indigo-600 w-6 h-6" /> 
                       {scannedBookDetails ? 'স্ক্যানকৃত তথ্য নিশ্চিত করুন' : 'Gemini দিয়ে বই এন্ট্রি'}
                    </h3>
                    <button 
                       onClick={() => {
                         stopCamera();
                         setShowAiScanner(false);
                         setIsAiProcessing(false);
                       }}
                       className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
                    >
                       <X className="w-5 h-5" />
                    </button>
                 </div>

                 <div className="p-6 overflow-y-auto font-bengali bg-slate-50 relative flex-1">
                    {!scannedBookDetails ? (
                       <div className="flex flex-col items-center">
                          <div className="w-full aspect-[3/4] bg-black rounded-2xl overflow-hidden relative border-4 border-slate-200">
                            <video 
                              ref={videoRef} 
                              autoPlay 
                              playsInline 
                              muted 
                              className="w-full h-full object-cover"
                            />
                            {isAiProcessing && (
                               <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                                 <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                                 <span className="font-bold text-sm tracking-widest animate-pulse">তথ্য প্রসেস করা হচ্ছে...</span>
                               </div>
                            )}
                            {/* Scanning Guide Overlay */}
                            {!isAiProcessing && (
                               <div className="absolute inset-0 pointer-events-none">
                                 <div className="w-full h-full border-[10px] border-slate-900/30 rounded-2xl"></div>
                                 <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-1/2 border-2 text-white/50 border-dashed border-white/50 rounded-xl flex items-center justify-center p-4">
                                     <span className="text-center text-sm font-bold">এখানে বইয়ের কাভার ঠিকমতো ধরুন</span>
                                 </div>
                               </div>
                            )}
                          </div>
                          
                          <canvas ref={canvasRef} className="hidden" />

                          <button
                             onClick={captureAndAnalyze}
                             disabled={isAiProcessing || !stream}
                             className="mt-6 bg-indigo-600 hover:bg-indigo-700 text-white w-full py-4 rounded-2xl font-black shadow-lg shadow-indigo-600/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                          >
                             <CameraIcon className="w-5 h-5" /> ছবি তুলুন ও তথ্য বের করুন
                          </button>
                       </div>
                    ) : (
                       <form onSubmit={saveAiBook} className="space-y-4">
                          <div className="flex justify-center mb-6">
                            <img src={scannedBookDetails.cover} alt="Cover" className="w-32 rounded-xl shadow-md border-2 border-slate-200" />
                          </div>

                          <div className="space-y-3">
                             <div>
                               <label className="text-xs font-bold text-slate-500 uppercase">বইয়ের নাম</label>
                               <input type="text" value={scannedBookDetails.title} onChange={e=>setScannedBookDetails({...scannedBookDetails, title: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold" required />
                             </div>
                             <div>
                               <label className="text-xs font-bold text-slate-500 uppercase">লেখকের নাম</label>
                               <input type="text" value={scannedBookDetails.author} onChange={e=>setScannedBookDetails({...scannedBookDetails, author: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold" required />
                             </div>
                             <div className="grid grid-cols-2 gap-3">
                               <div>
                                 <label className="text-xs font-bold text-slate-500 uppercase">ক্যাটাগরি</label>
                                 <input type="text" value={scannedBookDetails.category} onChange={e=>setScannedBookDetails({...scannedBookDetails, category: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                               </div>
                               <div>
                                 <label className="text-xs font-bold text-slate-500 uppercase">বইয়ের কোড</label>
                                 <input type="text" value={scannedBookDetails.bookCode} onChange={e=>setScannedBookDetails({...scannedBookDetails, bookCode: e.target.value})} className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                               </div>
                             </div>
                             <div>
                               <label className="text-xs font-bold text-slate-500 uppercase">শেল্ফ নং</label>
                               <input type="text" value={scannedBookDetails.shelfNo} onChange={e=>setScannedBookDetails({...scannedBookDetails, shelfNo: e.target.value})} placeholder="A1, B2" className="w-full p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold" />
                             </div>
                          </div>

                          <div className="pt-4 flex gap-3 sticky bottom-0 bg-slate-50">
                             <button type="button" onClick={() => { setScannedBookDetails(null); startCamera(); }} className="flex-1 px-4 py-3 bg-white border-2 border-slate-200 text-slate-600 rounded-xl font-bold">
                               পুনরায় ছবি তুলুন
                             </button>
                             <button type="submit" className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl font-bold shadow-lg shadow-emerald-500/20">
                               সেভ করুন
                             </button>
                          </div>
                       </form>
                    )}
                 </div>
              </motion.div>
           </motion.div>
         )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
         <Link to="/dashboard/events" className="group p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:-translate-y-1 transition-transform">
               <CalendarHeart size={28} />
            </div>
            <h3 className="text-xl font-bold font-bengali text-slate-800 mb-2">ইভেন্ট তৈরি ও পরিচালনা</h3>
            <p className="text-sm font-bengali text-slate-500">নতুন ইভেন্ট তৈরি করুন, আপডেট বা মুছে ফেলুন।</p>
         </Link>

         <Link to="/dashboard/manageblog" className="group p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-6 group-hover:-translate-y-1 transition-transform">
               <FileText size={28} />
            </div>
            <h3 className="text-xl font-bold font-bengali text-slate-800 mb-2">বুক রিভিও ও ব্লগ</h3>
            <p className="text-sm font-bengali text-slate-500">সদস্যদের ব্লগ এবং বুক রিভিও পরিচালনা করুন।</p>
         </Link>

         <Link to="/dashboard/manageteam" className="group p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-rose-200 transition-all">
            <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center mb-6 group-hover:-translate-y-1 transition-transform">
               <Users size={28} />
            </div>
            <h3 className="text-xl font-bold font-bengali text-slate-800 mb-2">পরিচালনা পর্ষদ</h3>
            <p className="text-sm font-bengali text-slate-500">টিম মেম্বার এবং কার্যকরী পরিষদ পরিচালনা করুন।</p>
         </Link>

         <Link to="/dashboard/constitution" className="group p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-amber-200 transition-all">
            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-6 group-hover:-translate-y-1 transition-transform">
               <FileText size={28} />
            </div>
            <h3 className="text-xl font-bold font-bengali text-slate-800 mb-2">গঠনতন্ত্র সেটিংস</h3>
            <p className="text-sm font-bengali text-slate-500">পাঠাগারের গঠনতন্ত্র এবং নীতিসমূহ আপডেট করুন।</p>
         </Link>

         <Link to="/dashboard/notices" className="group p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:-translate-y-1 transition-transform">
               <Bell size={28} />
            </div>
            <h3 className="text-xl font-bold font-bengali text-slate-800 mb-2">নোটিশ বোর্ড</h3>
            <p className="text-sm font-bengali text-slate-500">সকল প্রকার নোটিশ আপডেট এবং পরিচালনা করুন।</p>
         </Link>

         <Link to="/dashboard/messages" className="group p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-cyan-200 transition-all">
            <div className="w-14 h-14 bg-cyan-50 text-cyan-600 rounded-xl flex items-center justify-center mb-6 group-hover:-translate-y-1 transition-transform">
               <MessageSquare size={28} />
            </div>
            <h3 className="text-xl font-bold font-bengali text-slate-800 mb-2">মেসেজসমূহ</h3>
            <p className="text-sm font-bengali text-slate-500">ইউজারদের মেসেজ এবং টেক্সট দেখুন।</p>
         </Link>

         <Link to="/dashboard/reset-requests" className="group p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-purple-200 transition-all">
            <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-6 group-hover:-translate-y-1 transition-transform">
               <ShieldAlert size={28} />
            </div>
            <h3 className="text-xl font-bold font-bengali text-slate-800 mb-2">রিসেট রিকোয়েস্ট</h3>
            <p className="text-sm font-bengali text-slate-500">পাসওয়ার্ড এবং ইনফরমেশন রিসেট রিকোয়েস্ট ম্যানেজ করুন।</p>
         </Link>

         <Link to="/dashboard/book-requests" className="group p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-blue-200 transition-all">
            <div className="w-14 h-14 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mb-6 group-hover:-translate-y-1 transition-transform">
               <FileText size={28} />
            </div>
            <h3 className="text-xl font-bold font-bengali text-slate-800 mb-2">বইয়ের অনুরোধ রিকোয়েস্ট</h3>
            <p className="text-sm font-bengali text-slate-500">ইউজারদের নতুন বইয়ের অনুরোধগুলো দেখুন।</p>
         </Link>

         <Link to="/dashboard/pre-bookings" className="group p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-amber-200 transition-all">
            <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center mb-6 group-hover:-translate-y-1 transition-transform">
               <Clock size={28} />
            </div>
            <h3 className="text-xl font-bold font-bengali text-slate-800 mb-2">প্রি-বুকিং ব্যবস্থাপনা</h3>
            <p className="text-sm font-bengali text-slate-500">বইয়ের প্রি-বুকিং তালিকা এবং স্ট্যাটাস দেখুন।</p>
         </Link>

         <Link to="/dashboard/manage-shelves" className="group p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-indigo-200 transition-all">
            <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center mb-6 group-hover:-translate-y-1 transition-transform">
               <LayoutGrid size={28} />
            </div>
            <h3 className="text-xl font-bold font-bengali text-slate-800 mb-2">শেল্ফ ব্যবস্থাপনা</h3>
            <p className="text-sm font-bengali text-slate-500">বই সিলেক্ট করে ম্যানুয়ালি শেল্ফে অর্গানাইজ করুন।</p>
         </Link>

         <Link to="/dashboard/manage-categories" className="group p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-emerald-200 transition-all">
            <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center mb-6 group-hover:-translate-y-1 transition-transform">
               <Tags size={28} />
            </div>
            <h3 className="text-xl font-bold font-bengali text-slate-800 mb-2">ক্যাটাগরি ব্যবস্থাপনা</h3>
            <p className="text-sm font-bengali text-slate-500">একসাথে অনেকগুলো বইয়ের ক্যাটাগরি আপডেট করুন।</p>
         </Link>

         <Link to="/dashboard/delete-users" className="group p-6 bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-xl hover:border-red-200 transition-all">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-xl flex items-center justify-center mb-6 group-hover:-translate-y-1 transition-transform">
               <UserX size={28} />
            </div>
            <h3 className="text-xl font-bold font-bengali text-slate-800 mb-2">সদস্য ডিলিট করুন</h3>
            <p className="text-sm font-bengali text-slate-500">ওয়েবসাইট থেকে যেকোনো সদস্য রিমুভ বা ডিলিট করুন।</p>
         </Link>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 overflow-hidden relative mb-8">
         <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] -mr-32 -mt-32"></div>
         
         <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100 flex-shrink-0">
                  <MessageSquare size={24} />
               </div>
               <div>
                  <h2 className="text-xl font-black font-bengali text-slate-800">স্বাগতম বার্তা (Greeting Banner)</h2>
                  <p className="text-slate-500 font-bengali text-sm mt-1">ড্যাশবোর্ডের স্বাগতম বার্তা কাস্টমাইজ করুন।</p>
               </div>
            </div>
            
            <label className="flex items-center cursor-pointer justify-between bg-slate-50 md:bg-transparent p-3 md:p-0 rounded-xl border border-slate-100 md:border-transparent">
               <span className="md:hidden font-bengali text-slate-700 font-bold">স্টেটাস:</span>
               <div className="flex items-center">
                  <div className="relative">
                     <input 
                        type="checkbox" 
                        className="sr-only" 
                        checked={customGreetingEnabled}
                        onChange={(e) => setCustomGreetingEnabled(e.target.checked)}
                     />
                     <div className={`block w-14 h-8 rounded-full transition-colors ${customGreetingEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                     <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${customGreetingEnabled ? 'transform translate-x-6' : ''}`}></div>
                  </div>
                  <span className="ml-3 font-bengali text-slate-700 font-bold">{customGreetingEnabled ? 'নতুন মডেল' : 'ডিফল্ট মডেল'}</span>
               </div>
            </label>
         </div>

         <AnimatePresence>
            {customGreetingEnabled && (
               <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="relative z-10 space-y-4 overflow-hidden"
               >
                  <div>
                     <label className="block text-sm font-bold text-slate-700 font-bengali mb-1">
                        ব্যানার টাইটেল (Title)
                        <span className="text-emerald-600 font-normal ml-2 text-xs">ব্যাবহারকারীর নামের জন্য [user] লিখুন</span>
                     </label>
                     <input
                        type="text"
                        placeholder="যেমন: আসসালামু আলাইকুম [user]"
                        value={customGreetingTitle}
                        onChange={(e) => setCustomGreetingTitle(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white transition-colors focus:ring-2 focus:ring-emerald-500 outline-none font-bengali"
                     />
                  </div>
                  <div>
                     <label className="block text-sm font-bold text-slate-700 font-bengali mb-1">ব্যানার সাবটাইটেল (Subtitle)</label>
                     <textarea
                        placeholder="বার্তা বা ইভেন্টের তথ্য লিখুন..."
                        value={customGreetingSubtitle}
                        onChange={(e) => setCustomGreetingSubtitle(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white transition-colors focus:ring-2 focus:ring-emerald-500 outline-none font-bengali h-24 resize-none"
                     ></textarea>
                  </div>
               </motion.div>
            )}
         </AnimatePresence>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 overflow-hidden relative mb-8">
         <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-[80px] -mr-32 -mt-32"></div>
         
         <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6 mb-6">
            <div className="flex items-center gap-4">
               <div className="w-12 h-12 bg-amber-50 text-amber-500 rounded-xl flex items-center justify-center border border-amber-100 flex-shrink-0">
                  <span className="text-2xl">🎉</span>
               </div>
               <div>
                  <h2 className="text-xl font-black font-bengali text-slate-800">উদ্বোধন মোড (Launch Overlay)</h2>
                  <p className="text-slate-500 font-bengali text-sm mt-1">ব্যবহারকারী প্রথমবার সাইটে ঢুকলে একটি সুন্দর স্ক্রিন শো করবে।</p>
               </div>
            </div>
            
            <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between bg-slate-50 md:bg-transparent p-3 md:p-0 rounded-xl border border-slate-100 md:border-transparent">
               <label className="flex items-center cursor-pointer justify-between w-full md:w-auto">
                  <span className="md:hidden font-bengali text-slate-700 font-bold">স্টেটাস:</span>
                  <div className="flex items-center">
                     <div className="relative">
                        <input 
                           type="checkbox" 
                           className="sr-only" 
                           checked={inaugurationEnabled}
                           onChange={(e) => setInaugurationEnabled(e.target.checked)}
                        />
                        <div className={`block w-14 h-8 rounded-full transition-colors ${inaugurationEnabled ? 'bg-amber-500' : 'bg-slate-300'}`}></div>
                        <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${inaugurationEnabled ? 'transform translate-x-6' : ''}`}></div>
                     </div>
                     <span className="ml-3 font-bengali text-slate-700 font-bold">{inaugurationEnabled ? 'চালু আছে' : 'বন্ধ আছে'}</span>
                  </div>
               </label>

               {inaugurationEnabled && (
                  <button 
                     onClick={() => {
                        sessionStorage.removeItem('inauguration_seen');
                        window.location.reload();
                     }}
                     className="px-4 py-2 bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors font-bengali font-bold rounded-xl text-sm w-full md:w-auto text-center"
                  >
                     পুনরায় টেস্ট করুন
                  </button>
               )}
            </div>
         </div>

         <AnimatePresence>
            {inaugurationEnabled && (
               <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="relative z-10 space-y-4 overflow-hidden"
               >
                  <div>
                     <label className="block text-sm font-bold text-slate-700 font-bengali mb-1">উদ্বোধন টাইটেল</label>
                     <input
                        type="text"
                        placeholder="যেমন: পানধোয়া উন্মুক্ত পাঠাগার"
                        value={inaugurationTitle}
                        onChange={(e) => setInaugurationTitle(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white transition-colors focus:ring-2 focus:ring-amber-500 outline-none font-bengali"
                     />
                  </div>
                  <div>
                     <label className="block text-sm font-bold text-slate-700 font-bengali mb-1">উদ্বোধন সাবটাইটেল</label>
                     <input
                        type="text"
                        placeholder="যেমন: শুভ উদ্বোধন"
                        value={inaugurationSubtitle}
                        onChange={(e) => setInaugurationSubtitle(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white transition-colors focus:ring-2 focus:ring-amber-500 outline-none font-bengali"
                     />
                  </div>
                  <div>
                     <label className="block text-sm font-bold text-slate-700 font-bengali mb-1">স্বাগত বার্তা / বিবরণ</label>
                     <textarea
                        placeholder="অতিথিদের জন্য স্বাগত বার্তা..."
                        value={inaugurationMessage}
                        onChange={(e) => setInaugurationMessage(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white transition-colors focus:ring-2 focus:ring-amber-500 outline-none font-bengali h-24 resize-none"
                     ></textarea>
                  </div>
                  <div>
                     <label className="block text-sm font-bold text-slate-700 font-bengali mb-1">বাটনের টেক্সট</label>
                     <input
                        type="text"
                        placeholder="যেমন: অটোমেশন উদ্বোধন"
                        value={inaugurationButtonText}
                        onChange={(e) => setInaugurationButtonText(e.target.value)}
                        className="w-full border border-slate-200 rounded-xl p-3 bg-slate-50 focus:bg-white transition-colors focus:ring-2 focus:ring-amber-500 outline-none font-bengali"
                     />
                  </div>
                  <div>
                     <label className="block text-sm font-bold text-slate-700 font-bengali mb-1">যাদেরকে মেসেজ পাঠানো হবে (ফাঁকা রাখলে সবার কাছে যাবে)</label>
                     <Select 
                        isMulti 
                        options={allUsersList} 
                        value={allUsersList.filter(u => inaugurationTargetUsers.includes(u.value))}
                        onChange={(selected: any) => setInaugurationTargetUsers(selected ? selected.map((s: any) => s.value) : [])}
                        placeholder="ইউজার সিলেক্ট করুন..."
                        className="font-bengali text-sm"
                        styles={{ control: (base) => ({ ...base, borderRadius: '0.75rem', padding: '0.2rem', borderColor: '#e2e8f0' }) }}
                     />
                  </div>
               </motion.div>
            )}
         </AnimatePresence>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-8 overflow-hidden relative">
         <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] -mr-32 -mt-32"></div>
         
         <div className="relative z-10 flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100">
               <ImageIcon size={24} />
            </div>
            <div>
               <h2 className="text-2xl font-black font-bengali text-slate-800">হোম পেইজ ব্যানার / ইভেন্ট ফটো কার্ড</h2>
               <p className="text-slate-500 font-bengali text-sm mt-1">কার্ড আপলোড করুন। সাইজ: ২ এমবি এর নিচে। (প্রস্তাবিত সাইজ: ১৬:৯ অনুপাত বা ১২০০x৬৭৫ পিক্সেল)</p>
            </div>
         </div>

         <div className="grid md:grid-cols-2 gap-8 relative z-10">
            <div>
               <div className="border-2 border-dashed border-indigo-200 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-indigo-50/50 hover:bg-indigo-50 transition-colors">
                  <UploadCloud className="w-12 h-12 text-indigo-400 mb-4" />
                  <p className="font-bengali font-bold text-slate-700 mb-2">ছবি সিলেক্ট করুন</p>
                  <p className="text-xs text-slate-500 mb-6">(MAX: 2MB, Width/Height: 16:9 ratio)</p>
                  <label className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bengali font-black cursor-pointer hover:bg-indigo-700 transition shadow-lg shadow-indigo-200">
                     আপলোড করুন
                     <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
               </div>
               
               <button 
                  onClick={saveSettings} 
                  disabled={saving || loading}
                  className="mt-6 w-full py-4 rounded-xl font-bengali font-black text-white bg-slate-900 hover:bg-slate-800 transition shadow-xl shadow-slate-200 flex items-center justify-center gap-2 disabled:bg-slate-300"
               >
                  {saving ? 'সেভ করা হচ্ছে...' : 'সেটিং সেভ করুন'}
                  {!saving && <CheckCircle className="w-5 h-5" />}
               </button>
            </div>

            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 min-h-[250px]">
               {loading ? (
                  <div className="flex items-center justify-center h-full min-h-[200px]">
                     <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                  </div>
               ) : eventBanners.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                     {eventBanners.map((banner, idx) => (
                        <div key={idx} className="relative group">
                           <img src={banner} alt={`Banner ${idx + 1}`} className="w-full h-40 object-cover rounded-xl shadow-md bg-white border border-slate-200" />
                           <button 
                              onClick={() => removeBanner(idx)}
                              className="absolute top-2 right-2 bg-rose-500 text-white p-1.5 rounded-full shadow-lg opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity hover:bg-rose-600"
                              title="সরিয়ে ফেলুন"
                           >
                              <Trash2 className="w-4 h-4" />
                           </button>
                        </div>
                     ))}
                  </div>
               ) : (
                  <div className="flex items-center justify-center h-full min-h-[200px]">
                     <p className="font-bengali text-slate-400 font-bold">কোন ছবি সিলেক্ট করা হয়নি</p>
                  </div>
               )}
            </div>
         </div>
      </div>

      <div className="mt-8 bg-white rounded-3xl border border-slate-200 shadow-sm p-8 relative overflow-hidden">
         <div className="absolute top-0 left-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-[80px] -ml-32 -mt-32"></div>
         
         <div className="relative z-10 flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100">
               <Shield size={24} />
            </div>
            <div>
               <h2 className="text-2xl font-black font-bengali text-slate-800">সাব-অ্যাডমিন ওয়েব এক্সেস</h2>
               <p className="text-slate-500 font-bengali text-sm mt-1">কাস্টমাইজ করুন কোন কোন মেনু সাব-অ্যাডমিন ব্যবহার করতে পারবে।</p>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10 mb-8">
            {availableSubadminRoutes.map((route, idx) => (
                <label key={idx} className={`flex items-center gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${subadminAccess.includes(route.path) ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'}`}>
                   <input
                     type="checkbox"
                     checked={subadminAccess.includes(route.path)}
                     onChange={() => handleToggleAccess(route.path)}
                     className="w-5 h-5 text-emerald-600 border-slate-300 rounded focus:ring-emerald-500"
                   />
                   <span className="font-bold text-slate-700 font-bengali text-sm select-none">{route.name}</span>
                </label>
            ))}
         </div>

         <div className="relative z-10 mb-8 pt-8 border-t border-slate-200">
             <div className="flex items-center gap-4 mb-4">
                 <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100">
                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m12 14-8-4 8-4 8 4-8 4Z"/><path d="M4 14v4l8 4 8-4v-4"/></svg>
                 </div>
                 <div>
                    <h2 className="text-xl font-black font-bengali text-slate-800">Gemini AI সেটআপ</h2>
                    <p className="text-slate-500 font-bengali text-sm mt-1">ক্যামেরা দিয়ে বই বা টেক্সট স্ক্যান করার জন্য API কী দিন।</p>
                 </div>
             </div>
             <div>
                <input
                   type="password"
                   placeholder="Gemini API Key (AI Studio)"
                   value={aiToken}
                   onChange={e => setAiToken(e.target.value)}
                   className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-mono"
                />
                <p className="text-xs text-slate-400 mt-2">
                   আপনার যদি নিজস্ব কী না থাকে, তবে এই ঘর ফাঁকা রাখতে পারেন (লুকানো ডিফল্ট কী ব্যবহার হবে)।
                </p>
             </div>
         </div>

         <div className="relative z-10 mb-8 pt-8 border-t border-slate-200">
             <div className="flex items-center gap-4 mb-4">
                 <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100">
                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                 </div>
                 <div>
                    <h2 className="text-xl font-black font-bengali text-slate-800">SMS Gateway সেটআপ</h2>
                    <p className="text-slate-500 font-bengali text-sm mt-1">BulkSMSBD API Key এবং Sender ID দিন।</p>
                 </div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <input
                     type="password"
                     placeholder="SMS API Key"
                     value={smsToken}
                     onChange={e => setSmsToken(e.target.value)}
                     className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-mono"
                  />
                </div>
                <div>
                  <input
                     type="text"
                     placeholder="Sender ID (e.g. 8809617...)"
                     value={smsSenderId}
                     onChange={e => setSmsSenderId(e.target.value)}
                     className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-mono"
                  />
                </div>
             </div>
             <p className="text-xs text-slate-400 mt-2">
                এই ঘরগুলো ফাঁকা রাখলে ডিফল্ট API কী ব্যবহার হবে, যা কাজ নাও করতে পারে।
             </p>
         </div>

         <div className="relative z-10 mb-8 pt-8 border-t border-slate-200">
             <div className="flex items-center gap-4 mb-4">
                 <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-xl flex items-center justify-center border border-rose-100">
                     <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                 </div>
                 <div>
                    <h2 className="text-xl font-black font-bengali text-slate-800">Voice Call API সেটআপ</h2>
                    <p className="text-slate-500 font-bengali text-sm mt-1">অটোমেটিক কল দেয়ার জন্য API Key এবং Caller Number দিন।</p>
                 </div>
             </div>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <input
                   type="password"
                   placeholder="Voice Call API Key"
                   value={callToken}
                   onChange={e => setCallToken(e.target.value)}
                   className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-sm font-mono"
                />
                <input
                   type="text"
                   placeholder="Caller Number (Optional)"
                   value={callSenderId}
                   onChange={e => setCallSenderId(e.target.value)}
                   className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-rose-500 outline-none text-sm font-mono"
                />
             </div>
             <p className="text-xs text-slate-400 mt-2">
                সদস্যদের বই ফেরতের অটোমেটিক কল রিমাইন্ডার দেয়ার জন্য এটি ব্যবহৃত হবে। API Key না দিলে এটি কাজ করবে না।
             </p>
         </div>
         
         <div className="relative z-10 mb-8 pt-8 border-t border-slate-200">
             <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
                 <div className="flex items-center gap-4">
                     <div className="w-12 h-12 bg-white text-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                         <Package className="w-6 h-6" />
                     </div>
                     <div>
                        <h2 className="text-xl font-black font-bengali text-slate-800">বইয়ের স্টক ব্যবস্থাপনা</h2>
                        <p className="text-indigo-600/70 font-bengali text-sm mt-1">লাইব্রেরির বইয়ের বার্ষিক স্টক স্ট্যাটাস চেক করুন।</p>
                     </div>
                 </div>
                 <Link 
                   to="/dashboard/stock-take"
                   className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-2xl font-bold font-bengali transition active:scale-95 shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                 >
                   ম্যানেজ স্টক পেইজ এ যান
                   <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                 </Link>
             </div>
         </div>

         <div className="relative z-10 flex justify-end">
             <button 
                onClick={saveSettings} 
                disabled={saving || loading}
                className="py-3 px-8 rounded-xl font-bengali font-black text-white bg-slate-900 hover:bg-slate-800 transition shadow-xl flex items-center justify-center gap-2 disabled:bg-slate-300"
             >
                {saving ? 'সেভ করা হচ্ছে...' : 'সেটিং সেভ করুন'}
                {!saving && <CheckCircle className="w-5 h-5" />}
             </button>
         </div>
      </div>

      {/* Custom SMS Sending Section */}
      <div className="mt-8 bg-white rounded-3xl border border-slate-200 shadow-sm p-8 relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 rounded-full blur-[80px] -mr-32 -mt-32"></div>
         
         <div className="relative z-10 flex items-center gap-4 mb-6">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100 shadow-sm">
               <Send size={24} />
            </div>
            <div>
               <h2 className="text-2xl font-black font-bengali text-slate-800">কাস্টম এসএমএস (Custom SMS)</h2>
               <p className="text-slate-500 font-bengali text-sm mt-1">সব ইউজার বা নির্দিষ্ট ইউজারদের সিলেক্ট করে আপনার ইচ্ছামতো এসএমএস পাঠান।</p>
            </div>
         </div>

         <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            <div className="space-y-4">
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest font-bengali mb-1.5 block">প্রাপক নির্বাচন করুন</label>
                <div className="flex bg-slate-50 border border-slate-200 rounded-xl p-1 w-fit mb-3">
                    <button 
                       type="button"
                       onClick={() => setCustomSmsTargetType('specific')}
                       className={`px-4 py-2 rounded-lg text-sm font-bold font-bengali transition-colors ${customSmsTargetType === 'specific' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
                    >
                       নির্দিষ্ট সদস্য
                    </button>
                    <button 
                       type="button"
                       onClick={() => setCustomSmsTargetType('all')}
                       className={`px-4 py-2 rounded-lg text-sm font-bold font-bengali transition-colors ${customSmsTargetType === 'all' ? 'bg-white shadow text-indigo-600' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'}`}
                    >
                       সবাইকে পাঠান
                    </button>
                </div>
              </div>

              <AnimatePresence>
                {customSmsTargetType === 'specific' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <Select
                       isMulti
                       options={allUsersList.filter(u => u.phone)}
                       value={allUsersList.filter(u => customSmsTargetUsers.includes(u.value))}
                       onChange={(selected: any) => setCustomSmsTargetUsers(selected ? selected.map((s: any) => s.value) : [])}
                       placeholder="সদস্য খুঁজুন এবং সিলেক্ট করুন..."
                       className="font-bengali text-sm"
                       classNames={{
                          control: () => '!bg-white !border-slate-200 !rounded-xl !p-1 !shadow-sm hover:!border-indigo-300',
                          multiValue: () => '!bg-indigo-50 !rounded-lg',
                          multiValueLabel: () => '!text-indigo-700 !font-bold',
                          multiValueRemove: () => '!text-indigo-400 hover:!text-rose-500 hover:!bg-rose-50 rounded-r-lg',
                          menu: () => '!rounded-xl !shadow-lg border border-slate-100',
                          option: (state) => `${state.isFocused ? '!bg-indigo-50 !text-indigo-700' : '!text-slate-600'} !font-medium`
                       }}
                    />
                    <p className="text-[10px] text-slate-400 mt-2">* শুধুমাত্র যাদের মোবাইল নম্বর যুক্ত আছে তাদের দেখানো হচ্ছে।</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest font-bengali mb-1.5 block">এসএমএস মেসেজ</label>
                <textarea
                  value={customSmsMessage}
                  onChange={e => setCustomSmsMessage(e.target.value)}
                  placeholder="আপনার মেসেজ এখানে লিখুন..."
                  className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl focus:ring-2 focus:ring-indigo-500/50 outline-none font-medium font-bengali text-sm h-32 resize-none"
                />
              </div>

              <div className="flex justify-end">
                <button
                  onClick={handleCustomSmsSend}
                  disabled={customSmsSending || !customSmsMessage.trim()}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold font-bengali transition active:scale-95 shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {customSmsSending ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      পাঠানো হচ্ছে...
                    </>
                  ) : (
                    <>
                      <Send size={18} />
                      এসএমএস পাঠান
                    </>
                  )}
                </button>
              </div>
            </div>
         </div>
      </div>

      {/* PDF Export Section */}
      <div className="mt-8 bg-white rounded-3xl border border-slate-200 shadow-sm p-8 relative overflow-hidden">
         <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-[80px] -mr-32 -mt-32"></div>
         
         <div className="relative z-10 flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center border border-amber-100 shadow-sm">
               <FileText size={24} />
            </div>
            <div>
               <h2 className="text-2xl font-black font-bengali text-slate-800">বইয়ের তালিকা পিডিএফ (PDF) ডাউনলোড</h2>
               <p className="text-slate-500 font-bengali text-sm mt-1">ক্যাটাগরি অনুযায়ী বা সব বইয়ের তালিকা পিডিএফ ফাইল হিসেবে সেভ করুন।</p>
            </div>
         </div>

         <div className="relative z-10 space-y-6">
            {/* All Books Export */}
            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-indigo-600 text-white rounded-lg flex items-center justify-center shadow-md">
                     <LayoutGrid size={20} />
                  </div>
                  <div>
                     <h3 className="font-black font-bengali text-slate-800">সকল বইয়ের তালিকা</h3>
                     <p className="text-xs text-slate-500 font-bengali">পাঠাগারের সকল বই একসাথ পিডিএফ ফরম্যাটে ডাউনলোড করুন।</p>
                  </div>
               </div>
               <button 
                  onClick={() => downloadBookListPDF('all')}
                  disabled={exportingPdf !== null}
                  className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-black font-bengali flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 transition active:scale-95 disabled:opacity-50"
               >
                  {exportingPdf === 'all' ? (
                     <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                     <Download size={18} />
                  )}
                  ডাউনলোড করুন
               </button>
            </div>

            {/* Categories Export Grid */}
            <div>
               <h4 className="font-black font-bengali text-slate-700 mb-4 flex items-center gap-2">
                  <Tags size={18} className="text-amber-500" />
                  ক্যাটাগরি ভিত্তিক ডাউনলোড
               </h4>
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categories.length > 0 ? categories.map((cat, idx) => (
                     <div key={idx} className="p-4 bg-white border border-slate-200 rounded-2xl hover:border-amber-200 hover:shadow-md transition-all flex items-center justify-between gap-3">
                        <div className="overflow-hidden">
                           <p className="font-bold font-bengali text-slate-800 text-sm truncate" title={cat}>{cat}</p>
                        </div>
                        <button 
                          onClick={() => downloadBookListPDF(cat)}
                          disabled={exportingPdf !== null}
                          className="p-2 bg-amber-50 text-amber-600 hover:bg-amber-600 hover:text-white rounded-lg transition-colors flex-shrink-0"
                          title="ডাউনলোড পিডিএফ"
                        >
                           {exportingPdf === cat ? (
                              <div className="w-4 h-4 border-2 border-amber-600 border-t-transparent rounded-full animate-spin"></div>
                           ) : (
                              <Download size={16} />
                           )}
                        </button>
                     </div>
                  )) : (
                     <div className="col-span-full py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <p className="text-slate-400 font-bengali text-sm italic">কোনো ক্যাটাগরি পাওয়া যায়নি</p>
                     </div>
                  )}
               </div>
            </div>
         </div>
      </div>
    </div>
  );
}

