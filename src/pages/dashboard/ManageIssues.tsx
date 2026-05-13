import React, { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../store/AuthContext';
import { BookmarkMinus, CheckCircle2, Trash2, ShieldAlert, FileDown, BookOpen, ScanFace, Camera as CameraIcon, X } from 'lucide-react';
import { onSnapshot, collection, doc, updateDoc, deleteDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import Select from 'react-select';
import toast from 'react-hot-toast';
import { sendSMS } from '../../lib/sms';

export default function ManageIssues() {
  const [issues, setIssues] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const { user: currentUser } = useAuth();
  const location = useLocation();
  
  const [showIssueForm, setShowIssueForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('action') === 'issue') {
      const sevenDaysLater = new Date();
      sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
      setFormData({ 
        bookId: '', 
        userId: '', 
        expectedReturnDate: sevenDaysLater.toISOString().split('T')[0] 
      });
      setShowIssueForm(true);
    }
  }, [location]);

  const [formData, setFormData] = useState({ bookId: '', userId: '', expectedReturnDate: '' });

  // AI Scanner State
  const [showAiScanner, setShowAiScanner] = useState(false);
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
    } catch (err: any) {
      toast.error('Camera access denied or unavailable: ' + err.message);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
  };

  useEffect(() => {
    if (!showAiScanner && stream) {
      stopCamera();
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
    };
  }, [showAiScanner]);

  const captureAndProcessAI = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    let width = video.videoWidth;
    let height = video.videoHeight;
    const MAX_WIDTH = 800; // Resize to max 800 width for faster inference
    if (width > MAX_WIDTH) {
       height = Math.round((height * MAX_WIDTH) / width);
       width = MAX_WIDTH;
    }
    
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.drawImage(video, 0, 0, width, height);
    const base64Image = canvas.toDataURL('image/jpeg', 0.5).split(',')[1];
    
    setIsAiProcessing(true);
    const toastId = toast.loading('AI বইটিকে শনাক্ত করছে...', { duration: 15000 });
    
    try {
      const dbDoc = await import('firebase/firestore').then(mod => mod.getDoc(mod.doc(db, 'settings', 'general')));
      const aiToken = dbDoc.exists() ? dbDoc.data().sysToken : '';

      const sysInstruction = `You are a strict library book cover parser. 
The user is giving you a photo of a book cover.
Return exactly and only a strict JSON object: {"titleBn": "Exact title in Bengali", "titleEn": "Transliterated/Exact title in English"}. Do not include markdown, do not include anything else.`;

      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiKey: aiToken,
          model: "gemini-3-flash-preview",
          systemInstruction: sysInstruction,
          contents: [{
            role: "user",
            parts: [
              { text: "Extract the exact book title from this cover image." },
              { inlineData: { mimeType: "image/jpeg", data: base64Image } }
            ]
          }]
        })
      });
      
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'AI Failed');
      
      const text = data.text;
      if (!text) throw new Error("Could not parse result from AI.");
      
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      
      if (parsed.titleBn || parsed.titleEn) {
         toast.success('Found book title: ' + (parsed.titleBn || parsed.titleEn), { id: toastId });
         
         const normalizeText = (t: string) => t ? t.toLowerCase()
              .replace(/[\s\-_]/g, '')
              .replace(/য়/g, 'য')
              .replace(/ড়/g, 'র')
              .replace(/ী/g, 'ি')
              .replace(/ূ/g, 'ু')
              .replace(/ণ/g, 'ন')
              .replace(/শ/g, 'স')
              .replace(/ষ/g, 'স')
              .replace(/[ঁংঃ]/g, '') : '';

         const targetBn = normalizeText(parsed.titleBn);
         const targetEn = normalizeText(parsed.titleEn);
         
         const matchedBook = books.find(b => {
             const bt = normalizeText(b.title);
             return (targetBn && (bt.includes(targetBn) || targetBn.includes(bt))) || 
                    (targetEn && (bt.includes(targetEn) || targetEn.includes(bt)));
         });

         if (matchedBook) {
            setFormData(prev => ({ ...prev, bookId: matchedBook.id }));
            toast.success('Book selected automatically!');
            setShowAiScanner(false);
            stopCamera();
         } else {
            toast.error('The extracted title "' + (parsed.titleBn || parsed.titleEn) + '" was not found in your inventory.', { id: toastId, duration: 5000 });
         }
      } else {
        toast.error('AI could not confidently find the title.', { id: toastId });
      }
    } catch (err: any) {
      console.error(err);
      toast.error('AI Processing failed: ' + err.message, { id: toastId });
    } finally {
      setIsAiProcessing(false);
    }
  };

  const [editId, setEditId] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const { getDocs, query, collection, orderBy } = await import('firebase/firestore');
        const db = (await import('../../lib/firebase')).db;

        const checkCache = (key: string) => {
          const cached = sessionStorage.getItem(key);
          const cachedTime = sessionStorage.getItem(`${key}_time`);
          if (cached && cachedTime && (Date.now() - parseInt(cachedTime) < 5 * 60 * 1000)) {
            return JSON.parse(cached);
          }
          return null;
        };
        const setCache = (key: string, data: any) => {
          sessionStorage.setItem(key, JSON.stringify(data));
          sessionStorage.setItem(`${key}_time`, Date.now().toString());
        };

        const [issuesSnap, booksSnap, usersSnap] = await Promise.all([
          checkCache('admin_issues_cache') ? null : getDocs(collection(db, "issues")),
          checkCache('admin_books_cache') ? null : getDocs(collection(db, "books")),
          checkCache('admin_users_cache') ? null : getDocs(collection(db, "users"))
        ]);

        if (issuesSnap) {
          const docs = issuesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setIssues(docs);
          setCache('admin_issues_cache', docs);
        } else setIssues(checkCache('admin_issues_cache'));

        if (booksSnap) {
          const docs = booksSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setBooks(docs);
          setCache('admin_books_cache', docs);
        } else setBooks(checkCache('admin_books_cache'));

        if (usersSnap) {
          const docs = usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          setUsers(docs);
          setCache('admin_users_cache', docs);
        } else setUsers(checkCache('admin_users_cache'));

      } catch (error) {
        handleFirestoreError(error, OperationType.GET, 'issues/books/users');
      }
    };
    fetchData();
  }, []);

  const updateIssuesCache = (newIssues: any[]) => {
    sessionStorage.setItem('admin_issues_cache', JSON.stringify(newIssues));
    sessionStorage.setItem('admin_issues_cache_time', Date.now().toString());
  };

  const handleSendOverdueAlerts = async () => {
    if (issues.length === 0 || users.length === 0 || books.length === 0) return;

    let processing = false;

    if (processing) return;
    processing = true;
    let alertsSent = 0;

    for (const issue of issues) {
      if ((issue.status === 'ISSUED' || issue.status === 'Issued') && !issue.autoAlertSent && new Date(issue.expectedReturnDate) < new Date()) {
        const issueUser = users.find(u => u.id === issue.userId);
        const issueBook = books.find(b => b.id === issue.bookId);

        if (issueUser && issueUser.phone) {
          const smsMessage = `প্রিয় ${issueUser.name}, পানধোয়া উন্মুক্ত পাঠাগার থেকে নেওয়া আপনার "${issueBook?.title || 'বইটি'}" বইটির ফেরত দেওয়ার তারিখ অতিক্রম হয়েছে। দয়া করে বইটি দ্রুত ফেরত দিন। ওয়েবসাইট: www.pandhoalibrary.org`;
          
          try {
            const success = await sendSMS(issueUser.phone, smsMessage);
            
            if (success) {
                const currentNote = issue.adminNote || '';
                await updateDoc(doc(db, "issues", issue.id), {
                  autoAlertSent: true,
                  adminNote: currentNote ? currentNote + ' | AUTO ALERT SENT' : 'AUTO ALERT SENT'
                });
                alertsSent++;
            }
          } catch (err) {
            console.error("Auto alert failed for issue", issue.id, err);
          }
        }
      }
    }
    processing = false;
    
    if (alertsSent > 0) {
      toast.success(`${alertsSent} জনকে মেয়াদ উত্তীর্ণের মেসেজ পাঠানো হয়েছে।`);
    } else {
      toast.error('নতুন কোনো মেয়াদ উত্তীর্ণ সদস্য পাওয়া যায়নি যাদের মেসেজ পাঠানো বাকি আছে।');
    }
  };

  const handleUpdateNote = async (id: string, text: string = note) => {
    try {
      await updateDoc(doc(db, "issues", id), { adminNote: text });
      setEditId(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `issues/${id}`);
    }
  };

  const handleAlert = async (id: string, userPhone: string) => {
    toast.success(`Alert sent to phone number: ${userPhone || 'N/A'}`);
    await handleUpdateNote(id, 'ALERT SENT (Overdue)');
  };

  const handleIssue = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    
    console.log('--- Start Book Issue Process ---');
    console.log('Form Data:', formData);

    // 1. Form Validation
    if (!formData.bookId || !formData.userId || !formData.expectedReturnDate) {
      console.warn('Validation failed: missing fields');
      toast.error("Validation Error: Please select a book, a user, and a return date.");
      return;
    }

    // 2. Prepare Data (finding titles/names)
    const selectedBook = books.find(b => b.id === formData.bookId);
    const selectedUser = users.find(u => u.id === formData.userId);

    console.log('Selected Book:', selectedBook);
    console.log('Selected User:', selectedUser);

    if (!selectedBook) {
      console.error('Book not found in the local state:', formData.bookId);
      toast.error("Error: Selected book not found. Please try again.");
      return;
    }

    if (!selectedUser) {
      console.error('User not found in the local state:', formData.userId);
      toast.error("Error: Selected user not found. Please try again.");
      return;
    }

    // Check if user is blocked
    if (selectedUser.borrowBlocked) {
      toast.error(`Error: Membership Blocked! \n\n${selectedUser.blockedReason || "এই সদস্যের বই নেয়ার সুযোগ সাময়িকভাবে বন্ধ আছে।"}`);
      return;
    }

    // Additional check for IDs
    if (!selectedBook.id || !selectedUser.id) {
        console.error('Missing ID in entities:', { bookId: selectedBook.id, userId: selectedUser.id });
        toast.error("Critical Error: Invalid data format (Missing ID). Please contact support.");
        return;
    }

    // 3. Start Loading
    setIsSubmitting(true);

    try {
      if (!currentUser) {
          throw new Error("Authentication Error: You must be logged in to perform this action.");
      }

      // 4. Create Issue Document
      const issueId = `ISS-${Date.now()}`;
      const issueData = {
        bookId: String(selectedBook.id),
        bookTitle: selectedBook.title || 'Untitled',
        bookCode: selectedBook.bookCode || 'N/A',
        userId: String(selectedUser.id),
        userName: selectedUser.name || 'Anonymous',
        memberId: selectedUser.memberId || 'N/A',
        issueDate: new Date().toISOString(),
        returnDate: formData.expectedReturnDate,
        expectedReturnDate: formData.expectedReturnDate,
        status: "ISSUED",
        adminNote: "",
        autoAlertSent: false,
        issuedBy: currentUser.id,
        createdAt: serverTimestamp()
      };

      console.log('Creating Issue Doc with ID:', issueId, 'Payload:', issueData);
      await setDoc(doc(db, "issues", issueId), issueData);
      console.log('Issue document created successfully');
      setIssues(prev => {
        const updated = [...prev, { id: issueId, ...issueData }];
        updateIssuesCache(updated);
        return updated;
      });

      // 5. Update Book Status
      console.log('Updating Book Status for book:', selectedBook.id);
      const bookUpdates = { 
        status: "ISSUED",
        currentReaderName: selectedUser.name || 'Anonymous',
        currentReaderId: selectedUser.id,
        expectedReturnDate: formData.expectedReturnDate,
        updatedAt: serverTimestamp()
      };
      await updateDoc(doc(db, "books", String(selectedBook.id)), bookUpdates);
      setBooks(prev => {
        const updated = prev.map(b => b.id === selectedBook.id ? { ...b, ...bookUpdates } : b);
        sessionStorage.setItem('admin_books_cache', JSON.stringify(updated));
        sessionStorage.setItem('admin_books_cache_time', Date.now().toString());
        return updated;
      });
      console.log('Book status updated successfully');

      // 6. Success Handling
      toast.success(`Success: ${selectedBook.title} has been successfully issued to ${selectedUser.name}!`);

      console.log("Checking phone number for SMS:", selectedUser.phone);
      if (selectedUser.phone) {
        const bdDate = new Date(formData.expectedReturnDate).toLocaleDateString('bn-BD').replace(/[0-9]/g, w => String.fromCharCode(w.charCodeAt(0) + 2486));
        const smsMessage = `প্রিয় ${selectedUser.name}, পানধোয়া উন্মুক্ত পাঠাগার থেকে আপনাকে "${selectedBook.title}" বইটি ইস্যু করা হয়েছে। ফেরত দেওয়ার শেষ তারিখ: ${bdDate}। পাঠাগারের সাথে থাকার জন্য ধন্যবাদ। ওয়েবসাইট: www.pandhoalibrary.org`;
        
        // Send SMS in background to avoid blocking
        (async () => {
          try {
            const success = await sendSMS(selectedUser.phone || '', smsMessage);
            if (!success) {
              toast.error("সদস্যের মোবাইলে SMS পাঠানো সম্ভব হয়নি। দয়া করে API ব্যালেন্স চেক করুন।", { icon: '⚠️' });
            }
          } catch (e) {
            console.error("SMS Error:", e);
          }
        })();
      } else {
        console.warn("User has no phone number, skipping SMS.");
      }

      setFormData({ bookId: '', userId: '', expectedReturnDate: '' });
      setShowIssueForm(false);
      
    } catch (err: any) {
      // 7. Error Handling
      console.error("Critical Problem during book issuance:", err);
      const errorMessage = err.message || "An unexpected error occurred during database write.";
      toast.error(`Critical Error: Failed to issue book. \n\nReason: ${errorMessage}\n\nPlease check console logs for details.`);
      handleFirestoreError(err, OperationType.CREATE, "issues");
    } finally {
      // 8. Reset Loading State
      setIsSubmitting(false);
      console.log('--- End Book Issue Process ---');
    }
  };

  const downloadOverdueReport = () => {
    const overdueIssues = issues.filter(i => {
      if (i.status !== 'ISSUED') return false;
      const expected = new Date(i.expectedReturnDate);
      return expected < new Date();
    });

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      toast.error('উইন্ডো ওপেন করা সম্ভব হয়নি। দয়া করে পপআপ ব্লকার চেক করুন।');
      return;
    }

    const printContent = overdueIssues.map((i, index) => {
      const book = books.find(b => b.id === i.bookId);
      const user = users.find(u => u.id === i.userId);
      const serialConverted = (index + 1).toString().replace(/[0-9]/g, w => String.fromCharCode(w.charCodeAt(0) + 2486));
      const memberIdConverted = user?.memberId ? user.memberId.replace(/[0-9]/g, w => String.fromCharCode(w.charCodeAt(0) + 2486)) : 'অনির্ধারিত';
      const phoneConverted = user?.phone ? user.phone.replace(/[0-9]/g, w => String.fromCharCode(w.charCodeAt(0) + 2486)) : 'N/A';
      const expectedDateConverted = new Date(i.expectedReturnDate).toLocaleDateString('bn-BD').replace(/[0-9]/g, w => String.fromCharCode(w.charCodeAt(0) + 2486));

      return `
      <tr>
        <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; text-align: center; color: #475569;">${serialConverted}</td>
        <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; font-family: 'JetBrains Mono', monospace; font-weight: 700; color: #1e293b;">${memberIdConverted}</td>
        <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #1e293b;">${user?.name || 'অজানা'}</td>
        <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; font-family: 'JetBrains Mono', monospace; color: #64748b; font-size: 13px;">${phoneConverted}</td>
        <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #1e293b;">${book?.title || 'অজানা বই'}</td>
        <td style="padding: 14px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #e11d48; text-align: right;">${expectedDateConverted}</td>
      </tr>`;
    }).join('');

    const todayDateConverted = new Date().toLocaleDateString('bn-BD').replace(/[0-9]/g, w => String.fromCharCode(w.charCodeAt(0) + 2486));
    const todayTimeConverted = new Date().toLocaleString('bn-BD').replace(/[0-9]/g, w => String.fromCharCode(w.charCodeAt(0) + 2486));

    printWindow.document.write(`
    <!DOCTYPE html>
    <html lang="bn">
    <head>
        <meta charset="UTF-8">
        <title>ওভারডিউ বইয়ের রিপোর্ট</title>
        
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&family=Hind+Siliguri:wght@400;500;600;700&display=swap" rel="stylesheet">
                <style>
            body {
                font-family: 'Hind Siliguri', sans-serif;
                padding: 40px;
                color: #0f172a;
                margin: 0;
                background-color: #f8fafc;
            }
            .container {
                max-width: 900px;
                margin: 0 auto;
                background: white;
                padding: 40px;
                border-radius: 12px;
                box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
            }
            .header {
                text-align: center;
                margin-bottom: 40px;
                padding-bottom: 20px;
                border-bottom: 2px solid #e2e8f0;
            }
            .logo-placeholder {
                width: 60px;
                height: 60px;
                background: #fff1f2;
                border-radius: 50%;
                margin: 0 auto 15px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 24px;
            }
            .title {
                font-size: 32px;
                font-weight: 700;
                margin-bottom: 2px;
                color: #0f172a;
            }
            .address-box {
                font-family: 'Outfit', 'Hind Siliguri', sans-serif; 
                font-size: 15px; 
                color: #1e293b; 
                margin: 10px 0; 
                font-weight: 700; 
                background: #f1f5f9; 
                display: inline-block; 
                padding: 4px 18px; 
                border-radius: 10px; 
                border: 1px solid #e2e8f0;
            }
            .subtitle {
                color: #e11d48;
                font-size: 15px;
                font-weight: 600;
                letter-spacing: 0.5px;
                margin-top: 5px;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
                font-size: 15px;
                font-family: 'Hind Siliguri', sans-serif;
            }
            th {
                background-color: #f1f5f9;
                padding: 16px;
                text-align: left;
                font-weight: 700;
                color: #475569;
                font-size: 13px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            th:first-child { text-align: center; border-radius: 8px 0 0 8px; }
            th:last-child { text-align: right; border-radius: 0 8px 8px 0; }
            .total-row {
                background-color: #fff1f2;
                border-top: 2px solid #e11d48;
            }
            .total-row td {
                padding: 16px;
                font-weight: 700;
                color: #0f172a;
                font-size: 16px;
                border-bottom: none;
            }
            .total-row td:last-child {
                text-align: right;
                color: #e11d48;
                font-size: 18px;
            }
            .footer {
                margin-top: 60px;
                text-align: center;
                color: #94a3b8;
                font-size: 13px;
                padding-top: 20px;
                border-top: 1px solid #e2e8f0;
            }
            @media print {
                body { padding: 0; background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .container { padding: 0; box-shadow: none; max-width: 100%; }
                .header { margin-top: 0; }
                @page { margin: 20mm; }
                .no-print { display: none !important; }
            }
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <div class="logo-placeholder">⏰</div>
                <div class="title">পানধোয়া উন্মুক্ত পাঠাগার</div>
                <div class="address-box">ঠিকানা: পানধোয়া, সেনওয়ালিয়া-1344, আশুলিয়া, সাভার, ঢাকা।</div>
                <div class="subtitle">ওভারডিউ (দেরিতে ফেরত) বইয়ের রিপোর্ট — ${todayDateConverted}</div>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>ক্রমিক</th>
                        <th>সদস্য আইডি</th>
                        <th>নাম</th>
                        <th>মোবাইল নম্বর</th>
                        <th>বইয়ের নাম</th>
                        <th>ফেরতের তারিখ</th>
                    </tr>
                </thead>
                <tbody>
                    ${printContent}
                    <tr class="total-row">
                        <td colspan="5" style="text-align: right;">সর্বমোট ওভারডিউ বই:</td>
                        <td>${overdueIssues.length.toString().replace(/[0-9]/g, w => String.fromCharCode(w.charCodeAt(0) + 2486))} টি</td>
                    </tr>
                </tbody>
            </table>
            <div class="footer">
                রিপোর্ট জেনারেট করা হয়েছে: ${todayTimeConverted}<br>
                © পানধোয়া উন্মুক্ত পাঠাগার
            </div>
        </div>
        <div class="no-print" style="text-align: center; margin-top: 30px;">
            <button onclick="window.print()" style="background: #e11d48; color: white; border: none; padding: 14px 28px; border-radius: 8px; font-family: 'Noto Serif Bengali', serif; font-size: 16px; font-weight: 700; cursor: pointer; box-shadow: 0 4px 6px -1px rgba(225, 29, 72, 0.2); transition: all 0.2s;">
                🖨️ প্রিন্ট / পিডিএফ সেভ করুন
            </button>
            <p style="color: #64748b; font-size: 14px; margin-top: 12px; font-family: sans-serif;">মোবাইল ব্রাউজারে সমস্যা হলে উপরের বাটনে ক্লিক করুন</p>
        </div>
        <script>
            window.onload = () => {
                setTimeout(() => {
                    window.print();
                }, 800);
            };
        </script>
    </body>
    </html>
    `);
  };

  const handleReturn = async (id: string) => {
    console.log('--- Start Book Return Process ---');
    console.log('Issue ID to return:', id);

    const issue = issues.find(iss => iss.id === id);
    if (!issue) {
      console.error('Issue not found in local state:', id);
      return;
    }
    
    try {
      if (!currentUser) throw new Error("Auth required");

      console.log('Updating Issue Doc:', id);
      const issueUpdates = {
        status: 'Returned',
        returnDate: new Date().toISOString(),
        updatedAt: serverTimestamp()
      };
      await updateDoc(doc(db, "issues", id), issueUpdates);
      setIssues(prev => {
        const updated = prev.map(iss => iss.id === id ? { ...iss, ...issueUpdates } : iss);
        updateIssuesCache(updated);
        return updated;
      });
      console.log('Issue record updated to Returned');

      console.log('Updating Book status to Available for bookId:', issue.bookId);
      const returnBookUpdates = { 
        status: 'Available',
        currentReaderName: null,
        currentReaderId: null,
        expectedReturnDate: null,
        updatedAt: serverTimestamp()
      };
      await updateDoc(doc(db, "books", issue.bookId), returnBookUpdates);
      setBooks(prev => {
        const updated = prev.map(b => b.id === issue.bookId ? { ...b, ...returnBookUpdates } : b);
        sessionStorage.setItem('admin_books_cache', JSON.stringify(updated));
        sessionStorage.setItem('admin_books_cache_time', Date.now().toString());
        return updated;
      });
      console.log('Book status updated successfully');
      toast.success('Book returned successfully!');

      const issueUser = users.find(u => u.id === issue.userId);
      const issueBook = books.find(b => b.id === issue.bookId);
      if (issueUser && issueUser.phone) {
        const smsMessage = `প্রিয় ${issueUser.name}, আপনার জমাকৃত "${issueBook?.title || 'বইটি'}" বইটির ফেরত প্রক্রিয়া সফলভাবে সম্পন্ন হয়েছে। পানধোয়া উন্মুক্ত পাঠাগারের সাথে থাকার জন্য ধন্যবাদ। ওয়েবসাইট: www.pandhoalibrary.org`;
        
        // Send SMS in background
        (async () => {
          try {
            const success = await sendSMS(issueUser.phone || '', smsMessage);
            if (!success) {
              toast.error("ফেরত মেসেজটি পাঠানো সম্ভব হয়নি।", { icon: '⚠️' });
            }
          } catch (e) {
            console.error("SMS Error:", e);
          }
        })();
      }
    } catch (err: any) {
      console.error('Error during return process:', err);
      toast.error('Failed to return book: ' + (err.message || String(err)));
      handleFirestoreError(err, OperationType.UPDATE, `issues/${id}`);
    } finally {
      console.log('--- End Book Return Process ---');
    }
  };

  const handleDeleteIssue = async (id: string) => {
    console.log('--- Delete Issue Process ---');
    console.log('ID to delete:', id);

    if (!window.confirm("Are you sure you want to delete this issue record?")) {
      console.log('Delete cancelled by user');
      return;
    }

    try {
      if (!currentUser) throw new Error("Auth required");

      await deleteDoc(doc(db, "issues", id));
      setIssues(prev => {
        const updated = prev.filter(iss => iss.id !== id);
        updateIssuesCache(updated);
        return updated;
      });
      console.log('Document deleted successfully from Firestore');
    } catch (err) {
      console.error('Error deleting issue:', err);
      handleFirestoreError(err, OperationType.DELETE, `issues/${id}`);
    } finally {
      console.log('--- End Delete Issue Process ---');
    }
  };

  const userOptions = users.filter(u => 
    u.status === 'active' && 
    u.name?.toLowerCase() !== 'system admin' && 
    u.name?.toLowerCase() !== 'seneia islam' &&
    u.email !== 'seneiaislam@gmail.com'
  ).map(u => ({
    value: u.id,
    label: `${u.name} (আইডি: ${u.memberId ? u.memberId.replace(/[0-9]/g, w => String.fromCharCode(w.charCodeAt(0) + 2486)) : 'অনির্ধারিত'})`
  }));

  const bookOptions = books.filter(b => b.status === 'Available' || b.status === 'AVAILABLE').map(b => ({
    value: b.id,
    label: `${b.title} [${b.bookCode || 'N/A'}]`
  }));

  const selectStyles = {
    control: (base: any, state: any) => ({
      ...base,
      border: state.isFocused ? '2px solid #6366f1' : '2px solid #e2e8f0',
      borderRadius: '0.75rem',
      padding: '0.25rem',
      boxShadow: 'none',
      fontFamily: 'inherit',
      fontSize: '0.875rem',
      fontWeight: '500',
      color: '#334155',
      backgroundColor: 'white',
      '&:hover': {
        border: state.isFocused ? '2px solid #6366f1' : '2px solid #cbd5e1'
      }
    }),
    option: (base: any, state: any) => ({
      ...base,
      backgroundColor: state.isSelected ? '#4f46e5' : state.isFocused ? '#e0e7ff' : 'transparent',
      color: state.isSelected ? 'white' : '#334155',
      cursor: 'pointer',
      fontFamily: 'inherit',
      fontSize: '0.875rem',
      fontWeight: state.isSelected ? '700' : '500',
      padding: '0.75rem 1rem',
      '&:active': {
        backgroundColor: '#4338ca'
      }
    }),
    placeholder: (base: any) => ({
      ...base,
      color: '#94a3b8',
      fontFamily: 'inherit'
    }),
    menu: (base: any) => ({
      ...base,
      borderRadius: '0.75rem',
      border: '1px solid #e2e8f0',
      boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
      overflow: 'hidden',
      zIndex: 50,
      fontFamily: 'inherit'
    })
  };

  const handleRejectExtend = async (id: string) => {
    if (!window.confirm("আপনি কি নিশ্চিত যে সময় বৃদ্ধির রিকোয়েস্ট বাতিল করতে চান?")) return;
    try {
      await updateDoc(doc(db, "issues", id), {
        extendRequested: false,
        adminNote: "সময় বৃদ্ধির রিকোয়েস্ট বাতিল করা হয়েছে। দয়া করে বইটি দ্রুত ফেরত দিন।",
        updatedAt: serverTimestamp()
      });
      toast.success('রিকোয়েস্ট বাতিল করা হয়েছে।');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `issues/${id}`);
    }
  };

  const [extendConfig, setExtendConfig] = useState<{ id: string, currentDateStr: string } | null>(null);
  const [extendDays, setExtendDays] = useState(7);

  const confirmExtension = async () => {
    if (!extendConfig) return;
    const { id, currentDateStr } = extendConfig;
    if (isNaN(extendDays) || extendDays <= 0) {
      toast.error("Invalid number of days.");
      return;
    }
    try {
      const currentExpected = new Date(currentDateStr);
      currentExpected.setDate(currentExpected.getDate() + extendDays);
      const bdDate = currentExpected.toLocaleDateString('bn-BD').replace(/[0-9]/g, w => String.fromCharCode(w.charCodeAt(0) + 2486));
      
      await updateDoc(doc(db, "issues", id), {
        extendRequested: false,
        expectedReturnDate: currentExpected.toISOString(),
        adminNote: `সময় বৃদ্ধির রিকোয়েস্ট অনুমোদিত হয়েছে। নতুন তারিখ: ${bdDate}`,
        autoAlertSent: false,
        updatedAt: serverTimestamp()
      });
      toast.success('সময় বৃদ্ধি করা হয়েছে।');

      setExtendConfig(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `issues/${id}`);
    }
  };

  const handleAcceptExtend = (id: string, currentExpectedStr: string) => {
    setExtendConfig({ id, currentDateStr: currentExpectedStr });
  };

  const filteredIssues = issues.filter(i => {
    if (filterStatus === 'returned' && i.status !== 'Returned') return false;
    if (filterStatus === 'issued' && i.status !== 'ISSUED' && i.status !== 'Issued') return false;
    if (filterStatus === 'overdue') {
       if (i.status !== 'ISSUED' && i.status !== 'Issued') return false;
       if (new Date(i.expectedReturnDate) >= new Date()) return false;
    }
    if (filterStatus === 'extend' && !i.extendRequested) return false;

    const book = books.find(b => b.id === i.bookId);
    const user = users.find(u => u.id === i.userId);
    const term = search.toLowerCase();
    return (book?.bookCode?.toLowerCase()?.includes(term) || book?.title?.toLowerCase()?.includes(term) || user?.memberId?.toLowerCase()?.includes(term) || user?.name?.toLowerCase()?.includes(term));
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 font-bengali">
      <div className="flex flex-col gap-4 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
        <div className="flex flex-col md:flex-row md:justify-between items-start md:items-end gap-4">
          <div>
             <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">Issue / Return</h2>
             <p className="text-slate-500 font-medium text-sm mt-1 mb-0">Manage book rentals and returns for the library.</p>
          </div>
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
             <input 
                type="text" 
                placeholder="বইয়ের নাম, কোড বা মেম্বার দিয়ে খুঁজুন..." 
                className="border border-slate-200 px-4 py-2.5 rounded-xl text-sm w-full md:w-auto shadow-inner bg-slate-50 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium font-bengali"
                value={search}
                onChange={e => setSearch(e.target.value)}
             />
             <button onClick={handleSendOverdueAlerts} className="flex-1 md:flex-none justify-center bg-amber-50 text-amber-700 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-amber-100 transition shadow-sm border border-amber-200/50 hover:border-amber-300 whitespace-nowrap">
               মেয়াদ উত্তীর্ণদের <br className="md:hidden" /> মেসেজ দিন
             </button>
             <button onClick={downloadOverdueReport} className="flex-1 md:flex-none justify-center bg-rose-50/50 text-rose-600 px-5 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-rose-100 transition shadow-sm border border-rose-200/50 hover:border-rose-300">
               <FileDown className="w-5 h-5 truncate" /> ওভারডিউ রিপোর্ট
             </button>
             <button 
               onClick={() => {
                 const sevenDaysLater = new Date();
                 sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
                 setFormData({ 
                   bookId: '', 
                   userId: '', 
                   expectedReturnDate: sevenDaysLater.toISOString().split('T')[0] 
                 });
                 setShowIssueForm(true);
               }} 
               className="flex-1 md:flex-none justify-center bg-indigo-600 shadow-lg shadow-indigo-600/20 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 hover:-translate-y-0.5 transition-all font-bengali whitespace-nowrap"
             >
               নতুন বই ইস্যু
             </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {[{id:'all',l:'সবগুলো'},{id:'issued',l:'বর্তমানে ইস্যুকৃত'},{id:'overdue',l:'ওভারডিউ বা লেট'},{id:'returned',l:'ফেরত দেওয়া'},{id:'extend',l:'সময় বৃদ্ধির রিকোয়েস্ট'}].map((btn) => (
            <button
              key={btn.id}
              onClick={() => setFilterStatus(btn.id)}
              className={`flex-1 md:flex-none px-4 py-2.5 rounded-xl text-xs font-bold transition-all border whitespace-nowrap ${
                filterStatus === btn.id ? "bg-indigo-600 text-white border-indigo-600 shadow-md" : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {btn.l}
            </button>
          ))}
        </div>
      </div>

      {extendConfig && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-sm p-8 shadow-2xl relative">
            <h3 className="text-xl font-bold text-slate-900 mb-2 font-bengali">সময় বৃদ্ধি করুন</h3>
            <p className="text-slate-500 text-sm mb-6 font-bengali">কত দিন সময় বাড়াতে চান লিখুন (ডিফল্ট ৭ দিন)।</p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1 font-bengali">দিন সংখ্যা</label>
                <input 
                  type="number" 
                  value={extendDays} 
                  onChange={e => setExtendDays(Number(e.target.value))} 
                  className="w-full px-4 py-3 border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-emerald-500 font-mono text-center font-bold text-lg" 
                  min="1"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button 
                  onClick={() => setExtendConfig(null)} 
                  className="flex-1 px-4 py-3 text-slate-500 hover:bg-slate-50 rounded-xl font-bold font-bengali transition-colors"
                >
                  বাতিল
                </button>
                <button 
                  onClick={confirmExtension} 
                  className="flex-1 px-4 py-3 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all active:scale-95 font-bengali"
                >
                  নিশ্চিত করুন
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showIssueForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto font-bengali">
          <motion.div initial={{scale:0.9,opacity:0}} animate={{scale:1,opacity:1}} className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl border border-slate-100 relative my-4 sm:my-8 overflow-hidden sticky top-4">
            
            {showAiScanner && (
              <div className="absolute inset-0 z-[60] bg-white flex flex-col items-center justify-center p-6">
                <div className="w-full max-w-md bg-slate-900 rounded-3xl overflow-hidden shadow-2xl relative">
                  <div className="absolute top-4 right-4 z-10 flex gap-2">
                    <button 
                      onClick={() => {
                        setShowAiScanner(false);
                        stopCamera();
                      }}
                      className="w-10 h-10 bg-black/50 text-white rounded-full flex items-center justify-center backdrop-blur hover:bg-white hover:text-black transition"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <div className="relative aspect-[3/4] bg-black">
                    <video 
                      ref={videoRef}
                      autoPlay 
                      playsInline 
                      className="w-full h-full object-cover"
                    />
                    <canvas ref={canvasRef} className="hidden" />
                    
                    <div className="absolute inset-0 pointer-events-none">
                      <div className="w-full h-full border-[10px] border-slate-900/50"></div>
                      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-64 border-2 border-white/50 rounded-xl flex items-center justify-center">
                        <div className="w-12 h-12 border-4 border-indigo-500 rounded-full animate-ping opacity-50"></div>
                      </div>
                    </div>
                  </div>
                  <div className="p-6 bg-slate-900 flex flex-col items-center">
                    <button
                      onClick={captureAndProcessAI}
                      disabled={isAiProcessing}
                      className="w-16 h-16 bg-white rounded-full flex items-center justify-center disabled:opacity-50 hover:bg-slate-200 transition-transform active:scale-95 mb-4 shadow-lg shadow-white/20"
                    >
                      <CameraIcon size={28} className="text-slate-900" />
                    </button>
                    <p className="text-center text-slate-300 text-sm font-medium font-bengali">
                      {isAiProcessing ? "AI স্ক্যান করছে..." : "বইয়ের কাভার স্ক্যান করুন"}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="absolute top-0 left-0 w-full h-2 bg-indigo-600"></div>
            <div className="sticky top-0 bg-white z-10 px-8 sm:px-10 py-6 border-b border-slate-50 flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center"><BookOpen className="w-7 h-7" /></div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight font-bengali">নতুন বই ইস্যু</h3>
            </div>
            <form onSubmit={handleIssue} className="p-8 sm:p-10 pt-4 sm:pt-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider font-bengali">বই <span className="text-rose-500">*</span></label>
                  <Select
                    options={bookOptions}
                    value={bookOptions.find(o => o.value === formData.bookId) || null}
                    onChange={(option: any) => setFormData(p => ({...p, bookId: option?.value || ''}))}
                    placeholder="বই খুঁজুন..."
                    styles={selectStyles}
                    classNamePrefix="react-select"
                    className="text-sm font-medium focus:outline-none font-bengali"
                    required
                  />
                  <div className="flex flex-col space-y-1.5 mt-2">
                    <button 
                      type="button" 
                      onClick={() => {
                        setShowAiScanner(true);
                        startCamera();
                      }}
                      className="bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 text-indigo-700 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition"
                    >
                      <ScanFace size={18} /> এআই স্ক্যানার দিয়ে বইটি খুঁজুন
                    </button>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider font-bengali">সদস্য <span className="text-rose-500">*</span></label>
                  <Select
                    options={userOptions}
                    value={userOptions.find(o => o.value === formData.userId) || null}
                    onChange={(option: any) => setFormData(p => ({...p, userId: option?.value || ''}))}
                    placeholder="সদস্য খুঁজুন..."
                    styles={selectStyles}
                    classNamePrefix="react-select"
                    className="text-sm font-medium focus:outline-none font-bengali"
                    required
                  />
                  {formData.userId && (
                    <div className={`mt-3 p-4 rounded-xl flex items-center justify-between shadow-sm border ${users.find(u => u.id === formData.userId)?.borrowBlocked ? "bg-rose-50 border-rose-200" : "bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-100"}`}>
                      <div>
                        <p className={`text-sm font-extrabold ${users.find(u => u.id === formData.userId)?.borrowBlocked ? "text-rose-700" : "text-slate-800"}`}>
                          {users.find(u => u.id === formData.userId)?.name}
                        </p>
                        {users.find(u => u.id === formData.userId)?.borrowBlocked && (
                          <p className="text-[10px] font-bold text-rose-500 mt-1 uppercase tracking-widest animate-pulse font-bengali">
                            সদস্য সাময়িকভাবে স্থগিত: {users.find(u => u.id === formData.userId)?.blockedReason || "কোন কারণ উল্লেখ করা হয়নি"}
                          </p>
                        )}
                      </div>
                      <div className={`px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest border shadow-sm ${users.find(u => u.id === formData.userId)?.borrowBlocked ? "bg-rose-600 text-white border-rose-600" : "bg-white text-indigo-700 border-indigo-200"}`}>
                        ID: #{users.find(u => u.id === formData.userId)?.memberId || 'N/A'}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="space-y-1.5 max-w-sm">
                <label className="block text-sm font-bold text-slate-700 uppercase tracking-wider font-bengali">ফেরতের সম্ভাব্য তারিখ <span className="text-rose-500">*</span></label>
                <input type="date" required value={formData.expectedReturnDate ? formData.expectedReturnDate.split('T')[0] : ''} onChange={e => {
                  const val = e.target.value;
                  if (!val) {
                    setFormData(p => ({...p, expectedReturnDate: ''}));
                    return;
                  }
                  try {
                    const d = new Date(val);
                    if (!isNaN(d.getTime())) {
                      setFormData(p => ({...p, expectedReturnDate: d.toISOString()}));
                    }
                  } catch (e) {
                    // ignore
                  }
                }} className="w-full border-2 border-slate-200 px-4 py-2 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 font-medium text-slate-700 transition font-bengali" />
              </div>
              
              <div className="sticky bottom-0 bg-white z-10 flex justify-end gap-3 py-6 border-t border-slate-50">
                <button 
                  type="button" 
                  disabled={isSubmitting}
                  onClick={() => setShowIssueForm(false)} 
                  className="px-6 py-2.5 font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition disabled:opacity-50 font-bengali"
                >
                  বাতিল
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="bg-slate-900 shadow-xl shadow-slate-900/10 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-black transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 font-bengali"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      প্রসেস করা হচ্ছে...
                    </>
                  ) : 'নিশ্চিত করুন'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl md:rounded-3xl shadow-sm overflow-hidden md:overflow-hidden">
        <table className="w-full text-left block md:table">
          <thead className="hidden md:table-header-group bg-[#f8fafc] border-b border-slate-200 font-bengali">
            <tr>
              <th className="p-5 text-sm font-black text-[#64748B]">ইস্যু / স্ট্যাটাস</th>
              <th className="p-5 text-sm font-black text-[#64748B]">বইয়ের তথ্য</th>
              <th className="p-5 text-sm font-black text-[#64748B]">সদস্যের তথ্য</th>
              <th className="p-5 text-sm font-black text-[#64748B] text-right">অ্যাকশন</th>
            </tr>
          </thead>
          <tbody className="block md:table-row-group divide-y divide-slate-100">
            {filteredIssues.map(i => (
              <tr key={i.id} className="block md:table-row hover:bg-slate-50 transition-colors group p-4 md:p-0">
                <td className="block md:table-cell p-2 md:p-5 md:align-top">
                  <div className="font-bold text-slate-700 text-sm mb-1.5 tracking-tight uppercase">
                    #{i.id.slice(-6).replace(/[0-9]/g, w => String.fromCharCode(w.charCodeAt(0) + 2486))}
                  </div>
                  <div className="mb-2 md:mb-0">
                      {(i.status === 'ISSUED' || i.status === 'Issued') ? (
                         <div className="flex flex-col gap-1.5 items-start">
                            <span className={`px-2.5 py-1 rounded-lg text-[10.5px] font-bold tracking-wide border font-bengali ${new Date(i.expectedReturnDate) < new Date() ? 'bg-rose-50 text-rose-600 border-rose-200 animate-pulse' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                               {new Date(i.expectedReturnDate) < new Date() ? 'ওভারডিউ' : 'অ্যাকটিভ'}
                            </span>
                            {i.adminNote && <span className="text-indigo-700 font-medium font-bengali text-[10.5px] bg-indigo-50/80 px-2 py-1.5 rounded-md border border-indigo-100/50 flex flex-wrap max-w-[150px]">নোট: {i.adminNote}</span>}
                         </div>
                      ) : (
                         <span className="text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg text-[10.5px] font-bold tracking-wide border border-slate-200 font-bengali">ফেরত দেওয়া হয়েছে</span>
                      )}
                  </div>
                </td>
                <td className="block md:table-cell p-2 md:p-5 md:align-top">
                  <div className="flex items-start gap-4">
                    {books.find(b => b.id === i.bookId)?.imageUrl ? (
                      <img src={books.find(b => b.id === i.bookId)?.imageUrl} alt={books.find(b => b.id === i.bookId)?.title} className="w-12 h-16 object-cover rounded-md shadow-sm border border-slate-200" referrerPolicy="no-referrer" />
                    ) : (
                      <div className="w-12 h-16 bg-slate-100 rounded-md shadow-sm border border-slate-200 flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-slate-300" />
                      </div>
                    )}
                    <div>
                      <div className="font-bold text-slate-900 text-[15px] font-bengali leading-tight mb-2">{books.find(b => b.id === i.bookId)?.title || 'অজানা বই'}</div>
                      <div className="text-xs inline-flex items-center bg-slate-50 px-2.5 py-1 rounded-md text-slate-600 font-medium border border-slate-200 font-bengali">
                        কোড: {books.find(b => b.id === i.bookId)?.bookCode?.replace(/[0-9]/g, w => String.fromCharCode(w.charCodeAt(0) + 2486)) || 'N/A'}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="block md:table-cell p-2 md:p-5 md:align-top">
                  <div className="font-bold text-slate-900 text-sm mb-1.5 font-bengali">{users.find(u => u.id === i.userId)?.name || 'অজানা সদস্য'}</div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-600 font-medium bg-slate-50 px-2.5 py-1 rounded-md border border-slate-200 font-bengali">
                      আইডি: {users.find(u => u.id === i.userId)?.memberId?.replace(/[0-9]/g, w => String.fromCharCode(w.charCodeAt(0) + 2486)) || 'N/A'}
                    </span>
                  </div>
                </td>
                
                <td className="block md:table-cell p-2 md:p-5 md:align-top md:text-right mt-4 md:mt-0 pt-4 md:pt-5 border-t border-slate-100 md:border-0 relative">
                  <div className="flex flex-wrap md:flex-col md:items-end justify-start md:justify-end gap-2 relative z-0 group-hover:z-10">
                    <div className="flex flex-wrap items-center gap-2">
                        {(i.status === 'ISSUED' || i.status === 'Issued') && (
                            <>
                                {i.returnRequested && (
                                    <div className="flex items-center gap-1.5 mr-2 bg-indigo-50/80 p-1.5 rounded-xl border border-indigo-200/60 shadow-sm backdrop-blur-sm">
                                       <span className="text-[10.5px] font-bold text-indigo-700 px-2 py-1 flex items-center h-full font-bengali">রিকোয়েস্ট: ফেরত</span>
                                    </div>
                                )}
                                {i.extendRequested && (
                                    <div className="flex items-center gap-1.5 mr-2 bg-amber-50/80 p-1.5 rounded-lg border border-amber-200/60 shadow-sm backdrop-blur-sm">
                                       <span className="text-[10.5px] font-bold text-amber-700 px-2 py-1 flex items-center h-full font-bengali">সময় বৃদ্ধি</span>
                                       <button onClick={() => handleAcceptExtend(i.id, i.expectedReturnDate)} className="bg-emerald-500 text-white text-[10.5px] px-3 py-1.5 font-bold rounded shadow-sm hover:bg-emerald-600 transition-colors active:scale-95 font-bengali">অনুমোদন</button>
                                       <button onClick={() => handleRejectExtend(i.id)} className="bg-rose-500 text-white text-[10.5px] px-3 py-1.5 font-bold rounded shadow-sm hover:bg-rose-600 transition-colors active:scale-95 font-bengali">বাতিল</button>
                                    </div>
                                )}
                                {new Date(i.expectedReturnDate) < new Date() && !i.extendRequested && (
                                    <button 
                                        onClick={() => handleAlert(i.id, users.find(u => u.id === i.userId)?.phone || '')}
                                        className="text-[10.5px] font-bold bg-rose-600 text-white px-3 py-1.5 rounded-lg shadow-sm hover:bg-rose-700 transition flex items-center gap-1.5 font-bengali"
                                        title="Send Alert"
                                    >
                                        <ShieldAlert className="w-3.5 h-3.5" /> রিমাইন্ডার
                                    </button>
                                )}
                                <button 
                                    onClick={() => {
                                        setEditId(i.id);
                                        setNote(i.adminNote || '');
                                    }}
                                    className="text-[10.5px] font-bold bg-white text-slate-700 shadow-sm px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition font-bengali"
                                >
                                    নোট
                                </button>
                                <button onClick={() => { handleReturn(i.id); }} className="text-[11px] bg-emerald-600 text-white px-4 py-1.5 rounded-lg font-bold shadow-sm hover:bg-emerald-700 transition flex items-center justify-center gap-1.5 font-bengali">
                                    <CheckCircle2 className="w-4 h-4" /> বই ফেরত
                                </button>
                            </>
                        )}
                        <button onClick={() => handleDeleteIssue(i.id)} className="p-2 bg-white border border-slate-200 rounded-lg text-rose-500 shadow-sm hover:bg-rose-50 hover:text-rose-600 transition" title="Delete Record">
                            <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                    {editId === i.id && (
                       <div className="mt-2 flex gap-1 animate-in fade-in slide-in-from-top-2 absolute right-0 top-12 bg-white p-2 rounded-xl shadow-xl border border-slate-200 w-64 z-20">
                          <input 
                            className="text-xs font-medium border-2 border-slate-100 focus:border-indigo-500 focus:ring-0 p-2 rounded-lg w-full transition font-bengali" 
                            placeholder="মেসেজ দিন..."
                            value={note}
                            onChange={e=>setNote(e.target.value)}
                            autoFocus
                          />
                          <button onClick={() => handleUpdateNote(i.id)} className="bg-indigo-600 text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-indigo-700 transition">OK</button>
                          <button onClick={() => setEditId(null)} className="bg-slate-100 text-slate-600 text-xs font-bold px-3 py-2 rounded-lg hover:bg-slate-200 transition">X</button>
                       </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
