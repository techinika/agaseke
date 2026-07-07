/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useState, useEffect } from "react";
import { db } from "@/db/firebase";
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  deleteDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from "firebase/firestore";
import { Link2, Plus, Loader2, Trash2, Check, X, Star } from "lucide-react";
import { toast } from "sonner";

interface CountryItem {
  id: string;
  code: string;
  name: string;
  flag?: string;
}

interface CurrencyItem {
  id: string;
  code: string;
  name: string;
  symbol: string;
}

interface CountryCurrencyItem {
  id: string;
  countryCode: string;
  currencyCode: string;
  isDefault: boolean;
}

export default function AdminCountryCurrenciesPage() {
  const [countries, setCountries] = useState<CountryItem[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyItem[]>([]);
  const [mappings, setMappings] = useState<CountryCurrencyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("");
  const [setAsDefault, setSetAsDefault] = useState(false);
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    const unsubs: (() => void)[] = [];

    const countriesQ = query(collection(db, "countries"), orderBy("name", "asc"));
    unsubs.push(onSnapshot(countriesQ, (snap) => {
      setCountries(snap.docs.map((d) => ({ id: d.id, code: d.data().code, name: d.data().name, flag: d.data().flag } as CountryItem)));
    }));

    const currenciesQ = query(collection(db, "currencies"), orderBy("code", "asc"));
    unsubs.push(onSnapshot(currenciesQ, (snap) => {
      setCurrencies(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CurrencyItem)));
    }));

    const mappingsQ = query(collection(db, "countryCurrencies"), orderBy("countryCode", "asc"));
    unsubs.push(onSnapshot(mappingsQ, (snap) => {
      setMappings(snap.docs.map((d) => ({ id: d.id, ...d.data() } as CountryCurrencyItem)));
      setLoading(false);
    }));

    return () => unsubs.forEach((u) => u());
  }, []);

  const handleAdd = async () => {
    if (!selectedCountry || !selectedCurrency) {
      toast.error("Select both a country and a currency");
      return;
    }
    const exists = mappings.some((m) => m.countryCode === selectedCountry && m.currencyCode === selectedCurrency);
    if (exists) {
      toast.error("This mapping already exists");
      return;
    }
    setAdding(true);
    try {
      if (setAsDefault) {
        const existingDefaults = mappings.filter((m) => m.countryCode === selectedCountry && m.isDefault);
        for (const ed of existingDefaults) {
          await updateDoc(doc(db, "countryCurrencies", ed.id), { isDefault: false });
        }
      }
      await addDoc(collection(db, "countryCurrencies"), {
        countryCode: selectedCountry,
        currencyCode: selectedCurrency,
        isDefault: setAsDefault,
        createdAt: serverTimestamp(),
      });
      toast.success("Country-currency mapping added");
      setSelectedCurrency("");
      setSetAsDefault(false);
    } catch { toast.error("Failed to add mapping"); }
    finally { setAdding(false); }
  };

  const handleSetDefault = async (mapping: CountryCurrencyItem) => {
    try {
      const existingDefaults = mappings.filter((m) => m.countryCode === mapping.countryCode && m.isDefault);
      for (const ed of existingDefaults) {
        await updateDoc(doc(db, "countryCurrencies", ed.id), { isDefault: false });
      }
      await updateDoc(doc(db, "countryCurrencies", mapping.id), { isDefault: true });
      toast.success("Default currency updated");
    } catch { toast.error("Failed to update default"); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, "countryCurrencies", id));
      toast.success("Mapping removed");
      setConfirmDelete(null);
    } catch { toast.error("Failed to delete"); }
  };

  const getCurrencyName = (code: string) => currencies.find((c) => c.code === code)?.name || code;
  const getCurrencySymbol = (code: string) => currencies.find((c) => c.code === code)?.symbol || "";
  const getCountryName = (code: string) => countries.find((c) => c.code === code)?.name || code;
  const getCountryFlag = (code: string) => countries.find((c) => c.code === code)?.flag || "";

  const groupedMappings = mappings.reduce((acc, m) => {
    if (!acc[m.countryCode]) acc[m.countryCode] = [];
    acc[m.countryCode].push(m);
    return acc;
  }, {} as Record<string, CountryCurrencyItem[]>);

  if (loading) return (
    <div className="min-h-screen bg-background text-foreground p-8 flex justify-center pt-20">
      <Loader2 className="animate-spin text-muted-foreground" size={24} />
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold uppercase">Country Currencies</h1>
            <p className="text-sm text-muted-foreground">
              Link countries to currencies and set defaults. Creators can then choose from available currencies for their country.
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-lg p-6 mb-8 space-y-4">
          <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground">Add Mapping</h3>
          <div className="flex flex-wrap items-end gap-3">
            <div className="flex-1 min-w-[180px]">
              <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Country</label>
              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                className="w-full bg-muted p-4 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100"
              >
                <option value="">Select country...</option>
                {countries.map((c) => (
                  <option key={c.id} value={c.code}>{c.flag} {c.name} ({c.code})</option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="text-[10px] font-bold uppercase text-muted-foreground block mb-1">Currency</label>
              <select
                value={selectedCurrency}
                onChange={(e) => setSelectedCurrency(e.target.value)}
                className="w-full bg-muted p-4 rounded-lg text-sm font-bold outline-none focus:ring-2 focus:ring-orange-100"
              >
                <option value="">Select currency...</option>
                {currencies.map((c) => (
                  <option key={c.id} value={c.code}>{c.code} - {c.name} ({c.symbol})</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 cursor-pointer py-4">
              <input
                type="checkbox"
                checked={setAsDefault}
                onChange={(e) => setSetAsDefault(e.target.checked)}
                className="w-4 h-4 accent-orange-600"
              />
              <span className="text-xs font-bold text-muted-foreground">Set as default</span>
            </label>
            <button
              onClick={handleAdd}
              disabled={adding || !selectedCountry || !selectedCurrency}
              className="bg-orange-600 text-white px-6 py-4 rounded-lg font-bold text-sm flex items-center gap-2 hover:bg-orange-700 transition disabled:opacity-50"
            >
              {adding ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
              Add
            </button>
          </div>
        </div>

        {Object.keys(groupedMappings).length === 0 ? (
          <div className="text-center py-16 bg-card border border-border rounded-lg">
            <Link2 size={40} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground font-medium">No mappings yet</p>
            <p className="text-sm text-muted-foreground mt-2">Link countries to currencies above.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedMappings).map(([countryCode, items]) => (
              <div key={countryCode} className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="px-6 py-4 bg-muted/50 border-b border-border flex items-center gap-3">
                  <span className="text-lg">{getCountryFlag(countryCode)}</span>
                  <span className="font-bold">{getCountryName(countryCode)}</span>
                  <span className="text-xs text-muted-foreground">({countryCode})</span>
                </div>
                <div className="divide-y divide-border">
                  {items.map((m) => (
                    <div key={m.id} className="px-6 py-4 flex items-center justify-between group">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{m.currencyCode}</span>
                          <span className="text-sm text-muted-foreground">{getCurrencyName(m.currencyCode)}</span>
                          <span className="text-sm font-bold text-orange-600">{getCurrencySymbol(m.currencyCode)}</span>
                        </div>
                        {m.isDefault && (
                          <span className="text-[10px] font-bold uppercase text-orange-600 bg-orange-50 px-2 py-1 rounded">Default</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!m.isDefault && (
                          <button
                            onClick={() => handleSetDefault(m)}
                            className="text-xs font-bold text-muted-foreground hover:text-orange-600 px-3 py-1.5 rounded-lg hover:bg-orange-50 transition flex items-center gap-1"
                          >
                            <Star size={12} /> Set Default
                          </button>
                        )}
                        {confirmDelete === m.id ? (
                          <div className="flex items-center gap-2">
                            <button onClick={() => handleDelete(m.id)} className="text-xs font-bold text-red-600 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition">Confirm</button>
                            <button onClick={() => setConfirmDelete(null)} className="text-xs font-bold text-muted-foreground bg-muted px-3 py-1.5 rounded-lg hover:bg-muted transition">Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => setConfirmDelete(m.id)} className="p-2 text-muted-foreground hover:text-red-500 transition opacity-0 group-hover:opacity-100">
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
