import type { Env, BookingAvailability } from "../types";
import { firestoreGet, firestoreRunQuery, extractFirestoreDocument } from "../firestore";

export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function parseTimeRange(preferredTime: string): { start: string; end: string } | null {
  const parts = preferredTime.split(" - ");
  if (parts.length !== 2) return null;
  return { start: parts[0].trim(), end: parts[1].trim() };
}

export function hasOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  return timeToMinutes(aStart) < timeToMinutes(bEnd) && timeToMinutes(aEnd) > timeToMinutes(bStart);
}

export function getAvailabilityForDate(avail: BookingAvailability, dateStr: string): boolean {
  const date = new Date(dateStr + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const startRaw = avail.startDate ? new Date(avail.startDate + "T00:00:00") : new Date(today);
  startRaw.setHours(0, 0, 0, 0);
  const rangeStart = startRaw > today ? startRaw : today;

  const endRaw = avail.endDate ? new Date(avail.endDate + "T23:59:59") : new Date(today);
  if (!avail.endDate) endRaw.setMonth(endRaw.getMonth() + 2);

  if (date < rangeStart || date > endRaw) return false;
  if (!avail.daysOfWeek.includes(date.getDay())) return false;
  return true;
}

export function isSlotValid(avail: BookingAvailability, preferredTime: string): boolean {
  const range = parseTimeRange(preferredTime);
  if (!range) return false;
  return avail.defaultSlots.some(
    (s) => s.startTime === range.start && s.endTime === range.end
  );
}

export function getMeetingLocation(avail: BookingAvailability, preferredType: string): string {
  if (preferredType === "online" || preferredType === "both") {
    if (avail.onlineLink) return avail.onlineLink;
  }
  if (preferredType === "physical" || preferredType === "both") {
    if (avail.location) return avail.location;
  }
  return "";
}

export async function checkDateAvailability(
  env: Env,
  creatorHandle: string,
  dateStr: string
): Promise<{
  available: boolean;
  slots?: Array<{ startTime: string; endTime: string }>;
  message?: string;
}> {
  let doc = await firestoreGet(env, `creators/${creatorHandle}`);
  if (!doc) {
    const docs = await firestoreRunQuery(env, "creators", [
      { fieldPath: "uid", op: "EQUAL", value: creatorHandle },
    ], 1);
    if (!docs || docs.length === 0) {
      return { available: false, message: "Creator not found" };
    }
    doc = docs[0];
  }

  const data = extractFirestoreDocument((doc as { fields: Record<string, unknown> }).fields);
  const avail = data.bookingAvailability as BookingAvailability | undefined;

  if (!data.bookingEnabled || !avail) {
    return { available: false, message: "No availability configured" };
  }

  const isAvailable = getAvailabilityForDate(avail, dateStr);
  if (!isAvailable) {
    return { available: false, message: "Date not available" };
  }

  return {
    available: true,
    slots: avail.defaultSlots,
  };
}

export async function findConflicts(
  env: Env,
  creatorHandle: string,
  date: string,
  timeRange: { start: string; end: string }
): Promise<Array<{ id: string; start: string; end: string }>> {
  const docs = await firestoreRunQuery(env, "bookingRequests", [
    { fieldPath: "creatorHandle", op: "EQUAL", value: creatorHandle },
    { fieldPath: "preferredDate", op: "EQUAL", value: date },
    { fieldPath: "status", op: "IN", value: ["pending", "accepted"] },
  ]);

  if (!docs) return [];

  const conflicts: Array<{ id: string; start: string; end: string }> = [];

  for (const doc of docs) {
    const id = (doc as { name?: string }).name?.split("/").pop() || "";
    const fields = (doc as { fields?: Record<string, unknown> }).fields;
    if (!fields) continue;

    const prefTime = (fields as Record<string, { stringValue?: string }>).preferredTime?.stringValue;
    if (!prefTime) continue;

    const existingRange = parseTimeRange(prefTime);
    if (!existingRange) continue;

    if (hasOverlap(timeRange.start, timeRange.end, existingRange.start, existingRange.end)) {
      conflicts.push({ id, start: existingRange.start, end: existingRange.end });
    }
  }

  return conflicts;
}
