import React, { useEffect, useState } from 'react';
import { useAuth } from '../../store/AuthContext';
import { BookOpen } from 'lucide-react';

export default function UserBooks() {
  const [issues, setIssues] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const { token, user } = useAuth();

  useEffect(() => {
    Promise.all([
      fetch('/api/issues', { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch('/api/books').then(r => r.json())
    ]).then(([issueData, bookData]) => {
      setIssues(issueData);
      setBooks(bookData);
    });
  }, [token]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold tracking-tight text-slate-900">My Books</h2>
      
      <div className="grid gap-4 md:grid-cols-2">
        {issues.length === 0 ? (
          <div className="col-span-full py-16 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white">
            <BookOpen className="w-12 h-12 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 font-medium">You have no books issued right now.</p>
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
                   <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${i.status === 'Issued' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                     {i.status}
                   </span>
                 </div>
                 {i.status === 'Issued' && (
                   <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-sm text-slate-700">
                     <strong>Return by:</strong> {new Date(i.expectedReturnDate).toLocaleDateString()}
                   </div>
                 )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
