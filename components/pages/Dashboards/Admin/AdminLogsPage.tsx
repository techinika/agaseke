/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Search,
  Filter,
  Activity,
  Info,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Calendar,
  User,
  Shield,
  Download,
  RefreshCw,
} from "lucide-react";
import { db } from "@/db/firebase";
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  where,
  Timestamp,
} from "firebase/firestore";
import { toast } from "sonner";
import { LogLevel, LogCategory, getLogLevelColor, getCategoryColor } from "@/lib/logger";

interface LogItem {
  id: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  creatorId?: string;
  creatorHandle?: string;
  metadata?: Record<string, unknown>;
  createdAt?: Timestamp;
}

export default function AdminLogsPage() {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [levelFilter, setLevelFilter] = useState<LogLevel | "all">("all");
  const [categoryFilter, setCategoryFilter] = useState<LogCategory | "all">(
    "all",
  );
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const logsRef = collection(db, "activityLogs");
    const q = query(logsRef, orderBy("createdAt", "desc"), limit(500));

    const unsub = onSnapshot(q, (snapshot) => {
      const logData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as LogItem[];
      setLogs(logData);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (levelFilter !== "all" && log.level !== levelFilter) return false;
      if (categoryFilter !== "all" && log.category !== categoryFilter)
        return false;
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        return (
          log.message.toLowerCase().includes(search) ||
          log.userEmail?.toLowerCase().includes(search) ||
          log.userName?.toLowerCase().includes(search) ||
          log.creatorHandle?.toLowerCase().includes(search) ||
          log.category.toLowerCase().includes(search)
        );
      }
      return true;
    });
  }, [logs, levelFilter, categoryFilter, searchTerm]);

  const stats = useMemo(() => {
    const total = logs.length;
    const errors = logs.filter((l) => l.level === "error").length;
    const warnings = logs.filter((l) => l.level === "warning").length;
    const successes = logs.filter((l) => l.level === "success").length;
    return { total, errors, warnings, successes };
  }, [logs]);

  const exportLogs = () => {
    const csv = [
      ["Timestamp", "Level", "Category", "Message", "User", "Details"].join(
        ",",
      ),
      ...filteredLogs.map((log) =>
        [
          log.createdAt?.toDate().toISOString() || "",
          log.level,
          log.category,
          `"${log.message.replace(/"/g, '""')}"`,
          log.userEmail || log.userName || "",
          JSON.stringify(log.metadata || {}),
        ].join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity-logs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Logs exported successfully");
  };

  const getLevelIcon = (level: LogLevel) => {
    switch (level) {
      case "success":
        return <CheckCircle size={14} />;
      case "warning":
        return <AlertTriangle size={14} />;
      case "error":
        return <XCircle size={14} />;
      default:
        return <Info size={14} />;
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
        <header className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 uppercase">
              Activity Logs
            </h1>
            <p className="text-slate-500 font-medium mt-1">
              Monitor all platform activities and events
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition"
            >
              <Filter size={16} />
              Filters
              {(levelFilter !== "all" || categoryFilter !== "all") && (
                <span className="bg-orange-500 text-white text-[10px] px-2 py-0.5 rounded-full">
                  Active
                </span>
              )}
            </button>
            <button
              onClick={exportLogs}
              className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition"
            >
              <Download size={16} />
              Export
            </button>
          </div>
        </header>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-100 p-4">
            <p className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
              Total Logs
            </p>
            <p className="text-2xl font-bold text-slate-900 mt-1">
              {stats.total.toLocaleString()}
            </p>
          </div>
          <div className="bg-green-50 rounded-xl border border-green-100 p-4">
            <div className="flex items-center gap-2">
              <CheckCircle size={16} className="text-green-600" />
              <p className="text-[10px] font-bold uppercase text-green-600 tracking-wider">
                Success
              </p>
            </div>
            <p className="text-2xl font-bold text-green-700 mt-1">
              {stats.successes.toLocaleString()}
            </p>
          </div>
          <div className="bg-amber-50 rounded-xl border border-amber-100 p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600" />
              <p className="text-[10px] font-bold uppercase text-amber-600 tracking-wider">
                Warnings
              </p>
            </div>
            <p className="text-2xl font-bold text-amber-700 mt-1">
              {stats.warnings.toLocaleString()}
            </p>
          </div>
          <div className="bg-red-50 rounded-xl border border-red-100 p-4">
            <div className="flex items-center gap-2">
              <XCircle size={16} className="text-red-600" />
              <p className="text-[10px] font-bold uppercase text-red-600 tracking-wider">
                Errors
              </p>
            </div>
            <p className="text-2xl font-bold text-red-700 mt-1">
              {stats.errors.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-white rounded-xl border border-slate-100 p-4 mb-6 animate-in slide-in-from-top-2">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                    placeholder="Search logs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm outline-none focus:ring-2 focus:ring-orange-100"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-2">
                  Level
                </label>
                <select
                  value={levelFilter}
                  onChange={(e) =>
                    setLevelFilter(e.target.value as LogLevel | "all")
                  }
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm outline-none"
                >
                  <option value="all">All Levels</option>
                  <option value="info">Info</option>
                  <option value="success">Success</option>
                  <option value="warning">Warning</option>
                  <option value="error">Error</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block mb-2">
                  Category
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) =>
                    setCategoryFilter(e.target.value as LogCategory | "all")
                  }
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-100 rounded-lg text-sm outline-none"
                >
                  <option value="all">All Categories</option>
                  <option value="auth">Auth</option>
                  <option value="payment">Payment</option>
                  <option value="payout">Payout</option>
                  <option value="support">Support</option>
                  <option value="store">Store</option>
                  <option value="giveaway">Giveaway</option>
                  <option value="messaging">Messaging</option>
                  <option value="verification">Verification</option>
                  <option value="admin">Admin</option>
                  <option value="system">System</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Logs List */}
        <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
          {filteredLogs.length === 0 ? (
            <div className="text-center py-20">
              <Activity size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-slate-500 font-medium">No logs found</p>
              <p className="text-slate-400 text-sm mt-1">
                {searchTerm || levelFilter !== "all" || categoryFilter !== "all"
                  ? "Try adjusting your filters"
                  : "Activity will appear here as users interact with the platform"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {filteredLogs.map((log) => (
                <div key={log.id} className="p-4 hover:bg-slate-50 transition">
                  <div className="flex items-start gap-4">
                    <div
                      className={`p-2 rounded-lg ${getLogLevelColor(log.level)}`}
                    >
                      {getLevelIcon(log.level)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${getCategoryColor(log.category)}`}
                        >
                          {log.category}
                        </span>
                        <span className="text-xs text-slate-400">
                          {log.createdAt?.toDate().toLocaleString() ||
                            "Unknown time"}
                        </span>
                      </div>
                      <p className="text-sm text-slate-900">{log.message}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-slate-400">
                        {log.userEmail && (
                          <span className="flex items-center gap-1">
                            <User size={12} />
                            {log.userEmail}
                          </span>
                        )}
                        {log.creatorHandle && (
                          <span className="flex items-center gap-1">
                            <Shield size={12} />@{log.creatorHandle}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
