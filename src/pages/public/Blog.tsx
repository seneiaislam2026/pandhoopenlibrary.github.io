import React, { useEffect, useState } from 'react';
import { Bookmark } from 'lucide-react';
import { motion } from 'motion/react';

import { onSnapshot, collection } from 'firebase/firestore';
import { db } from '../../lib/firebase';

interface Post {
  id: string;
  title: string;
  content: string;
  date: string;
}

export default function Blog() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'posts'), (snapshot) => {
      const postsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Post[];
      setPosts(postsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching posts:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="bg-[#fafafa] min-h-screen py-16 px-4">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-2 font-bengali">বুক রিভিও</h1>
        <p className="text-slate-500 mb-12 font-bengali">পাঠকদের বুক রিভিওসমূহ এবং লাইব্রেরির নোটসমূহ এখানে দেখতে পারবেন।</p>

        {loading ? (
           <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
        ) : (
          <div className="space-y-8">
            {posts.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(post => (
              <motion.article 
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                key={post.id} 
                className="bg-white p-8 rounded-[24px] shadow-sm border border-slate-200"
              >
                <div className="flex items-center gap-2 text-indigo-600 text-sm font-semibold uppercase tracking-wider mb-3">
                  <Bookmark className="w-4 h-4" /> Book Review
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">{post.title}</h2>
                <time className="text-sm text-slate-400 block mb-6 font-bengali">
                  {new Date(post.date).toLocaleDateString('bn-BD', {
                    year: 'numeric', month: 'long', day: 'numeric'
                  })}
                </time>
                <div className="prose prose-slate max-w-none text-slate-600 whitespace-pre-wrap font-bengali">
                  {post.content}
                </div>
              </motion.article>
            ))}

            {posts.length === 0 && (
              <div className="text-center py-20 text-slate-500 bg-white rounded-[24px] border border-slate-200 border-dashed font-bengali">
                <p>এখনো কোনো বুক রিভিও প্রকাশ করা হয়নি।</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
