import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy, where, getDocsFromCache, getDocsFromServer } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Plus, Trash2, Calendar, FileText, CheckCircle, Clock, Printer, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../../store/AuthContext';
import { Link } from 'react-router-dom';
import Select from 'react-select';

interface Event {
  id: string;
  title: string;
  description: string;
  date: string;
  deadline: string;
  status: 'Active' | 'Closed' | 'Upcoming';
  type: string;
  image?: string;
  creatorId?: string;
  isScholarship?: boolean;
  requiredDocuments?: string[];
  customQuestions?: string[];
  targetUserPhone?: string;
}

export default function ManageEvents() {
  const { user } = useAuth();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editEventId, setEditEventId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    deadline: '',
    status: 'Upcoming' as 'Upcoming' | 'Active' | 'Closed',
    type: 'Competition',
    image: '',
    isScholarship: false,
    requiredDocuments: [] as string[],
    customQuestions: [] as string[],
    targetUserPhone: ''
  });
  const [viewApplicants, setViewApplicants] = useState<string | null>(null);
  const [applicants, setApplicants] = useState<any[]>([]);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchEvents();
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const cacheKey = 'admin_users_cache';
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        setUsers(JSON.parse(cached));
        // Still fetch in background if older than 30 mins
        const lastFetch = sessionStorage.getItem(cacheKey + '_time');
        if (lastFetch && Date.now() - parseInt(lastFetch) < 30 * 60 * 1000) return;
      }

      const q = query(collection(db, 'users'));
      let querySnapshot;
      try {
        querySnapshot = await getDocsFromCache(q);
      } catch (e) {
        querySnapshot = await getDocsFromServer(q);
      }
      
      const fetchedUsers = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(fetchedUsers);
      sessionStorage.setItem(cacheKey, JSON.stringify(fetchedUsers));
      sessionStorage.setItem(cacheKey + '_time', Date.now().toString());
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  useEffect(() => {
    if (viewApplicants) {
      fetchApplicants(viewApplicants);
    }
  }, [viewApplicants]);

  const fetchApplicants = async (eventId: string) => {
    setLoadingApplicants(true);
    try {
      const q = query(collection(db, 'event_registrations'), where('eventId', '==', eventId));
      const querySnapshot = await getDocs(q);
      const fetchedApplicants = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setApplicants(fetchedApplicants);
    } catch (error) {
      console.error("Error fetching applicants:", error);
      toast.error("আবেদনকারী লোড করতে সমস্যা হয়েছে");
    } finally {
      setLoadingApplicants(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const cacheKey = 'admin_events_cache';
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        setEvents(JSON.parse(cached));
        const lastFetch = sessionStorage.getItem(cacheKey + '_time');
        if (lastFetch && Date.now() - parseInt(lastFetch) < 10 * 60 * 1000) {
          setLoading(false);
          return;
        }
      }

      const q = query(collection(db, 'events'), orderBy('date', 'desc'));
      let querySnapshot;
      try {
        querySnapshot = await getDocsFromCache(q);
      } catch (e) {
        querySnapshot = await getDocsFromServer(q);
      }

      const fetchedEvents = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Event[];
      setEvents(fetchedEvents);
      sessionStorage.setItem(cacheKey, JSON.stringify(fetchedEvents));
      sessionStorage.setItem(cacheKey + '_time', Date.now().toString());
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("ইভেন্ট লোড করতে সমস্যা হয়েছে");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return toast.error("অনুগ্রহ করে লগইন করুন");
    
    try {
      if (editEventId) {
        await updateDoc(doc(db, 'events', editEventId), {
          ...formData,
        });
        toast.success("ইভেন্ট সফলভাবে আপডেট হয়েছে");
      } else {
        await addDoc(collection(db, 'events'), {
          ...formData,
          creatorId: user.id,
          createdAt: new Date().toISOString()
        });
        toast.success("ইভেন্ট সফলভাবে তৈরি হয়েছে");
      }
      resetForm();
      fetchEvents();
    } catch (error) {
      console.error("Error saving event:", error);
      toast.error("ইভেন্ট সেভ করতে সমস্যা হয়েছে");
    }
  };

  const resetForm = () => {
      setFormData({
        title: '',
        description: '',
        date: '',
        deadline: '',
        status: 'Upcoming',
        type: 'Competition',
        image: '',
        isScholarship: false,
        requiredDocuments: [],
        customQuestions: [],
        targetUserPhone: ''
      });
      setShowAddForm(false);
      setEditEventId(null);
  };

  const handleEditClick = (event: Event) => {
    setFormData({
      title: event.title,
      description: event.description,
      date: event.date,
      deadline: event.deadline,
      status: event.status,
      type: event.type,
      image: event.image || '',
      isScholarship: !!event.isScholarship,
      requiredDocuments: event.requiredDocuments || [],
      customQuestions: event.customQuestions || [],
      targetUserPhone: event.targetUserPhone || ''
    });
    setEditEventId(event.id);
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("আপনি কি নিশ্চিতভাবে এই ইভেন্টটি ডিলিট করতে চান?")) return;
    try {
      await deleteDoc(doc(db, 'events', id));
      toast.success("ইভেন্টটি ডিলিট করা হয়েছে");
      fetchEvents();
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("ইভেন্ট ডিলিট করতে সমস্যা হয়েছে");
    }
  };

  const updateStatus = async (id: string, newStatus: Event['status']) => {
    try {
      await updateDoc(doc(db, 'events', id), { status: newStatus });
      toast.success("স্ট্যাটাস আপডেট করা হয়েছে");
      fetchEvents();
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  const handlePrintAllApplicants = () => {
    const eventName = events.find(e => e.id === viewApplicants)?.title || 'আবেদনকারী তালিকা';
    const html = `
      <html>
        <head>
          <title>${eventName} - সকল আবেদনকারী</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;700;900&display=swap');
            body { font-family: 'Noto Sans Bengali', sans-serif; margin: 0; padding: 40px; color: #1e293b; }
            .header { text-align: center; margin-bottom: 40px; border-bottom: 3px solid #0f172a; padding-bottom: 20px; }
            h1 { margin: 0; font-size: 32px; font-weight: 900; }
            h2 { color: #4f46e5; margin-top: 10px; }
            table { w-full border-collapse: collapse; width: 100%; mt-8; }
            th, td { border: 1px solid #e2e8f0; padding: 12px; text-align: left; }
            th { background: #f8fafc; font-weight: 900; }
            @media print { body { padding: 0; } }
          </style>
        </head>
        <body onload="setTimeout(() => window.print(), 500)">
          <div class="header">
            <h1>পানধোয়া উন্মুক্ত পাঠাগার</h1>
            <h2>${eventName} - সকল আবেদনকারীর তালিকা</h2>
            <p>মোট আবেদনকারী: ${applicants.length} জন</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>ক্রমিক</th>
                <th>নাম</th>
                <th>মোবাইল নম্বর</th>
                <th>আবেদনের সময়</th>
                <th>ট্র্যাকিং আইডি</th>
              </tr>
            </thead>
            <tbody>
              ${applicants.map((app, idx) => `
                <tr>
                  <td>${idx + 1}</td>
                  <td>${app.userName}</td>
                  <td>${app.userPhone}</td>
                  <td>${new Date(app.registeredAt?.seconds * 1000).toLocaleString('bn-BD')}</td>
                  <td>#E${app.registeredAt?.seconds?.toString().slice(-6) || '----'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  const handlePrintApplicant = (app: any) => {
    const eventName = events.find(e => e.id === viewApplicants)?.title || 'আবেদন ফরম';

    let photoUrl = '';
    if (app.documents) {
       for (const [name, url] of Object.entries(app.documents) as [string, string][]) {
          if (name.toLowerCase().includes('ছবি') || name.toLowerCase().includes('photo') || name.toLowerCase().includes('image') || name.toLowerCase().includes('picture')) {
             photoUrl = url;
             break;
          }
       }
    }

    const photoHtml = photoUrl 
      ? `<div class="photo-box"><img src="${photoUrl}" alt="Applicant Photo" /></div>`
      : `<div class="photo-placeholder"><p>আবেদনকারীর<br/>ছবি</p></div>`;

    const html = `
      <html>
        <head>
          <title>${app.userName} - ডেটা সংগ্রহ ফরম</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;700;900&display=swap');
            * { box-sizing: border-box; }
            body { 
              font-family: 'Noto Sans Bengali', sans-serif; 
              margin: 0; 
              padding: 40px; 
              color: #1e293b; 
              background-color: #f8fafc;
              line-height: 1.6;
            }
            .document-container {
              max-width: 800px;
              margin: 0 flex;
              background: #ffffff;
              padding: 50px;
              border-radius: 12px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.05);
              border: 1px solid #e2e8f0;
            }
            .header { 
              display: flex; 
              justify-content: space-between; 
              align-items: flex-start;
              border-bottom: 3px solid #0f172a; 
              padding-bottom: 30px; 
              margin-bottom: 40px; 
            }
            .header-content { flex: 1; }
            .brand-name { margin: 0; font-size: 32px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px;}
            .address { margin: 5px 0 0; font-size: 13px; color: #64748b; font-weight: 500; }
            .form-title { 
              font-weight: 900; 
              color: #4f46e5; 
              font-size: 20px; 
              margin-top: 20px; 
              display: inline-block;
              background: #eef2ff;
              padding: 6px 16px;
              border-radius: 6px;
              border: 1px solid #c7d2fe;
            }
            
            .photo-box { width: 130px; height: 160px; border: 2px solid #e2e8f0; border-radius: 8px; overflow: hidden; background: #f8fafc; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
            .photo-box img { width: 100%; height: 100%; object-fit: cover; }
            .photo-placeholder { width: 130px; height: 160px; border: 2px dashed #cbd5e1; border-radius: 8px; display: flex; align-items: center; justify-content: center; text-align: center; color: #94a3b8; font-size: 13px; font-weight: bold; background: #f8fafc;}
            
            .section { margin-bottom: 40px; }
            .section-title { 
              font-size: 16px; 
              font-weight: 900; 
              color: #0f172a;
              text-transform: uppercase;
              letter-spacing: 1px;
              border-bottom: 2px solid #e2e8f0;
              padding-bottom: 10px;
              margin-bottom: 20px;
              display: flex;
              align-items: center;
              gap: 10px;
            }
            .section-title::before {
              content: '';
              display: inline-block;
              width: 12px;
              height: 12px;
              background: #4f46e5;
              border-radius: 3px;
            }
            
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 20px;
            }
            .info-item {
              background: #f8fafc;
              padding: 16px 20px;
              border-radius: 8px;
              border: 1px solid #f1f5f9;
            }
            .info-label {
              font-size: 11px;
              font-weight: 700;
              color: #64748b;
              text-transform: uppercase;
              letter-spacing: 0.5px;
              margin-bottom: 4px;
            }
            .info-value {
              font-size: 16px;
              font-weight: 700;
              color: #0f172a;
              margin: 0;
            }
            
            .qa-box { 
              margin-bottom: 20px; 
              page-break-inside: avoid; 
              border: 1px solid #e2e8f0; 
              border-radius: 10px; 
              background: #fff;
              overflow: hidden;
            }
            .q-text { 
              font-weight: 700; 
              color: #1e293b; 
              margin: 0; 
              font-size: 15px; 
              background: #f8fafc;
              padding: 12px 16px;
              border-bottom: 1px solid #e2e8f0;
            }
            .a-text { 
              margin: 0; 
              color: #334155; 
              font-size: 15px; 
              line-height: 1.6; 
              padding: 16px;
            }
            
            .footer { 
              margin-top: 80px; 
              display: flex; 
              justify-content: space-between; 
              font-size: 14px; 
              color: #64748b;
              page-break-inside: avoid;
            }
            .signature-block {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 10px;
            }
            .signature-line {
              width: 200px;
              border-bottom: 1.5px dashed #94a3b8;
            }
            .signature-text {
              font-weight: 600;
              font-size: 13px;
              color: #475569;
            }
            
            .meta-stamp {
              text-align: center;
              margin-top: 50px;
              font-size: 10px;
              color: #cbd5e1;
              text-transform: uppercase;
              letter-spacing: 2px;
              font-weight: 700;
            }

            @media print {
              body { background: white; padding: 0; }
              .document-container { border: none; box-shadow: none; padding: 0; max-width: 100%; }
              .qa-box { border: 1px solid #e2e8f0 !important; }
              .form-title { border: 1px solid #000; color: #000; background: #fff; }
              .section-title::before { background: #000; }
              .info-item { border: 1px solid #e2e8f0; }
            }
          </style>
        </head>
        <body onload="setTimeout(() => window.print(), 500)">
          <div class="document-container">
            <div class="header">
              <div class="header-content">
                <h1 class="brand-name">পানধোয়া উন্মুক্ত পাঠাগার</h1>
                <p class="address">সেনওয়ালিয়া-১৩৪৪, আশুলিয়া, সাভার, ঢাকা</p>
                <div class="form-title">${eventName}</div>
              </div>
              ${photoHtml}
            </div>

            <div class="section">
              <div class="section-title">ব্যক্তিগত ও সাধারণ তথ্য</div>
              <div class="info-grid">
                <div class="info-item">
                  <div class="info-label">আবেদনকারীর নাম</div>
                  <p class="info-value">${app.userName}</p>
                </div>
                <div class="info-item">
                  <div class="info-label">মোবাইল নম্বর</div>
                  <p class="info-value">${app.userPhone}</p>
                </div>
                <div class="info-item">
                  <div class="info-label">আবেদনের তারিখ ও সময়</div>
                  <p class="info-value">${new Date(app.registeredAt?.seconds * 1000).toLocaleString('bn-BD')}</p>
                </div>
                <div class="info-item">
                  <div class="info-label">সিস্টেম ট্র্যাকিং আইডি</div>
                  <p class="info-value" style="font-family: monospace;">#E${app.registeredAt?.seconds.toString().slice(-6)}</p>
                </div>
              </div>
            </div>

            ${app.answers ? `
              <div class="section">
                <div class="section-title">সংগৃহীত তথ্য ও প্রশ্নোত্তর</div>
                ${Object.entries(app.answers).map(([q, a]) => `
                  <div class="qa-box">
                    <p class="q-text">${q}</p>
                    <p class="a-text">${a as string || '<span style="color:#94a3b8;font-style:italic;">উত্তর প্রদান করা হয়নি</span>'}</p>
                  </div>
                `).join('')}
              </div>
            ` : ''}

            <div class="footer">
              <div class="signature-block">
                <div class="signature-line"></div>
                <div class="signature-text">আবেদনকারীর স্বাক্ষর ও তারিখ</div>
              </div>
              <div class="signature-block">
                <div class="signature-line"></div>
                <div class="signature-text">মূল্যায়নকারী/কর্তৃপক্ষের স্বাক্ষর</div>
              </div>
            </div>
            
            <div class="meta-stamp">
              System Generated Document • Verified by Pan Dhoa Library Data Platform
            </div>
          </div>
        </body>
      </html>
    `;
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 font-bengali">ইভেন্ট ম্যানেজমেন্ট</h1>
          <p className="text-gray-600 font-bengali">বৃত্তি, প্রতিযোগিতা এবং অন্যান্য ইভেন্ট তৈরি করুন</p>
          <Link to="/events" target="_blank" rel="noreferrer" className="text-indigo-600 font-bengali text-sm font-bold hover:underline mt-2 inline-block">
            + সদস্যের জন্য আবেদন জমা দিন (পাবলিক পেজ)
          </Link>
        </div>
        {user?.role !== 'visitor_admin' && (
          <button
            onClick={() => {
              if (showAddForm) {
                setShowAddForm(false);
              } else {
                resetForm();
                setShowAddForm(true);
              }
            }}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-slate-900 transition-all font-bengali shadow-lg shadow-indigo-100 active:scale-95"
          >
            <Plus size={20} /> নতুন ইভেন্ট যোগ করুন
          </button>
        )}
      </div>

      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed inset-0 z-[60] overflow-y-auto bg-[#f0ebf8]"
          >
            <div className="min-h-screen py-8 px-4">
              {/* Top Navigation / Close */}
              <div className="max-w-3xl mx-auto flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                   <div className="bg-[#673ab7] p-2 rounded-lg">
                      <Plus size={24} className="text-white" />
                   </div>
                   <h2 className="text-xl font-bold font-bengali text-slate-800">ইভেন্ট তৈরি/এডিট করুন</h2>
                </div>
                <button 
                  onClick={() => setShowAddForm(false)}
                  className="p-2 hover:bg-slate-200 rounded-full transition-colors"
                >
                  <X size={24} className="text-slate-600" />
                </button>
              </div>

              {/* Google Form Style Container */}
              <div className="max-w-3xl mx-auto space-y-4">
                <form id="event-create-form" onSubmit={handleSubmit} className="space-y-4 pb-20">
                  {/* Characteristic Google Form Top Accent */}
                  <div className="h-2.5 bg-[#673ab7] w-full rounded-t-xl mb-[-4px]" />
                  
                  {/* Header Card */}
                  <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm relative p-8">
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full text-4xl font-bold font-bengali text-slate-900 border-b-2 border-transparent focus:border-[#673ab7] mb-6 outline-none transition-all placeholder:text-slate-200 py-2"
                      placeholder="ইভেন্টের নাম (Event Title)"
                    />
                    <textarea
                      required
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-0 py-2 bg-transparent text-slate-700 font-bengali text-lg outline-none resize-none min-h-[100px] placeholder:text-slate-300"
                      placeholder="ইভেন্টের বিস্তারিত বর্ণনা এখানে লিখুন..."
                    />
                  </div>

                  {/* Question Card: Event Type */}
                  <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm transition-all hover:shadow-md">
                    <label className="block text-base font-bold text-slate-900 font-bengali mb-6 border-l-4 border-[#673ab7] pl-4">ইভেন্টের ধরণ (Event Type) *</label>
                    <div className="flex flex-wrap gap-3">
                      {['প্রতিযোগিতা', 'বৃত্তি', 'ওয়ার্কশপ', 'প্রশ্ন উত্তর', 'অন্যান্য'].map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => setFormData({ 
                            ...formData, 
                            type,
                            isScholarship: type === 'Scholarship' || type === 'QuestionAnswer' || type === 'বৃত্তি' || type === 'প্রশ্ন উত্তর'
                          })}
                          className={`px-8 py-3.5 rounded-xl font-bold font-bengali transition-all border-2 ${
                            formData.type === type 
                              ? 'bg-[#673ab7] text-white border-[#673ab7] shadow-lg shadow-indigo-200' 
                              : 'bg-white text-slate-600 border-slate-100 hover:border-[#673ab7]/30'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Question Card: Timing */}
                  <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                      <div className="group">
                        <label className="block text-base font-bold text-slate-900 font-bengali mb-4 border-l-4 border-indigo-500 pl-4">ইভেন্টের সময়</label>
                        <input
                          type="datetime-local"
                          required
                          value={formData.date}
                          onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                          className="w-full px-0 py-3 border-b-2 border-slate-100 group-focus-within:border-[#673ab7] outline-none font-bold text-slate-700 transition-all bg-transparent"
                        />
                      </div>
                      <div className="group">
                        <label className="block text-base font-bold text-slate-900 font-bengali mb-4 border-l-4 border-rose-500 pl-4">রেজিস্ট্রেশন শেষ সময়</label>
                        <input
                          type="datetime-local"
                          required
                          value={formData.deadline}
                          onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                          className="w-full px-0 py-3 border-b-2 border-slate-100 group-focus-within:border-rose-500 outline-none font-bold text-rose-600 transition-all bg-transparent"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Question Card: Image */}
                  <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm group">
                    <label className="block text-base font-bold text-slate-900 font-bengali mb-4 border-l-4 border-sky-500 pl-4">ইভেন্ট কভার ইমেজ ইউআরএল (URL)</label>
                    <input
                      type="url"
                      value={formData.image}
                      onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                      className="w-full px-0 py-3 border-b-2 border-slate-100 group-focus-within:border-[#673ab7] outline-none font-mono text-sm placeholder:text-slate-300 transition-all"
                      placeholder="https://example.com/banner.jpg"
                    />
                  </div>

                  {/* Scholarship specific cards... */}
                  {formData.isScholarship && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm group">
                        <label className="block text-base font-bold text-slate-900 font-bengali mb-6 border-l-4 border-amber-500 pl-4">ইউজার ফিল্টারিং</label>
                        <div className="space-y-8">
                          <div>
                            <p className="text-sm font-bold text-slate-400 mb-2 font-bengali">অ্যাডমিশন ডকুমেন্টস (কমা দিয়ে লিখুন)</p>
                            <input
                              type="text"
                              value={formData.requiredDocuments.join(', ')}
                              onChange={(e) => setFormData({ ...formData, requiredDocuments: e.target.value.split(',').map(s => s.trim()).filter(s => s !== '') })}
                              className="w-full p-0 py-3 border-b-2 border-slate-100 group-focus-within:border-[#673ab7] outline-none font-bengali text-lg transition-all"
                              placeholder="উদাঃ ফটো আইডি, মার্কশিট"
                            />
                          </div>
                          <div>
                             <p className="text-sm font-bold text-slate-400 mb-2 font-bengali">নির্দিষ্ট ইউজার নির্বাচন (ঐচ্ছিক)</p>
                             <Select
                                options={[
                                  { value: '', label: 'সবাই (পাবলিক ইভেন্ট)' },
                                  ...users.map(u => ({
                                    value: u.phone || u.memberId || u.email,
                                    label: `${u.name} - ${u.phone || u.memberId}`
                                  }))
                                ]}
                                value={formData.targetUserPhone ? { value: formData.targetUserPhone, label: formData.targetUserPhone } : { value: '', label: 'সবাই (পাবলিক ইভেন্ট)' }}
                                onChange={(selectedOption) => setFormData({ ...formData, targetUserPhone: selectedOption ? selectedOption.value : '' })}
                                className="font-bengali"
                                styles={{
                                  control: (base) => ({
                                    ...base,
                                    border: 'none',
                                    borderBottom: '2px solid #f1f5f9',
                                    borderRadius: '0',
                                    padding: '5px 0',
                                    boxShadow: 'none'
                                  })
                                }}
                             />
                          </div>
                        </div>
                      </div>

                      <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
                        <label className="block text-base font-bold text-slate-900 font-bengali mb-6 border-l-4 border-fuchsia-500 pl-4">কাস্টম প্রশ্নাবলি (Questions)</label>
                        <div className="space-y-6">
                           {formData.customQuestions.map((q, idx) => (
                              <div key={idx} className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-start gap-4">
                                 <span className="bg-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-[#673ab7] shadow-sm shrink-0 mt-1">{idx + 1}</span>
                                 <div className="flex-1 space-y-4">
                                    <input
                                      type="text"
                                      value={q}
                                      onChange={(e) => {
                                         const newQs = [...formData.customQuestions];
                                         newQs[idx] = e.target.value;
                                         setFormData({ ...formData, customQuestions: newQs });
                                      }}
                                      className="w-full bg-transparent border-b-2 border-slate-200 focus:border-[#673ab7] outline-none font-bold font-bengali text-slate-800 py-2 transition-all"
                                      placeholder="আপনার প্রশ্নটি টাইপ করুন..."
                                    />
                                 </div>
                                 <button
                                    type="button"
                                    onClick={() => {
                                       const newQs = formData.customQuestions.filter((_, i) => i !== idx);
                                       setFormData({ ...formData, customQuestions: newQs });
                                    }}
                                    className="p-2 text-rose-400 hover:bg-rose-50 rounded-lg transition"
                                 >
                                    <Trash2 size={22} />
                                 </button>
                              </div>
                           ))}
                           <button
                              type="button"
                              onClick={() => setFormData({ ...formData, customQuestions: [...formData.customQuestions, ''] })}
                              className="w-full py-4 rounded-xl border-2 border-dashed border-slate-200 text-[#673ab7] font-bold font-bengali hover:bg-white hover:border-[#673ab7] transition-all flex items-center justify-center gap-2"
                           >
                              <Plus size={20} /> আরও একটি প্রশ্ন যোগ করুন
                           </button>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Submission Row */}
                  <div className="sticky bottom-8 left-0 right-0 py-6 px-8 bg-white/80 backdrop-blur-md rounded-2xl border border-slate-200 shadow-2xl flex justify-between items-center z-10 mx-auto max-w-2xl">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="text-slate-500 font-bold font-bengali px-8 py-3 hover:bg-slate-100 rounded-xl transition"
                    >
                      বাতিল
                    </button>
                    <button
                      type="submit"
                      className="bg-[#673ab7] text-white px-12 py-4 rounded-xl font-bengali font-bold text-lg hover:shadow-[0_10px_30px_rgba(103,58,183,0.3)] transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                      সেভ করুন (Save Changes)
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : (
        <motion.div 
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1
              }
            }
          }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {events.map((event) => (
            <motion.div
              layout
              variants={{
                hidden: { opacity: 0, y: 20, scale: 0.95 },
                show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.5 } }
              }}
              whileHover={{ y: -5, transition: { duration: 0.2 } }}
              key={event.id}
              className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="h-40 bg-gray-100 flex items-center justify-center relative overflow-hidden">
                {event.image ? (
                  <img src={event.image} alt={event.title} referrerPolicy="no-referrer" className="w-full h-full object-cover" />
                ) : (
                  <Calendar className="text-gray-300" size={48} />
                )}
                <div className="absolute top-4 right-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold font-bengali ${
                    event.status === 'Active' ? 'bg-green-100 text-green-600' :
                    event.status === 'Closed' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    {event.status === 'Active' ? 'চলমান' : event.status === 'Closed' ? 'বন্ধ' : 'আসন্ন'}
                  </span>
                </div>
              </div>
              <div className="p-5">
                <h3 className="text-xl font-bold font-black text-slate-800 mb-3 font-bengali leading-relaxed">{event.title}</h3>
                <p className="text-slate-500 text-sm mb-5 line-clamp-2 font-bengali leading-relaxed">{event.description}</p>
                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Calendar size={16} />
                    <span className="font-bengali">{new Date(event.date).toLocaleDateString('bn-BD')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Clock size={16} />
                    <span className="font-bengali">ডেডলাইন: {new Date(event.deadline).toLocaleDateString('bn-BD')}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setViewApplicants(event.id)}
                      className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-lg text-xs font-bold font-bengali transition-colors"
                    >
                      আবেদনকারী দেখুন
                    </button>
                    {user?.role !== 'visitor_admin' && (
                      <select
                        value={event.status}
                        onChange={(e) => updateStatus(event.id, e.target.value as any)}
                        className="text-xs border rounded px-2 py-1 outline-none font-bengali"
                      >
                        <option value="Upcoming">আসন্ন</option>
                        <option value="Active">চলমান</option>
                        <option value="Closed">বন্ধ</option>
                      </select>
                    )}
                  </div>
                  {user?.role !== 'visitor_admin' && (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleEditClick(event)}
                        className="text-emerald-600 hover:bg-emerald-50 p-2 rounded-lg transition-colors"
                        title="ইভেন্ট এডিট করুন"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                      </button>
                      <button
                        onClick={() => handleDelete(event.id)}
                        className="text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                        title="ডিলিট করুন"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
          {events.length === 0 && (
            <div className="col-span-full py-20 text-center text-gray-500 font-bengali">
              কোন ইভেন্ট পাওয়া যায়নি
            </div>
          )}
        </motion.div>
      )}

      {/* Applicant View Modal */}
      <AnimatePresence>
        {viewApplicants && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewApplicants(null)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative bg-white w-full max-w-4xl rounded-[2rem] shadow-2xl p-8 overflow-y-auto max-h-[90vh]">
               <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-black text-slate-800 font-bengali">আবেদনকারীদের তালিকা</h2>
                  <div className="flex items-center gap-4">
                     {applicants.length > 0 && (
                        <button onClick={handlePrintAllApplicants} className="flex items-center gap-2 bg-indigo-50 text-indigo-600 px-4 py-2 rounded-xl text-sm font-bold font-bengali hover:bg-indigo-100 transition-colors">
                           <Printer size={16} /> একত্রে প্রিন্ট করুন
                        </button>
                     )}
                     <button onClick={() => setViewApplicants(null)} className="text-slate-400 hover:text-slate-600">বন্ধ করুন</button>
                  </div>
               </div>

               {loadingApplicants ? (
                 <div className="flex justify-center py-10"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
               ) : applicants.length === 0 ? (
                 <div className="text-center py-10 text-slate-500 font-bengali">কোন আবেদনকারী পাওয়া যায়নি</div>
               ) : (
                 <div className="space-y-6">
                   {applicants.map((app) => (
                     <div key={app.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-100">
                        <div className="flex justify-between mb-4">
                           <div>
                              <h4 className="font-bold text-slate-800 font-bengali text-lg leading-[1.8] mb-1">{app.userName}</h4>
                              <p className="text-sm text-slate-500">{app.userPhone}</p>
                           </div>
                           <div className="flex flex-col items-end gap-2">
                              <span className="text-xs text-slate-400">{new Date(app.registeredAt?.seconds * 1000).toLocaleString('bn-BD')}</span>
                              <button 
                                 onClick={() => handlePrintApplicant(app)}
                                 className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-xs font-bold transition-colors font-bengali"
                              >
                                 <Printer size={14} /> প্রিন্ট করুন
                              </button>
                           </div>
                        </div>
                        
                        {app.answers && (
                          <div className="mb-4 space-y-2">
                             <p className="text-xs font-bold text-indigo-600 uppercase font-bengali">প্রশ্নোত্তর:</p>
                             {Object.entries(app.answers).map(([q, a]: any) => (
                               <div key={q} className="bg-white p-3 rounded-lg border border-slate-100">
                                  <p className="text-xs text-slate-400 font-bengali">{q}</p>
                                  <p className="text-sm font-bold text-slate-700 font-bengali">{a}</p>
                               </div>
                             ))}
                          </div>
                        )}

                        {app.documents && (
                           <div className="flex flex-wrap gap-2">
                              {Object.entries(app.documents).map(([name, url]: any) => (
                                <a
                                  key={name}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-slate-900 transition-colors"
                                >
                                  <FileText size={14} /> {name} (ডাউনলোড)
                                </a>
                              ))}
                           </div>
                        )}
                     </div>
                   ))}
                 </div>
               )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
