import {
  collection,
  doc,
  getDoc,
  getDocs,
  increment,
  limit,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "@/db/firebase";
import type {
  CreatorPageCreator,
  CreatorPagePartner,
  CreatorPagePost,
  CreatorPageProfile,
} from "./types";

function requireDb() {
  if (!db) throw new Error("Firebase is not configured");
  return db;
}

export async function fetchCreatorRecord(username: string): Promise<{
  creator: CreatorPageCreator;
  profile: CreatorPageProfile | null;
  referralId: string | null;
} | null> {
  const database = requireDb();
  const creatorSnap = await getDoc(doc(database, "creators", username));
  if (!creatorSnap.exists()) return null;

  const creator = creatorSnap.data() as CreatorPageCreator;
  let profile: CreatorPageProfile | null = null;
  let referralId: string | null = null;

  if (creator.uid) {
    const profileSnap = await getDoc(doc(database, "profiles", creator.uid));
    if (profileSnap.exists()) {
      profile = profileSnap.data() as CreatorPageProfile;
      if (profile.referralCreator) {
        const referralSnap = await getDoc(
          doc(database, "creators", String(profile.referralCreator)),
        );
        if (referralSnap.exists()) {
          referralId = (referralSnap.data().uid as string) || null;
        }
      }
    }
  }

  return { creator, profile, referralId };
}

async function fetchPosts(
  creatorHandle: string,
  creatorUid: string,
  isPrivate: boolean,
): Promise<CreatorPagePost[]> {
  const database = requireDb();
  const snapshot = await getDocs(
    query(
      collection(database, "creatorContent"),
      where("creatorId", "in", [creatorHandle, creatorUid]),
      where("isPrivate", "==", isPrivate),
      limit(10),
    ),
  );

  return snapshot.docs.map(
    (item) => ({ id: item.id, ...item.data() }) as CreatorPagePost,
  );
}

export async function fetchPublicPosts(
  creatorHandle: string,
  creatorUid: string,
): Promise<CreatorPagePost[]> {
  const posts = await fetchPosts(creatorHandle, creatorUid, false);
  return posts.filter((post) => post.status !== "draft");
}

export async function fetchPrivatePosts(
  creatorHandle: string,
  creatorUid: string,
): Promise<CreatorPagePost[]> {
  return fetchPosts(creatorHandle, creatorUid, true);
}

export async function isSupportingCreator(
  supporterId: string,
  creatorId: string,
): Promise<boolean> {
  const database = requireDb();
  const snapshot = await getDocs(
    query(
      collection(database, "supportedCreators"),
      where("supporterId", "==", supporterId),
      where("creatorId", "==", creatorId),
    ),
  );
  return !snapshot.empty;
}

export async function fetchFeaturedPartners(
  creatorUid: string,
): Promise<CreatorPagePartner[]> {
  const database = requireDb();
  const snapshot = await getDocs(
    query(
      collection(database, "creatorPartners"),
      where("creatorId", "==", creatorUid),
      where("featured", "==", true),
    ),
  );
  return snapshot.docs.map(
    (item) => ({ id: item.id, ...item.data() }) as CreatorPagePartner,
  );
}

export async function countCreatorView(username: string): Promise<void> {
  const database = requireDb();
  await updateDoc(doc(database, "creators", username), {
    views: increment(1),
  });
}
