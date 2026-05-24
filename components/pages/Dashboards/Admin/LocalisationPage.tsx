/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/db/firebase";
import {
  collection,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  serverTimestamp,
  onSnapshot,
} from "firebase/firestore";
import { toast } from "sonner";
import {
  Globe,
  DollarSign,
  Plus,
  Trash2,
  Loader,
  MapPin,
  Landmark,
  Pencil,
  Check,
  X,
} from "lucide-react";
import Loading from "@/app/loading";
import { PlatformLocation, Currency } from "@/types/platform";

export default function LocalisationPage() {
  const [locations, setLocations] = useState<PlatformLocation[]>([]);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [loading, setLoading] = useState(true);

  const [newLocation, setNewLocation] = useState("");
  const [addingLocation, setAddingLocation] = useState(false);

  const [newCurrencyCode, setNewCurrencyCode] = useState("");
  const [newCurrencyName, setNewCurrencyName] = useState("");
  const [newCurrencySymbol, setNewCurrencySymbol] = useState("");
  const [newCurrencyThreshold, setNewCurrencyThreshold] = useState("10000");
  const [addingCurrency, setAddingCurrency] = useState(false);

  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [editingLocationName, setEditingLocationName] = useState("");

  const [editingCurrencyId, setEditingCurrencyId] = useState<string | null>(null);
  const [editingCurrencyCode, setEditingCurrencyCode] = useState("");
  const [editingCurrencyName, setEditingCurrencyName] = useState("");
  const [editingCurrencySymbol, setEditingCurrencySymbol] = useState("");
  const [editingCurrencyThreshold, setEditingCurrencyThreshold] = useState("");

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsubLocations = onSnapshot(
      collection(db, "locations"),
      (snap) => {
        setLocations(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as PlatformLocation)),
        );
        setLoading(false);
      },
    );
    const unsubCurrencies = onSnapshot(
      collection(db, "currencies"),
      (snap) => {
        setCurrencies(
          snap.docs.map((d) => ({ id: d.id, ...d.data() } as Currency)),
        );
      },
    );
    return () => {
      unsubLocations();
      unsubCurrencies();
    };
  }, []);

  const addLocation = async () => {
    if (!newLocation.trim()) return;
    setAddingLocation(true);
    try {
      await addDoc(collection(db, "locations"), {
        name: newLocation.trim(),
        createdAt: serverTimestamp(),
      });
      setNewLocation("");
      toast.success("Location added");
    } catch {
      toast.error("Failed to add location");
    } finally {
      setAddingLocation(false);
    }
  };

  const deleteLocation = async (id: string) => {
    try {
      await deleteDoc(doc(db, "locations", id));
      toast.success("Location removed");
    } catch {
      toast.error("Failed to remove location");
    }
  };

  const startEditLocation = (loc: PlatformLocation) => {
    setEditingLocationId(loc.id);
    setEditingLocationName(loc.name);
  };

  const cancelEditLocation = () => {
    setEditingLocationId(null);
    setEditingLocationName("");
  };

  const saveLocation = async (id: string) => {
    if (!editingLocationName.trim()) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "locations", id), {
        name: editingLocationName.trim(),
      });
      toast.success("Location updated");
      setEditingLocationId(null);
    } catch {
      toast.error("Failed to update location");
    } finally {
      setSaving(false);
    }
  };

  const addCurrency = async () => {
    if (!newCurrencyCode.trim() || !newCurrencyName.trim()) return;
    setAddingCurrency(true);
    try {
      await addDoc(collection(db, "currencies"), {
        code: newCurrencyCode.trim().toUpperCase(),
        name: newCurrencyName.trim(),
        symbol: newCurrencySymbol.trim() || newCurrencyCode.trim().toUpperCase(),
        payoutThreshold: parseInt(newCurrencyThreshold) || 10000,
        createdAt: serverTimestamp(),
      });
      setNewCurrencyCode("");
      setNewCurrencyName("");
      setNewCurrencySymbol("");
      setNewCurrencyThreshold("10000");
      toast.success("Currency added");
    } catch {
      toast.error("Failed to add currency");
    } finally {
      setAddingCurrency(false);
    }
  };

  const deleteCurrency = async (id: string) => {
    try {
      await deleteDoc(doc(db, "currencies", id));
      toast.success("Currency removed");
    } catch {
      toast.error("Failed to remove currency");
    }
  };

  const startEditCurrency = (cur: Currency) => {
    setEditingCurrencyId(cur.id);
    setEditingCurrencyCode(cur.code);
    setEditingCurrencyName(cur.name);
    setEditingCurrencySymbol(cur.symbol);
    setEditingCurrencyThreshold(String(cur.payoutThreshold ?? 10000));
  };

  const cancelEditCurrency = () => {
    setEditingCurrencyId(null);
  };

  const saveCurrency = async (id: string) => {
    if (!editingCurrencyCode.trim() || !editingCurrencyName.trim()) return;
    setSaving(true);
    try {
      await updateDoc(doc(db, "currencies", id), {
        code: editingCurrencyCode.trim().toUpperCase(),
        name: editingCurrencyName.trim(),
        symbol: editingCurrencySymbol.trim() || editingCurrencyCode.trim().toUpperCase(),
        payoutThreshold: parseInt(editingCurrencyThreshold) || 10000,
      });
      toast.success("Currency updated");
      setEditingCurrencyId(null);
    } catch {
      toast.error("Failed to update currency");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading />;

  return (
    <div className="min-h-screen bg-[#FBFBFC] text-slate-900 pb-20">
      <main className="max-w-7xl mx-auto px-6 mt-12">
        <header className="mb-10">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 uppercase">
            Localisation
          </h1>
          <p className="text-slate-500 font-medium">
            Manage platform locations and currencies for creators.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Locations */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-orange-100 rounded-xl">
                  <MapPin size={20} className="text-orange-600" />
                </div>
                <div>
                  <h2 className="font-bold uppercase tracking-tight">
                    Locations
                  </h2>
                  <p className="text-xs text-slate-400">
                    {locations.length} location{locations.length !== 1 ? "s" : ""} configured
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="flex gap-2 mb-6">
                <input
                  type="text"
                  value={newLocation}
                  onChange={(e) => setNewLocation(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addLocation()}
                  placeholder="e.g. Rwanda, Kenya, Nigeria..."
                  className="flex-1 bg-slate-50 border border-slate-100 rounded-lg px-4 py-2.5 text-sm font-medium outline-none focus:border-orange-500 transition-all"
                />
                <button
                  onClick={addLocation}
                  disabled={addingLocation || !newLocation.trim()}
                  className="bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-orange-600 transition-all disabled:opacity-50 shadow-sm"
                >
                  {addingLocation ? (
                    <Loader className="animate-spin" size={16} />
                  ) : (
                    <Plus size={16} />
                  )}
                  Add
                </button>
              </div>

              <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                {locations.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <Globe size={32} className="mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-medium">No locations yet</p>
                    <p className="text-xs">Add your first location above</p>
                  </div>
                ) : (
                  locations.map((loc) => (
                    <div
                      key={loc.id}
                      className="flex items-center justify-between p-3.5 rounded-xl hover:bg-slate-50 transition-all group"
                    >
                      {editingLocationId === loc.id ? (
                        <>
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                              <Globe size={15} className="text-orange-500" />
                            </div>
                            <input
                              type="text"
                              value={editingLocationName}
                              onChange={(e) => setEditingLocationName(e.target.value)}
                              onKeyDown={(e) => e.key === "Enter" && saveLocation(loc.id)}
                              className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-bold outline-none focus:border-orange-500 transition-all"
                              autoFocus
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => saveLocation(loc.id)}
                              disabled={saving || !editingLocationName.trim()}
                              className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                            >
                              <Check size={15} />
                            </button>
                            <button
                              onClick={cancelEditLocation}
                              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                            >
                              <X size={15} />
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                              <Globe size={15} className="text-orange-500" />
                            </div>
                            <span className="font-bold text-sm">{loc.name}</span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button
                              onClick={() => startEditLocation(loc)}
                              className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => deleteLocation(loc.id)}
                              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          {/* Currencies */}
          <section className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-50 bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 rounded-xl">
                  <Landmark size={20} className="text-emerald-600" />
                </div>
                <div>
                  <h2 className="font-bold uppercase tracking-tight">
                    Currencies
                  </h2>
                  <p className="text-xs text-slate-400">
                    {currencies.length} currenc{currencies.length !== 1 ? "ies" : "y"} configured
                  </p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <div className="space-y-2 mb-6">
                <div className="flex flex-wrap gap-2">
                  <input
                    type="text"
                    value={newCurrencyCode}
                    onChange={(e) => setNewCurrencyCode(e.target.value)}
                    placeholder="Code (e.g. RWF)"
                    className="w-24 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2.5 text-sm font-bold uppercase outline-none focus:border-emerald-500 transition-all"
                    maxLength={3}
                  />
                  <input
                    type="text"
                    value={newCurrencySymbol}
                    onChange={(e) => setNewCurrencySymbol(e.target.value)}
                    placeholder="Symbol (e.g. FRw)"
                    className="w-24 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2.5 text-sm font-medium outline-none focus:border-emerald-500 transition-all"
                  />
                  <input
                    type="text"
                    value={newCurrencyName}
                    onChange={(e) => setNewCurrencyName(e.target.value)}
                    placeholder="Name (e.g. Rwandan Franc)"
                    className="flex-1 min-w-[120px] bg-slate-50 border border-slate-100 rounded-lg px-3 py-2.5 text-sm font-medium outline-none focus:border-emerald-500 transition-all"
                  />
                  <input
                    type="number"
                    value={newCurrencyThreshold}
                    onChange={(e) => setNewCurrencyThreshold(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCurrency()}
                    placeholder="Threshold"
                    className="w-24 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2.5 text-sm font-medium outline-none focus:border-emerald-500 transition-all"
                  />
                  <button
                    onClick={addCurrency}
                    disabled={
                      addingCurrency ||
                      !newCurrencyCode.trim() ||
                      !newCurrencyName.trim()
                    }
                    className="bg-slate-900 text-white px-4 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-emerald-600 transition-all disabled:opacity-50 shadow-sm"
                  >
                    {addingCurrency ? (
                      <Loader className="animate-spin" size={16} />
                    ) : (
                      <Plus size={16} />
                    )}
                    Add
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
                {currencies.length === 0 ? (
                  <div className="text-center py-12 text-slate-400">
                    <DollarSign size={32} className="mx-auto mb-3 opacity-50" />
                    <p className="text-sm font-medium">No currencies yet</p>
                    <p className="text-xs">Add your first currency above</p>
                  </div>
                ) : (
                  currencies.map((cur) => (
                    <div
                      key={cur.id}
                      className="flex items-center justify-between p-3.5 rounded-xl hover:bg-slate-50 transition-all group"
                    >
                      {editingCurrencyId === cur.id ? (
                        <div className="flex items-center gap-2 w-full">
                          <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center font-bold text-emerald-600 text-xs shrink-0">
                            {editingCurrencySymbol || editingCurrencyCode}
                          </div>
                          <input
                            type="text"
                            value={editingCurrencyCode}
                            onChange={(e) => setEditingCurrencyCode(e.target.value.toUpperCase())}
                            className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-bold uppercase outline-none focus:border-emerald-500 transition-all"
                            maxLength={3}
                            autoFocus
                          />
                          <input
                            type="text"
                            value={editingCurrencySymbol}
                            onChange={(e) => setEditingCurrencySymbol(e.target.value)}
                            className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-medium outline-none focus:border-emerald-500 transition-all"
                          />
                          <input
                            type="text"
                            value={editingCurrencyName}
                            onChange={(e) => setEditingCurrencyName(e.target.value)}
                            className="flex-1 min-w-[80px] bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-medium outline-none focus:border-emerald-500 transition-all"
                          />
                          <input
                            type="number"
                            value={editingCurrencyThreshold}
                            onChange={(e) => setEditingCurrencyThreshold(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && saveCurrency(cur.id)}
                            className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-medium outline-none focus:border-emerald-500 transition-all"
                          />
                          <button
                            onClick={() => saveCurrency(cur.id)}
                            disabled={saving || !editingCurrencyCode.trim() || !editingCurrencyName.trim()}
                            className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all shrink-0"
                          >
                            <Check size={15} />
                          </button>
                          <button
                            onClick={cancelEditCurrency}
                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all shrink-0"
                          >
                            <X size={15} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center font-bold text-emerald-600 text-xs">
                              {cur.symbol || cur.code}
                            </div>
                            <div>
                              <span className="font-bold text-sm">
                                {cur.code}
                              </span>
                              <span className="text-xs text-slate-400 ml-2">
                                {cur.name}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest ml-2">
                              Threshold: {formatThreshold(cur.payoutThreshold ?? 10000)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                            <button
                              onClick={() => startEditCurrency(cur)}
                              className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-lg"
                            >
                              <Pencil size={15} />
                            </button>
                            <button
                              onClick={() => deleteCurrency(cur.id)}
                              className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

function formatThreshold(val: number) {
  if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
  return String(val);
}
