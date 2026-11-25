"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Globe2, HandCoins, Link2, Tags, Wrench } from "lucide-react";
import { Tabs } from "@/components/ui";
import AdminCurrenciesPage from "./AdminCurrenciesPage";
import AdminCountriesPage from "./AdminCountriesPage";
import AdminCountryCurrenciesPage from "./AdminCountryCurrenciesPage";
import AdminCategoriesPage from "./AdminCategoriesPage";
import AdminMaintenanceTab from "./AdminMaintenanceTab";

const CONFIG_TABS = [
  "currencies",
  "countries",
  "country-currencies",
  "categories",
  "maintenance",
] as const;

type ConfigTabId = (typeof CONFIG_TABS)[number];

export default function AdminConfigHub() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const tabFromUrl = searchParams.get("tab");
  const activeTab: ConfigTabId = CONFIG_TABS.includes(tabFromUrl as ConfigTabId)
    ? (tabFromUrl as ConfigTabId)
    : "currencies";

  const handleTabChange = (nextTab: string) => {
    const validTab: ConfigTabId = CONFIG_TABS.includes(nextTab as ConfigTabId)
      ? (nextTab as ConfigTabId)
      : "currencies";
    const params = new URLSearchParams(searchParams.toString());
    if (validTab === "currencies") {
      params.delete("tab");
    } else {
      params.set("tab", validTab);
    }
    const qs = params.toString();
    router.replace(qs ? `/admin/config?${qs}` : "/admin/config", {
      scroll: false,
    });
  };

  return (
    <div className="min-h-screen bg-canvas pb-20 text-fg">
      <div className="mx-auto max-w-5xl px-4 pt-8 sm:px-6 lg:px-8">
        <header className="mb-6">
          <p className="text-caption font-semibold text-brand-strong">Platform Settings</p>
          <h1 className="mt-1 text-heading font-black tracking-tight text-fg">
            Config
          </h1>
          <p className="mt-1 text-label text-muted-fg">
            Manage supported currencies, countries, currency mappings, and creator categories.
          </p>
        </header>

        <Tabs
          ariaLabel="Platform configuration sections"
          variant="underline"
          className="mb-8"
          value={activeTab}
          onChange={handleTabChange}
          items={[
            { id: "currencies", label: "Currencies", icon: <HandCoins size={16} /> },
            { id: "countries", label: "Countries", icon: <Globe2 size={16} /> },
            { id: "country-currencies", label: "Mappings", icon: <Link2 size={16} /> },
            { id: "categories", label: "Categories", icon: <Tags size={16} /> },
            { id: "maintenance", label: "Scripts", icon: <Wrench size={16} /> },
          ]}
        />

        {activeTab === "currencies" && <AdminCurrenciesPage embedded />}
        {activeTab === "countries" && <AdminCountriesPage embedded />}
        {activeTab === "country-currencies" && <AdminCountryCurrenciesPage embedded />}
        {activeTab === "categories" && <AdminCategoriesPage embedded />}
        {activeTab === "maintenance" && <AdminMaintenanceTab />}
      </div>
    </div>
  );
}
