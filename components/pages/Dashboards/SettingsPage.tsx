/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import Link from "next/link";
import React, { useState, useEffect, useRef } from "react";
import {
  User,
  Share2,
  ShieldCheck,
  Instagram,
  Twitter,
  Youtube,
  Globe,
  MessageSquare,
  Save,
  Check,
  Loader,
  Phone,
  AlertCircle,
  Camera,
  Linkedin,
  Store,
  ShoppingBag,
  Gift,
  Calendar,
  ImageIcon,
  Users,
  BadgeCheck,
} from "lucide-react";
import { auth, db } from "@/db/firebase";
import {
  doc,
  onSnapshot,
  updateDoc,
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import { Creator } from "@/types/creator";
import { useAuth } from "@/auth/AuthContext";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AiFillTikTok } from "react-icons/ai";
import { uploadBase64Image } from "@/lib/uploadService";
import { evaluateLocationUpdateCooldown } from "@/lib/creator/locationPolicy";
import { VerificationPage } from "./VerifyPage";
import {
  Badge,
  Button,
  Card,
  FormField,
  IconButton,
  Input,
  MediaImage,
  Select,
  Skeleton,
  Switch,
  Tabs,
  Textarea,
} from "@/components/ui";

const SETTINGS_TABS = [
  "profile",
  "socials",
  "location",
  "perks",
  "messaging",
  "community",
  "verification",
] as const;

type SettingsTabId = (typeof SETTINGS_TABS)[number];

export default function CreatorSettings() {
  const { creator } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerFileInputRef = useRef<HTMLInputElement>(null);

  const tabFromUrl = searchParams.get("tab");
  const activeTab: SettingsTabId = SETTINGS_TABS.includes(tabFromUrl as SettingsTabId)
    ? (tabFromUrl as SettingsTabId)
    : "profile";

  const [creatorData, setCreatorData] = useState<Creator | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [categories, setCategories] = useState<string[]>([]);

  const handleTabChange = (nextTab: string) => {
    const validTab = SETTINGS_TABS.includes(nextTab as SettingsTabId)
      ? (nextTab as SettingsTabId)
      : "profile";
    const params = new URLSearchParams(searchParams.toString());
    if (validTab === "profile") {
      params.delete("tab");
    } else {
      params.set("tab", validTab);
    }
    const qs = params.toString();
    router.replace(qs ? `/creator/settings?${qs}` : "/creator/settings", {
      scroll: false,
    });
  };

  const [countries, setCountries] = useState<any[]>([]);
  const [currencies, setCurrencies] = useState<any[]>([]);
  const [countryCurrencies, setCountryCurrencies] = useState<any[]>([]);
  const [availableCurrencies, setAvailableCurrencies] = useState<any[]>([]);
  const [savedLocationState, setSavedLocationState] = useState<{
    country: string;
    currency: string;
    locationUpdatedAt: unknown;
  }>({ country: "", currency: "", locationUpdatedAt: null });

  useEffect(() => {
    if (!creator) return;
    const unsubscribe = onSnapshot(doc(db, "creators", creator.handle), (snap) => {
      if (snap.exists()) {
        const data = snap.data() as Creator;
        setCreatorData(data);
        setSavedLocationState({
          country: (data.country || "").toUpperCase(),
          currency: (data.currency || "").toUpperCase(),
          locationUpdatedAt: data.locationUpdatedAt ?? data.countryUpdatedAt ?? null,
        });
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [creator]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const q = query(collection(db, "categories"), orderBy("createdAt", "desc"));
        const snap = await getDocs(q);
        setCategories(snap.docs.map((d) => d.data().name || "").filter(Boolean));
      } catch (e) {
        console.error("Failed to fetch categories", e);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [countriesSnap, currenciesSnap, mappingsSnap] = await Promise.all([
          getDocs(query(collection(db, "countries"), orderBy("name", "asc"))),
          getDocs(query(collection(db, "currencies"), orderBy("code", "asc"))),
          getDocs(query(collection(db, "countryCurrencies"))),
        ]);
        setCountries(countriesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setCurrencies(currenciesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setCountryCurrencies(mappingsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error("Failed to fetch countries/currencies", e);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!creatorData?.country) {
      queueMicrotask(() => setAvailableCurrencies([]));
      return;
    }
    const mappings = countryCurrencies.filter(
      (m: any) => m.countryCode === creatorData.country,
    );
    const available = currencies.filter((c: any) =>
      mappings.some((m: any) => m.currencyCode === c.code),
    );
    queueMicrotask(() => setAvailableCurrencies(available));
  }, [creatorData?.country, countryCurrencies, currencies]);

  const handleUpdate = (field: string, value: any) => {
    setCreatorData((prev) => {
      if (!prev) return prev;
      return { ...prev, [field]: value };
    });
  };

  const handleSocialUpdate = (platform: string, value: string) => {
    if (!creatorData) return;
    setCreatorData({
      ...creatorData,
      socials: { ...(creatorData.socials || {}), [platform]: value },
    });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onloadend = async () => {
      try {
        const data = await uploadBase64Image(reader.result as string, "creator_profile");
        if (data.url) {
          handleUpdate("profilePicture", data.url);
          toast.success("Photo uploaded! Remember to save changes.");
        }
      } catch {
        toast.error("Upload failed");
      } finally {
        setUploading(false);
      }
    };
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onloadend = async () => {
      try {
        const data = await uploadBase64Image(reader.result as string, "creator_cover");
        if (data.url) {
          handleUpdate("bannerURL", data.url);
          toast.success("Cover image uploaded! Remember to save changes.");
        }
      } catch {
        toast.error("Upload failed");
      } finally {
        setUploading(false);
      }
    };
  };

  const saveSettings = async () => {
    if (!creatorData) {
      toast.error("Please wait for settings to load");
      return;
    }
    if (!creator?.handle) {
      toast.error("Unable to identify creator account");
      return;
    }

    setSaving(true);
    try {
      const nextCountry = (creatorData.country || "").trim().toUpperCase();
      const nextCurrency = (creatorData.currency || "").trim().toUpperCase();
      const locationChanged = nextCountry !== savedLocationState.country;
      const currencyChanged = nextCurrency !== savedLocationState.currency;

      if (locationChanged || currencyChanged) {
        const currentUser = auth.currentUser;
        if (!currentUser) {
          toast.error("Please sign in again to update location or currency");
          return;
        }
        const token = await currentUser.getIdToken();
        const res = await fetch("/api/creators/location-currency", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            ...(locationChanged && nextCountry ? { country: nextCountry } : {}),
            ...(currencyChanged && nextCurrency ? { currency: nextCurrency } : {}),
          }),
        });
        const payload = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        if (!res.ok) {
          toast.error(payload?.error || "Failed to update location or currency");
          return;
        }
      }

      const updateData: Record<string, any> = {
        name: creatorData.name || "",
        bio: creatorData.bio || "",
        bannerURL: creatorData.bannerURL || "",
        profilePicture: creatorData.profilePicture || "",
        socials: creatorData.socials || {},
        messagingEnabled: creatorData.messagingEnabled ?? false,
        messagingAllowAll: creatorData.messagingAllowAll ?? true,
        messagingMinAmount: creatorData.messagingMinAmount ?? 0,
        storeEnabled: creatorData.storeEnabled ?? false,
        storePublic: creatorData.storePublic ?? true,
        giveawayEnabled: creatorData.giveawayEnabled ?? false,
        bookingEnabled: creatorData.bookingEnabled ?? false,
        bookingAccess: creatorData.bookingAccess ?? "public",
        gatheringsEnabled: creatorData.gatheringsEnabled ?? false,
        communityEnabled: creatorData.communityEnabled ?? false,
        focus: creatorData.focus || [],
      };

      await updateDoc(doc(db, "creators", creator.handle), updateData);
      window.dispatchEvent(new Event("agaseke:refresh-auth"));
      toast.success("Settings updated successfully!");
    } catch (error) {
      console.error("Save error:", error);
      toast.error("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div
        role="status"
        aria-label="Loading settings"
        className="min-h-screen bg-canvas px-6 pt-10"
      >
        <div className="mx-auto max-w-5xl space-y-8">
          <div className="space-y-3">
            <Skeleton className="h-10 w-56" rounded="card" />
            <Skeleton className="h-5 w-80" />
          </div>
          <Skeleton className="h-12 w-full" rounded="card" />
          <Card className="space-y-6 p-8">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-40 w-full" rounded="card" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" rounded="card" />
          </Card>
        </div>
      </div>
    );

  return (
    <div className="min-h-screen bg-canvas pb-20 text-fg">
      <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6 sm:pt-8">
        <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-1">
            <h1 className="font-display text-heading font-bold tracking-tight text-fg sm:text-display">
              Settings
            </h1>
            <p className="text-label font-medium text-muted-fg">
              Customize your creator identity, perks, and payout verification.
            </p>
          </div>
          {activeTab !== "verification" && (
            <Button
              onClick={saveSettings}
              loading={saving}
              disabled={uploading}
              size="lg"
              leadingIcon={<Save className="size-4" aria-hidden="true" />}
              className="w-full sm:w-auto"
            >
              Save Changes
            </Button>
          )}
        </header>

        <Tabs
          ariaLabel="Settings sections"
          value={activeTab}
          onChange={handleTabChange}
          items={[
            {
              id: "profile",
              label: "Profile",
              icon: <User className="size-4" aria-hidden="true" />,
            },
            {
              id: "verification",
              label: "Verification",
              icon: <BadgeCheck className="size-4" aria-hidden="true" />,
              badge: creatorData?.verified ? "Verified" : undefined,
            },
            {
              id: "socials",
              label: "Social Links",
              icon: <Share2 className="size-4" aria-hidden="true" />,
            },
            {
              id: "location",
              label: "Location & Currency",
              icon: <Globe className="size-4" aria-hidden="true" />,
            },
            {
              id: "perks",
              label: "Supporter Perks",
              icon: <ShieldCheck className="size-4" aria-hidden="true" />,
            },
            {
              id: "messaging",
              label: "Messaging",
              icon: <MessageSquare className="size-4" aria-hidden="true" />,
            },
            {
              id: "community",
              label: "Community",
              icon: <Users className="size-4" aria-hidden="true" />,
            },
          ]}
          className="mb-6 sm:mb-8"
        />

        <div className="space-y-8">
          {activeTab === "profile" && (
            <Card className="space-y-8 p-6 md:p-8">
              <div>
                <h4 className="text-body-lg font-bold text-fg">Cover Image</h4>
                <p className="mt-1 text-caption text-muted-fg">
                  Recommended: 1200x400px JPEG or PNG.
                </p>
                <div className="group relative mt-4 overflow-hidden rounded-card">
                  <div className="flex h-40 items-center justify-center bg-linear-to-r from-brand-soft via-surface-raised to-brand-soft">
                    {uploading ? (
                      <Loader
                        className="size-8 animate-spin text-brand-strong"
                        role="status"
                        aria-label="Uploading image"
                      />
                    ) : creatorData?.bannerURL ? (
                      <MediaImage
                        src={creatorData.bannerURL}
                        alt="Cover"
                        unoptimized
                        className="absolute inset-0 size-full"
                      />
                    ) : (
                      <ImageIcon
                        size={40}
                        className="text-line-strong"
                        aria-hidden="true"
                      />
                    )}
                    {creatorData?.bannerURL && (
                      <div className="absolute inset-0 flex items-center justify-center bg-overlay opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                        <IconButton
                          label="Change cover image"
                          icon={<Camera />}
                          variant="secondary"
                          size="sm"
                          onClick={() => bannerFileInputRef.current?.click()}
                        />
                      </div>
                    )}
                  </div>
                  {!creatorData?.bannerURL && (
                    <button
                      type="button"
                      onClick={() => bannerFileInputRef.current?.click()}
                      className="absolute inset-0 flex items-center justify-center bg-overlay opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                      aria-label="Change cover image"
                    >
                      <span className="rounded-control bg-surface/90 p-3 text-fg shadow-sm">
                        <Camera size={24} aria-hidden="true" />
                      </span>
                    </button>
                  )}
                  <input
                    type="file"
                    ref={bannerFileInputRef}
                    onChange={handleBannerUpload}
                    className="hidden"
                    accept="image/*"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="group relative">
                  <div className="size-24 overflow-hidden rounded-full border-4 border-surface bg-surface-sunken shadow-sm">
                    {uploading ? (
                      <div className="flex size-full items-center justify-center">
                        <Loader
                          className="size-6 animate-spin text-brand-strong"
                          role="status"
                          aria-label="Uploading image"
                        />
                      </div>
                    ) : (
                      <MediaImage
                        src={
                          creatorData?.profilePicture ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${creatorData?.handle}`
                        }
                        alt="Profile"
                        unoptimized
                        aspectRatio="1 / 1"
                        className="size-full"
                      />
                    )}
                  </div>
                  <div className="absolute -right-2 -bottom-2">
                    <IconButton
                      label="Change profile photo"
                      icon={<Camera />}
                      variant="primary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    />
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    className="hidden"
                    accept="image/*"
                  />
                </div>
                <div className="space-y-1">
                  <h4 className="text-body-lg font-bold text-fg">Profile Photo</h4>
                  <p className="text-caption text-muted-fg">
                    Recommended: Square JPEG or PNG, min 400x400px.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <Input
                  label="Creator Name"
                  type="text"
                  value={creatorData?.name || ""}
                  onChange={(e) => handleUpdate("name", e.target.value)}
                />
                <FormField id="username-locked" label="Username (Permanent)">
                  <div className="flex min-h-12 w-full cursor-not-allowed items-center rounded-control border border-line bg-surface-sunken px-4 text-body font-semibold text-muted-fg">
                    @{creatorData?.handle}
                  </div>
                </FormField>
              </div>

              <Textarea
                label="Bio"
                value={creatorData?.bio || ""}
                onChange={(e) => handleUpdate("bio", e.target.value)}
                placeholder="Tell your supporters who you are..."
                className="min-h-32 resize-none"
              />

              <div className="space-y-2">
                <p className="text-label font-semibold text-fg">Creator Focus</p>
                <div className="flex flex-wrap gap-2">
                  {categories.map((cat) => {
                    const selected = (creatorData?.focus || []).includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => {
                          const current = creatorData?.focus || [];
                          const next = selected
                            ? current.filter((c) => c !== cat)
                            : [...current, cat];
                          handleUpdate("focus", next);
                        }}
                        className="rounded-pill outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                      >
                        <Badge
                          tone={selected ? "brand" : "neutral"}
                          className="px-4 py-1.5 text-label font-semibold"
                        >
                          {cat}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
                {(!creatorData?.focus || creatorData.focus.length === 0) && (
                  <p className="text-caption text-muted-fg">
                    Select one or more categories that describe your content.
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 rounded-card bg-surface-sunken p-6 shadow-sm">
                <div className="flex items-center gap-4">
                  <div
                    className={`rounded-control p-3 ${
                      creatorData?.verified
                        ? "bg-success-bg text-success"
                        : "bg-brand-soft text-brand-strong"
                    }`}
                  >
                    {creatorData?.verified ? (
                      <Check className="size-6" aria-hidden="true" />
                    ) : (
                      <Phone className="size-6" aria-hidden="true" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-fg">
                      {creatorData?.verified ? "Identity Verified" : "Verify Identity"}
                    </p>
                    <p className="text-caption text-muted-fg">
                      {creatorData?.payoutNumber || "No number linked"}
                    </p>
                  </div>
                </div>
                {!creatorData?.verified && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleTabChange("verification")}
                  >
                    Verify Now
                  </Button>
                )}
              </div>
            </Card>
          )}

          {activeTab === "verification" && <VerificationPage embedded />}

          {activeTab === "socials" && (
            <Card className="space-y-6 p-6 md:p-8">
              <h3 className="font-display text-title font-bold text-fg">
                Connected Networks
              </h3>
              <div className="space-y-4">
                {[
                  {
                    id: "instagram",
                    icon: Instagram,
                    color: "text-brand-strong",
                    label: "Instagram Username",
                  },
                  {
                    id: "linkedin",
                    icon: Linkedin,
                    color: "text-info",
                    label: "LinkedIn Link",
                  },
                  {
                    id: "twitter",
                    icon: Twitter,
                    color: "text-info",
                    label: "Twitter / X Username",
                  },
                  {
                    id: "youtube",
                    icon: Youtube,
                    color: "text-danger",
                    label: "YouTube Channel URL",
                  },
                  {
                    id: "tiktok",
                    icon: AiFillTikTok,
                    color: "text-fg",
                    label: "TikTok Channel URL",
                  },
                  {
                    id: "web",
                    icon: Globe,
                    color: "text-muted-fg",
                    label: "Personal Website",
                  },
                ].map((social) => (
                  <div
                    key={social.id}
                    className="flex items-center gap-3 rounded-control bg-surface-sunken p-2"
                  >
                    <div
                      className={`rounded-control bg-surface p-3 shadow-sm ${social.color}`}
                    >
                      <social.icon size={20} aria-hidden="true" />
                    </div>
                    <Input
                      type="text"
                      aria-label={social.label}
                      placeholder={social.label}
                      value={
                        creatorData?.socials?.[
                          social.id as keyof typeof creatorData.socials
                        ] || ""
                      }
                      onChange={(e) => handleSocialUpdate(social.id, e.target.value)}
                      className="flex-1"
                    />
                  </div>
                ))}
              </div>
            </Card>
          )}

          {activeTab === "location" && (() => {
            const locationCooldown = evaluateLocationUpdateCooldown(
              savedLocationState.locationUpdatedAt,
            );
            const isCountryInCooldown =
              Boolean(savedLocationState.country) && !locationCooldown.allowed;
            const mappedCodes = new Set(availableCurrencies.map((c: any) => c.code));
            const otherCurrencies = currencies.filter(
              (c: any) => !mappedCodes.has(c.code),
            );
            const selectedCountryObj = countries.find(
              (c: any) => c.code === creatorData?.country,
            );

            return (
              <Card className="space-y-6 p-6 md:p-8">
                <div>
                  <h3 className="font-display text-title font-bold text-fg">
                    Location & Currency
                  </h3>
                  <p className="mt-1 text-label text-muted-fg">
                    Update your preferred currency anytime. Your country location can be
                    updated once every month.
                  </p>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    {isCountryInCooldown ? (
                      <FormField id="country-locked" label="Your Country">
                        <div className="flex min-h-12 w-full items-center gap-2 rounded-control border border-line bg-surface-sunken px-4 text-body font-semibold text-muted-fg opacity-70">
                          {selectedCountryObj?.flag || ""}{" "}
                          {selectedCountryObj?.name || creatorData?.country}
                        </div>
                      </FormField>
                    ) : (
                      <Select
                        label="Your Country"
                        value={creatorData?.country || ""}
                        onChange={(e) => handleUpdate("country", e.target.value)}
                      >
                        <option value="">Select country...</option>
                        {countries.map((c: any) => (
                          <option key={c.id} value={c.code}>
                            {c.flag || ""} {c.name}
                          </option>
                        ))}
                      </Select>
                    )}
                    {isCountryInCooldown ? (
                      <p className="text-caption font-semibold text-warning">
                        Location can be updated once every month. Next update available on{" "}
                        {locationCooldown.nextAllowedAt?.toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                        .
                      </p>
                    ) : (
                      <p className="text-caption text-muted-fg">
                        {locationCooldown.lastUpdatedAt
                          ? `Last location update: ${locationCooldown.lastUpdatedAt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}. Changing it starts a new 1-month window.`
                          : "You can update your location once every month."}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Select
                      label="Preferred Currency"
                      value={creatorData?.currency || ""}
                      onChange={(e) => handleUpdate("currency", e.target.value)}
                    >
                      <option value="">Select currency...</option>
                      {availableCurrencies.length > 0 && (
                        <optgroup
                          label={
                            selectedCountryObj
                              ? `Recommended for ${selectedCountryObj.name}`
                              : "Recommended currencies"
                          }
                        >
                          {availableCurrencies.map((c: any) => (
                            <option key={c.code} value={c.code}>
                              {c.code} - {c.name} ({c.symbol})
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {otherCurrencies.length > 0 && (
                        <optgroup
                          label={
                            availableCurrencies.length > 0
                              ? "Other supported currencies"
                              : "Supported currencies"
                          }
                        >
                          {otherCurrencies.map((c: any) => (
                            <option key={c.code} value={c.code}>
                              {c.code} - {c.name} ({c.symbol})
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </Select>
                    <p className="text-caption text-muted-fg">
                      You can change your preferred currency at any time.
                    </p>
                  </div>
                  {creatorData?.currency && (
                    <div className="rounded-control border border-line bg-brand-soft p-4">
                      <p className="text-label font-bold text-brand-strong">
                        All transactions will be processed in {creatorData.currency}
                      </p>
                      <p className="mt-1 text-caption text-brand-strong">
                        Prices shown on your profile will use this currency. Existing
                        transactions keep their original currency.
                      </p>
                    </div>
                  )}
                </div>
              </Card>
            );
          })()}

          {activeTab === "perks" && (
            <Card className="space-y-6 p-6 md:p-8">
              <div className="space-y-1">
                <h3 className="font-display text-title font-bold text-fg">
                  Supporter Perks
                </h3>
                <p className="text-label text-muted-fg">
                  Enable special features for your supporters and visitors.
                </p>
              </div>

              <div className="space-y-6">
                <div className="rounded-card border border-line bg-surface-sunken p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="rounded-control bg-brand-soft p-3 text-brand-strong">
                        <Store className="size-6" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-body-lg font-bold text-fg">Store</p>
                        <p className="text-label text-muted-fg">
                          Sell merchandise, digital products, and physical goods directly
                          to your audience.
                        </p>
                      </div>
                    </div>
                    <div className="w-14 shrink-0">
                      <Switch
                        checked={!!creatorData?.storeEnabled}
                        onCheckedChange={(checked) =>
                          handleUpdate("storeEnabled", checked)
                        }
                        label={<span className="sr-only">Store</span>}
                      />
                    </div>
                  </div>

                  {creatorData?.storeEnabled && (
                    <div className="mt-6 space-y-4 border-t border-line pt-6">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-label font-bold text-fg">Public Access</p>
                          <p className="text-caption text-muted-fg">
                            Allow anyone to purchase (not just supporters)
                          </p>
                        </div>
                        <div className="w-14 shrink-0">
                          <Switch
                            checked={!!creatorData?.storePublic}
                            onCheckedChange={(checked) =>
                              handleUpdate("storePublic", checked)
                            }
                            label={<span className="sr-only">Public Access</span>}
                          />
                        </div>
                      </div>
                      {!creatorData?.storePublic && (
                        <p className="rounded-control bg-brand-soft p-3 text-caption text-brand-strong">
                          Only supporters will be able to see and purchase from your
                          store.
                        </p>
                      )}
                      <Link
                        href="/creator/store"
                        className="inline-flex items-center gap-2 text-label font-bold text-brand-strong hover:text-brand-hover"
                      >
                        <ShoppingBag className="size-4" aria-hidden="true" />
                        Manage your store
                      </Link>
                    </div>
                  )}
                </div>

                <div className="rounded-card border border-line bg-surface-sunken p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="rounded-control bg-brand-soft p-3 text-brand-strong">
                        <Gift className="size-6" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-body-lg font-bold text-fg">Giveaways</p>
                        <p className="text-label text-muted-fg">
                          Run contests and reward your supporters with prizes.
                        </p>
                      </div>
                    </div>
                    <div className="w-14 shrink-0">
                      <Switch
                        checked={!!creatorData?.giveawayEnabled}
                        onCheckedChange={(checked) =>
                          handleUpdate("giveawayEnabled", checked)
                        }
                        label={<span className="sr-only">Giveaways</span>}
                      />
                    </div>
                  </div>

                  {creatorData?.giveawayEnabled && (
                    <div className="mt-6 border-t border-line pt-6">
                      <Link
                        href="/creator/giveaways"
                        className="inline-flex items-center gap-2 text-label font-bold text-brand-strong hover:text-brand-hover"
                      >
                        <Gift className="size-4" aria-hidden="true" />
                        Manage giveaways
                      </Link>
                    </div>
                  )}
                </div>

                <div className="rounded-card border border-line bg-surface-sunken p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="rounded-control bg-info-bg p-3 text-info">
                        <Calendar className="size-6" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-body-lg font-bold text-fg">Book a Meeting</p>
                        <p className="text-label text-muted-fg">
                          Allow supporters to book meetings or consultations with you.
                        </p>
                      </div>
                    </div>
                    <div className="w-14 shrink-0">
                      <Switch
                        checked={!!creatorData?.bookingEnabled}
                        onCheckedChange={(checked) =>
                          handleUpdate("bookingEnabled", checked)
                        }
                        label={<span className="sr-only">Book a Meeting</span>}
                      />
                    </div>
                  </div>

                  {creatorData?.bookingEnabled && (
                    <div className="mt-6 space-y-4 border-t border-line pt-6">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-label font-bold text-fg">Supporters Only</p>
                          <p className="text-caption text-muted-fg">
                            Only supporters can book meetings
                          </p>
                        </div>
                        <div className="w-14 shrink-0">
                          <Switch
                            checked={creatorData?.bookingAccess === "supporters"}
                            onCheckedChange={(checked) =>
                              handleUpdate(
                                "bookingAccess",
                                checked ? "supporters" : "public",
                              )
                            }
                            label={<span className="sr-only">Supporters Only</span>}
                          />
                        </div>
                      </div>
                      <Link
                        href="/creator/bookings"
                        className="inline-flex items-center gap-2 text-label font-bold text-brand-strong hover:text-brand-hover"
                      >
                        <Calendar className="size-4" aria-hidden="true" />
                        Manage bookings
                      </Link>
                    </div>
                  )}
                </div>

                <div className="rounded-card border border-line bg-surface-sunken p-6">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="rounded-control bg-success-bg p-3 text-success">
                        <Calendar className="size-6" aria-hidden="true" />
                      </div>
                      <div>
                        <p className="text-body-lg font-bold text-fg">Gatherings</p>
                        <p className="text-label text-muted-fg">
                          Create events and allow supporters to RSVP.
                        </p>
                      </div>
                    </div>
                    <div className="w-14 shrink-0">
                      <Switch
                        checked={!!creatorData?.gatheringsEnabled}
                        onCheckedChange={(checked) =>
                          handleUpdate("gatheringsEnabled", checked)
                        }
                        label={<span className="sr-only">Gatherings</span>}
                      />
                    </div>
                  </div>

                  {creatorData?.gatheringsEnabled && (
                    <div className="mt-6 border-t border-line pt-6">
                      <Link
                        href="/creator/gatherings"
                        className="inline-flex items-center gap-2 text-label font-bold text-brand-strong hover:text-brand-hover"
                      >
                        <Calendar className="size-4" aria-hidden="true" />
                        Manage gatherings
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )}

          {activeTab === "messaging" && (
            <Card className="space-y-8 p-6 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="font-display text-title font-bold text-fg">
                    Direct Messaging
                  </h3>
                  <p className="text-label text-muted-fg">
                    Allow your supporters to send you private messages.
                  </p>
                </div>
                <div className="w-14 shrink-0">
                  <Switch
                    checked={!!creatorData?.messagingEnabled}
                    onCheckedChange={(checked) =>
                      handleUpdate("messagingEnabled", checked)
                    }
                    label={<span className="sr-only">Direct Messaging</span>}
                  />
                </div>
              </div>

              {creatorData?.messagingEnabled && (
                <div className="space-y-6 border-t border-line pt-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-label font-bold text-fg">
                          Allow all supporters
                        </p>
                        <p className="text-caption text-muted-fg">
                          Any supporter can message you, regardless of amount
                        </p>
                      </div>
                      <div className="w-14 shrink-0">
                        <Switch
                          checked={!!creatorData?.messagingAllowAll}
                          onCheckedChange={(checked) =>
                            handleUpdate("messagingAllowAll", checked)
                          }
                          label={<span className="sr-only">Allow all supporters</span>}
                        />
                      </div>
                    </div>

                    {!creatorData?.messagingAllowAll && (
                      <Input
                        label={`Minimum Support Amount (${creatorData?.currency || "RWF"})`}
                        type="number"
                        value={creatorData?.messagingMinAmount || 0}
                        onChange={(e) =>
                          handleUpdate("messagingMinAmount", Number(e.target.value))
                        }
                        placeholder="0"
                        hint="Only supporters who have given at least this amount can message you"
                        containerClassName="md:w-56"
                      />
                    )}

                    <div className="flex items-start gap-3 rounded-control border border-line bg-success-bg p-4">
                      <MessageSquare
                        className="mt-0.5 size-5 text-success"
                        aria-hidden="true"
                      />
                      <div>
                        <p className="text-label font-bold text-success">
                          Email notifications enabled
                        </p>
                        <p className="text-caption text-success">
                          You will receive an email when a supporter sends you a new
                          message
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {!creatorData?.messagingEnabled && (
                <div className="rounded-card border border-line bg-surface-sunken p-6">
                  <div className="flex items-center gap-3 text-muted-fg">
                    <AlertCircle className="size-5" aria-hidden="true" />
                    <p className="text-label">
                      Messaging is disabled. Your supporters won&apos;t be able to send
                      you direct messages.
                    </p>
                  </div>
                </div>
              )}
            </Card>
          )}

          {activeTab === "community" && (
            <Card className="space-y-6 p-6 md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="rounded-control bg-info-bg p-3 text-info">
                    <Users className="size-6" aria-hidden="true" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-display text-title font-bold text-fg">
                      Community Tiers
                    </h3>
                    <p className="text-label text-muted-fg">
                      Create subscription tiers so supporters can support you monthly or
                      yearly.
                    </p>
                  </div>
                </div>
                <div className="w-14 shrink-0">
                  <Switch
                    checked={!!creatorData?.communityEnabled}
                    onCheckedChange={(checked) =>
                      handleUpdate("communityEnabled", checked)
                    }
                    label={<span className="sr-only">Community Tiers</span>}
                  />
                </div>
              </div>

              {creatorData?.communityEnabled && (
                <div className="mt-2 border-t border-line pt-6">
                  <Link
                    href="/creator/community"
                    className="inline-flex items-center gap-2 text-label font-bold text-brand-strong hover:text-brand-hover"
                  >
                    <Users className="size-4" aria-hidden="true" />
                    Manage community tiers
                  </Link>
                  <p className="mt-3 text-caption text-muted-fg">
                    When enabled, a &ldquo;Tiers&rdquo; link appears in your sidebar so
                    you can manage subscription plans.
                  </p>
                </div>
              )}

              {!creatorData?.communityEnabled && (
                <div className="rounded-card border border-line bg-surface-sunken p-6">
                  <div className="flex items-center gap-3 text-muted-fg">
                    <AlertCircle className="size-5" aria-hidden="true" />
                    <p className="text-label">
                      Community tiers are disabled. Your supporters won&apos;t be able to
                      subscribe to recurring support.
                    </p>
                  </div>
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
