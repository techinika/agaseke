import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe,
} from "firebase/firestore";
import { db } from "@/db/firebase";

export interface CategoryRecord {
  id: string;
  name: string;
  [k: string]: unknown;
}
export interface CountryRecord {
  id: string;
  code: string;
  name: string;
  flag?: string;
  phoneCode?: string;
  [k: string]: unknown;
}
export interface CurrencyRecord {
  id: string;
  code: string;
  name: string;
  symbol: string;
  [k: string]: unknown;
}
export interface CountryCurrencyRecord {
  id: string;
  countryCode: string;
  currencyCode: string;
  isDefault: boolean;
  [k: string]: unknown;
}

export function subscribeToCategories(
  onData: (items: CategoryRecord[]) => void,
): Unsubscribe {
  const q = query(collection(db, "categories"), orderBy("createdAt", "desc"));
  return onSnapshot(q, (snap) => {
    onData(
      snap.docs.map((d) => ({
        id: d.id,
        name: (d.data().name as string) || "",
        ...(d.data() as Record<string, unknown>),
      })),
    );
  });
}
export async function addCategory(name: string) {
  await addDoc(collection(db, "categories"), { name, createdAt: serverTimestamp() });
}
export async function updateCategory(id: string, name: string) {
  await updateDoc(doc(db, "categories", id), { name });
}
export async function deleteCategory(id: string) {
  await deleteDoc(doc(db, "categories", id));
}

export function subscribeToCountries(
  onData: (items: CountryRecord[]) => void,
): Unsubscribe {
  const q = query(collection(db, "countries"), orderBy("name", "asc"));
  return onSnapshot(q, (snap) => {
    onData(
      snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Record<string, unknown>),
      })) as CountryRecord[],
    );
  });
}
export async function addCountry(data: {
  code: string;
  name: string;
  flag: string;
  phoneCode: string;
}) {
  await addDoc(collection(db, "countries"), { ...data, createdAt: serverTimestamp() });
}
export async function updateCountry(
  id: string,
  data: { code: string; name: string; flag: string; phoneCode: string },
) {
  await updateDoc(doc(db, "countries", id), data);
}
export async function deleteCountry(id: string) {
  await deleteDoc(doc(db, "countries", id));
}

export function subscribeToCurrencies(
  onData: (items: CurrencyRecord[]) => void,
): Unsubscribe {
  const q = query(collection(db, "currencies"), orderBy("code", "asc"));
  return onSnapshot(q, (snap) => {
    onData(
      snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Record<string, unknown>),
      })) as CurrencyRecord[],
    );
  });
}

export function subscribeToCountryCurrencies(
  onData: (items: CountryCurrencyRecord[]) => void,
): Unsubscribe {
  const q = query(collection(db, "countryCurrencies"), orderBy("countryCode", "asc"));
  return onSnapshot(q, (snap) => {
    onData(
      snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Record<string, unknown>),
      })) as CountryCurrencyRecord[],
    );
  });
}
export async function addCountryCurrencyMapping(
  data: { countryCode: string; currencyCode: string; isDefault: boolean },
  existingDefaults: { id: string }[],
) {
  for (const ed of existingDefaults) {
    await updateDoc(doc(db, "countryCurrencies", ed.id), { isDefault: false });
  }
  await addDoc(collection(db, "countryCurrencies"), {
    ...data,
    createdAt: serverTimestamp(),
  });
}
export async function setDefaultCountryCurrency(
  mappingId: string,
  existingDefaults: { id: string }[],
) {
  for (const ed of existingDefaults) {
    await updateDoc(doc(db, "countryCurrencies", ed.id), { isDefault: false });
  }
  await updateDoc(doc(db, "countryCurrencies", mappingId), { isDefault: true });
}
export async function deleteCountryCurrencyMapping(id: string) {
  await deleteDoc(doc(db, "countryCurrencies", id));
}

export interface CurrencyConfigRecord {
  defaultCurrency?: string;
  [k: string]: unknown;
}

export function subscribeToCurrencyConfig(
  onData: (cfg: CurrencyConfigRecord | null) => void,
): Unsubscribe {
  return onSnapshot(doc(db, "config", "currencies"), (snap) => {
    onData(snap.exists() ? (snap.data() as CurrencyConfigRecord) : null);
  });
}
export async function setDefaultCurrency(code: string) {
  await updateDoc(doc(db, "config", "currencies"), { defaultCurrency: code });
}
export async function addCurrency(data: {
  code: string;
  name: string;
  symbol: string;
  payoutThreshold: number;
  minSupportAmount: number;
}) {
  await addDoc(collection(db, "currencies"), { ...data, createdAt: serverTimestamp() });
}
export async function updateCurrency(
  id: string,
  data: {
    code: string;
    name: string;
    symbol: string;
    payoutThreshold: number;
    minSupportAmount: number;
  },
) {
  await updateDoc(doc(db, "currencies", id), data);
}
export async function deleteCurrency(id: string) {
  await deleteDoc(doc(db, "currencies", id));
}

export function subscribeToPendingPayoutCreators(
  minAmount: number,
  onData: (items: Record<string, unknown>[]) => void,
): Unsubscribe {
  const q = query(collection(db, "creators"), where("pendingPayout", ">", minAmount));
  return onSnapshot(q, (snapshot) => {
    onData(
      snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as Record<string, unknown>) })),
    );
  });
}

export async function approveCreatorPayout(
  creator: { id: string; uid?: string; name?: string; payoutNumber?: string },
  amount: number,
) {
  await runTransaction(db, async (transaction) => {
    const creatorRef = doc(db, "creators", creator.id);
    const payoutRef = doc(collection(db, "payouts"));
    transaction.update(creatorRef, {
      pendingPayout: 0,
      lastPayoutAt: serverTimestamp(),
    });
    transaction.set(payoutRef, {
      creatorId: creator.id,
      creatorUid: creator.uid,
      amount,
      status: "completed",
      approvedAt: serverTimestamp(),
      method: "MoMo",
      createdAt: serverTimestamp(),
    });
  });
  let email: string | undefined;
  if (creator.uid) {
    const profileSnap = await getDoc(doc(db, "profiles", creator.uid));
    email = profileSnap.data()?.email as string | undefined;
  }
  return { email };
}
