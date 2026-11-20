"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { toast } from "sonner";
import { auth, db } from "@/db/firebase";
import { sendCommsEmail } from "@/lib/commsService";
import { RESERVED_USERNAMES } from "./reservedUsernames";
import type {
  CountryOption,
  CurrencyOption,
  OnboardingFormData,
  OnboardingFlowProps,
  OnboardingSocials,
  OnboardingStep,
  UsernameStatus,
} from "./types";

const DRAFT_KEY = "agaseke_onboarding_draft";

const emptyForm: OnboardingFormData = {
  username: "",
  fullName: "",
  bio: "",
  momoNumber: "",
  momoNetwork: "MTN",
  country: "",
  currency: "",
  socials: {
    instagram: "",
    linkedin: "",
    twitter: "",
    youtube: "",
    tiktok: "",
    web: "",
  },
};

function fromSnapshot<T>(snapshot: QueryDocumentSnapshot<DocumentData>): T {
  return { id: snapshot.id, ...snapshot.data() } as unknown as T;
}

function clampStep(value: number): OnboardingStep {
  if (value <= 1) return 1;
  if (value >= 6) return 6;
  return Math.round(value) as OnboardingStep;
}

export function useOnboarding(): OnboardingFlowProps {
  const searchParams = useSearchParams();
  const router = useRouter();
  const referralCreator = searchParams.get("referral") || null;

  const [step, setStep] = useState<OnboardingStep>(1);
  const [loading, setLoading] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>("idle");
  const [formData, setFormData] = useState<OnboardingFormData>(() => ({
    ...emptyForm,
    username: searchParams.get("username") || "",
    socials: { ...emptyForm.socials },
  }));
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [currencies, setCurrencies] = useState<CurrencyOption[]>([]);
  const [countryCurrencies, setCountryCurrencies] = useState<DocumentData[]>([]);
  const [availableCurrencies, setAvailableCurrencies] = useState<CurrencyOption[]>([]);
  const [locationDataError, setLocationDataError] = useState(false);
  const [locationLoading, setLocationLoading] = useState(true);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(DRAFT_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as {
        step?: number;
        formData?: Partial<OnboardingFormData>;
      };
      const draft = parsed;
      queueMicrotask(() => {
        if (draft.formData) {
          setFormData({
            ...emptyForm,
            ...draft.formData,
            socials: { ...emptyForm.socials, ...draft.formData.socials },
          });
        }
        if (draft.step) setStep(clampStep(draft.step));
      });
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    try {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ step, formData }));
    } catch {
      return;
    }
  }, [step, formData]);

  useEffect(() => {
    const username = formData.username;
    if (username.length < 3) {
      queueMicrotask(() => setUsernameStatus("idle"));
      return;
    }
    if (username.length > 19 || !/^[a-z0-9_]+$/.test(username)) {
      queueMicrotask(() => setUsernameStatus("invalid"));
      return;
    }

    const checkUsername = async () => {
      setUsernameStatus("checking");
      try {
        const snapshot = await getDoc(doc(db, "creators", username));
        setUsernameStatus(
          snapshot.exists() || RESERVED_USERNAMES.has(username) ? "taken" : "available",
        );
      } catch (error) {
        console.error(error);
      }
    };

    const timeoutId = setTimeout(checkUsername, 500);
    return () => clearTimeout(timeoutId);
  }, [formData.username]);

  useEffect(() => {
    const checkUserStatus = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const snapshot = await getDoc(doc(db, "profiles", user.uid));
      if (snapshot.exists() && snapshot.data().type === "creator") {
        router.push("/creator");
      }
    };
    checkUserStatus();
  }, [router]);

  useEffect(() => {
    const fetchData = async () => {
      setLocationLoading(true);
      try {
        const [countriesSnap, currenciesSnap, mappingsSnap] = await Promise.all([
          getDocs(query(collection(db, "countries"), orderBy("name", "asc"))),
          getDocs(query(collection(db, "currencies"), orderBy("code", "asc"))),
          getDocs(query(collection(db, "countryCurrencies"))),
        ]);
        setCountries(
          countriesSnap.docs.map((entry) => fromSnapshot<CountryOption>(entry)),
        );
        setCurrencies(
          currenciesSnap.docs.map((entry) => fromSnapshot<CurrencyOption>(entry)),
        );
        setCountryCurrencies(mappingsSnap.docs.map((entry) => entry.data()));
        setLocationDataError(false);
      } catch (error) {
        console.error("Failed to load countries/currencies:", error);
        setLocationDataError(true);
      } finally {
        setLocationLoading(false);
      }
    };
    fetchData();
  }, [reloadKey]);

  useEffect(() => {
    if (!formData.country) {
      queueMicrotask(() => setAvailableCurrencies([]));
      return;
    }
    const selectedCountry = formData.country.trim().toUpperCase();
    const mappings = countryCurrencies.filter(
      (mapping) =>
        String(mapping.countryCode || "")
          .trim()
          .toUpperCase() === selectedCountry,
    );
    const available = currencies.filter((currency) =>
      mappings.some(
        (mapping) =>
          String(mapping.currencyCode || "")
            .trim()
            .toUpperCase() ===
          String(currency.code || "")
            .trim()
            .toUpperCase(),
      ),
    );
    queueMicrotask(() => {
      setAvailableCurrencies(available);
      const defaultMapping = mappings.find((mapping) => mapping.isDefault);
      if (defaultMapping && !formData.currency) {
        setFormData((previous) => ({
          ...previous,
          currency: String(defaultMapping.currencyCode).trim().toUpperCase(),
        }));
      } else if (
        formData.currency &&
        !mappings.some(
          (mapping) =>
            String(mapping.currencyCode || "")
              .trim()
              .toUpperCase() === formData.currency.trim().toUpperCase(),
        )
      ) {
        setFormData((previous) => ({ ...previous, currency: "" }));
      }
    });
  }, [formData.country, formData.currency, countryCurrencies, currencies]);

  const onFieldChange = useCallback((field: keyof OnboardingFormData, value: string) => {
    if (field === "username") {
      const normalized = value.toLowerCase().replace(/[^a-z0-9_]/g, "");
      setFormData((previous) => ({ ...previous, username: normalized }));
      return;
    }
    if (field === "country") {
      setFormData((previous) => ({
        ...previous,
        country: value.trim().toUpperCase(),
        currency: "",
      }));
      return;
    }
    setFormData((previous) => ({ ...previous, [field]: value }));
  }, []);

  const onSocialChange = useCallback((field: keyof OnboardingSocials, value: string) => {
    setFormData((previous) => ({
      ...previous,
      socials: { ...previous.socials, [field]: value },
    }));
  }, []);

  const handleFinish = async () => {
    setLoading(true);
    const user = auth.currentUser;

    if (!user) {
      toast.error("You must be logged in");
      setLoading(false);
      return;
    }

    try {
      const selectedCountry = formData.country.trim().toUpperCase() || null;
      const selectedCurrency = formData.currency.trim().toUpperCase() || null;
      await setDoc(doc(db, "creators", formData.username), {
        uid: user.uid,
        name: formData.fullName,
        bio: formData.bio,
        handle: formData.username,
        payoutNumber: formData.momoNumber,
        network: formData.momoNetwork,
        country: selectedCountry,
        currency: selectedCurrency,
        verified: false,
        totalEarnings: 0,
        totalSupporters: 0,
        pendingPayout: 0,
        socials: {
          instagram: formData.socials.instagram || null,
          linkedin: formData.socials.linkedin || null,
          twitter: formData.socials.twitter || null,
          youtube: formData.socials.youtube || null,
          tiktok: formData.socials.tiktok || null,
          web: formData.socials.web || null,
        },
        perks: [],
        events: [],
        createdAt: serverTimestamp(),
        views: 0,
        verificationStatus: null,
        phoneVerified: false,
        foundingMember: false,
      });

      await updateDoc(doc(db, "profiles", user.uid), {
        type: "creator",
        username: formData.username,
        referralCreator: referralCreator ?? null,
        onboarded: true,
        country: selectedCountry,
        currency: selectedCurrency,
      });
      window.dispatchEvent(new Event("agaseke:refresh-auth"));

      try {
        await sendCommsEmail("welcome_creator", {
          email: user.email,
          name: formData.fullName,
          handle: formData.username,
        });
      } catch (emailError) {
        console.error("Creator launch email failed:", emailError);
      }

      try {
        await fetch("/api/admin/notifications/new-creator", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            creatorUid: user.uid,
            creatorName: formData.fullName,
            handle: formData.username,
          }),
        });
      } catch (notificationError) {
        console.error("Creator notification failed:", notificationError);
      }

      sessionStorage.removeItem(DRAFT_KEY);
      toast.success("Welcome to the creator family!");
      router.push("/creator");
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong saving your profile.");
    } finally {
      setLoading(false);
    }
  };

  return {
    step,
    formData,
    usernameStatus,
    countries,
    currencies,
    availableCurrencies,
    locationDataError,
    locationLoading,
    loading,
    onFieldChange,
    onSocialChange,
    onNext: () => setStep((previous) => clampStep(previous + 1)),
    onBack: () => setStep((previous) => clampStep(previous - 1)),
    onFinish: handleFinish,
    onSkip: () => router.push("/supporter"),
    onRetryLocation: () => setReloadKey((previous) => previous + 1),
  };
}
