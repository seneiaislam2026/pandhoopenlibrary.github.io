import React, { useEffect, useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Search, ShoppingCart, ShoppingBag, X, Plus, Minus, CreditCard, Library, Truck, CheckCircle2, Package, Clock, Calendar, Copy, Printer, ArrowRight } from 'lucide-react';
import { onSnapshot, collection, doc, addDoc, serverTimestamp, getDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import toast from 'react-hot-toast';
import { Helmet } from 'react-helmet-async';
import { useAuth } from '../../store/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';

interface ShopBook {
  id: string;
  title: string;
  author: string;
  price: number;
  cover?: string;
  category?: string;
  description?: string;
  stock?: number;
  isPreOrderAvailable?: boolean;
}

interface CartItem {
  bookId: string;
  title: string;
  price: number;
  quantity: number;
  cover?: string;
}

export default function BuyBooks() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const printRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: printRef,
  });

  const [books, setBooks] = useState<ShopBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [showCheckout, setShowCheckout] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [lastOrderId, setLastOrderId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Order Tracking
  const [trackOrderId, setTrackOrderId] = useState('');
  const [trackedOrder, setTrackedOrder] = useState<any>(null);
  const [isTracking, setIsTracking] = useState(false);

  // Form
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    deliveryType: 'COD' as 'COD' | 'LibraryPickup'
  });

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'shop-books'), (snapshot) => {
      setBooks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as ShopBook[]);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'shop-books');
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const addToCart = (book: ShopBook) => {
    if (!user) {
      toast.error('বই কিনতে হলে আপনাকে প্রথমে লগইন করতে হবে');
      navigate('/login');
      return;
    }
    setCart(prev => {
      const existing = prev.find(item => item.bookId === book.id);
      if (existing) {
        return prev.map(item => item.bookId === book.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { bookId: book.id, title: book.title, price: book.price, cover: book.cover, quantity: 1 }];
    });
    toast.success('কার্টে যোগ করা হয়েছে!');
  };

  const removeFromCart = (bookId: string) => {
    setCart(prev => prev.filter(item => item.bookId !== bookId));
  };

  const updateQuantity = (bookId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.bookId === bookId) {
        const newQty = Math.max(1, item.quantity + delta);
        return { ...item, quantity: newQty };
      }
      return item;
    }));
  };

  const totalPrice = useMemo(() => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0), [cart]);
  const finalTotalPrice = useMemo(() => totalPrice + (formData.deliveryType === 'COD' ? 60 : 0), [totalPrice, formData.deliveryType]);

  const generateOrderId = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setIsSubmitting(true);

    try {
      const orderData = {
        customerName: formData.name,
        customerPhone: formData.phone,
        customerAddress: formData.address,
        deliveryType: formData.deliveryType,
        items: cart.map(item => ({
          id: item.bookId,
          title: item.title,
          price: item.price,
          quantity: item.quantity
        })),
        totalPrice: finalTotalPrice,
        subTotal: totalPrice,
        deliveryCharge: formData.deliveryType === 'COD' ? 60 : 0,
        status: 'Pending',
        createdAt: serverTimestamp()
      };

      const orderId = generateOrderId();
      await setDoc(doc(db, 'shop-orders', orderId), orderData);
      setLastOrderId(orderId);
      setShowSuccessModal(true);
      setCart([]);
      setShowCheckout(false);
      setShowCart(false);
    } catch (err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'shop-orders');
      toast.error('অর্ডার করতে ব্যর্থ হয়েছে');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTrackOrder = async (idToTrack?: string) => {
    const id = idToTrack || trackOrderId.trim();
    if (!id) return;
    setIsTracking(true);
    try {
      const docSnap = await getDoc(doc(db, 'shop-orders', id));
      if (docSnap.exists()) {
        setTrackedOrder({ id: docSnap.id, ...docSnap.data() });
      } else {
        toast.error('অর্ডার পাওয়া যায়নি। আইডি চেক করুন।');
        setTrackedOrder(null);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `shop-orders/${id}`);
    } finally {
      setIsTracking(false);
    }
  };

  const filtered = useMemo(() => books.filter(b => 
    b.title.toLowerCase().includes(search.toLowerCase()) || 
    b.author.toLowerCase().includes(search.toLowerCase())
  ), [books, search]);

  return (
    <div className="bg-white min-h-screen">
      <Helmet>
        <title>বই বাজার - পানধোয়া উন্মুক্ত পাঠাগার</title>
        <meta name="description" content="এখান থেকে আপনি আপনার পছন্দের সব নতুন বইগুলো সংগ্রহ করতে পারবেন।" />
      </Helmet>

      {/* Page Header */}
      <div className="bg-slate-50 border-b border-slate-100 pt-32 pb-20 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <motion.h1 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="text-4xl md:text-7xl font-black text-slate-900 mb-6 font-bengali tracking-tight"
          >
            বই বাজার
          </motion.h1>
          <p className="text-xl md:text-2xl text-slate-500 font-bengali max-w-2xl mx-auto font-medium">নতুন বই কিনুন এবং আমাদের পাঠাগারের উন্নয়নে সাহায্য করুন। সরাসরি আপনার ঠিকানায় পৌঁছে দেব।</p>
          
          <div className="flex flex-col md:flex-row justify-center items-center gap-6 mt-12 max-w-4xl mx-auto px-6">
             <div className="relative flex-1 w-full">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
                <input 
                  type="text" 
                  placeholder="বইয়ের নাম বা লেখক দিয়ে খুঁজুন..." 
                  className="w-full pl-16 pr-8 py-5 bg-white border border-slate-200 rounded-[2rem] outline-none focus:ring-4 focus:ring-indigo-50 transition-all font-bengali font-bold text-lg"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
             </div>
             <div className="flex gap-4 w-full md:w-auto">
                <button 
                  onClick={() => setShowCart(true)}
                  className="flex-1 md:flex-none px-8 py-5 bg-white border border-slate-200 text-slate-900 rounded-[2rem] hover:border-indigo-600 transition-all flex items-center justify-center gap-3 font-bengali font-black relative"
                >
                   <ShoppingCart size={24} />
                   কার্ট
                   {cart.length > 0 && <span className="absolute -top-3 -right-3 bg-indigo-600 text-white text-xs w-8 h-8 rounded-full flex items-center justify-center border-4 border-white font-sans">{cart.length}</span>}
                </button>
                <button 
                  onClick={() => { const el = document.getElementById('tracking'); el?.scrollIntoView({ behavior: 'smooth' }); }}
                  className="flex-1 md:flex-none px-8 py-5 bg-slate-900 text-white rounded-[2rem] font-bengali font-black hover:bg-indigo-600 transition-all shadow-xl active:scale-95"
                >
                   অর্ডার ট্র্যাকিং
                </button>
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-20">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-10">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[2/3] bg-slate-50 rounded-[2.5rem] mb-6 border border-slate-100"></div>
                <div className="h-6 bg-slate-50 rounded-full w-3/4 mb-4"></div>
                <div className="h-4 bg-slate-50 rounded-full w-1/2"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-10">
            {filtered.map((book, index) => (
              <motion.div
                key={book.id}
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
                className="bg-white rounded-[2.5rem] border border-slate-100 p-4 hover:shadow-2xl transition-all group flex flex-col h-full"
              >
                <div className="aspect-[2/3] rounded-[2rem] overflow-hidden mb-6 bg-slate-50 relative">
                  {book.cover ? (
                    <img src={book.cover} alt={book.title} referrerPolicy="no-referrer" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-8 text-slate-200">
                       <BookOpen size={64} className="opacity-10 mb-4" />
                       <span className="text-xs font-black text-center font-bengali opacity-30">{book.title}</span>
                    </div>
                  )}
                  {book.stock !== undefined && book.stock <= 0 && !book.isPreOrderAvailable && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center">
                       <span className="bg-rose-500 text-white px-4 py-2 rounded-xl text-xs font-black font-bengali shadow-xl">স্টক আউট</span>
                    </div>
                  )}
                  <div className="absolute top-4 right-4">
                     <span className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-black font-sans shadow-xl">৳ {book.price}</span>
                  </div>
                </div>

                <div className="flex-1 px-4">
                   <p className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.2em] mb-2 font-bengali">{book.category || 'সাধারণ'}</p>
                   <h3 className="text-lg font-black text-slate-900 font-bengali line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors mb-2">{book.title}</h3>
                   <p className="text-sm text-slate-400 font-bengali font-bold">{book.author}</p>
                </div>

                <button 
                  onClick={() => addToCart(book)}
                  disabled={book.stock === 0 && !book.isPreOrderAvailable}
                  className="mt-8 w-full py-5 bg-slate-900 text-white rounded-2xl font-black font-bengali text-sm hover:bg-emerald-600 transition-all shadow-xl active:scale-[0.98] disabled:opacity-30 disabled:pointer-events-none flex items-center justify-center gap-3"
                >
                  কার্টে যুক্ত করুন <Plus size={20} />
                </button>
              </motion.div>
            ))}
          </div>
        )}

        {/* Tracking Section */}
        <div id="tracking" className="mt-32 pt-20 border-t border-slate-100">
           <div className="max-w-2xl mx-auto bg-slate-50 rounded-[3.5rem] p-12 md:p-20 text-center border border-slate-100">
              <h2 className="text-3xl md:text-5xl font-black text-slate-900 mb-4 font-bengali tracking-tight">অর্ডার ট্র্যাকিং</h2>
              <p className="text-slate-500 font-bengali mb-12 text-lg font-medium">অর্ডার করার সময় প্রাপ্ত ৬ সংখ্যার আইডিটি লিখে স্ট্যাটাস চেক করুন।</p>
              
              <div className="flex flex-col gap-6">
                 <input 
                  type="text" 
                  placeholder="অর্ডার আইডি (যেমন: ১২৩৪৫৬)" 
                  className="w-full px-10 py-6 bg-white border border-slate-200 rounded-[2rem] outline-none focus:ring-4 focus:ring-indigo-50 text-center text-3xl font-black tracking-[0.1em]"
                  value={trackOrderId}
                  onChange={e => setTrackOrderId(e.target.value)}
                 />
                 <button 
                  onClick={() => handleTrackOrder()}
                  disabled={isTracking || !trackOrderId}
                  className="w-full py-6 bg-indigo-600 text-white rounded-[2rem] font-black font-bengali text-xl hover:bg-slate-900 transition-all shadow-xl shadow-indigo-100 disabled:opacity-50 active:scale-95"
                 >
                    {isTracking ? 'খোঁজা হচ্ছে...' : 'স্ট্যাটাস দেখুন'}
                 </button>
              </div>

              {trackedOrder && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-12 p-10 bg-white rounded-[2.5rem] border border-slate-200 shadow-xl text-left">
                   <div className="flex justify-between items-start mb-8">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">সার্ভিস স্ট্যাটাস</p>
                        <h4 className="font-black text-indigo-600 font-bengali text-2xl">
                           {trackedOrder.status === 'Pending' ? 'পেন্ডিং' : 
                            trackedOrder.status === 'Confirmed' ? 'নিশ্চিত' :
                            trackedOrder.status === 'Shipping' ? 'শিপিং' :
                            trackedOrder.status === 'Delivered' ? 'ডেলিভারড' : 'বাতিল'}
                        </h4>
                      </div>
                      <div className="text-right">
                         <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">মোট পরিশোধিত</p>
                         <h4 className="font-black text-slate-900 text-3xl font-sans">৳{trackedOrder.totalPrice}</h4>
                      </div>
                   </div>
                   <div className="space-y-4 pt-8 border-t border-dashed border-slate-200">
                      {trackedOrder.items.map((item: any, idx: number) => (
                        <div key={idx} className="flex justify-between items-center text-sm">
                           <span className="text-slate-500 font-bengali font-bold leading-none">{item.title}</span>
                           <span className="font-black text-slate-900 bg-slate-50 px-3 py-1 rounded-lg">x{item.quantity}</span>
                        </div>
                      ))}
                   </div>
                </motion.div>
              )}
           </div>
        </div>
      </div>

      {/* Cart Drawer - Bold Redesign */}
      <AnimatePresence>
        {showCart && (
          <div className="fixed inset-0 z-[100] flex justify-end">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowCart(false)} className="absolute inset-0 bg-slate-900/60 backdrop-blur-md" />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} className="relative bg-white w-full max-w-md h-full shadow-2xl flex flex-col">
               <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                  <h2 className="text-3xl font-black text-slate-900 font-bengali">শপিং কার্ট</h2>
                  <button onClick={() => setShowCart(false)} className="p-4 bg-white border border-slate-200 rounded-2xl hover:bg-rose-50 hover:text-rose-600 transition-all shadow-sm"><X size={24} /></button>
               </div>

               <div className="flex-1 overflow-y-auto p-10 space-y-8">
                  {cart.length === 0 ? (
                    <div className="text-center py-20">
                       <ShoppingBag size={80} className="mx-auto mb-6 text-slate-200" />
                       <p className="text-xl font-bold text-slate-400 font-bengali">কার্টে কোনো বই নেই</p>
                    </div>
                  ) : (
                    cart.map(item => (
                      <div key={item.bookId} className="flex gap-6 items-center">
                         <div className="w-24 h-32 rounded-2xl overflow-hidden flex-shrink-0 shadow-lg border border-slate-100 bg-slate-50">
                            {item.cover ? <img src={item.cover} referrerPolicy="no-referrer" className="w-full h-full object-cover" /> : <BookOpen size={24} className="m-auto opacity-10 mt-12" />}
                         </div>
                         <div className="flex-1">
                            <h4 className="font-black text-slate-900 font-bengali mb-1 leading-tight">{item.title}</h4>
                            <p className="text-indigo-600 font-black font-sans mb-4">৳ {item.price}</p>
                            <div className="flex items-center gap-4">
                               <button onClick={() => updateQuantity(item.bookId, -1)} className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50"><Minus size={16} /></button>
                               <span className="font-black text-lg font-sans">{item.quantity}</span>
                               <button onClick={() => updateQuantity(item.bookId, 1)} className="w-10 h-10 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50"><Plus size={16} /></button>
                            </div>
                         </div>
                         <button onClick={() => removeFromCart(item.bookId)} className="p-3 text-slate-300 hover:text-rose-500 transition-colors"><X size={20} /></button>
                      </div>
                    ))
                  )}
               </div>

               {cart.length > 0 && (
                 <div className="p-10 bg-slate-50 border-t border-slate-100 rounded-t-[3.5rem] shadow-[0_-20px_50px_rgba(0,0,0,0.05)]">
                    <div className="flex justify-between items-center mb-8">
                       <span className="text-lg font-black text-slate-400 font-bengali">সর্বমোট:</span>
                       <span className="text-3xl font-black text-slate-900 font-sans">৳ {totalPrice}</span>
                    </div>
                    <button onClick={() => setShowCheckout(true)} className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black font-bengali text-xl shadow-2xl shadow-slate-200 hover:bg-indigo-600 transition-all flex items-center justify-center gap-4 active:scale-95">চেকআউট করুন <ArrowRight size={24} /></button>
                 </div>
               )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Checkout Modal - Bold Redesign */}
      <AnimatePresence>
        {showCheckout && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
             <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white w-full max-w-2xl rounded-[3.5rem] shadow-2xl p-12 md:p-16 overflow-y-auto max-h-[90vh] relative">
                <button onClick={() => setShowCheckout(false)} className="absolute top-10 right-10 text-slate-400 hover:text-rose-500 transition-colors"><X size={28} /></button>
                <h2 className="text-4xl font-black text-slate-900 mb-4 font-bengali">অর্ডার কনফার্ম করুন</h2>
                <p className="text-slate-500 font-bengali mb-12 text-lg font-medium">নিচের তথ্যগুলো পূরণ করে আপনার অর্ডারটি সম্পন্ন করুন।</p>
                
                <form onSubmit={handleCheckout} className="space-y-8">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-2">
                         <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 font-bengali">আপনার নাম</label>
                         <input type="text" required value={formData.name} onChange={e=>setFormData({...formData, name: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 font-bengali font-bold outline-none focus:ring-4 focus:ring-indigo-50 transition-all" />
                      </div>
                      <div className="space-y-2">
                         <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 font-bengali">মোবাইল নম্বর</label>
                         <input type="text" required value={formData.phone} onChange={e=>setFormData({...formData, phone: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 font-sans font-bold outline-none focus:ring-4 focus:ring-indigo-50 transition-all" />
                      </div>
                   </div>
                   <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 font-bengali">ডেলিভারি ঠিকানা</label>
                      <textarea required value={formData.address} onChange={e=>setFormData({...formData, address: e.target.value})} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 font-bengali font-bold outline-none focus:ring-4 focus:ring-indigo-50 transition-all h-24" />
                   </div>
                   <div>
                      <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 font-bengali">ডেলিভারি মাধ্যম</label>
                      <div className="grid grid-cols-2 gap-6">
                         <button type="button" onClick={() => setFormData({...formData, deliveryType: 'COD'})} className={`p-5 border-4 rounded-[2rem] transition-all text-sm font-black font-bengali ${formData.deliveryType === 'COD' ? 'border-indigo-600 bg-indigo-50 text-indigo-600 shadow-xl shadow-indigo-100' : 'border-slate-50 text-slate-400'}`}>ক্যাশ অন ডেলিভারি (৳৬০)</button>
                         <button type="button" onClick={() => setFormData({...formData, deliveryType: 'LibraryPickup'})} className={`p-5 border-4 rounded-[2rem] transition-all text-sm font-black font-bengali ${formData.deliveryType === 'LibraryPickup' ? 'border-indigo-600 bg-indigo-50 text-indigo-600 shadow-xl shadow-indigo-100' : 'border-slate-50 text-slate-400'}`}>লাইব্রেরি পিকআপ</button>
                      </div>
                   </div>
                   <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl shadow-slate-200 mt-12">
                      <div className="flex justify-between items-center mb-2 opacity-60 text-xs font-black uppercase tracking-widest"><span>উপ-মোট:</span><span>৳ {totalPrice}</span></div>
                      <div className="flex justify-between items-center mb-6 opacity-60 text-xs font-black uppercase tracking-widest"><span>ডেলিভারি:</span><span>+ ৳ {formData.deliveryType === 'COD' ? 60 : 0}</span></div>
                      <div className="flex justify-between items-center border-t border-slate-800 pt-6">
                         <span className="text-xl font-black font-bengali">সর্বমোট:</span>
                         <span className="text-4xl font-black font-sans tracking-tight">৳ {finalTotalPrice}</span>
                      </div>
                      <button type="submit" disabled={isSubmitting} className="w-full mt-10 bg-indigo-500 text-white font-black py-6 rounded-[2rem] font-bengali text-2xl hover:bg-indigo-400 shadow-xl transition-all active:scale-95 disabled:opacity-50">{isSubmitting ? 'অর্ডার হচ্ছে...' : 'অর্ডার কনফার্ম করুন'}</button>
                   </div>
                </form>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Success Modal - Bold Redesign */}
      <AnimatePresence>
        {showSuccessModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white p-16 rounded-[4rem] text-center max-w-lg w-full shadow-2xl relative border-8 border-slate-50">
              <div className="w-24 h-24 bg-emerald-500 text-white rounded-[2.5rem] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-emerald-200">
                 <CheckCircle2 size={48} />
              </div>
              <h2 className="text-4xl font-black text-slate-900 mb-4 font-bengali">অর্ডার সফল হয়েছে!</h2>
              <p className="text-slate-500 font-bengali mb-12 text-xl font-medium">আপনার অর্ডার আইডি: <span className="text-indigo-600 font-black font-sans tracking-widest ml-2">#{lastOrderId}</span></p>
              
              <div className="hidden">
                 <div ref={printRef} className="p-16 font-bengali text-center bg-white">
                    <div className="border-[12px] border-slate-900 p-16 rounded-[4rem] relative">
                       <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tighter">PAN dhoA SHOP</h1>
                       <p className="text-slate-400 font-black uppercase tracking-[0.4em] mb-16 text-[10px]">Official Order Receipt</p>
                       <div className="space-y-10 text-left max-w-sm mx-auto">
                          <div className="border-b-2 border-slate-100 pb-4">
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">ORDER NUMBER</span>
                             <p className="text-2xl font-black text-slate-900">#{lastOrderId}</p>
                          </div>
                          <div className="border-b-2 border-slate-100 pb-4">
                             <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">CUSTOMER</span>
                             <p className="text-2xl font-black text-slate-900">{formData.name}</p>
                          </div>
                          <div className="flex justify-between items-center bg-slate-50 p-6 rounded-2xl">
                             <span className="text-sm font-black font-bengali opacity-60">মোট দেয় বিল:</span>
                             <span className="text-2xl font-black font-sans">৳{finalTotalPrice}</span>
                          </div>
                       </div>
                       <div className="mt-20 pt-10 border-t border-dashed border-slate-200">
                          <p className="text-slate-300 font-black uppercase tracking-[0.5em] text-[10px]">Identity Verified Digital Order</p>
                       </div>
                    </div>
                 </div>
              </div>

              <div className="flex flex-col gap-6">
                <button onClick={() => handlePrint()} className="w-full bg-slate-900 text-white font-black py-6 rounded-[2rem] font-bengali text-xl flex items-center justify-center gap-4 shadow-2xl hover:bg-slate-800 transition-all active:scale-95">
                  <Printer size={28} /> স্লিপ প্রিন্ট করুন
                </button>
                <button onClick={() => setShowSuccessModal(false)} className="w-full py-4 text-slate-400 font-black font-bengali hover:text-rose-500 transition-colors text-lg">বন্ধ করুন</button>
              </div>
            </motion.div>
          </div>
        ) }
      </AnimatePresence>
    </div>
  );
}
