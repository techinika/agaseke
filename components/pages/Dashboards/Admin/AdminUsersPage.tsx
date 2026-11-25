/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
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
  Download,
  FileSearch,
} from "lucide-react";
import { auth, db } from "@/db/firebase";
import {
  doc,
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
import { LoadingState } from "@/components/ui/LoadingState";
import Link from "next/link";
import {
  isCreatorAlreadyVerified,
  normalizeVerificationRequest,
  resolveVerificationBadgeState,
  type NormalizedVerificationRequest,
  type VerificationBadgeState,
} from "@/lib/verificationSchema";
import { VerificationReviewDialog } from "./VerificationReviewDialog";

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
  const [verificationFilter, setVerificationFilter] = useState<
    "all" | "verified" | "pending" | "unverified"
  >("all");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [makingAdmin, setMakingAdmin] = useState<string | null>(null);
  const [reviewingRequest, setReviewingRequest] =
    useState<NormalizedVerificationRequest | null>(null);
  const [loadingReviewUid, setLoadingReviewUid] = useState<string | null>(null);
  const [creatorsByUid, setCreatorsByUid] = useState<
    Record<string, Record<string, unknown>>
  >({});
  const [pendingByUid, setPendingByUid] = useState<
    Record<string, NormalizedVerificationRequest>
  >({});
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
    const [snapshot, pendingSnap] = await Promise.all([
      getDocs(q),
      getDocs(
        query(
          collection(db, "verificationRequests"),
          where("status", "==", "pending"),
        ),
      ),
    ]);

    const userData = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as UserProfile[];

    // Resolve creators for this page (by handle and/or uid)
    const creatorRecords: Record<string, Record<string, unknown>> = {};
    const creatorUsers = userData.filter((u) => u.type === "creator");
    await Promise.all(
      creatorUsers.map(async (u) => {
        const uid = u.uid || u.id;
        try {
          if (u.username) {
            const cSnap = await getDoc(doc(db, "creators", u.username));
            if (cSnap.exists()) {
              creatorRecords[uid] = {
                id: cSnap.id,
                ...(cSnap.data() as Record<string, unknown>),
              };
              return;
            }
          }
          const byUid = await getDocs(
            query(collection(db, "creators"), where("uid", "==", uid), limit(1)),
          );
          if (!byUid.empty) {
            const c = byUid.docs[0];
            creatorRecords[uid] = {
              id: c.id,
              ...(c.data() as Record<string, unknown>),
            };
          }
        } catch {
          // ignore per-user creator fetch failures
        }
      }),
    );

    const profileByUid = new Map<string, UserProfile>();
    for (const u of userData) {
      profileByUid.set(u.uid || u.id, u);
    }

    const pendingMap: Record<string, NormalizedVerificationRequest> = {};
    for (const d of pendingSnap.docs) {
      const raw = d.data() as Record<string, unknown>;
      const reqUid = typeof raw.uid === "string" ? raw.uid : "";
      if (!reqUid) continue;
      const cData = creatorRecords[reqUid] ?? null;
      if (isCreatorAlreadyVerified(cData)) continue;
      const pData = (profileByUid.get(reqUid) as Record<string, unknown> | undefined) ?? null;
      const normalized = normalizeVerificationRequest(d.id, raw, cData, pData);
      const existing = pendingMap[reqUid];
      const existingMs = existing?.submittedAtIso ? Date.parse(existing.submittedAtIso) : 0;
      const nextMs = normalized.submittedAtIso ? Date.parse(normalized.submittedAtIso) : 0;
      if (!existing || nextMs >= existingMs) {
        pendingMap[reqUid] = normalized;
      }
    }

    setCreatorsByUid(creatorRecords);
    setPendingByUid(pendingMap);
    setUsers(userData);
    setHasMore(snapshot.docs.length === PAGE_SIZE);
    if (snapshot.docs.length > 0) {
      lastDocsRef.current[pageNum + 1] =
        snapshot.docs[snapshot.docs.length - 1];
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void fetchUsers(page);
    });
  }, [page, fetchUsers]);

  useEffect(() => {
    if (!selectedUser) {
      queueMicrotask(() => setCreatorProfile(null));
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
    queueMicrotask(() => {
      void fetchCreator();
    });
  }, [selectedUser]);

  const getUserVerificationState = useCallback(
    (user: UserProfile): VerificationBadgeState => {
      if (user.type !== "creator") return "unverified";
      const uid = user.uid || user.id;
      const creatorData = creatorsByUid[uid] ?? null;
      const pendingReq = pendingByUid[uid] ?? null;
      return resolveVerificationBadgeState(
        creatorData,
        pendingReq ? { status: pendingReq.status } : null,
      );
    },
    [creatorsByUid, pendingByUid],
  );

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      if (typeFilter === "admin" && !user.isAdmin) return false;
      if (typeFilter !== "all" && typeFilter !== "admin" && user.type !== typeFilter) {
        return false;
      }
      if (verificationFilter !== "all") {
        if (user.type !== "creator") return false;
        const vState = getUserVerificationState(user);
        if (verificationFilter === "verified" && vState !== "verified") return false;
        if (verificationFilter === "pending" && vState !== "pending") return false;
        if (
          verificationFilter === "unverified" &&
          vState !== "unverified" &&
          vState !== "rejected"
        ) {
          return false;
        }
      }
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          user.email?.toLowerCase().includes(search) ||
          user.displayName?.toLowerCase().includes(search) ||
          user.username?.toLowerCase().includes(search) ||
          user.id.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [users, typeFilter, verificationFilter, searchTerm, getUserVerificationState]);

  const stats = useMemo(() => {
    return {
      total: users.length,
      creators: users.filter((u) => u.type === "creator").length,
      verifiedCreators: users.filter(
        (u) => u.type === "creator" && getUserVerificationState(u) === "verified",
      ).length,
      admins: users.filter((u) => u.isAdmin === true).length,
    };
  }, [users, getUserVerificationState]);

  const toggleAdmin = async (user: UserProfile) => {
    setMakingAdmin(user.id);
    try {
      const newIsAdmin = !user.isAdmin;
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error("Authentication required");

      const res = await fetch("/api/admin/users/role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ uid: user.id, isAdmin: newIsAdmin }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to update user");
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isAdmin: newIsAdmin } : u)),
      );
      setSelectedUser((prev) =>
        prev && prev.id === user.id ? { ...prev, isAdmin: newIsAdmin } : prev,
      );

      toast.success(newIsAdmin ? "User is now an admin" : "Admin removed");
    } catch (error) {
      console.error("Error updating admin:", error);
      toast.error("Failed to update user");
    } finally {
      setMakingAdmin(null);
    }
  };

  const openVerificationReview = async (
    user: UserProfile,
    explicitCreatorData?: Record<string, unknown> | null,
  ) => {
    const uid = user.uid || user.id;
    const cachedPending = pendingByUid[uid];
    if (cachedPending) {
      setReviewingRequest(cachedPending);
      return;
    }

    setLoadingReviewUid(uid);
    try {
      const creatorData = explicitCreatorData ?? creatorsByUid[uid] ?? null;
      const reqSnap = await getDocs(
        query(collection(db, "verificationRequests"), where("uid", "==", uid)),
      );
      if (reqSnap.empty) {
        if (!creatorData && !user.username) {
          toast.info("No verification submission found for this user.");
          return;
        }
        setReviewingRequest(
          normalizeVerificationRequest(
            "",
            { uid, status: isCreatorAlreadyVerified(creatorData) ? "approved" : "pending" },
            creatorData,
            user as unknown as Record<string, unknown>,
          ),
        );
        return;
      }

      const sortedDocs = [...reqSnap.docs].sort((a, b) => {
        const aTs = a.data()?.createdAt?.toMillis?.() ?? 0;
        const bTs = b.data()?.createdAt?.toMillis?.() ?? 0;
        return bTs - aTs;
      });
      const pendingDoc = sortedDocs.find((d) => d.data()?.status === "pending");
      const targetDoc = pendingDoc ?? sortedDocs[0];
      setReviewingRequest(
        normalizeVerificationRequest(
          targetDoc.id,
          targetDoc.data() as Record<string, unknown>,
          creatorData,
          user as unknown as Record<string, unknown>,
        ),
      );
    } catch (error) {
      console.error("Failed to load verification submission:", error);
      toast.error("Failed to load verification details");
    } finally {
      setLoadingReviewUid(null);
    }
  };

  const [csvDownloading, setCsvDownloading] = useState(false);

  const downloadCSV = async () => {
    setCsvDownloading(true);
    try {
      const profilesRef = collection(db, "profiles");
      const q = query(profilesRef, orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const allUsers = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as UserProfile[];

      const headers = [
        "UID", "Email", "Display Name", "Type", "Username",
        "Is Admin", "Onboarded", "Phone", "Total Support",
        "Supported Creators", "Created At", "Last Login",
      ];
      const rows = allUsers.map((u) => [
        u.id,
        u.email || "",
        u.displayName || "",
        u.type || "",
        u.username || "",
        u.isAdmin ? "Yes" : "No",
        u.onboarded ? "Yes" : "No",
        u.phoneNumber || "",
        u.totalSupport ?? 0,
        u.totalSupportedCreators ?? 0,
        u.createdAt?.toDate?.()?.toISOString() || "",
        u.lastLogin?.toDate?.()?.toISOString() || "",
      ]);

      const csv = [
        headers.join(","),
        ...rows.map((r) =>
          r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")
        ),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `users-${new Date().toISOString().split("T")[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${allUsers.length} users`);
    } catch {
      toast.error("Failed to export users");
    } finally {
      setCsvDownloading(false);
    }
  };

  if (loading) {
    return <LoadingState variant="list" />;
  }

  return (
    <div className="min-h-screen bg-background text-foreground pb-20">
      <div className="max-w-7xl mx-auto px-6 mt-12">
        <header className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground uppercase">
              User Management
            </h1>
            <p className="text-muted-foreground font-medium mt-1">
              View and manage all platform users
            </p>
          </div>
          <button
            onClick={downloadCSV}
            disabled={csvDownloading}
            className="flex items-center gap-2 px-4 py-2 bg-card border border-border rounded-lg text-sm font-medium text-foreground hover:bg-muted transition disabled:opacity-50"
          >
            <Download size={16} />
            {csvDownloading ? "Downloading..." : "Download CSV"}
          </button>
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
                Verified Creators
              </p>
            </div>
            <p className="text-2xl font-bold text-blue-700 mt-1">
              {stats.verifiedCreators.toLocaleString()}
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                  placeholder="Search by name, handle, or email..."
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
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider block mb-2">
                Verification Status
              </label>
              <select
                value={verificationFilter}
                onChange={(e) => setVerificationFilter(e.target.value as any)}
                className="w-full px-4 py-2 bg-muted border border-border rounded-lg text-sm outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending Review</option>
                <option value="unverified">Unverified / Rejected</option>
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
            <>
              {/* Mobile cards */}
              <div className="divide-y divide-border md:hidden">
                {filteredUsers.map((user) => {
                  const vState = getUserVerificationState(user);
                  const uid = user.uid || user.id;
                  return (
                    <div
                      key={user.id}
                      onClick={() => setSelectedUser(user)}
                      className="space-y-3 p-4 hover:bg-muted/60 transition cursor-pointer"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="w-10 h-10 shrink-0 bg-muted rounded-full flex items-center justify-center text-sm font-bold overflow-hidden">
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
                          <div className="min-w-0">
                            <p className="truncate font-bold text-sm">
                              {user.displayName || "No name"}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {user.username ? `@${user.username} · ` : ""}
                              {user.email || "No email"}
                            </p>
                          </div>
                        </div>
                        <p className="shrink-0 font-bold text-sm tabular-nums">
                          {user.totalSupport > 0
                            ? `${user.totalSupport.toLocaleString()}${
                                typeof (user as any).currency === "string" && (user as any).currency
                                  ? ` ${(user as any).currency.toUpperCase()}`
                                  : ""
                              }`
                            : "-"}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            user.type === "creator"
                              ? "bg-orange-100 text-orange-600"
                              : "bg-blue-100 text-blue-600"
                          }`}
                        >
                          {user.type}
                        </span>
                        {user.type === "creator" && vState === "verified" && (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                            Verified
                          </span>
                        )}
                        {user.type === "creator" && vState === "pending" && (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                            Pending Review
                          </span>
                        )}
                        {user.type === "creator" && vState === "rejected" && (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-700">
                            Rejected
                          </span>
                        )}
                        {user.isAdmin && (
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-orange-100 text-orange-600">
                            Admin
                          </span>
                        )}
                      </div>

                      <div
                        className="flex flex-wrap items-center justify-between gap-2 pt-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-xs text-muted-foreground tabular-nums">
                          Joined {user.createdAt?.toDate().toLocaleDateString() || "Unknown"}
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            onClick={() => setSelectedUser(user)}
                            className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition"
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
                          {user.type === "creator" && vState === "pending" && (
                            <button
                              onClick={() => void openVerificationReview(user)}
                              disabled={loadingReviewUid === uid}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-amber-100 text-amber-800 hover:bg-amber-200 rounded-lg transition"
                              title="Review Submitted Documents & Data"
                            >
                              {loadingReviewUid === uid ? (
                                <Loader size={14} className="animate-spin" />
                              ) : (
                                <FileSearch size={14} />
                              )}
                              Review
                            </button>
                          )}
                          {user.type === "creator" && (
                            <a
                              href={`/${user.username || user.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 text-muted-foreground hover:bg-muted rounded-lg transition"
                              title="View Profile"
                            >
                              <ExternalLink size={16} />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[680px]">
                  <thead>
                    <tr className="bg-muted border-b border-border">
                      <th className="text-left px-4 lg:px-6 py-4 text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                        User
                      </th>
                      <th className="text-left px-4 lg:px-6 py-4 text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                        Type
                      </th>
                      <th className="whitespace-nowrap text-left px-4 lg:px-6 py-4 text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                        Total Support
                      </th>
                      <th className="whitespace-nowrap text-left px-4 lg:px-6 py-4 text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                        Joined
                      </th>
                      <th className="whitespace-nowrap text-left px-4 lg:px-6 py-4 text-[10px] font-bold uppercase text-muted-foreground tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => {
                      const vState = getUserVerificationState(user);
                      const uid = user.uid || user.id;
                      return (
                      <tr
                        key={user.id}
                        onClick={() => setSelectedUser(user)}
                        className="border-b border-border hover:bg-muted transition cursor-pointer"
                      >
                        <td className="max-w-xs px-4 lg:px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 shrink-0 bg-muted rounded-full flex items-center justify-center text-sm font-bold overflow-hidden">
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
                            <div className="min-w-0">
                              <p className="truncate font-bold text-sm">
                                {user.displayName || "No name"}
                              </p>
                              <p className="truncate text-xs text-muted-foreground">
                                {user.username ? `@${user.username} · ` : ""}
                                {user.email || "No email"}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span
                              className={`text-[10px] font-bold uppercase px-2 py-1 rounded-full ${
                                user.type === "creator"
                                  ? "bg-orange-100 text-orange-600"
                                  : "bg-blue-100 text-blue-600"
                              }`}
                            >
                              {user.type}
                            </span>
                            {user.type === "creator" && vState === "verified" && (
                              <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                                Verified
                              </span>
                            )}
                            {user.type === "creator" && vState === "pending" && (
                              <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-amber-100 text-amber-700">
                                Pending Review
                              </span>
                            )}
                            {user.type === "creator" && vState === "rejected" && (
                              <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-red-100 text-red-700">
                                Rejected
                              </span>
                            )}
                            {user.isAdmin && (
                              <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-full bg-orange-100 text-orange-600">
                                Admin
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="whitespace-nowrap px-4 lg:px-6 py-4">
                          <p className="font-bold text-sm tabular-nums">
                            {user.totalSupport > 0
                              ? `${user.totalSupport.toLocaleString()}${
                                  typeof (user as any).currency === "string" && (user as any).currency
                                    ? ` ${(user as any).currency.toUpperCase()}`
                                    : ""
                                }`
                              : "-"}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-4 lg:px-6 py-4">
                          <p className="text-sm text-muted-foreground tabular-nums">
                            {user.createdAt?.toDate().toLocaleDateString() ||
                              "Unknown"}
                          </p>
                        </td>
                        <td
                          className="whitespace-nowrap px-4 lg:px-6 py-4"
                          onClick={(e) => e.stopPropagation()}
                        >
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
                            {user.type === "creator" && vState === "pending" && (
                              <button
                                onClick={() => void openVerificationReview(user)}
                                disabled={loadingReviewUid === uid}
                                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold bg-amber-100 text-amber-800 hover:bg-amber-200 rounded-lg transition"
                                title="Review Submitted Documents & Data"
                              >
                                {loadingReviewUid === uid ? (
                                  <Loader size={14} className="animate-spin" />
                                ) : (
                                  <FileSearch size={14} />
                                )}
                                Review
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
                    );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Pagination */}
          <div className="flex flex-col gap-3 px-4 py-4 border-t border-border sm:flex-row sm:items-center sm:justify-between sm:px-6">
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
      </div>

      {/* Shared KYC Verification Review Dialog */}
      <VerificationReviewDialog
        request={reviewingRequest}
        onClose={() => setReviewingRequest(null)}
        onReviewed={({ uid, verified }) => {
          setCreatorsByUid((prev) => ({
            ...prev,
            [uid]: {
              ...(prev[uid] || {}),
              verified,
              verificationStatus: verified ? "approved" : "rejected",
            },
          }));
          setPendingByUid((prev) => {
            const next = { ...prev };
            delete next[uid];
            return next;
          });
          setCreatorProfile((prev: any) =>
            prev && prev.uid === uid
              ? {
                  ...prev,
                  verified,
                  verificationStatus: verified ? "approved" : "rejected",
                }
              : prev,
          );
        }}
      />

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
                  <p className="text-xl font-bold mt-1 tabular-nums">
                    {selectedUser.totalSupport.toLocaleString()}
                    {typeof (selectedUser as any).currency === "string" && (selectedUser as any).currency
                      ? ` ${(selectedUser as any).currency.toUpperCase()}`
                      : ""}
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
                {selectedUser.type === "creator" &&
                  (() => {
                    const drawerState = resolveVerificationBadgeState(
                      creatorProfile ?? creatorsByUid[selectedUser.uid || selectedUser.id] ?? null,
                      pendingByUid[selectedUser.uid || selectedUser.id]
                        ? { status: "pending" }
                        : null,
                    );
                    if (drawerState === "pending") {
                      return (
                        <button
                          onClick={() => {
                            const targetUser = selectedUser;
                            const cData = creatorProfile;
                            setSelectedUser(null);
                            void openVerificationReview(targetUser, cData);
                          }}
                          className="w-full py-3 bg-amber-600 text-white rounded-lg font-bold text-sm hover:bg-amber-700 transition flex items-center justify-center gap-2"
                        >
                          <FileSearch size={16} />
                          Review Verification Request
                        </button>
                      );
                    }
                    if (drawerState === "verified") {
                      return (
                        <button
                          onClick={() => {
                            const targetUser = selectedUser;
                            const cData = creatorProfile;
                            setSelectedUser(null);
                            void openVerificationReview(targetUser, cData);
                          }}
                          className="w-full py-3 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg font-bold text-sm hover:bg-emerald-100 transition flex items-center justify-center gap-2"
                        >
                          <ShieldCheck size={16} />
                          Verified · View KYC Record
                        </button>
                      );
                    }
                    if (drawerState === "rejected") {
                      return (
                        <button
                          onClick={() => {
                            const targetUser = selectedUser;
                            const cData = creatorProfile;
                            setSelectedUser(null);
                            void openVerificationReview(targetUser, cData);
                          }}
                          className="w-full py-3 bg-red-50 text-red-700 border border-red-200 rounded-lg font-bold text-sm hover:bg-red-100 transition flex items-center justify-center gap-2"
                        >
                          <FileSearch size={16} />
                          Rejected · View Last Submission
                        </button>
                      );
                    }
                    return null;
                  })()}
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
