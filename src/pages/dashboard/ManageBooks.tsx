import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useAuth } from '../../store/AuthContext';
import { Search, Plus, Edit2, Trash2, BookOpen, ShieldAlert, Download, X, ScanLine, Camera } from 'lucide-react';
import { onSnapshot, collection, doc, setDoc, deleteDoc, updateDoc, addDoc, query, where, getDocs, serverTimestamp, writeBatch } from 'firebase/firestore';
import { Html5Qrcode } from 'html5-qrcode';
import { db, auth } from '../../lib/firebase';
import { firebaseService } from '../../services/firebaseService';
import toast from 'react-hot-toast';
import Select from 'react-select';
import CreatableSelect from 'react-select/creatable';

export const reactSelectCustomStyles = {
  control: (base: any, state: any) => ({
    ...base,
    border: state.isFocused ? '2px solid #6366f1' : '1px solid #e2e8f0',
    borderRadius: '1rem', // rounded-2xl roughly
    padding: '0.4rem',
    boxShadow: 'none',
    backgroundColor: '#f8fafc',
    minHeight: '54px'
  }),
  option: (base: any, state: any) => ({
    ...base,
    backgroundColor: state.isSelected ? '#e0e7ff' : state.isFocused ? '#f1f5f9' : 'white',
    color: state.isSelected ? '#4f46e5' : '#334155',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontWeight: state.isSelected ? 'bold' : 'normal',
    padding: '0.75rem 1rem'
  }),
  menu: (base: any) => ({
    ...base,
    borderRadius: '1rem',
    overflow: 'hidden',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
    zIndex: 9999
  })
};

interface Book {
  id: string;
  title: string;
  author: string;
  category: string;
  status: string;
  cover: string;
  bookCode?: string;
  shelfNo?: string;
  price?: number;
  review?: string;
  description?: string;
}

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null, userId?: string | null, email?: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: userId || 'Not Authenticated',
      email: email || 'No Email',
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  
  if (operationType === OperationType.WRITE || operationType === OperationType.DELETE || operationType === OperationType.UPDATE) {
      toast.error(`অ্যাকশন ব্যর্থ হয়েছে: আপনার মেম্বারশিপ স্ট্যাটাস চেক করুন অথবা এডমিনের সাথে যোগাযোগ করুন। (Permission Error)`);
  }
}

// Helpers for cross language numbers
const engToBdNum = (str: string) => {
  const bdNumbers = { '0': '০', '1': '১', '2': '২', '3': '৩', '4': '৪', '5': '৫', '6': '৬', '7': '৭', '8': '৮', '9': '৯' };
  return str.replace(/[0-9]/g, (w) => (bdNumbers as any)[w] || w);
};
const bdToEngNum = (str: string) => {
  const engNumbers = { '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9' };
  return str.replace(/[০-৯]/g, (w) => (engNumbers as any)[w] || w);
};

export const BOOK_CATEGORIES = [
  "মুক্তিযুদ্ধ", "ইতিহাস", "উপন্যাস", "ছোটগল্প", "কবিতা", "প্রবন্ধ", "গবেষণা", 
  "জীবনী ও স্মৃতিচারণ", "সায়েন্স ফিকশন", "ধর্ম ও দর্শন", "ইসলামী বই", 
  "শিশু-কিশোর", "অনুবাদ সাহিত্য", "গোয়েন্দা, থ্রিলার ও অ্যাডভেঞ্চার", 
  "রহস্য ও ভৌতিক", "বিজ্ঞান ও প্রযুক্তি", "রাজনীতি", "অর্থনীতি", 
  "সমাজতত্ত্ব", "আইন ও বিচার", "স্বাস্থ্য ও চিকিৎসা", "কৃষি ও পরিবেশ", 
  "ভ্রমণ কাহিনী", "মোটিভেশন ও আত্মউন্নয়ন", "স্যাটায়ার ও রম্য", "রান্নাবান্না", 
  "নাটক", "ফিকশন", "একাডেমিক", "অভিধান ও রেফারেন্স", "ম্যাগাজিন ও সাময়িকী", "অন্যান্য"
];

const generateBookCode = (category: string) => {
  let prefix = 'B';
  if (category === 'মুক্তিযুদ্ধ') prefix = 'LIB';
  else if (category === 'ইতিহাস') prefix = 'HIS';
  else if (category === 'উপন্যাস') prefix = 'NOV';
  else if (category === 'ছোটগল্প') prefix = 'SST';
  else if (category === 'কবিতা') prefix = 'POE';
  else if (category === 'প্রবন্ধ') prefix = 'ESS';
  else if (category === 'গবেষণা') prefix = 'RES';
  else if (category === 'জীবনী ও স্মৃতিচারণ') prefix = 'BIO';
  else if (category === 'সায়েন্স ফিকশন') prefix = 'SCI';
  else if (category === 'ধর্ম ও দর্শন') prefix = 'REL';
  else if (category === 'ইসলামী বই') prefix = 'ISL';
  else if (category === 'শিশু-কিশোর') prefix = 'CHI';
  else if (category === 'অনুবাদ সাহিত্য') prefix = 'TRA';
  else if (category === 'গোয়েন্দা, থ্রিলার ও অ্যাডভেঞ্চার') prefix = 'THR';
  else if (category === 'রহস্য ও ভৌতিক') prefix = 'HOR';
  else if (category === 'বিজ্ঞান ও প্রযুক্তি') prefix = 'TEC';
  else if (category === 'রাজনীতি') prefix = 'POL';
  else if (category === 'অর্থনীতি') prefix = 'ECO';
  else if (category === 'সমাজতত্ত্ব') prefix = 'SOC';
  else if (category === 'আইন ও বিচার') prefix = 'LAW';
  else if (category === 'স্বাস্থ্য ও চিকিৎসা') prefix = 'HEA';
  else if (category === 'কৃষি ও পরিবেশ') prefix = 'AGR';
  else if (category === 'ভ্রমণ কাহিনী') prefix = 'TRV';
  else if (category === 'মোটিভেশন ও আত্মউন্নয়ন') prefix = 'MOT';
  else if (category === 'স্যাটায়ার ও রম্য') prefix = 'SAT';
  else if (category === 'রান্নাবান্না') prefix = 'COO';
  else if (category === 'নাটক') prefix = 'DRA';
  else if (category === 'ফিকশন') prefix = 'FIC';
  else if (category === 'একাডেমিক') prefix = 'ACA';
  else if (category === 'অভিধান ও রেফারেন্স') prefix = 'REF';
  else if (category === 'ম্যাগাজিন ও সাময়িকী') prefix = 'MAG';
  else prefix = 'GEN';
  
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${randomNum}`;
};

export default function ManageBooks() {
  const [books, setBooks] = useState<Book[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const { user, token } = useAuth();
  
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAiScanning, setIsAiScanning] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const fetchBookDetailsByISBN = async (isbn: string) => {
    try {
      toast.loading('বইয়ের তথ্য খোঁজা হচ্ছে...', { id: 'isbn-fetch' });
      
      let bookInfoRaw: any = null;
      let bookInfoString = "";
      let thumbnailUrl = "";
      
      try {
        const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}`);
        const data = await res.json();
        if (data.items && data.items.length > 0) {
          bookInfoRaw = data.items[0].volumeInfo;
          bookInfoString = JSON.stringify(bookInfoRaw);
          thumbnailUrl = bookInfoRaw.imageLinks?.thumbnail?.replace('http:', 'https:') || '';
        } else {
          // If ISBN query returned nothing, try a general query as it might be a partial code or alternative barcode
          const res2 = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${isbn}`);
          const data2 = await res2.json();
          if (data2.items && data2.items.length > 0) {
            bookInfoRaw = data2.items[0].volumeInfo;
            bookInfoString = JSON.stringify(bookInfoRaw);
            thumbnailUrl = bookInfoRaw.imageLinks?.thumbnail?.replace('http:', 'https:') || '';
          } else {
            bookInfoString = `No database info found for identifier: ${isbn}`;
          }
        }
      } catch (e) {
        bookInfoString = `Error fetching database info for ISBN: ${isbn}`;
      }

      let aiToken = '';
      try {
        const dbDoc = await import('firebase/firestore').then(mod => mod.getDoc(mod.doc(db, 'settings', 'general')));
        aiToken = dbDoc.exists() ? dbDoc.data().sysToken : '';
      } catch(e) {
        console.warn("Could not fetch general settings", e);
      }

      const sysInstruction = `You are a helpful AI assistant for a Bengali library. You are given an ISBN number and possibly some metadata fetched from a book database (which might be in English or incomplete). 

CRITICAL RULES:
1. Translate or transliterate EVERYTHING into proper Bengali (বাংলা) script. NEVER output English/Latin text for title, author, or description.
2. Return exactly and only a strict JSON object without markdown formatting using these exact keys: "title", "author", "category", "description".
3. The "category" MUST be one of: "শিশু-কিশোর", "ইসলামী বই", "গল্প", "ইতিহাস", "প্রবন্ধ", "কবিতা", "জীবনী ও স্মৃতিচারণ", "বিজ্ঞান", "উপন্যাস", "নাটক".
4. If "No database info found" is provided, DO NOT GUESS OR HALLUCINATE the book based on the ISBN number alone. You MUST output empty strings "" for all fields. 
5. Example JSON: {"title": "হিমু", "author": "হুমায়ূন আহমেদ", "category": "উপন্যাস", "description": "হিমু হুমায়ূন আহমেদের এক জনপ্রিয় চরিত্র।"}`;

      let parsed: any = {};
      
      try {
        const geminiRes = await fetch('/api/gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            apiKey: aiToken,
            model: "gemini-3-flash-preview",
            systemInstruction: sysInstruction,
            contents: [{
              role: "user",
              parts: [{ text: `ISBN: ${isbn}\n\nDatabase info:\n${bookInfoString}` }]
            }]
          })
        });

        if (geminiRes.ok) {
           const geminiData = await geminiRes.json();
           const text = geminiData.text;
           const cleanJson = text.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
           parsed = JSON.parse(cleanJson);
        } else {
           console.warn("AI API returned non-OK status");
        }
      } catch(aiErr) {
        console.warn("AI processing failed, using raw data", aiErr);
      }

      if (!parsed.title && !bookInfoRaw) {
        toast.error('এই বারকোডের তথ্য অনলাইনে পাওয়া যায়নি। দয়া করে ম্যানুয়ালি টাইপ করুন।', { id: 'isbn-fetch' });
        // Don't return, still set the barcode so user can save it
      } else if (!parsed.title && bookInfoRaw) {
         toast.success('তথ্য ইংরেজিতে পাওয়া গেছে, এডিটে দেখে নিন।', { id: 'isbn-fetch' });
      } else {
         toast.success('বইয়ের তথ্য স্বয়ংক্রিয়ভাবে বাংলায় সম্পূর্ণ হয়েছে!', { id: 'isbn-fetch' });
      }

      setFormData(prev => ({
        ...prev,
        title: parsed.title || prev.title || (bookInfoRaw ? bookInfoRaw.title : ''),
        author: parsed.author || prev.author || (bookInfoRaw?.authors ? bookInfoRaw.authors.join(', ') : ''),
        category: parsed.category || prev.category || (bookInfoRaw?.categories ? bookInfoRaw.categories[0] : ''),
        description: parsed.description || prev.description || (bookInfoRaw?.description || ''),
        cover: prev.cover || thumbnailUrl,
        barcode: isbn
      }));
      
    } catch (err) {
      console.error(err);
      toast.error('তথ্য সংগ্রহে সমস্যা হয়েছে।', { id: 'isbn-fetch' });
    }
  };

  const startAiCamera = async () => {
    setIsAiScanning(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error(err);
      toast.error('ক্যামেরা চালু করতে সমস্যা হয়েছে।');
      setIsAiScanning(false);
    }
  };

  const stopAiCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsAiScanning(false);
  };

  const captureAndProcessAI = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setIsAiProcessing(true);
    const toastId = toast.loading('AI বইয়ের কাভার এবং তথ্য বিশ্লেষণ করছে...', { style: { fontFamily: 'Hind Siliguri' } });

    try {
      const dbDoc = await import('firebase/firestore').then(mod => mod.getDoc(mod.doc(db, 'settings', 'general')));
      const aiToken = dbDoc.exists() ? dbDoc.data().sysToken : '';

      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      let width = video.videoWidth;
      let height = video.videoHeight;
      const MAX_WIDTH = 800;
      if (width > MAX_WIDTH) {
         height = Math.round((height * MAX_WIDTH) / width);
         width = MAX_WIDTH;
      }
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context not possible');
      
      ctx.drawImage(video, 0, 0, width, height);
      const base64Image = canvas.toDataURL('image/jpeg', 0.5);
      const base64Data = base64Image.split(',')[1];

      const sysInstruction = `You are a strict AI assistant for a Bengali library. Look at the book cover image provided and extract the book's information.

CRITICAL RULES:
1. Translate or transliterate EVERYTHING into proper Bengali (বাংলা) script. NEVER output English/Latin text in any field. Even if the book cover is in English, translate the title and author to Bengali letters!
2. Generate a brief 1-sentence descriptive summary about the book's contents in Bengali.
3. Category must strictly be one of: "শিশু-কিশোর", "ইসলামী বই", "গল্প", "ইতিহাস", "প্রবন্ধ", "কবিতা", "জীবনী ও স্মৃতিচারণ", "বিজ্ঞান", "উপন্যাস", "নাটক".
4. Return exactly and only a strict JSON object without markdown, using exactly these keys: "title", "author", "category", "description".
5. If you absolutely cannot identify the title, output an empty string "".

Example JSON: {"title": "হিমু", "author": "হুমায়ূন আহমেদ", "category": "উপন্যাস", "description": "হিমু হুমায়ূন আহমেদের এক জনপ্রিয় কাল্পনিক চরিত্র, যা হলুদ পাঞ্জাবি পরে এবং খালি পায়ে হাঁটে।"}`;

      const res = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: aiToken,
          model: "gemini-3-flash-preview",
          systemInstruction: sysInstruction,
          contents: [{
            role: "user",
            parts: [
              { text: "Extract the exact information from this cover image." },
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

      let text = data.text;
      const cleanJson = text.replace(/\`\`\`json/g, '').replace(/\`\`\`/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      
      if (!parsed.title) throw new Error('বইয়ের নাম পাওয়া যায়নি। আবার চেষ্টা করুন।');

      toast.success('সফলভাবে তথ্য পাওয়া গেছে!', { id: toastId });
      stopAiCamera();
      
      setFormData(prev => ({
         ...prev,
         title: prev.title || parsed.title || '',
         author: prev.author || parsed.author || '',
         category: prev.category || parsed.category || '',
         description: prev.description || parsed.description || '',
         cover: prev.cover || base64Image
      }));

    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Error processing image. Make sure image is clear.', { id: toastId });
    } finally {
      setIsAiProcessing(false);
    }
  };

  const [formData, setFormData] = useState<{ 
    title: string; 
    author: string; 
    category: string; 
    cover: string; 
    status: string; 
    bookCode: string; 
    shelfNo: string; 
    review: string; 
    description: string;
    barcode: string;
  }>({ 
    title: '', 
    author: '', 
    category: '', 
    cover: '', 
    status: 'Available', 
    bookCode: '',
    shelfNo: '',
    review: '',
    description: '',
    barcode: ''
  });
  const [coverInputType, setCoverInputType] = useState<'upload' | 'link'>('upload');

  useEffect(() => {
    const fetchBooks = async () => {
      try {
        const cached = sessionStorage.getItem('admin_books_cache');
        const cacheTime = sessionStorage.getItem('admin_books_cache_time');
        
        if (cached && cacheTime && (Date.now() - parseInt(cacheTime) < 1 * 60 * 1000)) {
          setBooks(JSON.parse(cached));
          return;
        }

        const snapshot = await getDocs(collection(db, 'books'));
        const booksData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Book[];
        setBooks(booksData);
        sessionStorage.setItem('admin_books_cache', JSON.stringify(booksData));
        sessionStorage.setItem('admin_books_cache_time', Date.now().toString());
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'books', user?.id, user?.email);
      }
    };
    fetchBooks();
  }, [user]);

  // Update session storage helper
  const updateCache = (newBooks: Book[]) => {
    sessionStorage.setItem('admin_books_cache', JSON.stringify(newBooks));
    sessionStorage.setItem('admin_books_cache_time', Date.now().toString());
    sessionStorage.removeItem('pub_books_cache'); // Also clear public cache
  };

  const handleDownloadPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const today = new Date().toLocaleDateString('bn-BD', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    const sortedBooks = [...books].sort((a, b) => (a.bookCode || '').localeCompare(b.bookCode || ''));

    const html = `
      <html>
        <head>
          <title>বই তালিকা রিপোর্ট</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Hind+Siliguri:wght@400;500;600;700&display=swap');
            body { 
              font-family: 'Hind Siliguri', sans-serif; 
              color: #1a1a1a;
              margin: 0;
              padding: 10mm;
              background-color: #fff;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
            }
            .header h1 {
              color: #000;
              margin: 0;
              font-size: 28px;
              font-weight: 800;
              letter-spacing: -0.5px;
            }
            .header .address {
              margin: 5px 0 0;
              font-size: 14px;
              font-weight: 600;
              color: #334155;
            }
            .report-title {
              text-align: center;
              margin: 15px 0;
              font-size: 20px;
              font-weight: 950;
              text-decoration: underline;
              text-underline-offset: 6px;
            }
            .meta {
              display: flex;
              justify-content: space-between;
              margin-bottom: 10px;
              font-size: 13px;
              font-weight: 700;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              table-layout: fixed;
            }
            th, td {
              padding: 6px 4px;
              text-align: center;
              border: 1px solid #000;
              line-height: normal; /* Fix for Bengali numeral 1 clipping */
              padding-top: 8px; /* Give a little extra room for ascenders */
              word-wrap: break-word;
              vertical-align: middle;
            }
            th {
              background-color: #e2e8f0;
              font-weight: 700;
              font-size: 11px;
              text-transform: uppercase;
            }
            td {
              font-size: 12px;
              font-weight: 500;
            }
            .sl-col { width: 35px; }
            .title-col { width: auto; text-align: left; padding-left: 6px; }
            .cat-col { width: 75px; }
            .author-col { width: 100px; text-align: left; padding-left: 6px; }
            .code-col { width: 100px; font-family: 'Outfit', sans-serif; }
            .shelf-col { width: 45px; font-family: 'Outfit', sans-serif; }
            
            .barcode-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              height: 25px;
            }
            .barcode-svg {
              width: 100%;
            }
            .code-text {
              font-size: 11px;
              font-weight: 900;
              letter-spacing: 0.5px;
            }

            @media print {
              .no-print { display: none; }
              body { padding: 0; }
              @page { margin: 10mm; }
            }
          </style>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        </head>
        <body>
          <div class="no-print" style="text-align: center; padding: 20px; background: #fff; border-bottom: 1px solid #e2e8f0; margin-bottom: 30px;">
            <button onclick="window.print()" style="font-family: 'Hind Siliguri', sans-serif; padding: 12px 35px; background: #4f46e5; color: #fff; border: none; font-size: 16px; font-weight: 700; cursor: pointer; border-radius: 12px; box-shadow: 0 4px 10px rgba(79, 70, 229, 0.4);">তালিকা প্রিন্ট করুন</button>
          </div>
          <div class="header">
            <h1>পানধোয়া উন্মুক্ত পাঠাগার</h1>
            <p class="address">পানধোয়া, সেনওয়ালিয়া-১৩৪৪, আশুলিয়া, সাভার, ঢাকা।</p>
          </div>
          <div class="report-title">লাইব্রেরি বই তালিকা রিপোর্ট</div>
          <div class="meta">
            <div>মোট বই: ${sortedBooks.length.toString().replace(/[0-9]/g, w => String.fromCharCode(w.charCodeAt(0) + 2486))} টি</div>
            <div>তারিখ: ${today}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th class="sl-col">ক্রমিক</th>
                <th class="title-col">বইয়ের নাম</th>
                <th class="cat-col">ক্যাটাগরি</th>
                <th class="author-col">লেখক</th>
                <th class="code-col">বই কোড</th>
                <th class="shelf-col">শেল্ফ নং</th>
              </tr>
            </thead>
            <tbody>
              ${sortedBooks.map((book, index) => `
                <tr>
                  <td class="text-center">${(index + 1).toString().replace(/[0-9]/g, w => String.fromCharCode(w.charCodeAt(0) + 2486))}</td>
                  <td class="title-col">${book.title}</td>
                  <td class="text-center cat-col">${book.category || '---'}</td>
                  <td class="author-col">${book.author}</td>
                  <td class="text-center code-col">
                    <div style="text-align: center; height: 35px; display: flex; justify-content: center; align-items: center; overflow: hidden;">
                      ${book.bookCode ? `
                        <img src="https://bwipjs-api.metafloor.com/?bcid=code128&text=${book.bookCode}&scale=2&height=7&includetext=true" alt="${book.bookCode}" style="max-height: 35px; max-width: 100%; object-fit: contain;" />
                      ` : '---'}
                    </div>
                  </td>
                  <td class="text-center shelf-col">${book.shelfNo || '---'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    
    try {
        if (!user) {
          throw new Error('User context missing. Are you logged in?');
        }

        const trimmedCode = (formData.bookCode || '').trim();
        if (trimmedCode) {
          const duplicate = books.find(b => b.id !== editingId && b.bookCode?.trim() === trimmedCode);
          if (duplicate) {
            toast.error('এই বইয়ের কোডটি ইতিপূর্বে ব্যবহার করা হয়েছে। দয়া করে ভিন্ন কোড ব্যবহার করুন।');
            setIsSubmitting(false);
            return;
          }
        }

        if (editingId) {
            await updateDoc(doc(db, 'books', editingId), {
              ...formData,
              updatedAt: serverTimestamp()
            });
            setShowModal(false);
            setBooks(prev => {
              const updated = prev.map(b => b.id === editingId ? { ...b, ...formData } : b);
              updateCache(updated);
              return updated;
            });
            setFormData({ title: '', author: '', category: '', cover: '', status: 'Available', bookCode: '', shelfNo: '', review: '', description: '', barcode: '' });
            setEditingId(null);
            toast.success('সফলভাবে বই আপডেট করা হয়েছে!');
        } else {
            const newDocRef = doc(collection(db, 'books'));
            const finalBookCode = formData.bookCode || generateBookCode(formData.category || '');
            const finalShelfNo = formData.shelfNo;
            
            await setDoc(newDocRef, { 
              ...formData, 
              bookCode: finalBookCode,
              shelfNo: finalShelfNo,
              id: newDocRef.id,
              createdAt: serverTimestamp()
            });
            setBooks(prev => {
              const updated = [...prev, { ...formData, bookCode: finalBookCode, shelfNo: finalShelfNo, id: newDocRef.id } as Book];
              updateCache(updated);
              return updated;
            });
            toast.success('সফলভাবে বই যুক্ত করা হয়েছে!');
            setFormData(prev => ({ 
              title: '', 
              author: '', 
              category: prev.category, 
              cover: '', 
              status: 'Available', 
              bookCode: generateBookCode(prev.category || ''), 
              shelfNo: finalShelfNo, 
              review: '', 
              description: '',
              barcode: ''
            }));
            // setShowModal(false); // Modal stays open for multiple additions as requested
        }
    } catch (error: any) {
        if (error.message?.includes('permission-denied') || error.code === 'permission-denied') {
            toast.error(`এক্সেস ডিনাইড: আপনার এডমিন পারমিশন নেই অথবা সেশন এক্সপায়ার হয়েছে। (Permission Denied)`);
        } else {
            toast.error(`সেভ করতে ব্যর্থ হয়েছে: ${error.message || 'Unknown error'}`);
        }
        handleFirestoreError(error, OperationType.WRITE, editingId ? `books/${editingId}` : 'books', user?.id, user?.email);
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleEdit = (book: Book) => {
    setFormData({
      title: book.title || '',
      author: book.author || '',
      category: book.category || '',
      cover: book.cover || '',
      status: book.status || 'Available',
      bookCode: book.bookCode || '',
      shelfNo: book.shelfNo || '',
      review: book.review || '',
      description: book.description || '',
      barcode: (book as any).barcode || ''
    });
    setEditingId(book.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (user?.role !== 'admin' && user?.email !== 'seneiaislam@gmail.com' && user?.username !== 'admin') {
      toast.error('Permission Denied: Only administrators can delete books.');
      return;
    }
    if (!confirm('Are you sure you want to delete this book?')) {
      return;
    }
    try {
        await deleteDoc(doc(db, 'books', id));
        setBooks(prev => {
          const updated = prev.filter(b => b.id !== id);
          updateCache(updated);
          return updated;
        });
        toast.success('সফলভাবে বয়ল ডিলিট করা হয়েছে!');
    } catch (error: any) {
        if (error.message?.includes('permission-denied') || error.message?.includes('Missing or insufficient permissions')) {
            toast.error('Delete failed: You do not have permission.');
        } else {
            toast.error(`Delete failed: ${error.message || 'Unknown error'}`);
        }
        handleFirestoreError(error, OperationType.DELETE, `books/${id}`, user?.id, user?.email);
    }
  };

  const [visibleCount, setVisibleCount] = useState(20);

  const filtered = books.filter(b => {
    const term = search.toLowerCase();
    const bdTerm = engToBdNum(term);
    const engTerm = bdToEngNum(term);
    const bookCode = (b.bookCode || '').toLowerCase();
    const searchMatch = bookCode.includes(term) || bookCode.includes(bdTerm) || bookCode.includes(engTerm) || b.title.toLowerCase().includes(term) || b.author.toLowerCase().includes(term);

    const categoryMatch = categoryFilter === '' || b.category === categoryFilter;

    // Status matching for dashboard filters "Issued", "Not Available"
    const isIssued = String(b.status).toLowerCase() === 'issued';
    const isNotAvailable = String(b.status).toLowerCase() === 'not_available' || String(b.status).toLowerCase() === 'not available';
    const isAvailable = String(b.status).toLowerCase() === 'available';

    let statusMatch = true;
    if (statusFilter === 'issued') statusMatch = isIssued;
    if (statusFilter === 'not available') statusMatch = isNotAvailable;
    
    return searchMatch && categoryMatch && statusMatch;
  });

  useEffect(() => {
    setVisibleCount(20);
  }, [search, categoryFilter, statusFilter]);

  const observerRef = useRef<IntersectionObserver | null>(null);
  const handleObserver = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        setVisibleCount((prev) => prev + 20);
      }
    }, { rootMargin: '400px' });
    if (node) observerRef.current.observe(node);
  }, []);

  const isActuallyAdmin = user?.role === 'admin' || user?.role === 'subadmin' || user?.role === 'visitor_admin' || user?.username === 'admin' || user?.email === 'seneiaislam@gmail.com' || user?.email === 'admin@library.com';
  const isAdminRole = user?.role === 'admin';

  const [userIssueCount, setUserIssueCount] = useState(0);
  const [userPastIssueCount, setUserPastIssueCount] = useState(0);

  useEffect(() => {
    if (user && !isActuallyAdmin) {
      const fetchUserIssues = async () => {
        try {
          const qCurrent = query(collection(db, 'issues'), where('userId', '==', user.id), where('status', 'in', ['Issued', 'ISSUED']));
          const snapCurrent = await getDocs(qCurrent);
          setUserIssueCount(snapCurrent.size);

          const qPast = query(collection(db, 'issues'), where('userId', '==', user.id), where('status', 'in', ['Returned', 'RETURNED']));
          const snapPast = await getDocs(qPast);
          setUserPastIssueCount(snapPast.size);
        } catch (error) {
          console.error(error);
        }
      };
      fetchUserIssues();
    }
  }, [user, isActuallyAdmin]);

  const [prebooking, setPrebooking] = useState<string | null>(null);
  const [requestedBooks, setRequestedBooks] = useState<string[]>([]);

  const handlePreBook = async (bookId: string) => {
    if (!user) {
      toast.error('বই রিকুয়েস্ট করতে দয়া করে লগইন করুন।');
      return;
    }

    if (user.status !== 'active') {
      toast.error('আপনার অ্যাকাউন্টটি এখনো সক্রিয় নয়। এডমিনের অনুমোদনের অপেক্ষা করুন।');
      return;
    }

    setPrebooking(bookId);
    try {
      await addDoc(collection(db, 'pre-bookings'), {
        bookId,
        userId: user.id,
        userName: user.name,
        date: serverTimestamp(),
        createdAt: serverTimestamp(),
        status: 'Pending'
      });
      toast.success('রিকুয়েষ্ট সম্পন্ন হয়েছে');
      setRequestedBooks(prev => [...prev, bookId]);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.CREATE, 'pre-bookings');
    } finally {
      setPrebooking(null);
    }
  };

  const [detailsModalBook, setDetailsModalBook] = useState<Book | null>(null);
  const [bookExpectedReturn, setBookExpectedReturn] = useState<string | null>(null);

  const handleBookClick = async (book: any) => {
    setDetailsModalBook(book);
    setBookExpectedReturn(null);
    if (String(book.status).toLowerCase() === 'issued') {
        if (book.expectedReturnDate) {
             setBookExpectedReturn(new Date(book.expectedReturnDate).toLocaleDateString('bn-BD', { month: 'short', day: 'numeric', year: 'numeric' }));
             return;
        }
        try {
            const q = query(collection(db, 'issues'), where('bookId', '==', book.id), where('status', 'in', ['Issued', 'ISSUED']));
            const snap = await getDocs(q);
            if (!snap.empty) {
                const issueData = snap.docs[0].data();
                if (issueData.expectedReturnDate) {
                    setBookExpectedReturn(new Date(issueData.expectedReturnDate).toLocaleDateString('bn-BD', { month: 'short', day: 'numeric', year: 'numeric' }));
                }
            }
        } catch (error) {
            console.error(error);
        }
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">

      {/* Header & Stats Bento */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 bg-slate-900 rounded-[2.5rem] p-8 sm:p-10 text-white relative overflow-hidden flex flex-col justify-between shadow-2xl">
          <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] -mr-32 -mt-32"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-500/10 rounded-full blur-[100px] -ml-32 -mb-32"></div>
          
          <div className="relative z-10 flex flex-col xl:flex-row xl:items-start justify-between gap-6">
            {isActuallyAdmin ? (
              <div>
                <h2 className="text-4xl font-black tracking-tighter mb-2 font-bengali">বই <span className="text-indigo-400">ব্যবস্থাপনা</span></h2>
                <p className="text-slate-400 font-bold font-bengali">লাইব্রেরির বইয়ের ক্যাটালগ পরিচালনা করুন।</p>
              </div>
            ) : (
              <div>
                <h2 className="text-4xl font-black tracking-tighter mb-2 font-bengali">বই <span className="text-indigo-400">তালিকা</span></h2>
                <p className="text-slate-400 font-bold font-bengali">লাইব্রেরির বইয়ের ক্যাটালগ দেখুন ও পড়ুন।</p>
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              {isActuallyAdmin && (
                <button
                  onClick={handleDownloadPDF}
                  className="bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-5 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 border border-white/20 transition-all active:scale-95 whitespace-nowrap min-w-[140px]"
                >
                  <Download className="w-5 h-5 text-indigo-300" />
                  তালিকা ডাউনলোড
                </button>
              )}
              {isActuallyAdmin && (
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => { setFormData({ title: '', author: '', category: '', cover: '', status: 'Available', bookCode: '', shelfNo: '', review: '', description: '', barcode: '' }); setEditingId(null); setShowModal(true); }}
                    className="bg-indigo-500 hover:bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-indigo-500/20 transition-all active:scale-95 group whitespace-nowrap min-w-[160px]"
                  >
                    <Plus className="w-5 h-5" /> 
                    বই যুক্ত করুন 
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-2 lg:grid-cols-4 gap-4 mt-10">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">মোট বই</p>
              <p className="text-2xl font-black">{books.length}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">এভেইলেবল</p>
              <p className="text-2xl font-black text-emerald-400">{books.filter(b => String(b.status).toLowerCase() === 'available').length}</p>
            </div>
            <div 
              onClick={() => setStatusFilter('issued')}
              className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 cursor-pointer hover:bg-white/10 transition-colors"
            >
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{isActuallyAdmin ? 'ইস্যু করা' : 'বর্তমানে পঠিত বই'}</p>
              <p className="text-2xl font-black text-indigo-400">{isActuallyAdmin ? books.filter(b => String(b.status).toLowerCase() === 'issued').length : userIssueCount}</p>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{isActuallyAdmin ? 'বর্তমানে নেই' : 'পূর্বের পঠিত বই'}</p>
              <p className="text-2xl font-black text-rose-400">{isActuallyAdmin ? books.filter(b => String(b.status).toLowerCase() === 'not available' || String(b.status).toLowerCase() === 'not_available').length : userPastIssueCount}</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Search className="w-5 h-5" />
              </div>
              <h3 className="font-black text-lg text-slate-800">দ্রুত খুঁজুন</h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  placeholder="বই, লেখক বা কোড দিয়ে খুঁজুন..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-200 px-5 py-4 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bengali"
                />
                <Select
                  value={categoryFilter ? { value: categoryFilter, label: categoryFilter } : null}
                  onChange={(selected: any) => setCategoryFilter(selected ? selected.value : '')}
                  options={[
                    { value: '', label: 'সব ক্যাটাগরি' },
                    ...BOOK_CATEGORIES.map(cat => ({ value: cat, label: cat }))
                  ]}
                  placeholder="ক্যাটাগরি ফিল্টার..."
                  styles={{
                    ...reactSelectCustomStyles,
                    control: (base: any, state: any) => ({
                       ...reactSelectCustomStyles.control(base, state),
                       minHeight: '54px',
                       borderRadius: '1rem',
                    })
                  }}
                  className="sm:w-64 font-bengali text-sm"
                  classNamePrefix="react-select"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-6">
        {filtered.slice(0, visibleCount).map(book => (
          <div
            key={book.id}
            onClick={() => handleBookClick(book)}
            className="bg-white rounded-2xl border border-slate-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full cursor-pointer relative overflow-hidden"
          >
            <div className="relative h-[220px] sm:h-[280px] w-full shrink-0 bg-slate-100 border-b border-slate-100 p-2">
              {book.cover ? (
                <img 
                  src={book.cover} 
                  alt={book.title} 
                  loading="lazy" 
                  decoding="async"
                  referrerPolicy="no-referrer" 
                  className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" 
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-slate-200">
                  <BookOpen size={32} className="mb-2 opacity-10" />
                  <span className="text-[10px] font-black text-center font-bengali opacity-30 leading-tight">{book.title}</span>
                </div>
              )}
              <div className="absolute top-2 right-2">
                <span className={`px-2 py-1 rounded-md text-[9px] font-bold font-bengali shadow-sm backdrop-blur-md ${
                  String(book.status).toLowerCase() === 'available' ? 'bg-emerald-500/90 text-white' : 'bg-rose-500/90 text-white'
                }`}>
                  {String(book.status).toLowerCase() === 'available' ? 'এভেইলেবল' : String(book.status).toLowerCase() === 'issued' ? 'ইস্যু করা' : String(book.status).toLowerCase() === 'not_available' || String(book.status).toLowerCase() === 'not available' ? 'বর্তমানে নেই' : book.status}
                </span>
              </div>
            </div>

            <div className="flex-1 p-2.5 sm:p-3.5 flex flex-col">
              <p className="text-[9px] sm:text-[10px] font-bold text-indigo-600 uppercase tracking-widest mb-1 font-bengali truncate">{book.category || 'সাধারণ'}</p>
              <h3 className="text-xs sm:text-sm font-bold text-slate-900 font-bengali leading-snug group-hover:text-indigo-600 transition-colors flex-1 line-clamp-2">{book.title}</h3>
              <p className="text-[10px] sm:text-xs text-slate-500 font-bengali font-medium mt-1 truncate">{book.author}</p>
              {isActuallyAdmin && (
                <div className="mt-2 flex flex-wrap gap-1">
                  <span className="text-[9px] font-medium text-slate-600 bg-slate-100 px-1.5 py-1 rounded border border-slate-200 flex items-center gap-1 font-mono">
                    <span className="opacity-70 font-bengali">কোড:</span> {book.bookCode || 'N/A'}
                  </span>
                  <span className="text-[9px] font-medium text-slate-600 bg-slate-100 px-1.5 py-1 rounded border border-slate-200 flex items-center gap-1 font-mono">
                    <span className="opacity-70 font-bengali">শেল্ফ:</span> {book.shelfNo || 'N/A'}
                  </span>
                </div>
              )}
            </div>

            <div className="px-2.5 sm:px-3.5 pb-2.5 sm:pb-3.5 mt-auto grid grid-cols-2 gap-1.5 relative z-20" onClick={e=>e.stopPropagation()}>
                {isActuallyAdmin && (book.status === 'Issued' || book.status === 'ISSUED') && (
                   <button
                      onClick={async (e) => {
                         e.stopPropagation();
                         try {
                             const q = query(collection(db, 'issues'), where('bookId', '==', book.id));
                             const snapshot = await getDocs(q);
                             if (snapshot && !snapshot.empty) {
                                 const activeIssues = snapshot.docs.filter(d => d.data().status === 'Issued' || d.data().status === 'ISSUED');
                                 if (activeIssues.length > 0) {
                                     const issueDoc = activeIssues[0];
                                     await updateDoc(doc(db, 'issues', issueDoc.id), {
                                         status: 'Returned',
                                         returnDate: new Date().toISOString()
                                     });
                                 }
                                 await updateDoc(doc(db, 'books', book.id), { status: 'Available' });
                                 toast.success('বই সফলভাবে রিটার্ন করা হয়েছে।');
                             }
                         } catch (err) {
                             toast.error('ত্রুটি: ' + (err instanceof Error ? err.message : String(err)));
                         }
                      }}
                      className="col-span-2 text-[10px] sm:text-[11px] bg-emerald-50 text-emerald-700 hover:text-white py-1.5 h-8 rounded-lg font-bold uppercase hover:bg-emerald-500 transition border border-emerald-100 hover:border-emerald-500 font-bengali flex justify-center items-center"
                   >
                      রিটার্ন জমা
                   </button>
                )}
                
                {isAdminRole && (
                  <>
                    <button onClick={(e) => {e.stopPropagation(); handleEdit(book);}} className="py-2 text-indigo-600 hover:text-white bg-indigo-50 hover:bg-indigo-600 rounded-lg transition border border-indigo-100 hover:border-indigo-600 flex justify-center items-center" title="এডিট">
                      <Edit2 className="w-4 h-4"/>
                    </button>
                    <button onClick={(e) => {e.stopPropagation(); handleDelete(book.id);}} className="py-2 text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 rounded-lg transition border border-rose-100 hover:border-rose-600 flex justify-center items-center" title="ডিলিট">
                      <Trash2 className="w-4 h-4"/>
                    </button>
                  </>
                )}
            </div>

            {!isActuallyAdmin && (String(book.status).toLowerCase() === 'available') && (
                <button
                  onClick={(e) => { e.stopPropagation(); handlePreBook(book.id!); }}
                  disabled={prebooking === book.id || requestedBooks.includes(book.id!)}
                  className="mt-3 sm:mt-6 w-full py-2.5 sm:py-4 rounded-lg sm:rounded-xl font-black font-bengali text-[10px] sm:text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 flex items-center justify-center gap-1.5 sm:gap-2 bg-slate-900 text-white hover:bg-indigo-600 shadow-md shadow-slate-200 disabled:bg-slate-50 disabled:text-slate-300 disabled:shadow-none active:scale-[0.98] z-20 relative"
                >
                  {requestedBooks.includes(book.id!) ? 'রিকুয়েষ্ট করা হয়েছে' : prebooking === book.id ? 'অপেক্ষা করুন...' : 'ইস্যুর অনুরোধ'}
                </button>
            )}
            {!isActuallyAdmin && (String(book.status).toLowerCase() !== 'available') && (
                <button disabled className="mt-3 sm:mt-6 w-full py-2.5 sm:py-4 rounded-lg sm:rounded-xl font-black font-bengali text-[10px] sm:text-sm flex items-center justify-center gap-1.5 sm:gap-2 bg-slate-50 text-slate-300 z-20 relative">
                    বুকড 
                </button>
            )}
          </div>
        ))}
      </div>
      
      {filtered.length > visibleCount && (
        <div ref={handleObserver} className="h-10 w-full"></div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center p-0 sm:p-4 overflow-y-auto sm:overflow-hidden">
          <div className="bg-white sm:rounded-3xl w-full max-w-lg h-full sm:h-auto sm:max-h-[90vh] shadow-2xl relative flex flex-col">
            <div className="p-6 sm:p-8 flex items-center justify-between border-b border-slate-100 bg-white sm:rounded-t-3xl sticky top-0 z-10 shrink-0">
              <h3 className="text-xl sm:text-2xl font-black font-bengali text-slate-800">
                {editingId ? 'বই এডিট করুন' : 'নতুন বই যোগ করুন'}
              </h3>
              <button 
                type="button" 
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors"
              >
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 pt-4">
              {isAiScanning ? (
                 <div className="mb-6 bg-slate-900 border overflow-hidden rounded-3xl relative">
                    <div className="absolute top-4 left-0 w-full z-10 flex justify-center pointer-events-none">
                       <div className="bg-black/60 backdrop-blur text-white px-4 py-1.5 rounded-full text-xs font-bold font-bengali tracking-wide flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-indigo-400" />
                          বইয়ের কাভারের ছবি তুলুন
                       </div>
                    </div>
                    <video ref={videoRef} className="w-full aspect-[4/3] object-cover" autoPlay playsInline muted />
                    <canvas ref={canvasRef} className="hidden" />
                    
                    <div className="absolute bottom-6 w-full flex items-center justify-center gap-4 z-10">
                      <button 
                        type="button" 
                        onClick={stopAiCamera}
                        className="bg-white/10 backdrop-blur hover:bg-white/20 p-3.5 rounded-full text-white transition pointer-events-auto"
                      >
                        <X className="w-6 h-6" />
                      </button>
                      <button 
                         type="button"
                         onClick={captureAndProcessAI}
                         disabled={isAiProcessing}
                         className="w-16 h-16 bg-white rounded-full flex items-center justify-center p-1 pointer-events-auto active:scale-95 transition-transform"
                      >
                         <div className={`w-full h-full rounded-full flex items-center justify-center ${isAiProcessing ? 'bg-indigo-200' : 'bg-indigo-600'}`}>
                           {isAiProcessing ? (
                             <ScanLine className="w-6 h-6 text-indigo-600 animate-pulse" />
                           ) : (
                             <Camera className="w-6 h-6 text-white" />
                           )}
                         </div>
                      </button>
                    </div>
                 </div>
              ) : null}

              <form id="bookForm" onSubmit={handleSubmit} className="space-y-5 font-bengali pb-4">
                <div className="grid grid-cols-2 gap-4 text-slate-800">
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">বইয়ের কোড</label>
                    <input type="text" value={formData.bookCode || ''} onChange={e=>setFormData({...formData, bookCode: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm" placeholder="LIB-001" />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">শেল্ফ নং (Shelf No)</label>
                    <input type="text" value={formData.shelfNo || ''} onChange={e=>setFormData({...formData, shelfNo: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm" placeholder="A1, B2..." />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">বইয়ের নাম</label>
                  <input type="text" required value={formData.title || ''} onChange={e=>setFormData({...formData, title: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" placeholder="বইয়ের নাম লিখুন" />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">লেখকের নাম</label>
                  <input type="text" required value={formData.author || ''} onChange={e=>setFormData({...formData, author: e.target.value})} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold" placeholder="লেখকের নাম লিখুন" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">ক্যাটাগরি</label>
                    <CreatableSelect
                      isClearable
                      value={formData.category ? { value: formData.category, label: formData.category } : null}
                      onChange={(selected: any) => {
                        const newCategory = selected ? selected.value : '';
                        setFormData({
                          ...formData, 
                          category: newCategory, 
                          bookCode: generateBookCode(newCategory)
                        });
                      }}
                      options={BOOK_CATEGORIES.map(cat => ({ value: cat, label: cat }))}
                      placeholder="টাইপ করুন..."
                      formatCreateLabel={(inputValue) => `নতুন: "${inputValue}"`}
                      styles={{
                        ...reactSelectCustomStyles,
                        control: (base: any, state: any) => ({
                          ...reactSelectCustomStyles.control(base, state),
                          minHeight: '48px',
                          borderRadius: '0.75rem'
                        })
                      }}
                      className="font-bengali text-sm"
                      classNamePrefix="react-select"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">অবস্থা</label>
                    <Select
                      value={{ value: formData.status, label: formData.status === 'Available' ? 'এভেইলেবল' : 'ইস্যুকৃত' }}
                      onChange={(selected: any) => setFormData({...formData, status: selected.value})}
                      options={[
                        { value: 'Available', label: 'এভেইলেবল' },
                        { value: 'Issued', label: 'ইস্যুকৃত' }
                      ]}
                      styles={{
                        ...reactSelectCustomStyles,
                        control: (base: any, state: any) => ({
                          ...reactSelectCustomStyles.control(base, state),
                          minHeight: '48px',
                          borderRadius: '0.75rem'
                        })
                      }}
                      className="font-bengali text-sm font-bold"
                      classNamePrefix="react-select"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">বইয়ের বিবরণ (Description)</label>
                  <textarea 
                    value={formData.description || ''} 
                    onChange={e=>setFormData({...formData, description: e.target.value})} 
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-50 outline-none font-bold text-sm h-32" 
                    placeholder="বিবরণ লিখুন..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-1.5">বই সমালোচনা (ঐচ্ছিক)</label>
                  <textarea 
                    value={formData.review || ''} 
                    onChange={e=>setFormData({...formData, review: e.target.value})} 
                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-sm h-24" 
                    placeholder="রিভিউ লিখুন..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3">কভার ইমেজ (ঐচ্ছিক)</label>
                  
                  <div className="flex gap-2 mb-4 bg-slate-50 p-1.5 rounded-xl border border-slate-200">
                    <button 
                      type="button" 
                      onClick={() => setCoverInputType('upload')}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-black transition-all ${coverInputType === 'upload' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      আপলোড
                    </button>
                    <button 
                      type="button" 
                      onClick={() => setCoverInputType('link')}
                      className={`flex-1 py-2 px-3 rounded-lg text-xs font-black transition-all ${coverInputType === 'link' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                      লিঙ্ক (URL)
                    </button>
                  </div>

                  <div className="flex gap-4">
                    {formData.cover ? (
                      <div className="w-16 h-24 bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-sm relative group shrink-0">
                        <img src={formData.cover} alt="Preview" referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                        <button type="button" onClick={() => setFormData({...formData, cover: ''})} className="absolute inset-0 bg-black/60 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center font-bold text-[10px]">REMOVE</button>
                      </div>
                    ) : (
                      <div className="w-16 h-24 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex items-center justify-center shrink-0">
                        <BookOpen className="w-6 h-6 text-slate-300" />
                      </div>
                    )}
                    <div className="flex-1">
                      {coverInputType === 'upload' ? (
                        <input 
                          type="file" 
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 2 * 1024 * 1024) {
                                toast.error('ফাইলের সাইজ ২ এমবি-র কম হতে হবে।');
                                return;
                              }
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                const img = new Image();
                                img.onload = () => {
                                  const canvas = document.createElement('canvas');
                                  const MAX_WIDTH = 400;
                                  const MAX_HEIGHT = 600;
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
                                  const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                                  setFormData({ ...formData, cover: dataUrl });
                                };
                                img.src = reader.result as string;
                              };
                              reader.readAsDataURL(file);
                            }
                          }} 
                          className="w-full text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                        />
                      ) : (
                        <input 
                          type="text" 
                          placeholder="https://example.com/image.jpg"
                          value={formData.cover?.startsWith('data:') ? '' : (formData.cover || '')}
                          onChange={(e) => setFormData({ ...formData, cover: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-xs"
                        />
                      )}
                    </div>
                  </div>
                </div>
              </form>
            </div>

            <div className="p-6 sm:p-8 bg-slate-50 border-t border-slate-100 sm:rounded-b-3xl shrink-0 flex items-center justify-between gap-4">
              <button 
                type="button" 
                onClick={() => setShowModal(false)} 
                disabled={isSubmitting} 
                className="flex-1 py-3.5 px-4 font-black text-slate-500 hover:text-slate-700 transition disabled:opacity-50 text-sm border border-slate-200 rounded-2xl bg-white"
              >
                বাতিল
              </button>
              <button 
                type="submit" 
                form="bookForm"
                disabled={isSubmitting} 
                className="flex-[2] py-3.5 px-4 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base outline-none ring-offset-2 focus:ring-2 focus:ring-indigo-500"
              >
                {isSubmitting && <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                {editingId ? 'পরিবর্তন সংরক্ষণ করুন' : 'নতুন বই যুক্ত করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailsModalBook && (
        <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl relative flex flex-col overflow-hidden animate-in zoom-in-95 mt-10 md:mt-0 max-h-[90vh] overflow-y-auto">
            <div className="absolute top-4 right-4 z-10 block">
              <button 
                type="button" 
                onClick={() => setDetailsModalBook(null)}
                className="bg-black/50 hover:bg-black/80 backdrop-blur-md text-white p-2 text-sm rounded-full transition-colors"
                title="বইয়ের বিবরণ বন্ধ করুন"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="h-80 sm:h-96 w-full bg-slate-900 relative shrink-0 p-4">
              {detailsModalBook.cover ? (
                <img 
                  src={detailsModalBook.cover} 
                  alt={detailsModalBook.title} 
                  loading="lazy" 
                  referrerPolicy="no-referrer" 
                  className="w-full h-full object-contain" 
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-4 text-slate-300 bg-slate-100">
                  <BookOpen size={48} className="mb-2 opacity-20" />
                  <span className="text-sm font-black font-bengali opacity-30 text-center">{detailsModalBook.title}</span>
                </div>
              )}
              <div className="absolute top-4 left-4 flex gap-2">
                 <span className={`px-2.5 py-1 rounded-md text-xs font-bold font-bengali shadow-sm backdrop-blur-md ${
                  String(detailsModalBook.status).toLowerCase() === 'available' ? 'bg-emerald-500/90 text-white' : 'bg-rose-500/90 text-white'
                }`}>
                  {String(detailsModalBook.status).toLowerCase() === 'available' ? 'এভেইলেবল' : String(detailsModalBook.status).toLowerCase() === 'issued' ? 'ইস্যু করা' : String(detailsModalBook.status).toLowerCase() === 'not_available' || String(detailsModalBook.status).toLowerCase() === 'not available' ? 'বর্তমানে নেই' : detailsModalBook.status}
                </span>
              </div>
            </div>
            
            <div className="p-6">
              <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest mb-2 font-bengali">{detailsModalBook.category || 'সাধারণ'}</p>
              <h3 className="text-xl sm:text-2xl font-black text-slate-900 font-bengali leading-snug mb-1">{detailsModalBook.title}</h3>
              <p className="text-sm text-slate-500 font-bengali font-bold mb-4">{detailsModalBook.author}</p>
              
              {String(detailsModalBook.status).toLowerCase() === 'issued' && bookExpectedReturn && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4 flex items-start gap-3">
                      <div className="bg-amber-100 text-amber-600 p-2 rounded-lg shrink-0">
                          <span className="text-sm">📅</span>
                      </div>
                      <div>
                          <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest font-bengali mb-0.5">সম্ভাব্য ফেরত তারিখ</p>
                          <p className="text-sm font-bold text-amber-800 font-bengali">{bookExpectedReturn}</p>
                      </div>
                  </div>
              )}
              
              {detailsModalBook.description && (
                  <div className="mb-4">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 font-bengali">বইয়ের বিবরণ</p>
                      <p className="text-sm text-slate-700 font-bengali leading-relaxed">{detailsModalBook.description}</p>
                  </div>
              )}

              {detailsModalBook.review && (
                  <div className="mb-4">
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5 font-bengali">রিভিউ</p>
                      <p className="text-sm text-slate-700 font-bengali leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">{detailsModalBook.review}</p>
                  </div>
              )}

              {isActuallyAdmin && (
                <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
                  <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1.5 font-mono">
                    <span className="opacity-70 font-bengali">কোড:</span> {detailsModalBook.bookCode || 'N/A'}
                  </span>
                  <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-1.5 rounded-lg border border-slate-200 flex items-center gap-1.5 font-mono">
                    <span className="opacity-70 font-bengali">শেল্ফ:</span> {detailsModalBook.shelfNo || 'N/A'}
                  </span>
                </div>
              )}
              
              {!isActuallyAdmin && (String(detailsModalBook.status).toLowerCase() === 'available') && (
                  <button
                    onClick={() => { handlePreBook(detailsModalBook.id!); setDetailsModalBook(null); }}
                    disabled={prebooking === detailsModalBook.id || requestedBooks.includes(detailsModalBook.id!)}
                    className="mt-6 w-full py-4 rounded-xl font-black font-bengali text-[13px] uppercase tracking-wider transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/50 flex items-center justify-center gap-2 bg-slate-900 text-white hover:bg-slate-800 shadow-xl shadow-slate-200 disabled:bg-slate-50 disabled:text-slate-300 disabled:shadow-none active:scale-[0.98]"
                  >
                    {requestedBooks.includes(detailsModalBook.id!) ? 'রিকুয়েষ্ট করা হয়েছে' : prebooking === detailsModalBook.id ? 'অপেক্ষা করুন...' : 'ইস্যুর অনুরোধ করুন'}
                  </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

