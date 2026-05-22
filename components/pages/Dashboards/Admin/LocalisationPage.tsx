/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { db } from "@/db/firebase";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
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
  const [addingCurrency, setAddingCurrency] = useState(false);

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

  const addCurrency = async () => {
    if (!newCurrencyCode.trim() || !newCurrencyName.trim()) return;
    setAddingCurrency(true);
    try {
      await addDoc(collection(db, "currencies"), {
        code: newCurrencyCode.trim().toUpperCase(),
        name: newCurrencyName.trim(),
        symbol: newCurrencySymbol.trim() || newCurrencyCode.trim().toUpperCase(),
        createdAt: serverTimestamp(),
      });
      setNewCurrencyCode("");
      setNewCurrencyName("");
      setNewCurrencySymbol("");
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
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-orange-50 rounded-lg flex items-center justify-center">
                          <Globe size={15} className="text-orange-500" />
                        </div>
                        <span className="font-bold text-sm">{loc.name}</span>
                      </div>
                      <button
                        onClick={() => deleteLocation(loc.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={15} />
                      </button>
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
                <div className="flex gap-2">
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
                    className="w-28 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2.5 text-sm font-medium outline-none focus:border-emerald-500 transition-all"
                  />
                  <input
                    type="text"
                    value={newCurrencyName}
                    onChange={(e) => setNewCurrencyName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCurrency()}
                    placeholder="Name (e.g. Rwandan Franc)"
                    className="flex-1 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2.5 text-sm font-medium outline-none focus:border-emerald-500 transition-all"
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
                      </div>
                      <button
                        onClick={() => deleteCurrency(cur.id)}
                        className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                      >
                        <Trash2 size={15} />
                      </button>
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
