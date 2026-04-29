import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Phone, Mail, User2 } from 'lucide-react';

interface TeamMember {
  id: string;
  name: string;
  role: string;
  contact: string;
  image?: string;
}

export default function Team() {
  const [team, setTeam] = useState<TeamMember[]>([]);

  useEffect(() => {
    fetch('/api/team')
      .then(r => r.json())
      .then(setTeam)
      .catch(console.error);
  }, []);

  return (
    <div className="min-h-screen py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 mb-4">Management Team</h1>
          <p className="text-slate-500 text-lg">
            Meet the dedicated individuals who keep Pandhoa Open Library running smoothly every single day.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {team.map((member, i) => (
            <motion.div
              key={member.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-[24px] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 text-center flex flex-col items-center"
            >
              <div className="w-24 h-24 rounded-full bg-indigo-50 flex items-center justify-center mb-4 overflow-hidden border-2 border-white shadow-sm">
                {member.image ? (
                  <img src={member.image} alt={member.name} className="w-full h-full object-cover" />
                ) : (
                  <User2 className="w-10 h-10 text-indigo-300" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-slate-900">{member.name}</h3>
              <p className="text-sm text-indigo-600 font-medium uppercase tracking-wider mb-4 mt-1">{member.role}</p>
              <div className="mt-auto w-full pt-4 border-t border-slate-100">
                 <p className="text-sm text-slate-500 flex items-center justify-center gap-2">
                   <Phone className="w-4 h-4" /> {member.contact}
                 </p>
              </div>
            </motion.div>
          ))}

          {team.length === 0 && (
            <div className="col-span-full py-20 text-center text-slate-500">
              Profiles are currently being updated. Check back soon!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
