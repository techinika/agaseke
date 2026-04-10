/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Users,
  Shield,
  ShieldCheck,
  ShieldOff,
  MoreVertical,
  Eye,
  Mail,
  Crown,
  Loader,
  RefreshCw,
  ChevronDown,
  Check,
  X,
  DollarSign,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { db } from "@/db/firebase";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  where,
  doc,
  updateDoc,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { toast } from "sonner";
import { logActivity } from "@/lib/logger";

interface UserProfile {
  id: string;
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  type: "supporter" | "creator" | "admin";
  username?: string;
  isAdmin: boolean;
  onboarded: boolean;
  totalSupport: number;
  totalSupportedCreators: number;
  createdAt?: Timestamp;
  lastLogin?: Timestamp;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<
    "all" | "creator" | "supporter" | "admin"
  >("all");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [makingAdmin, setMakingAdmin] = useState<string | null>(null);

  useEffect(() => {
    const profilesRef = collection(db, "profiles");
    const q = query(profilesRef, orderBy("createdAt", "desc"), limit(500));

    const unsub = onSnapshot(q, (snapshot) => {
      const userData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as UserProfile[];
      setUsers(userData);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (typeFilter !== "all" && user.type !== typeFilter) return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          user.email?.toLowerCase().includes(search) ||
          user.displayName?.toLowerCase().includes(search) ||
          user.id.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [users, typeFilter, searchTerm]);

  const stats = useMemo(() => {
    return {
      total: users.length,
      creators: users.filter((u) => u.type === "creator").length,
      supporters: users.filter((u) => u.type === "supporter").length,
      admins: users.filter((u) => u.isAdmin === true).length,
    };
  }, [users]);

  const toggleAdmin = async (user: UserProfile) => {
    setMakingAdmin(user.id);
    try {
      const newIsAdmin = !user.isAdmin;
      await updateDoc(doc(db, "profiles", user.id), {
        isAdmin: newIsAdmin,
      });

      await logActivity({
        level: "info",
        category: "admin",
        message: `${newIsAdmin ? "Made admin" : "Removed admin from"}: ${user.displayName || user.email}`,
        userId: user.id,
        userEmail: user.email || undefined,
        userName: user.displayName || undefined,
      });

      toast.success(newIsAdmin ? "User is now an admin" : "Admin removed");
    } catch (error) {
      console.error("Error updating admin:", error);
      toast.error("Failed to update user");
    } finally {
      setMakingAdmin(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <RefreshCw className="animate-spin text-orange-500" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBFBFC] text-slate-900 pb-20">
      <main className="max-w-7xl mx-auto px-6 mt-12">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 uppercase">
            User Management
          </h1>
          <p className="text-slate-500 font-medium mt-1">
            View and manage all platform users
          </p>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-slate-400" />
              <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                Total Users
              </p>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {stats.total.toLocaleString()}
            </p>
          </div>
          <div className="bg-orange-50 rounded-xl border border-orange-100 p-4">
            <div className="flex items-center gap-2">
              <Shield size={16} className="text-orange-600" />
              <p className="text-[10px] font-bold uppercase text-orange-600 tracking-wider">
                Creators
              </p>
            </div>
            <p className="text-2xl font-bold text-orange-700 mt-1">
              {stats.creators.toLocaleString()}
            </p>
          </div>
          <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
            <div className="flex items-center gap-2">
              <DollarSign size={16} className="text-blue-600" />
              <p className="text-[10px] font-bold uppercase text-blue-600 tracking-wider">
                Supporters
              </p>
            </div>
            <p className="text-2xl font-bold text-blue-700 mt-1">
              {stats.supporters.toLocaleString()}
            </p>
          </div>
          <div className="bg-orange-50 rounded-xl border border-orange-100 p-4">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-orange-600" />
              <p className="text-[10px] font-bold uppercase text-orange-600 tracking-wider">
                Admins
              </p>
            </div>
            <p className="text-2xl font-bold text-orange-700 mt-1">
              {stats.admins.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-slate-100 p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-2">
                Search
              </label>
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300"
                />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-100"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-2">
                User Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm outline-none"
              >
                <option value="all">All Users</option>
                <option value="creator">Creators</option>
                <option value="supporter">Supporters</option>
                <option value="admin">Admins</option>
              </select>
            </div>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-20">
              <Users size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-500 font-medium">No users found</p>
              <p className="text-slate-400 text-sm mt-1">
                {searchTerm || typeFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Users will appear here as they sign up"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-6 py-4 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                      User
                    </th>
                    <th className="text-left px-6 py-4 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                      Type
                    </th>
                    <th className="text-left px-6 py-4 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                      Total Support
                    </th>
                    <th className="text-left px-6 py-4 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                      Joined
                    </th>
                    <th className="text-left px-6 py-4 text-[10px] font-bold uppercase text-slate-400 tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-slate-50 hover:bg-slate-50 transition"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-sm font-bold overflow-hidden">
                            {user.photoURL ? (
                              <img
                                src={user.photoURL}
                                alt={user.displayName || "User"}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              (user.displayName ||
                                user.email ||
                                "?")[0].toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-sm">
                              {user.displayName || "No name"}
                            </p>
                            <p className="text-xs text-slate-400">
                              {user.email || "No email"}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                              user.type === "creator"
                                ? "bg-orange-100 text-orange-600"
                                : "bg-blue-100 text-blue-600"
                            }`}
                          >
                            {user.type}
                          </span>
                          {user.isAdmin && (
                            <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-orange-100 text-orange-600">
                              Admin
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <p className="font-bold text-sm">
                          {user.totalSupport > 0
                            ? `${user.totalSupport.toLocaleString()} RWF`
                            : "-"}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-sm text-slate-500">
                          {user.createdAt?.toDate().toLocaleDateString() ||
                            "Unknown"}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                            title="View Details"
                          >
                            <Eye size={16} />
                          </button>
                          {!user.isAdmin ? (
                            <button
                              onClick={() => toggleAdmin(user)}
                              disabled={makingAdmin === user.id}
                              className="p-2 text-orange-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition"
                              title="Make Admin"
                            >
                              {makingAdmin === user.id ? (
                                <Loader size={16} className="animate-spin" />
                              ) : (
                                <ShieldCheck size={16} />
                              )}
                            </button>
                          ) : (
                            <button
                              onClick={() => toggleAdmin(user)}
                              disabled={makingAdmin === user.id}
                              className="p-2 text-orange-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition"
                              title="Remove Admin"
                            >
                              {makingAdmin === user.id ? (
                                <Loader size={16} className="animate-spin" />
                              ) : (
                                <ShieldOff size={16} />
                              )}
                            </button>
                          )}
                          {user.type === "creator" && (
                            <a
                              href={`/${user.username || user.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
                              title="View Profile"
                            >
                              <ExternalLink size={16} />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-white w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <h2 className="text-xl font-bold">User Details</h2>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 hover:bg-slate-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-2xl font-bold overflow-hidden">
                  {selectedUser.photoURL ? (
                    <img
                      src={selectedUser.photoURL}
                      alt={selectedUser.displayName || "User"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (selectedUser.displayName ||
                      selectedUser.email ||
                      "?")[0].toUpperCase()
                  )}
                </div>
                <div>
                  <p className="font-bold text-lg">
                    {selectedUser.displayName || "No name"}
                  </p>
                  <p className="text-sm text-slate-500">{selectedUser.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                        selectedUser.type === "creator"
                          ? "bg-orange-100 text-orange-600"
                          : "bg-blue-100 text-blue-600"
                      }`}
                    >
                      {selectedUser.type}
                    </span>
                    {selectedUser.isAdmin && (
                      <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-orange-100 text-orange-600">
                        Admin
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-[10px] font-bold uppercase text-slate-400">
                      Total Supported
                    </p>
                    <p className="text-xl font-bold mt-1">
                      {selectedUser.totalSupport.toLocaleString()} RWF
                    </p>
                  </div>
                  <div className="bg-slate-50 rounded-lg p-4">
                    <p className="text-[10px] font-bold uppercase text-slate-400">
                      Creators Supported
                    </p>
                    <p className="text-xl font-bold mt-1">
                      {selectedUser.totalSupportedCreators}
                    </p>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-4">
                  <p className="text-[10px] font-bold uppercase text-slate-400">
                    User ID
                  </p>
                  <p className="text-sm font-mono mt-1 break-all">
                    {selectedUser.id}
                  </p>
                </div>
                <div className="flex gap-3">
                  {!selectedUser.isAdmin && (
                    <button
                      onClick={() => {
                        toggleAdmin(selectedUser);
                        setSelectedUser(null);
                      }}
                      disabled={makingAdmin === selectedUser.id}
                      className="flex-1 py-3 bg-orange-600 text-white rounded-lg font-bold text-sm hover:bg-orange-700 transition"
                    >
                      Make Admin
                    </button>
                  )}
                  {selectedUser.type === "creator" && (
                    <a
                      href={`/${selectedUser.username || selectedUser.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-3 bg-slate-900 text-white rounded-lg font-bold text-sm hover:bg-slate-800 transition text-center"
                    >
                      View Profile
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
