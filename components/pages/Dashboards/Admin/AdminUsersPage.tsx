/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { sendCommsEmail } from "@/lib/commsService";
import {
  Search,
  Users,
  Shield,
  ShieldCheck,
  ShieldOff,
  Eye,
  Loader,
  X,
  DollarSign,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { db } from "@/db/firebase";
import {
  doc,
  updateDoc,
  arrayUnion,
  collection,
  getDocs,
  query,
  where,
  getDoc,
  orderBy,
  limit,
  startAfter,
  Timestamp,
} from "firebase/firestore";
import { toast } from "sonner";
import { logActivity } from "@/lib/logger";
import Loading from "@/app/loading";
import Link from "next/link";

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
  phoneNumber?: string | null;
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
  const [verifyingUser, setVerifyingUser] = useState<UserProfile | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const lastDocsRef = useRef<(any | null)[]>([null]);
  const [creatorProfile, setCreatorProfile] = useState<any>(null);
  const [creatorLoading, setCreatorLoading] = useState(false);
  const PAGE_SIZE = 25;

  const fetchUsers = useCallback(async (pageNum: number) => {
    setLoading(true);
    const profilesRef = collection(db, "profiles");
    let q;
    if (pageNum === 0) {
      q = query(profilesRef, orderBy("createdAt", "desc"), limit(PAGE_SIZE));
    } else {
      q = query(
        profilesRef,
        orderBy("createdAt", "desc"),
        startAfter(lastDocsRef.current[pageNum]),
        limit(PAGE_SIZE),
      );
    }
    const snapshot = await getDocs(q);
    const userData = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as UserProfile[];
    setUsers(userData);
    setHasMore(snapshot.docs.length === PAGE_SIZE);
    if (snapshot.docs.length > 0) {
      lastDocsRef.current[pageNum + 1] =
        snapshot.docs[snapshot.docs.length - 1];
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchUsers(page);
  }, [page, fetchUsers]);

  useEffect(() => {
    if (!selectedUser) {
      setCreatorProfile(null);
      return;
    }
    const fetchCreator = async () => {
      setCreatorLoading(true);
      try {
        const username = selectedUser.username || selectedUser.id;
        const creatorRef = doc(db, "creators", username);
        const creatorSnap = await getDoc(creatorRef);
        if (creatorSnap.exists()) {
          setCreatorProfile({ id: creatorSnap.id, ...creatorSnap.data() });
        } else {
          setCreatorProfile(null);
        }
      } catch {
        setCreatorProfile(null);
      } finally {
        setCreatorLoading(false);
      }
    };
    fetchCreator();
  }, [selectedUser]);

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

  const verifyUser = async () => {
    if (!verifyingUser) return;
    setVerifyLoading(true);

    try {
      await updateDoc(
        doc(db, "creators", verifyingUser.username || verifyingUser.id),
        {
          verified: true,
          verificationStatus: "approved",
        },
      );

      await sendCommsEmail("verification_feedback", {
        email: verifyingUser.email,
        name: verifyingUser.displayName,
        approved: true,
        reason: "",
        creatorUid: verifyingUser.uid || verifyingUser.id,
        handle: verifyingUser.username || verifyingUser.id,
      });

      await logActivity({
        level: "success",
        category: "verification",
        message: `Verified by admin: ${verifyingUser.displayName || verifyingUser.email}`,
        userId: verifyingUser.id,
        userEmail: verifyingUser.email || undefined,
        userName: verifyingUser.displayName || undefined,
      });

      toast.success("User verified successfully");
      setVerifyingUser(null);
    } catch (error) {
      console.error("Error verifying user:", error);
      toast.error("Failed to verify user");
    } finally {
      setVerifyLoading(false);
    }
  };

  if (loading) {
    return <Loading />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <main className="max-w-7xl mx-auto px-6 mt-12">
        <header className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground uppercase">
            User Management
          </h1>
          <p className="text-muted-foreground font-medium mt-1">
            View and manage all platform users
          </p>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-card rounded-xl border border-border p-4">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-muted-foreground" />
              <p className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                Total Users
              </p>
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">
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
        <div className="bg-card rounded-xl border border-border p-4 mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider block mb-2">
                Search
              </label>
              <div className="relative">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                />
                <input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-100"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider block mb-2">
                User Type
              </label>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-sm outline-none"
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
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          {filteredUsers.length === 0 ? (
            <div className="text-center py-20">
              <Users size={48} className="mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground font-medium">
                No users found
              </p>
              <p className="text-muted-foreground text-sm mt-1">
                {searchTerm || typeFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Users will appear here as they sign up"}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted border-b border-border">
                    <th className="text-left px-6 py-4 text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                      User
                    </th>
                    <th className="text-left px-6 py-4 text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                      Type
                    </th>
                    <th className="text-left px-6 py-4 text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                      Total Support
                    </th>
                    <th className="text-left px-6 py-4 text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                      Joined
                    </th>
                    <th className="text-left px-6 py-4 text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr
                      key={user.id}
                      onClick={() => setSelectedUser(user)}
                      className="border-b border-border hover:bg-muted transition cursor-pointer"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center text-sm font-bold overflow-hidden">
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
                            <p className="text-xs text-muted-foreground">
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
                        <p className="text-sm text-muted-foreground">
                          {user.createdAt?.toDate().toLocaleDateString() ||
                            "Unknown"}
                        </p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="p-2 text-muted-foreground hover:text-muted-foreground hover:bg-muted rounded-lg transition"
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
                            <button
                              onClick={() => setVerifyingUser(user)}
                              className="p-2 text-emerald-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition"
                              title="Verify User"
                            >
                              <ShieldCheck size={16} />
                            </button>
                          )}
                          {user.type === "creator" && (
                            <a
                              href={`/${user.username || user.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-muted-foreground hover:text-muted-foreground hover:bg-muted rounded-lg transition"
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

          {/* Pagination */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-border">
            <p className="text-sm text-muted-foreground">Page {page + 1}</p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg bg-muted hover:bg-border-strong transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={16} />
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasMore}
                className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg bg-muted hover:bg-border-strong transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Verify User Modal */}
      {verifyingUser && (
        <div className="fixed inset-0 bg-foreground/60 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
          <div className="bg-card w-full max-w-md rounded-2xl overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-border flex justify-between items-center">
              <h2 className="text-xl font-bold">Verify User</h2>
              <button
                onClick={() => setVerifyingUser(null)}
                className="p-2 hover:bg-muted rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center text-xl font-bold overflow-hidden">
                  {verifyingUser.photoURL ? (
                    <img
                      src={verifyingUser.photoURL}
                      alt={verifyingUser.displayName || "User"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    (verifyingUser.displayName ||
                      verifyingUser.email ||
                      "?")[0].toUpperCase()
                  )}
                </div>
                <div>
                  <p className="font-bold text-lg">
                    {verifyingUser.displayName || "No name"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {verifyingUser.email}
                  </p>
                </div>
              </div>
              <p className="text-muted-foreground mb-6">
                Are you sure you want to verify this user? They will receive an
                email notification confirming their verification status.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setVerifyingUser(null)}
                  className="flex-1 py-3 bg-muted text-foreground rounded-lg font-bold text-sm hover:bg-border-strong transition"
                >
                  Cancel
                </button>
                <button
                  onClick={verifyUser}
                  disabled={verifyLoading}
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-lg font-bold text-sm hover:bg-emerald-700 transition flex items-center justify-center gap-2"
                >
                  {verifyLoading && (
                    <Loader size={16} className="animate-spin" />
                  )}
                  Confirm Verification
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User Details Side Panel */}
      {selectedUser && (
        <>
          <div
            className="fixed inset-0 bg-black/40 z-40"
            onClick={() => setSelectedUser(null)}
          />
          <div className="fixed top-0 right-0 h-full w-full max-w-lg bg-background border-l border-border z-50 shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-background border-b border-border px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-foreground uppercase">
                User Details
              </h2>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 hover:bg-muted rounded-lg transition"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-6">
              {/* Profile Header */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center text-2xl font-bold overflow-hidden shrink-0">
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
                <div className="min-w-0">
                  <p className="font-bold text-lg truncate">
                    {selectedUser.displayName || "No name"}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {selectedUser.email}
                  </p>
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

              {/* Profile Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">
                    Total Supported
                  </p>
                  <p className="text-xl font-bold mt-1">
                    {selectedUser.totalSupport.toLocaleString()} RWF
                  </p>
                </div>
                <div className="bg-muted rounded-lg p-4">
                  <p className="text-[10px] font-bold uppercase text-muted-foreground">
                    Creators Supported
                  </p>
                  <p className="text-xl font-bold mt-1">
                    {selectedUser.totalSupportedCreators}
                  </p>
                </div>
              </div>

              <div className="bg-muted rounded-lg p-4">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">
                  User ID
                </p>
                <p className="text-sm font-mono mt-1 break-all">
                  {selectedUser.id}
                </p>
              </div>

              <div className="bg-muted rounded-lg p-4">
                <p className="text-[10px] font-bold uppercase text-muted-foreground">
                  Phone Number
                </p>
                <p className="text-sm mt-1">
                  {creatorProfile
                    ? creatorProfile.payoutNumber
                    : selectedUser.phoneNumber || "—"}
                </p>
              </div>

              {/* Creator Profile Section */}
              {selectedUser.type === "creator" && (
                <div>
                  <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-3">
                    Creator Profile
                  </p>
                  {creatorLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader
                        size={20}
                        className="animate-spin text-muted-foreground"
                      />
                    </div>
                  ) : creatorProfile ? (
                    <div className="bg-muted rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                          Handle
                        </p>
                        <p className="text-sm font-medium">
                          @{creatorProfile.id}
                        </p>
                      </div>
                      {creatorProfile.displayName && (
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                            Display Name
                          </p>
                          <p className="text-sm">
                            {creatorProfile.displayName}
                          </p>
                        </div>
                      )}
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                          Verified
                        </p>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            creatorProfile.verified
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {creatorProfile.verified ? "Verified" : "Unverified"}
                        </span>
                      </div>
                      {creatorProfile.views !== undefined && (
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider">
                            Profile Views
                          </p>
                          <p className="text-sm font-bold">
                            {creatorProfile.views.toLocaleString()}
                          </p>
                        </div>
                      )}
                      {creatorProfile.bio && (
                        <div>
                          <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-1">
                            Bio
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {creatorProfile.bio}
                          </p>
                        </div>
                      )}
                      {creatorProfile.coverURL && (
                        <div>
                          <p className="text-xs font-bold uppercase text-muted-foreground tracking-wider mb-1">
                            Cover
                          </p>
                          <img
                            src={creatorProfile.coverURL}
                            alt="Cover"
                            className="w-full h-24 object-cover rounded-lg"
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-muted rounded-lg p-4 text-center">
                      <p className="text-sm text-muted-foreground">
                        No creator profile found
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col gap-3">
                {selectedUser.type === "creator" && (
                  <button
                    onClick={() => {
                      setVerifyingUser(selectedUser);
                      setSelectedUser(null);
                    }}
                    className="w-full py-3 bg-emerald-600 text-white rounded-lg font-bold text-sm hover:bg-emerald-700 transition"
                  >
                    Verify User
                  </button>
                )}
                {!selectedUser.isAdmin ? (
                  <button
                    onClick={() => {
                      toggleAdmin(selectedUser);
                      setSelectedUser(null);
                    }}
                    disabled={makingAdmin === selectedUser.id}
                    className="w-full py-3 bg-orange-600 text-white rounded-lg font-bold text-sm hover:bg-orange-700 transition flex items-center justify-center gap-2"
                  >
                    {makingAdmin === selectedUser.id ? (
                      <Loader size={16} className="animate-spin" />
                    ) : null}
                    Make Admin
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      toggleAdmin(selectedUser);
                      setSelectedUser(null);
                    }}
                    disabled={makingAdmin === selectedUser.id}
                    className="w-full py-3 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 transition flex items-center justify-center gap-2"
                  >
                    {makingAdmin === selectedUser.id ? (
                      <Loader size={16} className="animate-spin" />
                    ) : null}
                    Remove Admin
                  </button>
                )}
                {selectedUser.type === "creator" && (
                  <Link
                    href={`/${selectedUser.username || selectedUser.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-3 bg-foreground text-background rounded-lg font-bold text-sm hover:bg-card transition text-center"
                  >
                    View Public Profile
                  </Link>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
