import React, { useEffect, useState } from 'react';
import { useAuth } from '../../store/AuthContext';
import { ShoppingCart, Trash2, Search } from 'lucide-react';

interface Purchase {
  id: string;
  userId: string;
  userName: string;
  bookId: string;
  bookTitle: string;
  price: number;
  date: string;
}

export default function ManagePurchases() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'requests' | 'products'>('requests');
  const { token } = useAuth();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [showProductModal, setShowProductModal] = useState(false);
  const [formData, setFormData] = useState({ title: '', author: '', category: 'Sale', cover: '', price: 0, status: 'Available' });


  const fetchPurchases = () => {
    fetch('/api/purchases', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setPurchases);
    
    fetch('/api/books')
      .then(r => r.json())
      .then(data => setProducts(data.filter((b: any) => (b.price || 0) > 0)));
  };

  useEffect(() => {
    fetchPurchases();
  }, [token]);

  const handleDelete = async (id: string, force: boolean = false) => {
    if (!force) {
      setDeletingId(id);
      return;
    }
    const res = await fetch(`/api/purchases/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      setDeletingId(null);
      fetchPurchases();
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.price <= 0) return alert('Price must be greater than 0');
    
    const res = await fetch('/api/books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(formData)
    });
    
    if (res.ok) {
      setShowProductModal(false);
      setFormData({ title: '', author: '', category: 'Sale', cover: '', price: 0, status: 'Available' });
      fetchPurchases();
    }
  };

  const handleDeleteProduct = async (id: string) => {

    const res = await fetch(`/api/books/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) fetchPurchases();
  };

  const filteredPurchases = purchases.filter(p => 
    p.userName.toLowerCase().includes(search.toLowerCase()) || 
    p.bookTitle.toLowerCase().includes(search.toLowerCase())
  );
  
  const filteredProducts = products.filter(p => 
    p.title.toLowerCase().includes(search.toLowerCase()) || 
    p.author.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black font-bengali text-slate-900 tracking-tight">Manage Market / Buy</h2>
          <p className="text-sm text-slate-500 mt-1 font-bengali">Manage products for sale and review incoming buy requests.</p>
        </div>
      </div>

      <div className="flex gap-2 p-1 bg-slate-200/50 rounded-xl w-fit">
        <button 
          onClick={() => setActiveTab('requests')} 
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'requests' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          Buy Requests (Orders)
        </button>
        <button 
          onClick={() => setActiveTab('products')} 
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'products' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
        >
          Sale Products
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 md:px-6 md:py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
           <div className="relative w-full md:w-64">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
             <input 
               type="text" 
               placeholder="Search..." 
               value={search} 
               onChange={e => setSearch(e.target.value)} 
               className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm bg-white" 
             />
           </div>
           {activeTab === 'products' && (
             <button onClick={() => setShowProductModal(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors shadow-sm">
               Add Product
             </button>
           )}
        </div>

        <div className="overflow-x-auto">
          {activeTab === 'requests' ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">User</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Book/Product</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Price</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPurchases.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 align-top text-sm font-mono text-slate-600">
                      {new Date(p.date).toLocaleDateString()}
                    </td>
                    <td className="p-4 align-top">
                      <div className="font-bold text-slate-900">{p.userName}</div>
                    </td>
                    <td className="p-4 align-top">
                      <div className="font-bold text-indigo-700">{p.bookTitle}</div>
                    </td>
                    <td className="p-4 align-top">
                      <span className="font-black text-rose-600 text-lg">৳{p.price}</span>
                    </td>
                    <td className="p-4 align-top text-right min-w-[120px]">
                       {deletingId === p.id ? (
                          <div className="flex items-center justify-end gap-2">
                             <button onClick={() => handleDelete(p.id, true)} className="px-2 py-1 bg-rose-600 text-white text-xs rounded font-bold shadow-sm">Delete</button>
                             <button onClick={() => setDeletingId(null)} className="px-2 py-1 bg-slate-200 text-slate-700 text-xs rounded font-bold">Cancel</button>
                          </div>
                       ) : (
                          <button onClick={() => handleDelete(p.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition shadow-sm border border-transparent hover:border-rose-100" title="Delete Purchase Request">
                             <Trash2 className="w-4 h-4" />
                          </button>
                       )}
                    </td>
                  </tr>
                ))}
                {filteredPurchases.length === 0 && (
                  <tr><td colSpan={5} className="p-12 text-center text-slate-500 font-bengali text-sm bg-slate-50/50">No purchase requests found.</td></tr>
                )}
              </tbody>
            </table>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Product Name</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Author/Brand</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Price</th>
                  <th className="p-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 align-top">
                      <div className="font-bold text-slate-900">{p.title}</div>
                    </td>
                    <td className="p-4 align-top text-sm text-slate-600">
                      {p.author}
                    </td>
                    <td className="p-4 align-top">
                      <span className="font-black text-emerald-600 text-lg">৳{p.price}</span>
                    </td>
                    <td className="p-4 align-top text-right">
                       <button onClick={() => handleDeleteProduct(p.id)} className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition shadow-sm border border-transparent hover:border-rose-100" title="Delete Product">
                          <Trash2 className="w-4 h-4" />
                       </button>
                    </td>
                  </tr>
                ))}
                {filteredProducts.length === 0 && (
                  <tr><td colSpan={4} className="p-12 text-center text-slate-500 font-bengali text-sm bg-slate-50/50">No products found.</td></tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
      
      {showProductModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl">
             <h3 className="text-xl font-bold text-slate-800 mb-4">Add Sale Product</h3>
             <form onSubmit={handleAddProduct} className="space-y-4">
               <div>
                 <label className="block text-sm font-medium mb-1">Product Name</label>
                 <input required type="text" value={formData.title} onChange={e=>setFormData({...formData, title: e.target.value})} className="w-full border p-2 rounded-lg" />
               </div>
               <div>
                 <label className="block text-sm font-medium mb-1">Author / Brand</label>
                 <input type="text" value={formData.author} onChange={e=>setFormData({...formData, author: e.target.value})} className="w-full border p-2 rounded-lg" />
               </div>
               <div>
                 <label className="block text-sm font-medium mb-1">Price (৳)</label>
                 <input required type="number" min="1" value={formData.price || ''} onChange={e=>setFormData({...formData, price: Number(e.target.value)})} className="w-full border p-2 rounded-lg" />
               </div>
               <div>
                  <label className="block text-sm font-medium mb-1">Product Image</label>
                  <div className="flex items-center gap-4">
                    {formData.cover && (
                      <div className="w-16 h-20 bg-slate-100 rounded-md overflow-hidden flex-shrink-0">
                        <img src={formData.cover} alt="Preview" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            setFormData({ ...formData, cover: reader.result as string });
                          };
                          reader.readAsDataURL(file);
                        }
                      }} 
                      className="w-full border p-2 rounded-lg text-sm text-slate-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100" 
                    />
                  </div>
               </div>
               <div className="flex justify-end gap-3 mt-6">
                 <button type="button" onClick={() => setShowProductModal(false)} className="px-4 py-2 text-slate-600">Cancel</button>
                 <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold">Add Product</button>
               </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
}
