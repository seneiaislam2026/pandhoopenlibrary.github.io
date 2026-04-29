import React, { useEffect, useState } from 'react';
import { useAuth } from '../../store/AuthContext';
import { Mail, MessageSquare, Clock, User, CheckCircle, Reply, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Message {
  id: string;
  fromUserId: string;
  fromUserName: string;
  toUserId: string;
  toUserName: string;
  subject: string;
  content: string;
  date: string;
  isRead: boolean;
}

export default function UserMessages() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { token, user } = useAuth();

  useEffect(() => {
    fetchMessages();
  }, [token]);

  const fetchMessages = async () => {
    const res = await fetch('/api/messages', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    // Include messages sent to "all" users
    const filtered = data.filter((m: Message) => String(m.toUserId) === String(user?.id) || m.toUserId === 'all' || String(m.fromUserId) === String(user?.id));
    setMessages(filtered);
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    await fetch(`/api/messages/${id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` }
    });
    setMessages(msgs => msgs.map(m => m.id === id ? { ...m, isRead: true } : m));
  };

  const toggleExpand = (id: string, isRead: boolean) => {
    if (expandedId === id) {
      setExpandedId(null);
    } else {
      setExpandedId(id);
      if (!isRead) markAsRead(id);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden relative">
          <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-50 rounded-full translate-x-10 -translate-y-10" />
          <div className="relative z-10">
            <h2 className="text-3xl font-black text-slate-900 tracking-tighter">My Inbox</h2>
            <p className="text-slate-500 font-medium mt-1">Communicate with library admins and see notifications.</p>
          </div>
          <div className="relative z-10 flex items-center gap-3 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-xl">
             <Mail className="w-5 h-5 text-indigo-400" />
             <span className="font-bold">{messages.filter(m => !m.isRead && m.toUserId !== user?.id).length === 0 ? 'All caught up' : `${messages.filter(m => !m.isRead).length} Unread Messages`}</span>
          </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden">
        {loading ? (
             <div className="p-20 text-center">
                 <div className="animate-spin w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full mx-auto" />
             </div>
        ) : messages.length === 0 ? (
            <div className="p-20 text-center space-y-4">
                <MessageSquare className="w-16 h-16 text-slate-100 mx-auto" />
                <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Your inbox is empty</p>
            </div>
        ) : (
            <div className="divide-y divide-slate-50">
                {messages.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((msg, idx) => {
                    const isFromMe = msg.fromUserId === user?.id;
                    const isExpanded = expandedId === msg.id;
                    
                    return (
                        <div key={msg.id} className={`transition-colors ${!msg.isRead && !isFromMe ? 'bg-indigo-50/30' : 'hover:bg-slate-50'}`}>
                            <button 
                                onClick={() => toggleExpand(msg.id, msg.isRead || isFromMe)}
                                className="w-full p-6 text-left flex items-start gap-4 focus:outline-none"
                            >
                                <div className={`shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${isFromMe ? 'bg-slate-100 text-slate-400' : 'bg-white text-indigo-600 border border-slate-100'}`}>
                                   {isFromMe ? <Reply className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="min-w-0">
                                            <h4 className={`text-lg transition-all ${!msg.isRead && !isFromMe ? 'font-black text-slate-900 border-l-4 border-indigo-600 pl-3 -ml-3' : 'font-bold text-slate-700'}`}>
                                                {msg.subject}
                                            </h4>
                                            <p className="text-[10px] font-black uppercase text-slate-400 mt-1 flex items-center gap-1.5">
                                                {isFromMe ? (
                                                    <>SENT TO: <span className="text-indigo-500">{msg.toUserName}</span></>
                                                ) : (
                                                    <>FROM: <span className="text-indigo-500">{msg.fromUserName}</span></>
                                                )}
                                                <span className="w-1 h-1 rounded-full bg-slate-200 mx-1" />
                                                <Clock className="w-3 h-3" />
                                                {new Date(msg.date).toLocaleDateString()}
                                            </p>
                                        </div>
                                        {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-300" /> : <ChevronDown className="w-5 h-5 text-slate-300" />}
                                    </div>
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div 
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="mt-6 p-6 bg-slate-50 rounded-2xl border border-slate-100 text-slate-600 font-medium leading-relaxed whitespace-pre-wrap">
                                                    {msg.content}
                                                </div>
                                                {!isFromMe && (
                                                    <div className="mt-4 flex justify-end">
                                                        <button 
                                                          onClick={(e) => {
                                                              e.stopPropagation();
                                                              alert('Direct replies coming soon! Please contact through library desk for now.');
                                                          }}
                                                          className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-indigo-600 hover:bg-indigo-50 px-4 py-2 rounded-xl transition"
                                                        >
                                                            <Reply className="w-4 h-4" /> Reply
                                                        </button>
                                                    </div>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                    {!isExpanded && (
                                        <p className="text-slate-500 text-sm mt-3 line-clamp-1 italic font-medium">{msg.content}</p>
                                    )}
                                </div>
                            </button>
                        </div>
                    );
                })}
            </div>
        )}
      </div>
      
      <div className="bg-indigo-900 rounded-3xl p-10 text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-64 h-64 bg-indigo-800 rounded-full -translate-x-1/2 -translate-y-1/2 group-hover:scale-110 transition-transform duration-700" />
          <div className="relative z-10">
              <h3 className="text-2xl font-black tracking-tighter mb-2">Need Support?</h3>
              <p className="text-indigo-200 font-medium max-w-sm">If you didn't receive a response or have an urgent query, contact our chief librarian directly.</p>
          </div>
          <a href="tel:01570206953" className="relative z-10 whitespace-nowrap bg-white text-indigo-900 px-8 py-4 rounded-2xl font-black uppercase tracking-widest hover:scale-105 transition shadow-lg">
              Call Librarian
          </a>
      </div>
    </div>
  );
}
