import { NextRequest, NextResponse } from "next/server";
import { admin, adminDb } from "@/db/firebaseAdmin";
import { requireAuth } from "@/lib/authMiddleware";
import { isCurrencyCode } from "@/lib/money";
import { evaluateLocationUpdateCooldown } from "@/lib/creator/locationPolicy";

function cleanString(value: unknown, max = 32): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(request: NextRequest) {
  const authUser = await requireAuth(request);
  if (authUser instanceof NextResponse) return authUser;

  let body: { country?: unknown; currency?: unknown };
  try {
    body = (await request.json()) as { country?: unknown; currency?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const rawCountry =
    body.country === undefined ? undefined : cleanString(body.country, 16).toUpperCase();
  const rawCurrency =
    body.currency === undefined ? undefined : cleanString(body.currency, 10).toUpperCase();

  if (rawCountry === undefined && rawCurrency === undefined) {
    return NextResponse.json(
      { error: "Provide country or currency to update" },
      { status: 400 },
    );
  }

  try {
    const creatorSnap = await adminDb
      .collection("creators")
      .where("uid", "==", authUser.uid)
      .limit(1)
      .get();

    if (creatorSnap.empty) {
      return NextResponse.json({ error: "Creator profile not found" }, { status: 404 });
    }

    const creatorDoc = creatorSnap.docs[0];
    const creatorData = (creatorDoc.data() || {}) as Record<string, unknown>;
    const currentCountry = cleanString(creatorData.country, 16).toUpperCase();
    const currentCurrency = cleanString(creatorData.currency, 10).toUpperCase();

    const updates: Record<string, unknown> = {};
    let countryUpdated = false;
    let currencyUpdated = false;

    if (rawCountry !== undefined && rawCountry !== "" && rawCountry !== currentCountry) {
      const countrySnap = await adminDb
        .collection("countries")
        .where("code", "==", rawCountry)
        .limit(1)
        .get();
      if (countrySnap.empty) {
        return NextResponse.json(
          { error: "Selected country is not supported", code: "INVALID_COUNTRY" },
          { status: 400 },
        );
      }

      if (currentCountry) {
        const cooldown = evaluateLocationUpdateCooldown(
          creatorData.locationUpdatedAt ?? creatorData.countryUpdatedAt,
        );
        if (!cooldown.allowed) {
          return NextResponse.json(
            {
              error: `Location can only be updated once every month. Next update available on ${cooldown.nextAllowedAt?.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })}.`,
              code: "LOCATION_COOLDOWN",
              nextAllowedAt: cooldown.nextAllowedAt?.toISOString() ?? null,
              remainingDays: cooldown.remainingDays,
            },
            { status: 429 },
          );
        }
      }

      updates.country = rawCountry;
      updates.locationUpdatedAt = admin.firestore.FieldValue.serverTimestamp();
      updates.countryUpdatedAt = admin.firestore.FieldValue.serverTimestamp();
      countryUpdated = true;
    }

    if (rawCurrency !== undefined && rawCurrency !== "" && rawCurrency !== currentCurrency) {
      if (!isCurrencyCode(rawCurrency)) {
        return NextResponse.json(
          { error: "Selected currency is not valid", code: "INVALID_CURRENCY" },
          { status: 400 },
        );
      }

      const currenciesSnap = await adminDb
        .collection("currencies")
        .where("code", "==", rawCurrency)
        .limit(1)
        .get();
      if (currenciesSnap.empty) {
        return NextResponse.json(
          { error: "Selected currency is not currently active", code: "CURRENCY_NOT_CONFIGURED" },
          { status: 400 },
        );
      }

      updates.currency = rawCurrency;
      updates.currencyUpdatedAt = admin.firestore.FieldValue.serverTimestamp();
      currencyUpdated = true;
    }

    if (!countryUpdated && !currencyUpdated) {
      return NextResponse.json({
        ok: true,
        updated: false,
        country: currentCountry || null,
        currency: currentCurrency || null,
      });
    }

    updates.updatedAt = admin.firestore.FieldValue.serverTimestamp();

    const batch = adminDb.batch();
    batch.update(creatorDoc.ref, updates);

    const logRef = adminDb.collection("activityLogs").doc();
    batch.set(logRef, {
      level: "info",
      category: "creator_settings",
      message: `Updated ${[countryUpdated ? `location (${updates.country})` : "", currencyUpdated ? `currency (${updates.currency})` : ""].filter(Boolean).join(" & ")} for @${creatorDoc.id}`,
      creatorId: authUser.uid,
      creatorHandle: creatorDoc.id,
      countryUpdated,
      currencyUpdated,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();

    return NextResponse.json({
      ok: true,
      updated: true,
      countryUpdated,
      currencyUpdated,
      country: (updates.country as string) || currentCountry || null,
      currency: (updates.currency as string) || currentCurrency || null,
      locationUpdatedAt: countryUpdated ? new Date().toISOString() : undefined,
    });
  } catch (error) {
    console.error("Failed to update creator location/currency:", error);
    return NextResponse.json(
      { error: "Failed to update location and currency" },
      { status: 500 },
    );
  }
}
