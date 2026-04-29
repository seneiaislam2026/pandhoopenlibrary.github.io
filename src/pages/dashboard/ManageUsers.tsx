import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../../store/AuthContext";
import {
  Check,
  X,
  ShieldAlert,
  BadgeCheck,
  Search,
  ShieldCheck,
  User2,
  Plus,
  Trash2,
  BookmarkMinus,
  Pencil,
} from "lucide-react";

interface LibUser {
  id: string;
  name: string;
  username: string;
  role: string;
  status: string;
  createdAt: string;
  memberId?: string;
  phone?: string;
  isMonthlyDonor?: boolean;
}

export default function ManageUsers() {
  const location = useLocation();
  const [users, setUsers] = useState<LibUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const { token } = useAuth();

  const [showModal, setShowModal] = useState(
    location.search.includes("add=true"),
  );
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    password: "",
    role: "reader",
    status: "active",
    isMonthlyDonor: false,
    phone: "",
  });

  const [editUser, setEditUser] = useState<LibUser | null>(null);
  const [editFormData, setEditFormData] = useState({
    name: "",
    role: "",
    status: "",
    phone: "",
    isMonthlyDonor: false,
    password: "",
  });

  const [selectedUser, setSelectedUser] = useState<LibUser | null>(null);
  const [userIssues, setUserIssues] = useState<any[]>([]);
  const [allIssues, setAllIssues] = useState<any[]>([]);
  const [books, setBooks] = useState<any[]>([]);
  const [filterType, setFilterType] = useState('all');

  useEffect(() => {
    fetch("/api/books")
      .then((r) => r.json())
      .then(setBooks);
  }, []);

  const fetchUserIssues = async (userId: string) => {
    const res = await fetch("/api/issues", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const allIss = await res.json();
    setUserIssues(
      allIss.filter((i: any) => String(i.userId) === String(userId)),
    );
  };

  useEffect(() => {
    if (location.search.includes("add=true")) {
      setShowModal(true);
    }
  }, [location.search]);

  const fetchUsers = () => {
    fetch("/api/users", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        setUsers(data);
        setLoading(false);
      });
  };

  const fetchAllIssues = () => {
    fetch("/api/issues", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((data) => {
        setAllIssues(data);
      });
  };

  useEffect(() => {
    fetchUsers();
    fetchAllIssues();
  }, [token]);

  const handleUpdateStatus = async (id: string, status: string) => {
    await fetch(`/api/users/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    fetchUsers();
    if (status === "active") {
      alert("Member approved and 4-digit ID generated.");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/users/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        alert("Member deleted successfully from database.");
        fetchUsers(); // Refresh list
      } else {
        const data = await response
          .json()
          .catch(() => ({ error: "Delete failed" }));
        alert(data.error || "Failed to delete user");
      }
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Server connection error. Could not delete.");
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(formData),
    });

    if (res.ok) {
      setShowModal(false);
      setFormData({
        name: "",
        username: "",
        password: "",
        role: "reader",
        status: "active",
        isMonthlyDonor: false,
        phone: "",
      });
      alert("Member registered successfully!");
      fetchUsers();
    } else {
      const err = await res.json();
      alert(err.error || "Failed to register member");
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editUser) return;

    const res = await fetch(`/api/users/${editUser.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(editFormData),
    });

    if (res.ok) {
      setEditUser(null);
      alert("User updated successfully!");
      fetchUsers();
    } else {
      const err = await res.json();
      alert(err.error || "Update failed");
    }
  };

  const filtered = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      (u.memberId && u.memberId.includes(search));

    if (!matchesSearch) return false;

    const uIssues = allIssues.filter((i) => String(i.userId) === String(u.id));
    const lateReturnCount = uIssues.filter(
      (i) =>
        i.status === "Returned" &&
        new Date(i.returnDate || i.issueDate) > new Date(i.expectedReturnDate)
    ).length;
    const hasOverdueBooks = uIssues.some(
      (i) => i.status === "Issued" && new Date() > new Date(i.expectedReturnDate)
    );

    if (filterType === "overdue") return hasOverdueBooks;
    if (filterType === "frequent-late") return lateReturnCount >= 5;
    if (filterType === "blocked") return u.borrowBlocked || hasOverdueBooks || lateReturnCount >= 5;

    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 tracking-tight">
            Manage Users
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Approve or reject members, manage roles.
          </p>
        </div>
        <div className="flex flex-wrap gap-4">
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          >
            <option value="all">All Users</option>
            <option value="overdue">Has Overdue Books</option>
            <option value="frequent-late">Frequent Late Returns</option>
            <option value="blocked">Borrowing Blocked</option>
          </select>
          <div className="relative w-full md:w-56">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search users..."
              className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition active:scale-95 ring-2 ring-indigo-500 ring-offset-2"
          >
            <Plus className="w-5 h-5" /> Register New Member
          </button>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                <User2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Register New Member
                </h3>
                <p className="text-xs text-slate-500 font-medium tracking-tight">
                  Manual registration from admin panel
                </p>
              </div>
            </div>

            <form onSubmit={handleAddUser} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1 shadow-indigo-100 text-slate-400">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full border border-slate-200 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all"
                  placeholder="e.g. Tanzim Ahmed"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1 text-slate-400">
                  Username
                </label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) =>
                    setFormData({ ...formData, username: e.target.value })
                  }
                  className="w-full border border-slate-200 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all"
                  placeholder="unique_username"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1 text-slate-400">
                  Phone / Contact No
                </label>
                <input
                  type="text"
                  required
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                  className="w-full border border-slate-200 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all"
                  placeholder="e.g. 01XXXXXXXXX"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1 text-slate-400">
                  Password
                </label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full border border-slate-200 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-slate-50 focus:bg-white transition-all"
                  placeholder="Leave blank for default (123456)"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  If blank, default password will be <strong>123456</strong>
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-1 text-slate-400">
                    Role
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) =>
                      setFormData({ ...formData, role: e.target.value })
                    }
                    className="w-full border border-slate-200 p-2.5 rounded-lg bg-slate-50"
                  >
                    <option value="reader">Reader / Member</option>
                    <option value="donor">Donor Member</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-1 text-slate-400">
                    Initial Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value })
                    }
                    className="w-full border border-slate-200 p-2.5 rounded-lg bg-slate-50"
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending Appreciation</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                <input
                  type="checkbox"
                  id="isMonthlyDonor_reg"
                  checked={formData.isMonthlyDonor}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      isMonthlyDonor: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label
                  htmlFor="isMonthlyDonor_reg"
                  className="text-sm font-semibold text-slate-700 cursor-pointer"
                >
                  Mark as Monthly Donor
                </label>
              </div>
              <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-6 py-2.5 font-bold text-slate-500 hover:text-slate-900 transition text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-md shadow-indigo-200 active:scale-95 transition text-sm"
                >
                  Create & Register
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  User
                </th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  Role
                </th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  Status
                </th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  Member ID
                </th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  Joined
                </th>
                <th className="p-4 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition">
                  <td className="p-4">
                    <div className="font-bengali font-bold text-slate-900 text-lg">
                      {u.name}
                    </div>
                    <div className="text-sm text-slate-500">@{u.username}</div>
                  </td>
                  <td className="p-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium ${
                        u.role === "admin"
                          ? "bg-purple-100 text-purple-700"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {u.role === "admin" ? (
                        <ShieldAlert className="w-3.5 h-3.5" />
                      ) : (
                        <User2 className="w-3.5 h-3.5" />
                      )}
                      <span className="capitalize">{u.role}</span>
                    </span>
                  </td>
                  <td className="p-4">
                    {u.status === "pending" ? (
                      <span className="inline-flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md text-xs font-semibold">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                        Pending Approval
                      </span>
                    ) : (
                      <div className="flex flex-col items-start gap-1">
                        <span className="inline-flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md text-xs font-semibold">
                          <BadgeCheck className="w-4 h-4" /> Active
                        </span>
                        {u.borrowBlocked && (
                          <span className="inline-flex items-center gap-1.5 text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest leading-none">
                            <ShieldAlert className="w-3 h-3" /> Blocked
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="p-4 text-xs font-mono">
                    <div className="font-bold text-slate-900 leading-none">
                      #{u.memberId || "N/A"}
                    </div>
                  </td>
                  <td className="p-4 text-sm text-slate-500">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4 flex gap-2 justify-end">
                    <button
                      onClick={() => {
                        setSelectedUser(u);
                        fetchUserIssues(u.id);
                      }}
                      className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition shadow-sm border border-indigo-100"
                      title="View Details"
                    >
                      <User2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditUser(u);
                        setEditFormData({
                          name: u.name,
                          role: u.role,
                          status: u.status,
                          phone: u.phone || "",
                          isMonthlyDonor: !!u.isMonthlyDonor,
                          password: "",
                        });
                      }}
                      className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition shadow-sm border border-indigo-100"
                      title="Edit User"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        if (true) {
                          fetch(`/api/users/${u.id}`, {
                            method: "PATCH",
                            headers: {
                              "Content-Type": "application/json",
                              Authorization: `Bearer ${token}`,
                            },
                            body: JSON.stringify({ password: "123456" }),
                          }).then((res) => {
                            if (res.ok) alert("Password reset to 123456");
                            else alert("Reset failed");
                          });
                        }
                      }}
                      className="p-1.5 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-100 transition shadow-sm border border-amber-100"
                      title="Quick Reset Password"
                    >
                      <ShieldAlert className="w-4 h-4" />
                    </button>
                    {u.status === "pending" && (
                      <>
                        <button
                          onClick={() => handleUpdateStatus(u.id, "active")}
                          className="p-1.5 bg-emerald-100 text-emerald-600 rounded hover:bg-emerald-200 transition"
                          title="Approve"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="p-1.5 bg-rose-100 text-rose-600 rounded hover:bg-rose-200 transition"
                          title="Reject/Delete"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </>
                    )}
                    {u.status === "active" && u.role !== "admin" && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to promote ${u.name} to Admin?`)) {
                              fetch(`/api/users/${u.id}`, {
                                method: 'PATCH',
                                headers: {
                                  'Content-Type': 'application/json',
                                  Authorization: `Bearer ${token}`
                                },
                                body: JSON.stringify({ role: 'admin' })
                              }).then(fetchUsers);
                            }
                          }}
                          className="text-[10px] bg-slate-900 text-white px-2 py-1 rounded font-bold uppercase tracking-widest hover:bg-black transition shadow-sm border border-slate-700"
                          title="Promote to Admin"
                        >
                          Make Admin
                        </button>
                        <button
                          onClick={() => {
                            fetch(`/api/users/${u.id}`, {
                              method: 'PATCH',
                              headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${token}`
                              },
                              body: JSON.stringify({ borrowBlocked: !u.borrowBlocked })
                            }).then(fetchUsers);
                          }}
                          className={`text-[10px] px-2 py-1 rounded font-bold uppercase tracking-widest transition shadow-sm ${u.borrowBlocked ? 'bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200' : 'bg-slate-100 text-slate-500 border border-slate-200 hover:bg-slate-200'}`}
                          title={u.borrowBlocked ? "Unblock Borrowing" : "Block Borrowing"}
                        >
                          {u.borrowBlocked ? 'Unblock Borrowing' : 'Block Borrowing'}
                        </button>
                        <button
                          onClick={() => {
                            fetch(`/api/users/${u.id}`, {
                              method: "PATCH",
                              headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`,
                              },
                              body: JSON.stringify({
                                isMonthlyDonor: !u.isMonthlyDonor,
                              }),
                            }).then(fetchUsers);
                          }}
                          className={`text-[10px] px-2 py-1 rounded font-bold uppercase tracking-tighter border transition ${u.isMonthlyDonor ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-slate-400 border-slate-200 hover:border-indigo-400"}`}
                        >
                          {u.isMonthlyDonor ? "Monthly Donor" : "Mark Donor"}
                        </button>
                        <button
                          onClick={() => handleDelete(u.id)}
                          className="p-1.5 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition shadow-sm border border-rose-100"
                          title="Delete User"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No users found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl p-0 shadow-2xl border border-slate-100 overflow-hidden">
            <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-[#111827] to-slate-900 border-b border-indigo-500/20 p-6 sm:p-8 text-white flex justify-between items-start gap-4">
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] pointer-events-none"></div>
              <div className="flex items-start sm:items-center gap-4 sm:gap-6 relative z-10 flex-1 min-w-0">
                <div className="min-w-fit px-3 h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 rounded-2xl flex items-center justify-center font-black text-lg shadow-lg shadow-indigo-600/30 border border-indigo-400/50">
                  <span className="opacity-70 mr-0.5">#</span>
                  {selectedUser.memberId || "PEND"}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight truncate pb-1">
                    {selectedUser.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-indigo-300 font-medium text-sm truncate max-w-[150px] sm:max-w-xs">
                      @{selectedUser.username}
                    </span>
                    <span className="w-1 h-1 bg-slate-600 rounded-full shrink-0"></span>
                    <span className="text-xs font-bold tracking-widest uppercase text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md border border-slate-700 shrink-0">
                      {selectedUser.role}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 bg-white/5 hover:bg-rose-500/20 hover:text-rose-400 rounded-xl transition-all relative z-10 border border-transparent hover:border-rose-500/30 shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-slate-500 font-bold text-[10px] uppercase">
                    Phone
                  </p>
                  <p className="font-semibold">{selectedUser.phone || "N/A"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-500 font-bold text-[10px] uppercase">
                    Status
                  </p>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${selectedUser.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}
                  >
                    {selectedUser.status.toUpperCase()}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-500 font-bold text-[10px] uppercase">
                    Donor Status
                  </p>
                  <p className="font-semibold">
                    {selectedUser.isMonthlyDonor
                      ? "Monthly Donor"
                      : "General Member"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-500 font-bold text-[10px] uppercase">
                    Borrow Status
                  </p>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${!selectedUser.borrowBlocked ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}
                  >
                    {!selectedUser.borrowBlocked ? "ACTIVE" : "BLOCKED"}
                  </span>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-500 font-bold text-[10px] uppercase">
                    Joined
                  </p>
                  <p className="font-semibold">
                    {new Date(selectedUser.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-black text-slate-900 text-sm uppercase tracking-tight flex items-center gap-2">
                  <BookmarkMinus className="w-4 h-4 text-indigo-600" />
                  Books Currently Issued
                </h4>
                {userIssues.filter((i) => i.status === "Issued").length ===
                0 ? (
                  <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-slate-400 text-xs">
                    No books are currently issued to this user.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {userIssues
                      .filter((i) => i.status === "Issued")
                      .map((i) => {
                        const book = books.find((b) => b.id === i.bookId);
                        return (
                          <div
                            key={i.id}
                            className="flex justify-between items-center p-3 bg-indigo-50 border border-indigo-100 rounded-lg"
                          >
                            <div>
                              <p className="font-bold text-slate-900 text-sm">
                                {book?.title || "Unknown Book"}
                              </p>
                              <p className="text-[10px] text-indigo-600 font-mono font-bold">
                                CODE: {book?.bookCode || "N/A"}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] text-slate-400 font-bold uppercase">
                                Expected Return
                              </p>
                              <p className="text-xs font-bold text-slate-900">
                                {new Date(
                                  i.expectedReturnDate,
                                ).toLocaleDateString()}
                              </p>
                            </div>
                            <button
                              onClick={async () => {
                                console.log(
                                  "[DEBUG] Attempting to return issue. issueId:",
                                  i.id,
                                );
                                const res = await fetch(
                                  `/api/issues/${i.id}/return`,
                                  {
                                    method: "PATCH",
                                    headers: {
                                      Authorization: `Bearer ${token}`,
                                    },
                                  },
                                );
                                if (res.ok) {
                                  console.log(
                                    "[DEBUG] Successfully returned issue",
                                  );
                                  fetchUserIssues(selectedUser.id);
                                } else {
                                  console.error(
                                    "[DEBUG] Failed to return issue",
                                  );
                                }
                              }}
                              className="ml-4 p-1.5 bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition"
                              title="Mark as Returned"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-100 mt-4">
                <h4 className="font-black text-slate-900 text-sm uppercase tracking-tight flex items-center gap-2">
                  <BookmarkMinus className="w-4 h-4 text-emerald-600" />
                  Borrow History (Returned)
                </h4>
                {userIssues.filter((i) => i.status === "Returned").length ===
                0 ? (
                  <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-slate-400 text-xs">
                    No borrowing history found.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {userIssues
                      .filter((i) => i.status === "Returned")
                      .sort(
                        (a, b) =>
                          new Date(b.returnDate || b.issueDate).getTime() -
                          new Date(a.returnDate || a.issueDate).getTime(),
                      )
                      .map((i) => {
                        const book = books.find((b) => b.id === i.bookId);
                        return (
                          <div
                            key={i.id}
                            className="flex justify-between items-center p-3 bg-slate-50 border border-slate-100 rounded-lg"
                          >
                            <div>
                              <p className="font-bold text-slate-900 text-sm line-through text-slate-500">
                                {book?.title || "Unknown Book"}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono font-bold">
                                CODE: {book?.bookCode || "N/A"}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] text-emerald-500 font-bold uppercase">
                                Returned On
                              </p>
                              <p className="text-xs font-bold text-slate-900">
                                {new Date(
                                  i.returnDate || i.issueDate,
                                ).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-slate-50 p-4 flex justify-end gap-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedUser(null)}
                className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold text-sm"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {editUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-8 shadow-2xl border border-slate-100">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center">
                <Pencil className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  Edit Member
                </h3>
                <p className="text-xs text-slate-500 font-medium tracking-tight">
                  Updating information for @{editUser.username}
                </p>
              </div>
            </div>

            <form onSubmit={handleEditUser} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1 text-slate-400">
                  Full Name
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, name: e.target.value })
                  }
                  className="w-full border border-slate-200 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-slate-50 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1 text-slate-400">
                  Phone
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.phone}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, phone: e.target.value })
                  }
                  className="w-full border border-slate-200 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-slate-50 transition-all"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-1 text-slate-400">
                  Update Password (Optional)
                </label>
                <input
                  type="password"
                  value={editFormData.password}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      password: e.target.value,
                    })
                  }
                  className="w-full border border-slate-200 p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 bg-slate-50 transition-all"
                  placeholder="New password or leave blank"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-1 text-slate-400">
                    Role
                  </label>
                  <select
                    value={editFormData.role}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, role: e.target.value })
                    }
                    className="w-full border border-slate-200 p-2.5 rounded-lg bg-slate-50"
                  >
                    <option value="reader">Reader / Member</option>
                    <option value="donor">Donor Member</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-1 text-slate-400">
                    Status
                  </label>
                  <select
                    value={editFormData.status}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        status: e.target.value,
                      })
                    }
                    className="w-full border border-slate-200 p-2.5 rounded-lg bg-slate-50"
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                <input
                  type="checkbox"
                  id="isMonthlyDonor_edit"
                  checked={editFormData.isMonthlyDonor}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      isMonthlyDonor: e.target.checked,
                    })
                  }
                  className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                <label
                  htmlFor="isMonthlyDonor_edit"
                  className="text-sm font-semibold text-slate-700 cursor-pointer"
                >
                  Monthly Donor
                </label>
              </div>
              <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditUser(null)}
                  className="px-6 py-2.5 font-bold text-slate-500 hover:text-slate-900 transition text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 shadow-md shadow-indigo-200 transition text-sm"
                >
                  Update Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
