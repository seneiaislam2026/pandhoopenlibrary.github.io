import React, { useEffect, useState } from "react";
import { useAuth } from "../../store/AuthContext";
import {
  Check,
  Search,
  Calendar,
  DollarSign,
  Plus,
  Trash2,
  Edit2,
} from "lucide-react";

interface LibUser {
  id: string;
  name: string;
  username: string;
  role: string;
  status: string;
  createdAt: string;
}

interface Payment {
  id: string;
  userId: string;
  userName?: string;
  amount: number;
  month: string;
  trxId?: string;
  status: string; // Pending, Approved
  date: string;
}

export default function ManageDues() {
  const [users, setUsers] = useState<LibUser[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [trxSearch, setTrxSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const { token } = useAuth();

  const [showForm, setShowForm] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState("");
  const [amount, setAmount] = useState(50);
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  });

  const loadData = () => {
    Promise.all([
      fetch("/api/users", { headers: { Authorization: `Bearer ${token}` } }),
      fetch("/api/payments", { headers: { Authorization: `Bearer ${token}` } }),
    ]).then(async ([usersRes, payRes]) => {
      const usersData = await usersRes.json();
      const payData = await payRes.json();
      setUsers(
        usersData.filter(
          (u: any) => u.role !== "admin" && u.status === "active",
        ),
      );
      setPayments(payData);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData();
  }, [token]);

  const handleAddPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) return alert("Select a user");

    const user = users.find((u) => u.id === selectedUserId);
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        userId: selectedUserId,
        userName: user?.name,
        amount,
        month,
        status: "Approved",
      }),
    });
    if (res.ok) {
      setShowForm(false);
      loadData();
    } else {
      alert("Failed to record payment");
    }
  };

  const handleDeletePayment = async (id: string) => {

    try {
      const res = await fetch(`/api/payments/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        loadData();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Delete failed. Check server connection.");
      }
    } catch (err) {
      console.error(err);
      alert("Network error while deleting.");
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;
    try {
      const res = await fetch(`/api/payments/${editingPayment.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editingPayment),
      });
      if (res.ok) {
        setEditingPayment(null);
        loadData();
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || "Failed to update payment");
      }
    } catch (err) {
      console.error(err);
      alert("Network error while updating.");
    }
  };

  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

  const handleApprove = async (id: string) => {
    const res = await fetch(`/api/payments/${id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...payments.find((p) => p.id === id),
        status: "Approved",
      }),
    });
    if (res.ok) loadData();
  };

  const handleReset = async () => {
    
    const res = await fetch("/api/payments/reset", {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) loadData();
  };

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900">
            Member Dues & Donations
          </h2>
          <p className="text-sm text-slate-500 mt-1">
            Track monthly fees from readers and donor members.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition"
        >
          <Plus className="w-4 h-4" />
          Record Payment
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <h3 className="font-semibold text-lg mb-4">Record New Payment</h3>
          <form
            onSubmit={handleAddPayment}
            className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end"
          >
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                User
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white"
              >
                <option value="">Select Member</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} (@{u.username})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Month (YYYY-MM)
              </label>
              <input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Amount (৳)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                required
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50 focus:bg-white"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search members..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:bg-white focus:border-indigo-500"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-500">
            Loading records...
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="p-4 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Member Name
                  </th>
                  <th className="p-4 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">
                    Recent Payments
                  </th>
                  <th className="p-4 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                    Total Contributed
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((user) => {
                  const userPayments = payments
                    .filter((p) => p.userId === user.id)
                    .sort((a, b) => b.month.localeCompare(a.month));
                  const total = userPayments.reduce(
                    (sum, p) => sum + Number(p.amount),
                    0,
                  );

                  return (
                    <tr key={user.id} className="hover:bg-slate-50/50">
                      <td className="p-4">
                        <div className="font-medium text-slate-900">
                          {user.name}
                        </div>
                        <div className="text-slate-500 text-xs mt-0.5">
                          @{user.username} • Joined{" "}
                          {new Date(user.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2 justify-center">
                          {userPayments.length === 0 && (
                            <span className="text-xs text-slate-400 font-medium">
                              No payments yet
                            </span>
                          )}
                          {userPayments.slice(0, 3).map((p) => (
                            <span
                              key={p.id}
                              className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-md text-xs font-medium border border-emerald-100"
                            >
                              <Calendar className="w-3 h-3" />
                              {p.month} (৳{p.amount})
                            </span>
                          ))}
                          {userPayments.length > 3 && (
                            <span className="inline-flex items-center px-2.5 py-1 bg-slate-100 text-slate-600 rounded-md text-xs font-medium border border-slate-200">
                              +{userPayments.length - 3} more
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 text-right font-medium text-slate-900">
                        ৳{total}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="p-8 text-center text-slate-500 text-sm"
                    >
                      No members found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden mt-8">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="font-bold text-sm text-slate-800">
            All Payment Records (Trx History)
          </span>
          <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-3 pr-8 py-1.5 border border-slate-200 rounded-lg text-sm bg-white"
            >
              <option value="All">All Status</option>
              <option value="Approved">Paid (Approved)</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Pending">Pending</option>
            </select>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search trx, user, or month..."
                value={trxSearch}
                onChange={(e) => setTrxSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white"
              />
            </div>
            <button
              onClick={handleReset}
              className="text-xs bg-rose-50 text-rose-600 hover:bg-rose-100 px-3 py-1.5 rounded-lg font-bold border border-rose-100 transition whitespace-nowrap"
            >
              Reset All
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">
                  User
                </th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">
                  Month
                </th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">
                  Amount
                </th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase">
                  TrxID / Status
                </th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments
                .filter(
                  (p) =>
                    (p.userName?.toLowerCase() || "").includes(
                      trxSearch.toLowerCase(),
                    ) ||
                    (p.trxId?.toLowerCase() || "").includes(
                      trxSearch.toLowerCase(),
                    ) ||
                    (p.month?.toLowerCase() || "").includes(
                      trxSearch.toLowerCase(),
                    ),
                )
                .filter(
                  (p) =>
                    statusFilter === "All" ||
                    p.status === statusFilter ||
                    (statusFilter === "Paid (Approved)" &&
                      p.status === "Approved"),
                )
                .sort(
                  (a, b) =>
                    new Date(b.date).getTime() - new Date(a.date).getTime(),
                )
                .map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 text-sm">
                        {p.userName || "Member"}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {new Date(p.date).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="p-4 text-sm font-medium">{p.month}</td>
                    <td className="p-4 font-black text-emerald-600">
                      ৳{p.amount}
                    </td>
                    <td className="p-4">
                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 w-fit">
                          {p.trxId || "CASH/ADMIN"}
                        </span>
                        <span
                          className={`text-[9px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded w-fit ${p.status === "Approved" ? "bg-emerald-100 text-emerald-700" : p.status === "Unpaid" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700 animate-pulse"}`}
                        >
                          {p.status}
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end gap-2">
                        {p.status === "Pending" && (
                          <button
                            type="button"
                            onClick={() => handleApprove(p.id)}
                            className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100"
                            title="Approve"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setEditingPayment(p)}
                          className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeletePayment(p.id)}
                          className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400">
                    No payment history.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editingPayment && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-xl border border-slate-200">
            <h3 className="text-xl font-bold mb-4">Edit Payment</h3>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Amount
                </label>
                <input
                  type="number"
                  value={editingPayment.amount}
                  onChange={(e) =>
                    setEditingPayment({
                      ...editingPayment,
                      amount: Number(e.target.value),
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Status
                </label>
                <select
                  value={editingPayment.status}
                  onChange={(e) =>
                    setEditingPayment({
                      ...editingPayment,
                      status: e.target.value,
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                  required
                >
                  <option value="Approved">Approved</option>
                  <option value="Pending">Pending</option>
                  <option value="Unpaid">Unpaid</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={
                    new Date(editingPayment.date).toISOString().split("T")[0]
                  }
                  onChange={(e) =>
                    setEditingPayment({
                      ...editingPayment,
                      date: new Date(e.target.value).toISOString(),
                    })
                  }
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-slate-50"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingPayment(null)}
                  className="px-4 py-2 font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-medium bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
