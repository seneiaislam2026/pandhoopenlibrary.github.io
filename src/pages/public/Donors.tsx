import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Heart, TrendingUp, Users, Crown } from 'lucide-react';

interface Donation {
  id: string;
  name: string;
  amount: number;
  date: string;
}

interface DonorMember {
  id: string;
  name: string;
  phone: string;
  address?: string;
  createdAt: string;
}

export default function Donors() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [donorMembers, setDonorMembers] = useState<DonorMember[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'honourable' | 'contributions'>('honourable');

  useEffect(() => {
    fetch('/api/donations')
      .then(r => r.json())
      .then(setDonations)
      .catch(console.error);
      
    fetch('/api/donor-members')
      .then(r => r.json())
      .then(setDonorMembers)
      .catch(console.error);
  }, []);

  const totalDonated = donations.reduce((sum, d) => sum + Number(d.amount), 0);

  const predefinedAmounts = [50, 100, 500, 1000];
  const [formAmt, setFormAmt] = useState(500);
  const [formName, setFormName] = useState('');
  const [successMsg, setSuccessMsg] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/donations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: formName || 'Anonymous', amount: formAmt })
      });
      if(res.ok) {
        const newDonation = await res.json();
        setDonations(prev => [...prev, newDonation]);
        setSuccessMsg(true);
        setShowForm(false);
        setTimeout(() => setSuccessMsg(false), 5000);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#fafafa] dark:bg-slate-900 min-h-screen py-16 px-4 transition-colors">
      <div className="max-w-4xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="text-center">
          <Heart className="w-16 h-16 text-rose-500 dark:text-rose-400 mx-auto mb-6" />
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-slate-900 dark:text-white mb-6 font-serif italic">
            "Generosity fuels knowledge."
          </h1>
          <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto text-lg leading-relaxed mb-8">
            Our library runs on the kindness of community members.
          </p>
          
          {/* Tabs */}
          <div className="flex bg-white dark:bg-slate-800 p-1.5 rounded-full mx-auto w-fit border border-slate-200 dark:border-slate-700 shadow-sm transition-colors">
             <button 
               onClick={() => setActiveTab('honourable')}
               className={`px-6 py-2.5 rounded-full font-medium text-sm flex items-center gap-2 transition-all ${activeTab === 'honourable' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
             >
               <Crown className="w-4 h-4" /> Honourable Donor Members
             </button>
             <button 
               onClick={() => setActiveTab('contributions')}
               className={`px-6 py-2.5 rounded-full font-medium text-sm flex items-center gap-2 transition-all ${activeTab === 'contributions' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
             >
               <Heart className="w-4 h-4" /> Recent Contributions
             </button>
          </div>
        </div>

        {activeTab === 'honourable' ? (
           <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white dark:bg-slate-800 rounded-[24px] overflow-hidden shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
             <div className="p-8 border-b border-slate-100 dark:border-slate-700 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 transition-colors">
               <h2 className="text-2xl font-bold font-bengali text-slate-800 dark:text-slate-100 text-center flex items-center justify-center gap-3">
                 <Crown className="w-6 h-6 text-amber-500 dark:text-amber-400" />
                 সম্মানিত দাতা সদস্যবৃন্দ (Honourable Donor Members)
               </h2>
               <p className="text-center text-slate-600 dark:text-slate-400 mt-2 font-bengali text-sm">
                 We extend our deepest gratitude to the following members for their continuous support.
               </p>
             </div>
             <div className="p-2">
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                   {donorMembers.map(member => (
                     <div key={member.id} className="relative p-6 rounded-[2rem] border border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group text-center flex flex-col items-center overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-amber-50/50 to-transparent dark:from-amber-900/10 dark:to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <div className="relative w-20 h-20 bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/40 dark:to-amber-800/20 text-amber-600 dark:text-amber-400 rounded-full flex items-center justify-center mb-5 shadow-inner group-hover:scale-110 transition-transform duration-500">
                          <Users className="w-10 h-10 drop-shadow-sm" />
                          <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-800 rounded-full p-1 shadow-sm">
                            <Crown className="w-4 h-4 text-amber-500" />
                          </div>
                        </div>
                        <h3 className="relative font-bold text-slate-900 dark:text-slate-100 text-xl mb-2">{member.name}</h3>
                        {member.address && <p className="relative text-sm text-slate-500 dark:text-slate-400 line-clamp-2 px-2">{member.address}</p>}
                     </div>
                   ))}
                   {donorMembers.length === 0 && (
                     <div className="col-span-full py-16 text-center text-slate-500 dark:text-slate-400">
                        No donor members found yet.
                     </div>
                   )}
                 </div>
             </div>
           </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-12">
            <div className="text-center">
              <button 
                onClick={() => setShowForm(!showForm)}
                className="bg-slate-900 dark:bg-indigo-600 text-white px-8 py-3 rounded-full font-medium hover:bg-slate-800 dark:hover:bg-indigo-700 transition-colors shadow-lg shadow-slate-900/20 dark:shadow-indigo-900/20"
              >
                Make a Donation
              </button>
            </div>
            
            {showForm && (
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto bg-white dark:bg-slate-800 p-8 rounded-[24px] shadow-sm border border-slate-200 dark:border-slate-700 transition-colors">
                 <div className="bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/50 rounded-xl p-4 mb-6 text-center">
                    <p className="text-sm text-indigo-800 dark:text-indigo-300 font-medium leading-relaxed">
                      Please send your donation via bKash to <br/>
                      <span className="text-lg font-bold text-indigo-900 dark:text-indigo-200">01570206953</span><br/>
                      Then fill out this form so we can honor you on our wall.
                    </p>
                 </div>
                 <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Amount (৳)</label>
                      <div className="grid grid-cols-4 gap-2 mb-3">
                        {predefinedAmounts.map(amt => (
                          <button 
                            key={amt} 
                            type="button"
                            onClick={() => setFormAmt(amt)}
                            className={`py-2 text-sm font-medium rounded-lg border transition-colors ${formAmt === amt ? 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'}`}
                          >৳{amt}</button>
                        ))}
                      </div>
                      <input
                        type="number"
                        value={formAmt}
                        onChange={e => setFormAmt(Number(e.target.value))}
                        className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:ring-indigo-500/40 dark:focus:border-indigo-400 transition-colors outline-none text-slate-900 dark:text-white"
                        placeholder="Custom Amount"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5">Your Name (Optional)</label>
                      <input
                        type="text"
                        value={formName}
                        onChange={e => setFormName(e.target.value)}
                        className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:ring-indigo-500/40 dark:focus:border-indigo-400 transition-colors outline-none text-slate-900 dark:text-white"
                        placeholder="Anonymous"
                      />
                    </div>
                    <button 
                      type="submit" 
                      disabled={loading}
                      className="w-full bg-indigo-600 text-white font-medium py-3 rounded-xl hover:bg-indigo-700 transition"
                    >
                      {loading ? 'Submitting...' : 'Record Donation'}
                    </button>
                 </form>
              </motion.div>
            )}

            {successMsg && (
              <div className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 p-4 rounded-xl text-center font-medium max-w-md mx-auto border border-emerald-200 dark:border-emerald-800/50 shadow-sm transition-colors">
                Thank you! Your donation request has been recorded.
              </div>
            )}

            {/* Stats */}
            <div className="flex justify-center flex-wrap gap-4">
               <div className="bg-white dark:bg-slate-800 px-8 py-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex items-center gap-6 min-w-[300px] transition-colors">
                 <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-6 h-6" />
                 </div>
                 <div>
                   <p className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Total Raised</p>
                   <p className="text-3xl font-bold text-slate-900 dark:text-white">৳{totalDonated}</p>
                 </div>
               </div>
            </div>

            {/* List */}
            <div>
              <h3 className="text-2xl font-semibold mb-6 flex items-center justify-center gap-2 text-slate-900 dark:text-white">
                Wall of Support
              </h3>
              <div className="bg-white dark:bg-slate-800 rounded-[24px] p-2 shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden transition-colors">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr>
                      <th className="border-b border-slate-100 dark:border-slate-700 p-5 text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/50">Supporter</th>
                      <th className="border-b border-slate-100 dark:border-slate-700 p-5 text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/50">Date</th>
                      <th className="border-b border-slate-100 dark:border-slate-700 p-5 text-xs uppercase tracking-wider font-bold text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/50 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {donations.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(d => (
                      <tr key={d.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/50 transition-colors">
                        <td className="p-5 border-b border-slate-50 dark:border-slate-700 font-bold text-slate-900 dark:text-slate-200">{d.name || 'Anonymous'}</td>
                        <td className="p-5 border-b border-slate-50 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-sm">
                          {new Date(d.date).toLocaleDateString(undefined, {month:'short', day:'numeric', year:'numeric'})}
                        </td>
                        <td className="p-5 border-b border-slate-50 dark:border-slate-700 font-black text-emerald-600 dark:text-emerald-400 text-right">৳{d.amount}</td>
                      </tr>
                    ))}
                    {donations.length === 0 && (
                      <tr><td colSpan={3} className="text-center p-12 text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/50">Be the first to donate!</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
